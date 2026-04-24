import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export async function transformToProfessionalEmail(roughNote: string, emailType: string, userName?: string) {
  const isAutoReply = emailType === "Auto-Reply";
  
  const prompt = `
    You are an expert corporate communications specialist and executive assistant. 
    Your task is to transform the following rough, informal voice note or transcript into a polished, professional email.

    Email Type: ${emailType}
    User Name for Sign-off: ${userName || '[Your Name]'}

    STRICT RULES:
    1. Identify the core message and intent.
    2. Elevate the tone to be polite, clear, and professionally appropriate for a workplace environment.
    3. Remove any filler words, slang, or overly casual phrasing.
    4. Neutralize any frustration or hurry; sound calm and collected.
    5. Do not invent new information. Use placeholders like [Name] or [Time] if specifics are missing.
    6. Return the output STRICTLY as a valid JSON object without markdown formatting blocks.

    OUTPUT FORMAT (${isAutoReply ? 'AUTO-REPLY' : 'STANDARD'}):
    ${isAutoReply 
      ? `
      {
        "options": [
          {"type": "Formal", "subject": "...", "body": "..."},
          {"type": "Friendly", "subject": "...", "body": "..."},
          {"type": "Concise", "subject": "...", "body": "..."}
        ]
      }
      ` 
      : `
      {
        "subject": "...",
        "body": "..."
      }
      `}

    INPUT:
    "${roughNote}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    // Clean and parse JSON
    let text = response.text || "{}";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
