import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import EntityList from '../components/EntityList';
import Modal from '../components/Modal';
import FormField, { TextInput, TextArea, Select } from '../components/FormField';

interface Faction {
  id: string;
  slug: string;
  name: string;
  faction_type: string;
  description: string;
  lore: string;
  color: string;
  published: boolean;
}

export default function FactionsManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Faction | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ slug: '', name: '', faction_type: 'main', description: '', lore: '', color: '#4A90D9' });

  const { data: factions = [] } = useQuery<Faction[]>({ queryKey: ['factions'], queryFn: () => api('/factions') });

  const createMut = useMutation({
    mutationFn: (data: any) => api('/factions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['factions'] }); setCreating(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: any) => api(`/factions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['factions'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/factions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factions'] }),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api(`/factions/${id}`, { method: 'PUT', body: JSON.stringify({ published }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factions'] }),
  });

  const openCreate = () => {
    setForm({ slug: '', name: '', faction_type: 'main', description: '', lore: '', color: '#4A90D9' });
    setCreating(true);
  };

  const openEdit = (f: Faction) => {
    setForm({ slug: f.slug, name: f.name, faction_type: f.faction_type, description: f.description || '', lore: f.lore || '', color: f.color || '#4A90D9' });
    setEditing(f);
  };

  const handleSave = () => {
    if (editing) {
      updateMut.mutate({ id: editing.id, ...form });
    } else {
      createMut.mutate(form);
    }
  };

  return (
    <>
      <EntityList
        title="Factions"
        subtitle="Manage game factions"
        items={factions}
        getId={f => f.id}
        isPublished={f => f.published}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={f => { if (confirm(`Delete ${f.name}?`)) deleteMut.mutate(f.id); }}
        onPublish={(f, pub) => publishMut.mutate({ id: f.id, published: pub })}
        columns={[
          { key: 'name', label: 'Name', render: f => (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: f.color || '#666' }} />
              <span className="font-medium text-white">{f.name}</span>
            </div>
          )},
          { key: 'slug', label: 'Slug' },
          { key: 'faction_type', label: 'Type', render: f => (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${f.faction_type === 'main' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-700 text-gray-400'}`}>
              {f.faction_type}
            </span>
          )},
        ]}
      />

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? 'Edit Faction' : 'New Faction'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v, slug: editing ? f.slug : v.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} placeholder="Le Concordat d'Acier" /></FormField>
            <FormField label="Slug"><TextInput value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} placeholder="concordat-acier" disabled={!!editing} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type">
              <Select value={form.faction_type} onChange={v => setForm(f => ({ ...f, faction_type: v }))} options={[{ value: 'main', label: 'Main' }, { value: 'secondary', label: 'Secondary' }]} />
            </FormField>
            <FormField label="Color">
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded border-0 bg-transparent cursor-pointer" />
                <TextInput value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} />
              </div>
            </FormField>
          </div>
          <FormField label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Faction description..." /></FormField>
          <FormField label="Lore"><TextArea value={form.lore} onChange={v => setForm(f => ({ ...f, lore: v }))} placeholder="Detailed lore..." rows={5} /></FormField>
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
