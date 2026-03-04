import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import EntityList from '../components/EntityList';
import Modal from '../components/Modal';
import FormField, { TextInput, TextArea, Select } from '../components/FormField';

interface Zone {
  id: string; slug: string; name: string; ring: string; biome: string;
  corruption_level: number; zone_x: number; zone_y: number; published: boolean;
}

const RINGS = ['coeur','eaux_medianes','terres_noyees','brume'];
const RING_COLORS: Record<string, string> = {
  coeur: 'bg-green-500/20 text-green-400', eaux_medianes: 'bg-blue-500/20 text-blue-400',
  terres_noyees: 'bg-purple-500/20 text-purple-400', brume: 'bg-red-500/20 text-red-400',
};

export default function ZoneManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Zone | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    slug: '', name: '', ring: 'coeur', biome: '', description: '',
    corruption_level: 0, zone_x: 0, zone_y: 0,
  });

  const { data: zones = [] } = useQuery<Zone[]>({ queryKey: ['zones'], queryFn: () => api('/zones') });

  const createMut = useMutation({
    mutationFn: (data: any) => api('/zones', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); setCreating(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: any) => api(`/zones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['zones'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/zones/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
  });

  const openCreate = () => {
    setForm({ slug: '', name: '', ring: 'coeur', biome: '', description: '', corruption_level: 0, zone_x: 0, zone_y: 0 });
    setCreating(true);
  };

  const openEdit = (z: Zone) => {
    setForm({ slug: z.slug, name: z.name, ring: z.ring, biome: z.biome || '', description: '', corruption_level: z.corruption_level, zone_x: z.zone_x, zone_y: z.zone_y });
    setEditing(z);
  };

  const handleSave = () => {
    if (editing) updateMut.mutate({ id: editing.id, ...form });
    else createMut.mutate(form);
  };

  return (
    <>
      <EntityList
        title="Zones"
        subtitle="Map zones and regions"
        items={zones}
        getId={z => z.id}
        isPublished={z => z.published}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={z => { if (confirm(`Delete ${z.name}?`)) deleteMut.mutate(z.id); }}
        columns={[
          { key: 'name', label: 'Name', render: z => <span className="font-medium text-white">{z.name}</span> },
          { key: 'ring', label: 'Ring', render: z => (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${RING_COLORS[z.ring] || ''}`}>{z.ring}</span>
          )},
          { key: 'biome', label: 'Biome', render: z => z.biome || <span className="text-gray-600">-</span> },
          { key: 'coords', label: 'Coords', render: z => <span className="font-mono text-xs text-gray-400">({z.zone_x}, {z.zone_y})</span> },
          { key: 'corruption_level', label: 'Corruption', render: z => (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${z.corruption_level}%` }} />
              </div>
              <span className="text-xs text-gray-500">{z.corruption_level}%</span>
            </div>
          )},
        ]}
      />

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit ${editing.name}` : 'New Zone'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v, slug: editing ? f.slug : v.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} /></FormField>
            <FormField label="Slug"><TextInput value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} disabled={!!editing} /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Ring"><Select value={form.ring} onChange={v => setForm(f => ({ ...f, ring: v }))} options={RINGS.map(r => ({ value: r, label: r }))} /></FormField>
            <FormField label="Zone X">
              <input type="number" value={form.zone_x} onChange={e => setForm(f => ({ ...f, zone_x: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </FormField>
            <FormField label="Zone Y">
              <input type="number" value={form.zone_y} onChange={e => setForm(f => ({ ...f, zone_y: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Biome"><TextInput value={form.biome} onChange={v => setForm(f => ({ ...f, biome: v }))} placeholder="tropical, arctic, volcanic..." /></FormField>
            <FormField label="Corruption Level">
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={100} value={form.corruption_level} onChange={e => setForm(f => ({ ...f, corruption_level: parseInt(e.target.value) }))} className="flex-1" />
                <span className="text-sm text-gray-400 w-10 text-right">{form.corruption_level}%</span>
              </div>
            </FormField>
          </div>
          <FormField label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} /></FormField>
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
