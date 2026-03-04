import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../db/index.js';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = path.resolve(__dirname, '../../storage');

export async function downloadAndStore(
  url: string,
  meta: { entityType: string; prompt?: string; service?: string }
): Promise<{ assetId: string; filePath: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = url.includes('.glb') ? '.glb' : url.includes('.fbx') ? '.fbx' : '.glb';
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(STORAGE_ROOT, 'models', meta.entityType);

  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);

  const relativePath = path.relative(STORAGE_ROOT, filePath);

  const result = await query(
    `INSERT INTO assets (filename, asset_type, mime_type, file_size, file_path, generation_prompt, generation_service)
     VALUES ($1, 'model_3d', 'model/gltf-binary', $2, $3, $4, $5) RETURNING id`,
    [filename, buffer.length, relativePath, meta.prompt || null, meta.service || 'meshy']
  );

  return { assetId: result.rows[0].id, filePath: relativePath };
}

export async function storeBase64Image(
  base64: string,
  meta: { entityType: string; mimeType?: string; prompt?: string; service?: string }
): Promise<{ assetId: string; filePath: string }> {
  const buffer = Buffer.from(base64, 'base64');
  const ext = meta.mimeType === 'image/jpeg' ? '.jpg' : '.png';
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(STORAGE_ROOT, 'images', meta.entityType);

  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);

  const relativePath = path.relative(STORAGE_ROOT, filePath);

  const result = await query(
    `INSERT INTO assets (filename, asset_type, mime_type, file_size, file_path, generation_prompt, generation_service)
     VALUES ($1, 'sprite', $2, $3, $4, $5, $6) RETURNING id`,
    [filename, meta.mimeType || 'image/png', buffer.length, relativePath, meta.prompt || null, meta.service || 'gemini']
  );

  return { assetId: result.rows[0].id, filePath: relativePath };
}

export async function linkToEntity(
  assetId: string,
  entityType: string,
  entityId: string,
  field: string
): Promise<void> {
  const tableMap: Record<string, string> = {
    abyssaux: 'abyssaux',
    item: 'items',
    npc: 'npcs',
    ship: 'ship_classes',
  };

  const table = tableMap[entityType];
  if (!table) throw new Error(`Unknown entity type: ${entityType}`);

  const allowedFields = ['sprite_asset_id', 'model_asset_id', 'icon_asset_id'];
  if (!allowedFields.includes(field)) throw new Error(`Invalid field: ${field}`);

  await query(`UPDATE ${table} SET ${field} = $1, updated_at = NOW() WHERE id = $2`, [assetId, entityId]);
}
