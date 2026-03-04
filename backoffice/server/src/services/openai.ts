import OpenAI from 'openai';

const MODEL = 'gpt-5-mini-2025-08-07';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export interface AIGenerationResult {
  variants: any[];
  usage: { input_tokens: number; output_tokens: number };
  model: string;
}

export async function generateJSON(
  systemPrompt: string,
  userPrompt: string,
  numVariants: number = 3
): Promise<AIGenerationResult> {
  const ai = getClient();
  const variants: any[] = [];
  let totalInput = 0;
  let totalOutput = 0;

  for (let i = 0; i < numVariants; i++) {
    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt + '\n\nYou must respond ONLY with valid JSON. No markdown. No explanation. No extra text.' },
        { role: 'user', content: userPrompt + (numVariants > 1 ? `\n\nThis is variant ${i + 1} of ${numVariants}. Make each variant distinct and creative.` : '') },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      try {
        variants.push(JSON.parse(content));
      } catch {
        variants.push({ raw: content });
      }
    }

    if (response.usage) {
      totalInput += response.usage.prompt_tokens;
      totalOutput += response.usage.completion_tokens;
    }
  }

  return {
    variants,
    usage: { input_tokens: totalInput, output_tokens: totalOutput },
    model: MODEL,
  };
}

export async function generateChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
  const ai = getClient();
  const response = await ai.chat.completions.create({
    model: MODEL,
    messages,
    max_completion_tokens: 1000,
  });

  return {
    text: response.choices[0]?.message?.content || '',
    usage: {
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0,
    },
  };
}

export { MODEL };
