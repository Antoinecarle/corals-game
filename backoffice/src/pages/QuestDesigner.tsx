import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import EntityList from '../components/EntityList';
import Modal from '../components/Modal';
import FormField, { TextInput, TextArea, Select } from '../components/FormField';
import { Sparkles } from 'lucide-react';

interface Quest {
  id: string; slug: string; title: string; quest_type: string; difficulty: string;
  description: string; faction_name: string; npc_giver_name: string;
  min_level: number; max_level: number; published: boolean;
}

const QUEST_TYPES = ['fetch','kill','escort','explore','social','trade','chain','world'];
const DIFFICULTIES = ['easy','medium','hard','legendary'];

const DIFF_COLORS: Record<string, string> = {
  easy: 'bg-green-500/20 text-green-400', medium: 'bg-blue-500/20 text-blue-400',
  hard: 'bg-orange-500/20 text-orange-400', legendary: 'bg-red-500/20 text-red-400',
};

export default function QuestDesigner() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Quest | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    slug: '', title: '', quest_type: 'fetch', description: '', narrative_hook: '',
    objectives: [] as any[], rewards: {} as any, difficulty: 'medium',
    time_limit_minutes: null as number | null, faction_id: '', npc_giver_id: '',
    min_level: 1, max_level: 80, repeatable: false,
  });

  const { data: quests = [] } = useQuery<Quest[]>({ queryKey: ['quests'], queryFn: () => api('/quests') });
  const { data: factions = [] } = useQuery<any[]>({ queryKey: ['factions'], queryFn: () => api('/factions') });
  const { data: npcs = [] } = useQuery<any[]>({ queryKey: ['npcs'], queryFn: () => api('/npcs') });

  const createMut = useMutation({
    mutationFn: (data: any) => api('/quests', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quests'] }); setCreating(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: any) => api(`/quests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quests'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/quests/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quests'] }),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api(`/quests/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ published }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quests'] }),
  });

  const openCreate = () => {
    setForm({ slug: '', title: '', quest_type: 'fetch', description: '', narrative_hook: '', objectives: [], rewards: {}, difficulty: 'medium', time_limit_minutes: null, faction_id: '', npc_giver_id: '', min_level: 1, max_level: 80, repeatable: false });
    setCreating(true);
  };

  const openEdit = (q: Quest) => {
    setForm({ slug: q.slug, title: q.title, quest_type: q.quest_type, description: q.description || '', narrative_hook: '', objectives: [], rewards: {}, difficulty: q.difficulty, time_limit_minutes: null, faction_id: '', npc_giver_id: '', min_level: q.min_level, max_level: q.max_level, repeatable: false });
    setEditing(q);
  };

  const generateQuest = async () => {
    setAiLoading(true);
    try {
      const npc = npcs.find((n: any) => n.id === form.npc_giver_id);
      const faction = factions.find((f: any) => f.id === form.faction_id);
      const result = await api<any>('/ai/generate/quest', {
        method: 'POST', body: JSON.stringify({
          npc_name: npc?.name, npc_role: npc?.role, faction: faction?.name,
          player_level: `${form.min_level}-${form.max_level}`, quest_type: form.quest_type,
        }),
      });
      if (result.variants?.[0]) {
        const v = result.variants[0];
        setForm(f => ({
          ...f, title: v.title || f.title, quest_type: v.quest_type || f.quest_type,
          description: v.description || f.description, narrative_hook: v.narrative_hook || f.narrative_hook,
          objectives: v.objectives || f.objectives, rewards: v.rewards || f.rewards,
          difficulty: v.difficulty || f.difficulty, time_limit_minutes: v.time_limit_minutes,
          min_level: v.min_level || f.min_level, max_level: v.max_level || f.max_level,
          slug: f.slug || (v.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        }));
      }
    } catch {} finally { setAiLoading(false); }
  };

  const handleSave = () => {
    const data = { ...form, faction_id: form.faction_id || null, npc_giver_id: form.npc_giver_id || null };
    if (editing) updateMut.mutate({ id: editing.id, ...data });
    else createMut.mutate(data);
  };

  return (
    <>
      <EntityList
        title="Quests"
        subtitle="Design and manage quests"
        items={quests}
        getId={q => q.id}
        isPublished={q => q.published}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={q => { if (confirm(`Delete ${q.title}?`)) deleteMut.mutate(q.id); }}
        onPublish={(q, pub) => publishMut.mutate({ id: q.id, published: pub })}
        columns={[
          { key: 'title', label: 'Title', render: q => <span className="font-medium text-white">{q.title}</span> },
          { key: 'quest_type', label: 'Type', render: q => <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{q.quest_type}</span> },
          { key: 'difficulty', label: 'Difficulty', render: q => (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${DIFF_COLORS[q.difficulty] || ''}`}>{q.difficulty}</span>
          )},
          { key: 'level', label: 'Level', render: q => <span className="text-xs text-gray-400">{q.min_level}-{q.max_level}</span> },
          { key: 'npc_giver_name', label: 'Giver', render: q => q.npc_giver_name || <span className="text-gray-600">-</span> },
        ]}
      />

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit Quest` : 'New Quest'} wide>
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <button onClick={generateQuest} disabled={aiLoading} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded transition-colors">
              <Sparkles className="w-3 h-3" /> {aiLoading ? 'Generating...' : 'Generate with AI'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Title"><TextInput value={form.title} onChange={v => setForm(f => ({ ...f, title: v, slug: editing ? f.slug : v.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} /></FormField>
            <FormField label="Slug"><TextInput value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} disabled={!!editing} /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Type"><Select value={form.quest_type} onChange={v => setForm(f => ({ ...f, quest_type: v }))} options={QUEST_TYPES.map(t => ({ value: t, label: t }))} /></FormField>
            <FormField label="Difficulty"><Select value={form.difficulty} onChange={v => setForm(f => ({ ...f, difficulty: v }))} options={DIFFICULTIES.map(d => ({ value: d, label: d }))} /></FormField>
            <FormField label="NPC Giver"><Select value={form.npc_giver_id} onChange={v => setForm(f => ({ ...f, npc_giver_id: v }))} options={npcs.map((n: any) => ({ value: n.id, label: n.name }))} placeholder="Select NPC..." /></FormField>
          </div>
          <FormField label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} rows={3} /></FormField>
          <FormField label="Narrative Hook"><TextArea value={form.narrative_hook} onChange={v => setForm(f => ({ ...f, narrative_hook: v }))} rows={2} placeholder="How the NPC introduces the quest..." /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Min Level">
              <input type="number" value={form.min_level} onChange={e => setForm(f => ({ ...f, min_level: parseInt(e.target.value) || 1 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </FormField>
            <FormField label="Max Level">
              <input type="number" value={form.max_level} onChange={e => setForm(f => ({ ...f, max_level: parseInt(e.target.value) || 80 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setCreating(false); setEditing(null); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
              {editing ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
