
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export const geminiModel = {
  generate: async (contents) => {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
    });
    return response.text;
  },
};
