const GEMINI_API_KEY = 'AIzaSyBu9gEWvohlb84z9f8v7R2l5NHgJSZ4fCc';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent';

export interface GeminiImageResult {
  base64: string;
  mimeType: string;
  text?: string;
}

export async function generateImage(prompt: string): Promise<GeminiImageResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || GEMINI_API_KEY;

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];

  let base64 = '';
  let mimeType = 'image/png';
  let text = '';

  for (const part of parts) {
    if (part.inlineData) {
      base64 = part.inlineData.data;
      mimeType = part.inlineData.mimeType || 'image/png';
    }
    if (part.text) {
      text = part.text;
    }
  }

  if (!base64) {
    throw new Error('Gemini did not return an image');
  }

  return { base64, mimeType, text };
}
