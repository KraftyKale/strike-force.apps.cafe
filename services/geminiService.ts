
import { GoogleGenAI } from "@google/genai";

export const getIntelReport = async (context: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a military tactical officer for Strike Force Gemini. Give a short, one-sentence grit-filled tactical update for the player. Context: ${context}`,
      config: {
        maxOutputTokens: 100,
        temperature: 0.8
      }
    });

    return response.text || "Eyes sharp, soldier. No threats visible yet.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Comm-link unstable. Maintain operational focus.";
  }
};
