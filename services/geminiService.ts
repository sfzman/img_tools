
import { GoogleGenAI, Modality } from "@google/genai";

// Initialize the client
// The API key is guaranteed to be in process.env.API_KEY by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export type ConsistencyMode = 'strict' | 'expression' | 'style-transfer' | 'extraction';

/**
 * Generates a specific view of a character based on a reference image.
 * Uses gemini-2.5-flash-image for efficient image editing/generation.
 */
export const generateCharacterView = async (
  base64Image: string,
  promptInstruction: string,
  mode: ConsistencyMode = 'strict'
): Promise<string> => {
  try {
    // Clean the base64 string to get just the data
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';

    let consistencyPrompt = "";
    
    switch (mode) {
      case 'strict':
        consistencyPrompt = `
        IMPORTANT CONSISTENCY RULES:
        1. Keep the character's identity, gender, ethnicity, and body type EXACTLY the same as the reference image.
        2. Keep the clothing details, colors, and accessories EXACTLY the same.
        3. Keep the hair style and color EXACTLY the same.
        4. Render on a plain, neutral background.
        5. High quality, detailed character design.
        `;
        break;
      
      case 'expression':
        consistencyPrompt = `
        IMPORTANT CONSISTENCY RULES:
        1. Keep the character's identity, gender, ethnicity, and hair style EXACTLY the same as the reference.
        2. Keep clothing and accessories EXACTLY the same.
        3. CHANGE ONLY THE FACIAL EXPRESSION as requested in the prompt.
        4. Render on a plain, neutral background.
        `;
        break;

      case 'style-transfer': // For Chibi
        consistencyPrompt = `
        IMPORTANT STYLE TRANSFER RULES:
        1. Keep the character's recognizable features (Hair color, eye color, key clothing colors/patterns).
        2. CHANGE the body proportions to a "Q-version" / Chibi style (2-3 heads tall, large head, small body).
        3. CHANGE the art style to be cute and illustrated.
        4. Render on a plain, neutral background.
        `;
        break;

      case 'extraction': // For Remove BG (simulated via generation on white)
        consistencyPrompt = `
        IMPORTANT EXTRACTION RULES:
        1. COPY the character EXACTLY as they appear in the reference image.
        2. DO NOT CHANGE pose, lighting, or details.
        3. PLACE the character on a PURE WHITE background (#FFFFFF).
        4. Remove all original background elements completely.
        `;
        break;
    }

    const finalPrompt = `${promptInstruction} \n\n ${consistencyPrompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: finalPrompt
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
      }
    });

    // Iterate through candidates and parts to find the image
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
    console.error("Gemini API Error:", error);
    throw error;
  }
};

/**
 * Erases objects from an image using Gemini 2.5 Flash Image ("nano banana").
 * We send two images:
 * 1. The original image.
 * 2. A mask image (black background, white object) indicating what to remove.
 */
export const eraseObjectWithGemini = async (
  originalBase64: string,
  maskBase64: string
): Promise<string> => {
  try {
    const originalData = originalBase64.split(',')[1] || originalBase64;
    const originalMime = originalBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';

    const maskData = maskBase64.split(',')[1] || maskBase64;
    const maskMime = maskBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';

    const prompt = `
    I have provided two images. 
    The first image is the original picture. 
    The second image is a black and white mask where the white area represents an object I want to remove.
    
    Task: Remove the object highlighted by the white area in the mask from the original image. 
    Fill in the erased area naturally to match the surrounding background (inpainting). 
    Do not change anything else in the image. Return the full edited image.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: originalMime, data: originalData } },
          { inlineData: { mimeType: maskMime, data: maskData } }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE],
      }
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
