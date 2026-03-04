import path from 'path';

const MESHY_BASE = 'https://api.meshy.ai/openapi/v2';

function getApiKey(): string {
  const key = process.env.MESHY_API_KEY;
  if (!key) throw new Error('MESHY_API_KEY not configured');
  return key;
}

export interface MeshyTaskResult {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
  progress: number;
  model_urls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usdz?: string;
  };
  thumbnail_url?: string;
  error?: string;
}

export async function createTextTo3D(prompt: string, options?: {
  negative_prompt?: string;
  art_style?: string;
  ai_model?: string;
}): Promise<{ taskId: string }> {
  const res = await fetch(`${MESHY_BASE}/text-to-3d`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'preview',
      prompt,
      negative_prompt: options?.negative_prompt || 'ugly, blurry, low quality',
      art_style: options?.art_style || 'low-poly',
      ai_model: options?.ai_model || 'meshy-4',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meshy API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return { taskId: data.result };
}

export async function getTaskStatus(taskId: string): Promise<MeshyTaskResult> {
  const res = await fetch(`${MESHY_BASE}/text-to-3d/${taskId}`, {
    headers: { 'Authorization': `Bearer ${getApiKey()}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meshy API error: ${res.status} - ${err}`);
  }

  return res.json();
}
