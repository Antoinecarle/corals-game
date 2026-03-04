import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import EntityList from '../components/EntityList';
import Modal from '../components/Modal';
import FormField, { TextInput, TextArea, Select } from '../components/FormField';
import { Sparkles } from 'lucide-react';
import AssetGeneratorPanel from '../components/AssetGeneratorPanel';

interface Abyssal {
  id: string; slug: string; name: string; size_class: string; coral_type: string;
  description: string; xp_reward: number; gold_reward: number; published: boolean;
  sprite_url?: string; model_url?: string;
}

const SIZE_CLASSES = ['essaim','sentinelle','colosse','titan','primordial'];
const CORAL_TYPES = ['encre','flux','cristal','braise','voile','chair','echo'];

const SIZE_COLORS: Record<string, string> = {
  essaim: 'bg-green-500/20 text-green-400', sentinelle: 'bg-blue-500/20 text-blue-400',
  colosse: 'bg-purple-500/20 text-purple-400', titan: 'bg-orange-500/20 text-orange-400',
  primordial: 'bg-red-500/20 text-red-400',
};

export default function AbyssauxManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Abyssal | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    slug: '', name: '', size_class: 'sentinelle', coral_type: 'encre',
    description: '', behavior: {} as any, stats: {} as any,
    loot_table: [] as any[], abilities: [] as any[],
    xp_reward: 0, gold_reward: 0,
  });

  const { data: abyssaux = [] } = useQuery<Abyssal[]>({ queryKey: ['abyssaux'], queryFn: () => api('/abyssaux') });

  const createMut = useMutation({
    mutationFn: (data: any) => api('/abyssaux', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['abyssaux'] }); setCreating(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: any) => api(`/abyssaux/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['abyssaux'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/abyssaux/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['abyssaux'] }),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api(`/abyssaux/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ published }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['abyssaux'] }),
  });

  const openCreate = () => {
    setForm({ slug: '', name: '', size_class: 'sentinelle', coral_type: 'encre', description: '', behavior: {}, stats: {}, loot_table: [], abilities: [], xp_reward: 0, gold_reward: 0 });
    setCreating(true);
  };

  const openEdit = (a: Abyssal) => {
    setForm({ slug: a.slug, name: a.name, size_class: a.size_class, coral_type: a.coral_type, description: a.description || '', behavior: {}, stats: {}, loot_table: [], abilities: [], xp_reward: a.xp_reward, gold_reward: a.gold_reward });
    setEditing(a);
  };

  const generateDesign = async () => {
    setAiLoading(true);
    try {
      const result = await api<any>('/ai/generate/abyssal-design', {
        method: 'POST', body: JSON.stringify({ size_class: form.size_class, coral_type: form.coral_type }),
      });
      if (result.variants?.[0]) {
        const v = result.variants[0];
        setForm(f => ({
          ...f, name: v.name || f.name, description: v.description || f.description,
          behavior: v.behavior || f.behavior, stats: v.stats || f.stats,
          abilities: v.abilities || f.abilities, loot_table: v.loot_table || f.loot_table,
          xp_reward: v.xp_reward || f.xp_reward, gold_reward: v.gold_reward || f.gold_reward,
          slug: f.slug || (v.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        }));
      }
    } catch {} finally { setAiLoading(false); }
  };

  const handleSave = () => {
    if (editing) updateMut.mutate({ id: editing.id, ...form });
    else createMut.mutate(form);
  };

  return (
    <>
      <EntityList
        title="Abyssaux"
        subtitle="Sea creatures and monsters"
        items={abyssaux}
        getId={a => a.id}
        isPublished={a => a.published}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={a => { if (confirm(`Delete ${a.name}?`)) deleteMut.mutate(a.id); }}
        onPublish={(a, pub) => publishMut.mutate({ id: a.id, published: pub })}
        columns={[
          { key: 'sprite_url', label: '', render: a => a.sprite_url ? (
            <img src={a.sprite_url} alt={a.name} className="w-10 h-10 rounded object-cover bg-gray-800" />
          ) : (
            <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center">
              <span className="text-gray-600 text-xs">?</span>
            </div>
          )},
          { key: 'name', label: 'Name', render: a => <span className="font-medium text-white">{a.name}</span> },
          { key: 'size_class', label: 'Size', render: a => (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${SIZE_COLORS[a.size_class] || ''}`}>{a.size_class}</span>
          )},
          { key: 'coral_type', label: 'Coral', render: a => <span className="text-xs text-purple-400">{a.coral_type}</span> },
          { key: 'xp_reward', label: 'XP' },
        ]}
      />

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit ${editing.name}` : 'New Abyssal'} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v, slug: editing ? f.slug : v.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} /></FormField>
            <FormField label="Slug"><TextInput value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} disabled={!!editing} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Size Class"><Select value={form.size_class} onChange={v => setForm(f => ({ ...f, size_class: v }))} options={SIZE_CLASSES.map(s => ({ value: s, label: s }))} /></FormField>
            <FormField label="Coral Type"><Select value={form.coral_type} onChange={v => setForm(f => ({ ...f, coral_type: v }))} options={CORAL_TYPES.map(c => ({ value: c, label: c }))} /></FormField>
          </div>
          <FormField label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} rows={3} /></FormField>

          <div className="flex items-center justify-end">
            <button onClick={generateDesign} disabled={aiLoading} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded transition-colors">
              <Sparkles className="w-3 h-3" /> {aiLoading ? 'Generating...' : 'Generate Full Design with AI'}
            </button>
          </div>

          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-white">Stats</h3>
            <div className="grid grid-cols-4 gap-3">
              {['hp', 'attack', 'defense', 'speed'].map(stat => (
                <FormField key={stat} label={stat}>
                  <input type="number" value={form.stats[stat] || 0} onChange={e => setForm(f => ({ ...f, stats: { ...f.stats, [stat]: parseInt(e.target.value) || 0 } }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </FormField>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="XP Reward">
              <input type="number" value={form.xp_reward} onChange={e => setForm(f => ({ ...f, xp_reward: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </FormField>
            <FormField label="Gold Reward">
              <input type="number" value={form.gold_reward} onChange={e => setForm(f => ({ ...f, gold_reward: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </FormField>
          </div>

          {/* Visual Asset Generation */}
          <AssetGeneratorPanel
            entityType="abyssaux"
            entityId={editing?.id}
            entityData={{ name: form.name, size_class: form.size_class, coral_type: form.coral_type, description: form.description, stats: form.stats }}
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
