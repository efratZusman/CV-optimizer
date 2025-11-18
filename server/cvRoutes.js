// server/routes/cvRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import {
  optimizeForJobController,
  downloadPdfController,
} from "./cvController.js";

const router = express.Router();
const __dirname = path.resolve();

// ---------- Multer config for PDF upload ----------
const uploadsDir = path.join(__dirname, "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, `cv-${timestamp}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF files are allowed"), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

// ---------- Routes ----------

// Option 1: optimize for a specific job
// POST /api/optimize-for-job
// Form-data: cv (file), jobDescription (text)
router.post(
  "/optimize-for-job",
  upload.single("cv"),
  optimizeForJobController
);

// Download improved PDF
// GET /api/download/:filename
router.get("/download/:filename", downloadPdfController);

export default router;
