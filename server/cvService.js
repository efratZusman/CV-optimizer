import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { geminiModel } from "./gemini.js";

const __dirname = path.resolve();

const uploadsDir = path.join(__dirname, "uploads");
const generatedDir = path.join(__dirname, "generated");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

// ---------- helpers ----------
function pdfFileToBase64(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString("base64");
}

import fs from "fs";
import PDFDocument from "pdfkit";

export function createImprovedPdf(contentObj, outputFilePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const stream = fs.createWriteStream(outputFilePath);
    doc.pipe(stream);

    // --- כותרת ראשית ---
    doc.fontSize(20).text("Optimized CV", { align: "center", underline: true });
    doc.moveDown(1);

    // --- Match Score ---
    if (contentObj.match_score !== undefined) {
      doc.fontSize(12).text(`Match Score: ${contentObj.match_score}/100`, { align: "right" });
      doc.moveDown(0.5);
    }

    // --- Helper function for sections ---
    const addSection = (title, items) => {
      if (!items || items.length === 0) return;
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor("blue").text(title, { underline: true });
      doc.moveDown(0.2);
      items.forEach(item => {
        doc.fontSize(12).fillColor("black").text(`• ${item}`);
      });
    };

    addSection("Key Skills", contentObj.key_skills_to_highlight);
    addSection("Suggested Changes", contentObj.suggested_changes);
    addSection("Missing Qualifications", contentObj.missing_qualifications);
    addSection("Recommendations", contentObj.specific_recommendations);

    // --- Full Improved CV ---
    if (contentObj.improved_cv_full_text) {
      doc.addPage();
      doc.fontSize(16).fillColor("black").text("Full Improved CV", { underline: true });
      doc.moveDown(0.3);

      const lines = contentObj.improved_cv_full_text.split(/\r?\n/);
      lines.forEach(line => {
        if (line.trim() === "") {
          doc.moveDown(0.2);
        } else {
          doc.fontSize(12).text(line, { align: "left" });
          doc.moveDown(0.1);
        }
      });
    }

    doc.end();

    stream.on("finish", () => resolve(outputFilePath));
    stream.on("error", (err) => reject(err));
  });
}

// ---------- main service: optimization for a specific job ----------
export async function optimizeCvForJob(uploadedFilePath, jobDescription) {
  const base64Pdf = pdfFileToBase64(uploadedFilePath);

 const prompt = `
You are an expert CV/resume writer and job matching specialist.

You will receive:
1) A CV as a PDF file encoded in base64.
2) A job description as plain text.

Your tasks:
1. Decode and read the CV.
2. Read the job description carefully.
3. Analyze how well the CV fits this specific job.
4. Generate concrete improvements.
5. Rewrite the CV content so it fits approximately **one page** (single-page PDF).
6. Provide a precise match score as a number from 0 to 100.
7. Give short, clear, actionable recommendations.

Base64 CV:
${base64Pdf}

Job Description:
${jobDescription}

Return ONLY a valid JSON object with the following structure:

{
  "match_score": 0-100,
  "key_skills_to_highlight": ["skill 1", "skill 2"],
  "suggested_changes": ["concise change 1", "concise change 2"],
  "missing_qualifications": ["missing 1", "missing 2"],
  "specific_recommendations": ["short recommendation 1", "short recommendation 2"],
  "improved_cv_full_text": "concise improved CV content suitable for one page"
}

Rules:
- "match_score" must be a number (0-100), not a string.
- "improved_cv_full_text" should be concise, professional, and fit on roughly one page.
- Recommendations must be short, actionable, and easy to follow.
- Return ONLY JSON. Do NOT include markdown, explanations, or extra text.
`;


  let responseText;
  try {
    // עכשיו generate מחזיר ישירות את הטקסט
    responseText = await geminiModel.generate(prompt);
  } catch (err) {
    console.error("Error calling Gemini in optimizeCvForJob:", {
      message: err.message,
      status: err.status,
    });
    throw new Error("AI service is temporarily unavailable. Please try again later.");
  }

  if (!responseText || typeof responseText !== "string") {
    console.error("Gemini returned invalid text:", responseText);
    throw new Error("Did not receive a valid text response from AI service.");
  }

  responseText = responseText.trim();

  let analysis;
  try {
    const cleaned = responseText
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    analysis = JSON.parse(cleaned);
  } catch (err) {
    console.error("Error parsing JSON from Gemini:", err);
    console.error("Raw response:", responseText);
    throw new Error("Failed to parse JSON from Gemini");
  }

  const improvedText = analysis.improved_cv_full_text;
  if (!improvedText) {
    throw new Error("Gemini response did not contain 'improved_cv_full_text'");
  }

  const newFileName = `cv-improved-for-job-${Date.now()}.pdf`;
  const newFilePath = path.join(generatedDir, newFileName);

  await createImprovedPdf(improvedText, newFilePath);

  // delete original file (optional)
  fs.unlink(uploadedFilePath, (err) => {
    if (err) console.warn("Failed to delete original file:", err.message);
  });

  return {
    analysis,
    pdfFilename: newFileName,
  };
}


export function getGeneratedFilePath(filename) {
  return path.join(generatedDir, filename);
}


