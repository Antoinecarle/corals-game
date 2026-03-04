import { Router, Request, Response } from 'express';
import { generateJSON, generateChat, MODEL } from '../services/openai.js';
import { CORALS_LORE_CONTEXT } from '../prompts/lore-context.js';
import { query } from '../db/index.js';
import { logChange } from './changelog.js';
import { createTextTo3D, getTaskStatus } from '../services/meshy.js';
import { generateImage } from '../services/gemini-image.js';
import { downloadAndStore, storeBase64Image, linkToEntity } from '../services/asset-pipeline.js';

const router = Router();

async function trackJob(
  jobType: string,
  inputData: any,
  adminId: string,
  fn: () => Promise<any>,
  entityType?: string,
  entityId?: string
) {
  const job = await query(
    `INSERT INTO generation_jobs (job_type, service, input_data, status, entity_type, entity_id, created_by)
     VALUES ($1, $2, $3, 'processing', $4, $5, $6) RETURNING id`,
    [jobType, 'openai', JSON.stringify(inputData), entityType, entityId, adminId]
  );
  const jobId = job.rows[0].id;

  try {
    const result = await fn();
    await query(
      `UPDATE generation_jobs SET status = 'completed', output_data = $1, token_usage = $2, completed_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(result.variants || result), JSON.stringify(result.usage || {}), jobId]
    );
    return { jobId, ...result };
  } catch (err: any) {
    await query(
      `UPDATE generation_jobs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
      [err.message, jobId]
    );
    throw err;
  }
}

// Generate NPC Personality (3 variants)
router.post('/generate/npc-personality', async (req: Request, res: Response) => {
  try {
    const { name, role, faction, zone, traits } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'name and role required' });

    const result = await trackJob('npc_personality', req.body, req.admin!.adminId, () =>
      generateJSON(
        CORALS_LORE_CONTEXT + `\nYou are a game designer creating NPC personalities for CORALS.`,
        `Create a detailed NPC personality for:
Name: ${name}
Role: ${role}
${faction ? `Faction: ${faction}` : ''}
${zone ? `Zone: ${zone}` : ''}
${traits ? `Desired traits: ${traits.join(', ')}` : ''}

Return JSON with:
{
  "backstory": "2-3 paragraph backstory fitting the CORALS lore",
  "tone": "how they speak (e.g. gruff, poetic, nervous)",
  "vocabulary": ["list of words/expressions they use often"],
  "motivations": ["what drives them"],
  "secrets": ["hidden information they might reveal"],
  "quirks": ["behavioral quirks"],
  "greeting": "example first line when meeting a player",
  "catchphrase": "signature expression"
}`
      )
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test NPC Dialogue
router.post('/generate/npc-dialogue-test', async (req: Request, res: Response) => {
  try {
    const { personality, player_message, player_context } = req.body;
    if (!personality || !player_message) return res.status(400).json({ error: 'personality and player_message required' });

    const result = await trackJob('dialogue_test', req.body, req.admin!.adminId, async () => {
      const chatResult = await generateChat([
        { role: 'system', content: CORALS_LORE_CONTEXT + `\n\nYou are an NPC in CORALS.\n\nPersonality:\n${JSON.stringify(personality, null, 2)}\n\n${player_context ? `Player context: ${player_context}` : ''}\n\nRespond in character. Keep response under 200 words.` },
        { role: 'user', content: player_message },
      ]);
      return { variants: [{ dialogue: chatResult.text }], usage: chatResult.usage };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Item Stats
router.post('/generate/item-stats', async (req: Request, res: Response) => {
  try {
    const { name, item_type, rarity, slot, description } = req.body;
    if (!name || !item_type) return res.status(400).json({ error: 'name and item_type required' });

    const result = await trackJob('item_stats', req.body, req.admin!.adminId, () =>
      generateJSON(
        CORALS_LORE_CONTEXT + `\nYou are a game balance designer for CORALS.`,
        `Generate balanced stats for this item:
Name: ${name}
Type: ${item_type}
Rarity: ${rarity || 'common'}
${slot ? `Slot: ${slot}` : ''}
${description ? `Description: ${description}` : ''}

Return JSON:
{
  "stats": {
    "attack": 0, "defense": 0, "speed": 0, "hp": 0,
    "coral_power": 0, "corruption_resistance": 0
  },
  "effects": [{"name": "effect name", "description": "what it does", "value": 0}],
  "sell_price": 0,
  "buy_price": 0,
  "flavor_text": "atmospheric flavor text"
}

Scale stats based on rarity: common(1-10), uncommon(10-25), rare(25-50), epic(50-80), legendary(80-120), coral ranks(varies).`
      )
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Item Description
router.post('/generate/item-description', async (req: Request, res: Response) => {
  try {
    const { name, item_type, rarity, coral_type } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const result = await trackJob('item_description', req.body, req.admin!.adminId, () =>
      generateJSON(
        CORALS_LORE_CONTEXT + `\nYou are a lore writer for CORALS.`,
        `Write a description and flavor text for this item:
Name: ${name}
Type: ${item_type || 'unknown'}
Rarity: ${rarity || 'common'}
${coral_type ? `Coral type: ${coral_type}` : ''}

Return JSON:
{
  "description": "functional description (1-2 sentences)",
  "flavor_text": "atmospheric/lore flavor text (1-2 sentences, italic style)",
  "lore_connection": "how it connects to the CORALS lore"
}`
      )
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Full Quest
router.post('/generate/quest', async (req: Request, res: Response) => {
  try {
    const { npc_name, npc_role, faction, zone, player_level, quest_type } = req.body;

    const result = await trackJob('quest', req.body, req.admin!.adminId, () =>
      generateJSON(
        CORALS_LORE_CONTEXT + `\nYou are a quest designer for CORALS.`,
        `Create a complete quest:
${npc_name ? `Quest giver NPC: ${npc_name} (${npc_role || 'unknown role'})` : ''}
${faction ? `Faction: ${faction}` : ''}
${zone ? `Zone: ${zone}` : ''}
Player level range: ${player_level || '1-20'}
${quest_type ? `Quest type: ${quest_type}` : ''}

Return JSON:
{
  "title": "quest title",
  "quest_type": "fetch|kill|escort|explore|social|trade",
  "description": "full quest description for the player",
  "narrative_hook": "how the NPC introduces the quest (in-character dialogue)",
  "objectives": [
    {"type": "kill|collect|talk|reach|defend", "target": "what", "count": 1, "description": "objective text"}
  ],
  "rewards": {"xp": 0, "gold": 0, "items": [], "reputation": 0},
  "difficulty": "easy|medium|hard",
  "time_limit_minutes": null,
  "min_level": 1,
  "max_level": 80
}`
      )
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Abyssal Design
router.post('/generate/abyssal-design', async (req: Request, res: Response) => {
  try {
    const { size_class, coral_type, zone } = req.body;

    const result = await trackJob('abyssal_design', req.body, req.admin!.adminId, () =>
      generateJSON(
        CORALS_LORE_CONTEXT + `\nYou are a creature designer for CORALS.`,
        `Design an Abyssal creature:
Size class: ${size_class || 'sentinelle'}
Coral type: ${coral_type || 'encre'}
${zone ? `Zone: ${zone}` : ''}

Return JSON:
{
  "name": "creature name in French",
  "description": "visual description (appearance, colors, texture, movement)",
  "behavior": {
    "aggression": "passive|defensive|aggressive|territorial",
    "patrol_pattern": "roam|stationary|path|ambush",
    "special_trigger": "what makes it attack"
  },
  "stats": {"hp": 0, "attack": 0, "defense": 0, "speed": 0},
  "abilities": [{"name": "ability name", "description": "what it does", "cooldown_seconds": 0}],
  "loot_table": [{"item_type": "material|fragment|currency", "name": "drop name", "drop_rate": 0.5}],
  "xp_reward": 0,
  "gold_reward": 0,
  "visual_prompt": "prompt for generating 3D model (for Meshy AI)"
}`
      )
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate World Event
router.post('/generate/world-event', async (req: Request, res: Response) => {
  try {
    const { event_type, zones } = req.body;

    const result = await trackJob('world_event', req.body, req.admin!.adminId, () =>
      generateJSON(
        CORALS_LORE_CONTEXT + `\nYou are a world event designer for CORALS.`,
        `Design a world event:
Type: ${event_type || 'tempete'}
${zones ? `Affected zones: ${zones.join(', ')}` : ''}

Return JSON:
{
  "name": "event name in French",
  "description": "public event description players will see",
  "narrative": "lore narrative explaining the event",
  "duration_minutes": 60,
  "effects": {"weather": "", "visibility": "", "mob_modifier": "", "special": ""},
  "spawn_waves": [{"time_offset_minutes": 0, "abyssal_type": "", "count": 5}],
  "rewards": {"xp_multiplier": 1.5, "special_drops": []},
  "min_players": 1
}`
      )
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generic Variants Generator
router.post('/generate/variants', async (req: Request, res: Response) => {
  try {
    const { field_name, context, current_value, entity_type } = req.body;
    if (!field_name) return res.status(400).json({ error: 'field_name required' });

    const result = await trackJob('variants', req.body, req.admin!.adminId, () =>
      generateJSON(
        CORALS_LORE_CONTEXT + `\nYou are a creative content writer for the CORALS game.`,
        `Generate 3 creative variants for the "${field_name}" field of a ${entity_type || 'game entity'}.
${current_value ? `Current value: ${current_value}` : ''}
${context ? `Context: ${JSON.stringify(context)}` : ''}

Return JSON:
{
  "variants": [
    {"value": "variant 1", "rationale": "why this works"},
    {"value": "variant 2", "rationale": "why this works"},
    {"value": "variant 3", "rationale": "why this works"}
  ]
}`,
        1 // Single call, 3 variants in output
      )
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generation jobs history
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const { status, job_type } = req.query;
    let sql = `SELECT j.*, a.username as admin_username FROM generation_jobs j
               LEFT JOIN bo_admins a ON a.id = j.created_by WHERE 1=1`;
    const params: any[] = [];

    if (status) { params.push(status); sql += ` AND j.status = $${params.length}`; }
    if (job_type) { params.push(job_type); sql += ` AND j.job_type = $${params.length}`; }

    sql += ' ORDER BY j.created_at DESC LIMIT 50';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Visual Prompt (optimized prompt for image/3D generation)
router.post('/generate/visual-prompt', async (req: Request, res: Response) => {
  try {
    const { entity_type, entity_data, target } = req.body;
    if (!entity_type || !entity_data) return res.status(400).json({ error: 'entity_type and entity_data required' });

    const result = await trackJob('visual_prompt', req.body, req.admin!.adminId, () =>
      generateJSON(
        CORALS_LORE_CONTEXT + `\nYou are an expert at writing prompts for AI image/3D generation.`,
        `Create an optimized ${target === '3d' ? '3D model generation (for Meshy AI, low-poly game asset style)' : '2D concept art generation (for Gemini, digital painting style)'} prompt for this ${entity_type}:

${JSON.stringify(entity_data, null, 2)}

Return JSON:
{
  "prompt": "detailed generation prompt optimized for ${target === '3d' ? 'low-poly 3D model generation' : '2D concept art'}",
  "negative_prompt": "things to avoid in the generation"
}`,
        1
      ),
      entity_type,
      entity_data.id
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Launch async 3D generation via Meshy
router.post('/generate/visual-3d', async (req: Request, res: Response) => {
  try {
    const { entity_type, entity_id, prompt, negative_prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const { taskId } = await createTextTo3D(prompt, { negative_prompt });

    const job = await query(
      `INSERT INTO generation_jobs (job_type, service, input_data, status, entity_type, entity_id, created_by, external_task_id)
       VALUES ('text_to_3d', 'meshy', $1, 'processing', $2, $3, $4, $5) RETURNING id`,
      [JSON.stringify({ prompt, negative_prompt, entity_type }), entity_type, entity_id || null, req.admin!.adminId, taskId]
    );

    res.json({ jobId: job.rows[0].id, externalTaskId: taskId, status: 'processing' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Synchronous 2D image generation via Gemini
router.post('/generate/visual-2d', async (req: Request, res: Response) => {
  try {
    const { entity_type, entity_id, prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    const job = await query(
      `INSERT INTO generation_jobs (job_type, service, input_data, status, entity_type, entity_id, created_by)
       VALUES ('image_gen', 'gemini', $1, 'processing', $2, $3, $4) RETURNING id`,
      [JSON.stringify({ prompt, entity_type }), entity_type, entity_id || null, req.admin!.adminId]
    );
    const jobId = job.rows[0].id;

    try {
      const imageResult = await generateImage(prompt);
      const { assetId, filePath } = await storeBase64Image(imageResult.base64, {
        entityType: entity_type || 'misc',
        mimeType: imageResult.mimeType,
        prompt,
        service: 'gemini',
      });

      await query(
        `UPDATE generation_jobs SET status = 'completed', output_data = $1, completed_at = NOW() WHERE id = $2`,
        [JSON.stringify({ asset_id: assetId, file_path: filePath }), jobId]
      );

      res.json({ jobId, asset: { id: assetId, file_path: `/storage/${filePath}` } });
    } catch (genErr: any) {
      await query(
        `UPDATE generation_jobs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
        [genErr.message, jobId]
      );
      throw genErr;
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Poll job status (for Meshy async jobs, downloads GLB when done)
router.get('/jobs/:jobId/status', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const jobResult = await query('SELECT * FROM generation_jobs WHERE id = $1', [jobId]);
    if (jobResult.rows.length === 0) return res.status(404).json({ error: 'Job not found' });

    const job = jobResult.rows[0];

    if (job.status === 'completed' || job.status === 'failed') {
      return res.json({
        status: job.status,
        progress: 100,
        asset: job.output_data,
        error: job.error_message,
      });
    }

    // For Meshy jobs, poll the external API
    if (job.service === 'meshy' && job.external_task_id) {
      try {
        const meshyStatus = await getTaskStatus(job.external_task_id);

        if (meshyStatus.status === 'SUCCEEDED' && meshyStatus.model_urls?.glb) {
          // Download and store the model
          const { assetId, filePath } = await downloadAndStore(meshyStatus.model_urls.glb, {
            entityType: job.entity_type || 'misc',
            prompt: job.input_data?.prompt,
            service: 'meshy',
          });

          await query(
            `UPDATE generation_jobs SET status = 'completed', output_data = $1, completed_at = NOW() WHERE id = $2`,
            [JSON.stringify({ asset_id: assetId, file_path: filePath, thumbnail_url: meshyStatus.thumbnail_url }), jobId]
          );

          return res.json({
            status: 'completed',
            progress: 100,
            asset: { id: assetId, file_path: `/storage/${filePath}`, thumbnail_url: meshyStatus.thumbnail_url },
          });
        }

        if (meshyStatus.status === 'FAILED') {
          await query(
            `UPDATE generation_jobs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
            [meshyStatus.error || 'Meshy generation failed', jobId]
          );
          return res.json({ status: 'failed', progress: 0, error: meshyStatus.error });
        }

        return res.json({
          status: 'processing',
          progress: meshyStatus.progress || 0,
        });
      } catch (pollErr: any) {
        return res.json({ status: 'processing', progress: 0, error: pollErr.message });
      }
    }

    res.json({ status: job.status, progress: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Link an asset to an entity
router.post('/link-asset', async (req: Request, res: Response) => {
  try {
    const { asset_id, entity_type, entity_id, field } = req.body;
    if (!asset_id || !entity_type || !entity_id || !field) {
      return res.status(400).json({ error: 'asset_id, entity_type, entity_id, and field are required' });
    }

    await linkToEntity(asset_id, entity_type, entity_id, field);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
