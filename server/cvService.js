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

function createImprovedPdf(contentText, outputFilePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outputFilePath);
    doc.pipe(stream);

    // הגדרות בסיס
    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;

    // כותרת עליונה כללית
    doc
      .fontSize(20)
      .fillColor("#1f4e79")
      .text("Curriculum Vitae", left, doc.y, {
        align: "center",
        underline: true,
      });
    doc.moveDown(1);

    // נחזור לשחור לטקסט רגיל
    doc.fillColor("black").fontSize(12);

    const lines = contentText.split("\n");

    for (let rawLine of lines) {
      const line = rawLine.trimEnd();

      // שורות ריקות – מרווח קטן
      if (line.trim() === "") {
        doc.moveDown(0.3);
        continue;
      }

      // קו מפריד (---)
      if (line.trim() === "---") {
        doc
          .moveTo(left, doc.y)
          .lineTo(right, doc.y)
          .stroke();
        doc.moveDown(0.5);
        continue;
      }

      // כותרת סעיף – מתחיל ב-### (למשל ### Summary)
      if (line.startsWith("### ")) {
        const title = line.substring(4).trim();
        doc.moveDown(0.5);
        doc
          .fontSize(14)
          .fillColor("#1f4e79")
          .text(title, { underline: true });
        doc.moveDown(0.2);
        doc.fontSize(12).fillColor("black");
        continue;
      }

      // כותרת מודגשת – **Title**
      if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
        const title = line.substring(2, line.length - 2).trim();
        doc.moveDown(0.3);
        doc
          .fontSize(12)
          .fillColor("#333333")
          .text(title, {
            underline: true,
          });
        doc.moveDown(0.15);
        doc.fontSize(12).fillColor("black");
        continue;
      }

      // בולט (* text או - text)
      if ((line.startsWith("* ") || line.startsWith("- ")) && line.length > 2) {
        const text = line.substring(2).trim();
        doc.fontSize(12).fillColor("black").text("• " + text, {
          align: "left",
          indent: 10,
        });
        doc.moveDown(0.1);
        continue;
      }

      // שורה עם קו אנכי (כמו בשורת הפרטים) – נמרכז מעט
      if (line.includes("|")) {
        doc.fontSize(11).fillColor("#333333").text(line, {
          align: "center",
        });
        doc.moveDown(0.2);
        doc.fillColor("black");
        continue;
      }

      // ברירת מחדל – טקסט רגיל
      doc.fontSize(12).fillColor("black").text(line, {
        align: "left",
      });
      doc.moveDown(0.15);
    }

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
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

Your goals:
- Do NOT invent or fabricate experience, skills, degrees, or dates that are not clearly supported by the CV.
- You may only rephrase, reorganize, highlight, or slightly expand on what is already present in the CV.
- Keep the improved CV concise and focused (roughly one page of content).

Your tasks:
1. Decode and read the CV.
2. Read the job description carefully.
3. Analyze how well the CV fits this specific job.
4. Suggest concrete and realistic improvements based ONLY on the existing information.
5. Emphasize the most relevant skills and experience for this specific job.
6. Rewrite the CV content so it:
   - stays faithful to the real facts in the original CV,
   - is clearly structured,
   - is not too long (approximately one page),
   - uses clear, professional language.
7. Provide a precise match score as a number from 0 to 100.
8. Provide short, clear, actionable recommendations (not long paragraphs).

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
  "improved_cv_full_text": "concise improved CV content suitable for one page, based only on real facts from the original CV"
}

Rules:
- "match_score" must be a number (0-100), not a string and not a percentage with %.
- Do NOT add fake jobs, fake skills, fake tools, fake degrees, or fake dates.
- If you are not sure about some detail, do NOT guess it and do NOT invent it.
- You may reorder, rephrase, and slightly condense or expand, but always stay faithful to the original CV.
- "improved_cv_full_text" must be professional, focused, and roughly one page of content.
- Recommendations must be short, actionable bullet-style suggestions.
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


