
import { GoogleGenAI, Modality } from "@google/genai";

export type ConsistencyMode = 'strict' | 'expression' | 'style-transfer' | 'extraction';

/**
 * Generates a specific view of a character based on front and optional back reference images.
 */
export const generateCharacterView = async (
  frontImage: string,
  backImage: string | null,
  promptInstruction: string,
  mode: ConsistencyMode = 'strict'
): Promise<string> => {
  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const frontData = frontImage.split(',')[1] || frontImage;
    const frontMime = frontImage.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';

    const parts: any[] = [{ text: "" }];

    let consistencyPrompt = "";
    switch (mode) {
      case 'strict':
        consistencyPrompt = `
        IMPORTANT CONSISTENCY RULES:
        1. Keep the character's identity, gender, ethnicity, and body type EXACTLY the same as the references.
        2. Keep the clothing details, colors, and accessories EXACTLY the same.
        3. Use the provided BACK image to accurately render side and back details.
        4. Render on a plain, neutral background.
        5. High quality, detailed character design.
        `;
        break;
      case 'expression':
        consistencyPrompt = `
        IMPORTANT CONSISTENCY RULES:
        1. Keep identity and clothing EXACTLY as reference.
        2. CHANGE ONLY THE FACIAL EXPRESSION.
        3. Render on a plain, neutral background.
        `;
        break;
      case 'style-transfer':
        consistencyPrompt = `
        STYLE TRANSFER: Render character in Chibi/Q-version while maintaining recognizable colors and features from references.
        `;
        break;
      case 'extraction':
        consistencyPrompt = `
        EXTRACTION: Copy the character exactly as they appear in the reference, but on a pure white background.
        `;
        break;
    }

    const referenceCount = backImage ? "TWO (front and back)" : "ONE (front)";
    parts[0].text = `Target View: ${promptInstruction}\n\nI have provided ${referenceCount} reference images of this character. Please ensure perfect consistency across all angles based on these references. \n\n ${consistencyPrompt}`;

    // Add Front Image
    parts.push({
      inlineData: { mimeType: frontMime, data: frontData }
    });

    // Add Back Image if exists
    if (backImage) {
      const backData = backImage.split(',')[1] || backImage;
      const backMime = backImage.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';
      parts.push({
        inlineData: { mimeType: backMime, data: backData }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const resParts = candidates[0].content.parts;
      for (const part of resParts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const eraseObjectWithGemini = async (
  originalBase64: string,
  maskBase64: string
): Promise<string> => {
  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const originalData = originalBase64.split(',')[1] || originalBase64;
    const originalMime = originalBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';
    const maskData = maskBase64.split(',')[1] || maskBase64;
    const maskMime = maskBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: "Remove the object highlighted by the white area in the mask. Fill naturally." },
          { inlineData: { mimeType: originalMime, data: originalData } },
          { inlineData: { mimeType: maskMime, data: maskData } }
        ]
      },
      config: { responseModalities: [Modality.IMAGE] }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini Erasure Error:", error);
    throw error;
  }
};
