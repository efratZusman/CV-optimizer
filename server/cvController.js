// server/controllers/cvController.js
import fs from "fs";
import { optimizeCvForJob, getGeneratedFilePath } from "./cvService.js";

// POST /api/optimize-for-job
export async function optimizeForJobController(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No CV file was uploaded" });
    }

    const { jobDescription } = req.body;

    if (!jobDescription || jobDescription.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Job description is required in the request body" });
    }

    const uploadedPath = req.file.path;

    const { analysis, pdfFilename } = await optimizeCvForJob(
      uploadedPath,
      jobDescription
    );

    return res.json({
      analysis,
      pdfFilename,
    });
  } catch (err) {
    console.error("Error in optimizeForJobController:", err);
    return res.status(500).json({
      error: err.message || "Internal server error while optimizing CV for job",
    });
  }
}

// GET /api/download/:filename
export function downloadPdfController(req, res) {
  const { filename } = req.params;

  if (filename.includes("..")) {
    return res.status(400).send("Invalid filename");
  }

  const filePath = getGeneratedFilePath(filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);

  // Optional: delete file after sending
  // stream.on("close", () => {
  //   fs.unlink(filePath, () => {});
  // });
}
