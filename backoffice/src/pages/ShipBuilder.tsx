import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import EntityList from '../components/EntityList';
import Modal from '../components/Modal';
import FormField, { TextInput, TextArea, Select } from '../components/FormField';
import AssetGeneratorPanel from '../components/AssetGeneratorPanel';

interface ShipClass {
  id: string; slug: string; name: string; ship_type: string;
  crew_capacity: number; cargo_capacity: number; cost: number;
  required_level: number; published: boolean;
  model_url?: string;
}

const SHIP_TYPES = ['sloop','brigantin','galion','cuirasse','sous_marin','dirigeable'];

export default function ShipBuilder() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ShipClass | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    slug: '', name: '', ship_type: 'sloop', description: '',
    base_stats: {} as any, module_slots: [] as any[],
    crew_capacity: 1, cargo_capacity: 10, cost: 0, required_level: 1,
  });

  const { data: ships = [] } = useQuery<ShipClass[]>({ queryKey: ['ships'], queryFn: () => api('/ships/classes') });

  const createMut = useMutation({
    mutationFn: (data: any) => api('/ships/classes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ships'] }); setCreating(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: any) => api(`/ships/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ships'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/ships/classes/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ships'] }),
  });

  const openCreate = () => {
    setForm({ slug: '', name: '', ship_type: 'sloop', description: '', base_stats: {}, module_slots: [], crew_capacity: 1, cargo_capacity: 10, cost: 0, required_level: 1 });
    setCreating(true);
  };

  const openEdit = (s: ShipClass) => {
    setForm({ slug: s.slug, name: s.name, ship_type: s.ship_type, description: '', base_stats: {}, module_slots: [], crew_capacity: s.crew_capacity, cargo_capacity: s.cargo_capacity, cost: s.cost, required_level: s.required_level });
    setEditing(s);
  };

  const handleSave = () => {
    if (editing) updateMut.mutate({ id: editing.id, ...form });
    else createMut.mutate(form);
  };

  return (
    <>
      <EntityList
        title="Ship Classes"
        subtitle="Manage ship types and their stats"
        items={ships}
        getId={s => s.id}
        isPublished={s => s.published}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={s => { if (confirm(`Delete ${s.name}?`)) deleteMut.mutate(s.id); }}
        columns={[
          { key: 'model_url', label: '', render: s => s.model_url ? (
            <img src={s.model_url} alt={s.name} className="w-10 h-10 rounded object-cover bg-gray-800" />
          ) : (
            <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center">
              <span className="text-gray-600 text-xs">?</span>
            </div>
          )},
          { key: 'name', label: 'Name', render: s => <span className="font-medium text-white">{s.name}</span> },
          { key: 'ship_type', label: 'Type', render: s => <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400">{s.ship_type}</span> },
          { key: 'crew_capacity', label: 'Crew' },
          { key: 'cargo_capacity', label: 'Cargo' },
          { key: 'cost', label: 'Cost', render: s => <span className="text-amber-400">{s.cost}g</span> },
          { key: 'required_level', label: 'Lvl' },
        ]}
      />

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit ${editing.name}` : 'New Ship Class'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v, slug: editing ? f.slug : v.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} /></FormField>
            <FormField label="Slug"><TextInput value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} disabled={!!editing} /></FormField>
          </div>
          <FormField label="Type"><Select value={form.ship_type} onChange={v => setForm(f => ({ ...f, ship_type: v }))} options={SHIP_TYPES.map(t => ({ value: t, label: t }))} /></FormField>
          <FormField label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Crew Capacity"><input type="number" value={form.crew_capacity} onChange={e => setForm(f => ({ ...f, crew_capacity: parseInt(e.target.value) || 1 }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></FormField>
            <FormField label="Cargo Capacity"><input type="number" value={form.cargo_capacity} onChange={e => setForm(f => ({ ...f, cargo_capacity: parseInt(e.target.value) || 10 }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Cost (gold)"><input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: parseInt(e.target.value) || 0 }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></FormField>
            <FormField label="Required Level"><input type="number" value={form.required_level} onChange={e => setForm(f => ({ ...f, required_level: parseInt(e.target.value) || 1 }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" /></FormField>
          </div>

          {/* Visual Asset Generation */}
          <AssetGeneratorPanel
            entityType="ship"
            entityId={editing?.id}
            entityData={{ name: form.name, ship_type: form.ship_type, description: form.description }}
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
