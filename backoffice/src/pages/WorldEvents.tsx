import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import EntityList from '../components/EntityList';
import Modal from '../components/Modal';
import FormField, { TextInput, TextArea, Select } from '../components/FormField';
import { Sparkles } from 'lucide-react';

interface WorldEvent {
  id: string; slug: string; name: string; event_type: string;
  duration_minutes: number; min_players: number; published: boolean;
}

const EVENT_TYPES = ['maree_noire','breche_brume','eveil','jugement','festival','tempete','raid','commerce'];

const EVENT_COLORS: Record<string, string> = {
  maree_noire: 'bg-purple-500/20 text-purple-400', breche_brume: 'bg-gray-500/20 text-gray-400',
  eveil: 'bg-amber-500/20 text-amber-400', jugement: 'bg-red-500/20 text-red-400',
  festival: 'bg-green-500/20 text-green-400', tempete: 'bg-blue-500/20 text-blue-400',
  raid: 'bg-orange-500/20 text-orange-400', commerce: 'bg-cyan-500/20 text-cyan-400',
};

export default function WorldEvents() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<WorldEvent | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    slug: '', name: '', event_type: 'tempete', description: '', narrative: '',
    duration_minutes: 60, min_players: 1, cooldown_hours: 24,
  });

  const { data: events = [] } = useQuery<WorldEvent[]>({ queryKey: ['world-events'], queryFn: () => api('/world-events') });

  const createMut = useMutation({
    mutationFn: (data: any) => api('/world-events', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['world-events'] }); setCreating(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: any) => api(`/world-events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['world-events'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/world-events/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['world-events'] }),
  });

  const openCreate = () => {
    setForm({ slug: '', name: '', event_type: 'tempete', description: '', narrative: '', duration_minutes: 60, min_players: 1, cooldown_hours: 24 });
    setCreating(true);
  };

  const openEdit = (e: WorldEvent) => {
    setForm({ slug: e.slug, name: e.name, event_type: e.event_type, description: '', narrative: '', duration_minutes: e.duration_minutes, min_players: e.min_players, cooldown_hours: 24 });
    setEditing(e);
  };

  const generateEvent = async () => {
    setAiLoading(true);
    try {
      const result = await api<any>('/ai/generate/world-event', {
        method: 'POST', body: JSON.stringify({ event_type: form.event_type }),
      });
      if (result.variants?.[0]) {
        const v = result.variants[0];
        setForm(f => ({
          ...f, name: v.name || f.name, description: v.description || f.description,
          narrative: v.narrative || f.narrative, duration_minutes: v.duration_minutes || f.duration_minutes,
          min_players: v.min_players || f.min_players,
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
        title="World Events"
        subtitle="Global events that affect the game world"
        items={events}
        getId={e => e.id}
        isPublished={e => e.published}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={e => { if (confirm(`Delete ${e.name}?`)) deleteMut.mutate(e.id); }}
        columns={[
          { key: 'name', label: 'Name', render: e => <span className="font-medium text-white">{e.name}</span> },
          { key: 'event_type', label: 'Type', render: e => (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${EVENT_COLORS[e.event_type] || ''}`}>{e.event_type}</span>
          )},
          { key: 'duration_minutes', label: 'Duration', render: e => <span className="text-gray-400">{e.duration_minutes}min</span> },
          { key: 'min_players', label: 'Min Players' },
        ]}
      />

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit Event` : 'New World Event'} wide>
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <button onClick={generateEvent} disabled={aiLoading} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded transition-colors">
              <Sparkles className="w-3 h-3" /> {aiLoading ? 'Generating...' : 'Generate with AI'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v, slug: editing ? f.slug : v.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} /></FormField>
            <FormField label="Slug"><TextInput value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} disabled={!!editing} /></FormField>
          </div>
          <FormField label="Event Type"><Select value={form.event_type} onChange={v => setForm(f => ({ ...f, event_type: v }))} options={EVENT_TYPES.map(t => ({ value: t, label: t }))} /></FormField>
          <FormField label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} /></FormField>
          <FormField label="Narrative"><TextArea value={form.narrative} onChange={v => setForm(f => ({ ...f, narrative: v }))} rows={4} /></FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Duration (min)"><input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 60 }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></FormField>
            <FormField label="Min Players"><input type="number" value={form.min_players} onChange={e => setForm(f => ({ ...f, min_players: parseInt(e.target.value) || 1 }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></FormField>
            <FormField label="Cooldown (hrs)"><input type="number" value={form.cooldown_hours} onChange={e => setForm(f => ({ ...f, cooldown_hours: parseInt(e.target.value) || 24 }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></FormField>
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
