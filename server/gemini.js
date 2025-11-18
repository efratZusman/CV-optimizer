// gemini.js
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const geminiModel = {
  generate: async (prompt) => {
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      // === כאן השינוי הקריטי ===
      // מסתמכים על מה שראינו בלוג:
      // GenerateContentResponse { candidates: [ { content: ... } ] }

      if (!response || !Array.isArray(response.candidates) || response.candidates.length === 0) {
        console.error("No candidates in Gemini response:", response);
        throw new Error("Did not receive a valid response from AI service.");
      }

      const firstCandidate = response.candidates[0];
      const parts = firstCandidate?.content?.parts;

      if (!Array.isArray(parts) || parts.length === 0 || !parts[0]?.text) {
        console.error("No text parts in Gemini response:", firstCandidate);
        throw new Error("Did not receive a valid response from AI service.");
      }

      const text = parts[0].text;
      return text;
    } catch (err) {
      console.error("Gemini API error in geminiModel.generate:", {
        message: err?.message,
        status: err?.status,
        raw: err,
      });
      throw err;
    }
  },
};
