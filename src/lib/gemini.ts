import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function transformToProfessionalEmail(roughNote: string) {
  const prompt = `
    You are an expert corporate communications specialist and executive assistant. 
    Your task is to transform the following rough, informal voice note or transcript into a polished, professional email.

    STRICT RULES:
    1. Identify the core message and intent.
    2. Elevate the tone to be polite, clear, and professionally appropriate for a workplace environment.
    3. Remove any filler words, slang, or overly casual phrasing.
    4. Neutralize any frustration or hurry; sound calm and collected.
    5. Format the output STRICTLY with a Subject Line, Salutation, Body, and Sign-off.
    6. Do not invent new information. Use placeholders like [Name] or [Time] if specifics are missing.

    OUTPUT FORMAT:
    Subject: [Clear, concise subject line]

    Hi [Name/Team],

    [Professional email body]

    Best regards,
    [My Name]

    INPUT:
    "${roughNote}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
