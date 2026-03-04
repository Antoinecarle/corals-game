import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import EntityList from '../components/EntityList';
import Modal from '../components/Modal';
import FormField, { TextInput, TextArea, Select } from '../components/FormField';
import { Sparkles, MessageSquare } from 'lucide-react';
import AssetGeneratorPanel from '../components/AssetGeneratorPanel';

interface NPC {
  id: string;
  slug: string;
  name: string;
  role: string;
  faction_id: string;
  faction_name: string;
  personality: any;
  published: boolean;
  sprite_url?: string;
}

interface Faction { id: string; name: string; }

const ROLES = ['marchand','capitaine','forgeron','tavernier','quest_giver','garde','civil','pirate','marin','mystique'];

export default function NPCManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<NPC | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiPanel, setAiPanel] = useState(false);
  const [dialogueTest, setDialogueTest] = useState(false);
  const [playerMsg, setPlayerMsg] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    slug: '', name: '', role: 'civil', faction_id: '',
    personality: { backstory: '', tone: '', vocabulary: [], motivations: [], secrets: [], quirks: [], greeting: '', catchphrase: '' },
    appearance: {}, trade_inventory: [], dialogue_style: {}, stats: {},
  });

  const { data: npcs = [] } = useQuery<NPC[]>({ queryKey: ['npcs'], queryFn: () => api('/npcs') });
  const { data: factions = [] } = useQuery<Faction[]>({ queryKey: ['factions'], queryFn: () => api('/factions') });

  const createMut = useMutation({
    mutationFn: (data: any) => api('/npcs', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['npcs'] }); setCreating(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: any) => api(`/npcs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['npcs'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/npcs/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['npcs'] }),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api(`/npcs/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ published }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['npcs'] }),
  });

  const openCreate = () => {
    setForm({ slug: '', name: '', role: 'civil', faction_id: '', personality: { backstory: '', tone: '', vocabulary: [], motivations: [], secrets: [], quirks: [], greeting: '', catchphrase: '' }, appearance: {}, trade_inventory: [], dialogue_style: {}, stats: {} });
    setCreating(true);
  };

  const openEdit = (npc: NPC) => {
    setForm({
      slug: npc.slug, name: npc.name, role: npc.role, faction_id: npc.faction_id || '',
      personality: npc.personality || {}, appearance: {}, trade_inventory: [], dialogue_style: {}, stats: {},
    });
    setEditing(npc);
  };

  const handleSave = () => {
    if (editing) updateMut.mutate({ id: editing.id, ...form });
    else createMut.mutate(form);
  };

  const generatePersonality = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const faction = factions.find(f => f.id === form.faction_id);
      const result = await api<any>('/ai/generate/npc-personality', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, role: form.role, faction: faction?.name }),
      });
      setAiResult(result);
    } catch (err: any) {
      setAiResult({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const testDialogue = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await api<any>('/ai/generate/npc-dialogue-test', {
        method: 'POST',
        body: JSON.stringify({ personality: form.personality, player_message: playerMsg }),
      });
      setAiResult(result);
    } catch (err: any) {
      setAiResult({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const applyVariant = (variant: any) => {
    setForm(f => ({ ...f, personality: { ...f.personality, ...variant } }));
    setAiPanel(false);
    setAiResult(null);
  };

  return (
    <>
      <EntityList
        title="NPCs"
        subtitle="Manage game NPCs with AI-powered personalities"
        items={npcs}
        getId={n => n.id}
        isPublished={n => n.published}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={n => { if (confirm(`Delete ${n.name}?`)) deleteMut.mutate(n.id); }}
        onPublish={(n, pub) => publishMut.mutate({ id: n.id, published: pub })}
        columns={[
          { key: 'sprite_url', label: '', render: n => n.sprite_url ? (
            <img src={n.sprite_url} alt={n.name} className="w-10 h-10 rounded object-cover bg-gray-800" />
          ) : (
            <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center">
              <span className="text-gray-600 text-xs">?</span>
            </div>
          )},
          { key: 'name', label: 'Name', render: n => <span className="font-medium text-white">{n.name}</span> },
          { key: 'slug', label: 'Slug' },
          { key: 'role', label: 'Role', render: n => (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">{n.role}</span>
          )},
          { key: 'faction_name', label: 'Faction', render: n => n.faction_name || <span className="text-gray-600">None</span> },
        ]}
      />

      <Modal
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); setAiPanel(false); setDialogueTest(false); setAiResult(null); }}
        title={editing ? `Edit ${editing.name}` : 'New NPC'}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v, slug: editing ? f.slug : v.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} placeholder="Dock Master Morgan" /></FormField>
            <FormField label="Slug"><TextInput value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} disabled={!!editing} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role">
              <Select value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} options={ROLES.map(r => ({ value: r, label: r }))} />
            </FormField>
            <FormField label="Faction">
              <Select value={form.faction_id} onChange={v => setForm(f => ({ ...f, faction_id: v }))} options={factions.map(f => ({ value: f.id, label: f.name }))} placeholder="Select faction..." />
            </FormField>
          </div>

          {/* Personality */}
          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Personality</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setDialogueTest(!dialogueTest); setAiPanel(false); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded transition-colors"
                >
                  <MessageSquare className="w-3 h-3" /> Test Dialogue
                </button>
                <button
                  onClick={() => { setAiPanel(!aiPanel); setDialogueTest(false); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded transition-colors"
                >
                  <Sparkles className="w-3 h-3" /> Generate with AI
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Backstory"><TextArea value={form.personality.backstory || ''} onChange={v => setForm(f => ({ ...f, personality: { ...f.personality, backstory: v } }))} rows={3} /></FormField>
              <FormField label="Tone"><TextInput value={form.personality.tone || ''} onChange={v => setForm(f => ({ ...f, personality: { ...f.personality, tone: v } }))} placeholder="gruff, poetic, nervous..." /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Greeting"><TextInput value={form.personality.greeting || ''} onChange={v => setForm(f => ({ ...f, personality: { ...f.personality, greeting: v } }))} placeholder="First line when meeting a player" /></FormField>
              <FormField label="Catchphrase"><TextInput value={form.personality.catchphrase || ''} onChange={v => setForm(f => ({ ...f, personality: { ...f.personality, catchphrase: v } }))} placeholder="Signature expression" /></FormField>
            </div>
          </div>

          {/* AI Panel */}
          {aiPanel && (
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-amber-400">AI Personality Generator</h3>
                <button onClick={generatePersonality} disabled={aiLoading || !form.name} className="px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white rounded transition-colors">
                  {aiLoading ? 'Generating...' : 'Generate 3 Variants'}
                </button>
              </div>
              {aiResult?.error && <p className="text-sm text-red-400">{aiResult.error}</p>}
              {aiResult?.variants && (
                <div className="grid grid-cols-3 gap-3">
                  {aiResult.variants.map((v: any, i: number) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2 text-xs">
                      <p className="text-gray-300 line-clamp-3">{v.backstory?.substring(0, 150)}...</p>
                      <p className="text-gray-500">Tone: {v.tone}</p>
                      <p className="text-amber-400 italic">"{v.catchphrase}"</p>
                      <button onClick={() => applyVariant(v)} className="w-full mt-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition-colors">
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dialogue Test */}
          {dialogueTest && (
            <div className="border border-purple-500/30 bg-purple-500/5 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-purple-400">Dialogue Test</h3>
              <div className="flex gap-2">
                <TextInput value={playerMsg} onChange={setPlayerMsg} placeholder="Type a player message..." />
                <button onClick={testDialogue} disabled={aiLoading || !playerMsg} className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded shrink-0 transition-colors">
                  {aiLoading ? '...' : 'Send'}
                </button>
              </div>
              {aiResult?.variants?.[0]?.dialogue && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-sm text-gray-300 italic">"{aiResult.variants[0].dialogue}"</p>
                </div>
              )}
            </div>
          )}

          {/* Visual Asset Generation */}
          <AssetGeneratorPanel
            entityType="npc"
            entityId={editing?.id}
            entityData={{ name: form.name, role: form.role, personality: form.personality }}
          />

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
