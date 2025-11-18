// server/config/gemini.js
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/genai";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in .env file");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

// you can change the model name if needed
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
});
