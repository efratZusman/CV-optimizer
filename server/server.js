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
    const doc = new PDFDocument({ margin: 40 });

    const stream = fs.createWriteStream(outputFilePath);
    doc.pipe(stream);

    doc.fontSize(12);
    const lines = contentText.split("\n");
    for (const line of lines) {
      doc.text(line, { align: "left" }); // use "right" if content is RTL
      doc.moveDown(0.3);
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
You are a professional CV/resume writer and job matching expert.

You will receive:
1) A CV as a PDF file encoded in base64.
2) A job description as plain text.

Your tasks:
- Decode and read the CV.
- Read the job description.
- Analyze how well the CV fits this specific job.
- Suggest concrete improvements.

Base64 CV:
${base64Pdf}

Job Description:
${jobDescription}

Return ONLY a valid JSON object with the following structure:

{
  "key_skills_to_highlight": ["skill 1", "skill 2"],
  "suggested_changes": ["change 1", "change 2"],
  "missing_qualifications": ["missing 1", "missing 2"],
  "match_score": 0-100,
  "specific_recommendations": ["recommendation 1", "recommendation 2"],
  "improved_cv_full_text": "full improved CV text tailored to this job"
}

Rules:
- "match_score" MUST be a number between 0 and 100 (no % sign, not a string).
- Write the improved CV in 'improved_cv_full_text' so it is ready to be used as a full CV for this job.
- Return ONLY JSON. No markdown, no comments, no extra text.
`;

const result = await geminiModel.generate(prompt);
  const responseText = result.response.text().trim();

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

