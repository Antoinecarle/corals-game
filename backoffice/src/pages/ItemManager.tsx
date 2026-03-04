import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import EntityList from '../components/EntityList';
import Modal from '../components/Modal';
import FormField, { TextInput, TextArea, Select } from '../components/FormField';
import { Sparkles } from 'lucide-react';
import AssetGeneratorPanel from '../components/AssetGeneratorPanel';

interface Item {
  id: string; slug: string; name: string; item_type: string; rarity: string;
  slot: string; description: string; flavor_text: string; stats: any;
  coral_type: string; sell_price: number; buy_price: number; published: boolean;
  icon_url?: string; model_url?: string;
}

const ITEM_TYPES = ['weapon','armor','fragment','consumable','material','key_item','ship_module','currency'];
const RARITIES = ['common','uncommon','rare','epic','legendary','eclat','bourgeon','branche','coeur','coral_ancien'];
const CORAL_TYPES = ['','abime','maree','givre','braise','brume','chair','echo'];
const SLOTS = ['','head','chest','legs','feet','hands','ring','necklace','main_hand','off_hand','two_hand'];

const RARITY_COLORS: Record<string, string> = {
  common: 'text-gray-400', uncommon: 'text-green-400', rare: 'text-blue-400',
  epic: 'text-purple-400', legendary: 'text-amber-400', eclat: 'text-teal-400',
  bourgeon: 'text-emerald-400', branche: 'text-cyan-400', coeur: 'text-orange-400', coral_ancien: 'text-red-400',
};

export default function ItemManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({
    slug: '', name: '', item_type: 'weapon', rarity: 'common', slot: '',
    description: '', flavor_text: '', stats: {} as any, coral_type: '',
    sell_price: 0, buy_price: 0, stackable: false, max_stack: 1,
  });

  const { data: items = [] } = useQuery<Item[]>({ queryKey: ['items'], queryFn: () => api('/items') });

  const createMut = useMutation({
    mutationFn: (data: any) => api('/items', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); setCreating(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: any) => api(`/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['items'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) =>
      api(`/items/${id}/publish`, { method: 'PATCH', body: JSON.stringify({ published }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  });

  const openCreate = () => {
    setForm({ slug: '', name: '', item_type: 'weapon', rarity: 'common', slot: '', description: '', flavor_text: '', stats: {}, coral_type: '', sell_price: 0, buy_price: 0, stackable: false, max_stack: 1 });
    setCreating(true);
  };

  const openEdit = (item: Item) => {
    setForm({ slug: item.slug, name: item.name, item_type: item.item_type, rarity: item.rarity, slot: item.slot || '', description: item.description || '', flavor_text: item.flavor_text || '', stats: item.stats || {}, coral_type: item.coral_type || '', sell_price: item.sell_price, buy_price: item.buy_price, stackable: false, max_stack: 1 });
    setEditing(item);
  };

  const generateStats = async () => {
    setAiLoading(true);
    try {
      const result = await api<any>('/ai/generate/item-stats', {
        method: 'POST', body: JSON.stringify({ name: form.name, item_type: form.item_type, rarity: form.rarity, slot: form.slot, description: form.description }),
      });
      if (result.variants?.[0]) {
        const v = result.variants[0];
        setForm(f => ({ ...f, stats: v.stats || f.stats, sell_price: v.sell_price || f.sell_price, buy_price: v.buy_price || f.buy_price, flavor_text: v.flavor_text || f.flavor_text }));
      }
    } catch {} finally { setAiLoading(false); }
  };

  const handleSave = () => {
    const data = { ...form, coral_type: form.coral_type || null };
    if (editing) updateMut.mutate({ id: editing.id, ...data });
    else createMut.mutate(data);
  };

  return (
    <>
      <EntityList
        title="Items"
        subtitle="Weapons, armor, fragments and more"
        items={items}
        getId={i => i.id}
        isPublished={i => i.published}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={i => { if (confirm(`Delete ${i.name}?`)) deleteMut.mutate(i.id); }}
        onPublish={(i, pub) => publishMut.mutate({ id: i.id, published: pub })}
        columns={[
          { key: 'icon_url', label: '', render: i => i.icon_url ? (
            <img src={i.icon_url} alt={i.name} className="w-10 h-10 rounded object-cover bg-gray-800" />
          ) : (
            <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center">
              <span className="text-gray-600 text-xs">?</span>
            </div>
          )},
          { key: 'name', label: 'Name', render: i => <span className={`font-medium ${RARITY_COLORS[i.rarity] || 'text-white'}`}>{i.name}</span> },
          { key: 'item_type', label: 'Type', render: i => <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{i.item_type}</span> },
          { key: 'rarity', label: 'Rarity', render: i => <span className={`text-xs font-medium ${RARITY_COLORS[i.rarity]}`}>{i.rarity}</span> },
          { key: 'coral_type', label: 'Coral', render: i => i.coral_type ? <span className="text-xs text-purple-400">{i.coral_type}</span> : <span className="text-gray-600">-</span> },
        ]}
      />

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit ${editing.name}` : 'New Item'} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name"><TextInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v, slug: editing ? f.slug : v.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))} /></FormField>
            <FormField label="Slug"><TextInput value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))} disabled={!!editing} /></FormField>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <FormField label="Type"><Select value={form.item_type} onChange={v => setForm(f => ({ ...f, item_type: v }))} options={ITEM_TYPES.map(t => ({ value: t, label: t }))} /></FormField>
            <FormField label="Rarity"><Select value={form.rarity} onChange={v => setForm(f => ({ ...f, rarity: v }))} options={RARITIES.map(r => ({ value: r, label: r }))} /></FormField>
            <FormField label="Slot"><Select value={form.slot} onChange={v => setForm(f => ({ ...f, slot: v }))} options={SLOTS.map(s => ({ value: s, label: s || 'None' }))} /></FormField>
            <FormField label="Coral Type"><Select value={form.coral_type} onChange={v => setForm(f => ({ ...f, coral_type: v }))} options={CORAL_TYPES.map(c => ({ value: c, label: c || 'None' }))} /></FormField>
          </div>
          <FormField label="Description"><TextArea value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} /></FormField>
          <FormField label="Flavor Text"><TextArea value={form.flavor_text} onChange={v => setForm(f => ({ ...f, flavor_text: v }))} rows={2} /></FormField>

          <div className="border border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">Stats</h3>
              <button onClick={generateStats} disabled={aiLoading || !form.name} className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded transition-colors">
                <Sparkles className="w-3 h-3" /> {aiLoading ? 'Generating...' : 'AI Suggest'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['attack', 'defense', 'speed', 'hp', 'coral_power', 'corruption_resistance'].map(stat => (
                <FormField key={stat} label={stat.replace('_', ' ')}>
                  <input type="number" value={form.stats[stat] || 0} onChange={e => setForm(f => ({ ...f, stats: { ...f.stats, [stat]: parseInt(e.target.value) || 0 } }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </FormField>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Buy Price">
              <input type="number" value={form.buy_price} onChange={e => setForm(f => ({ ...f, buy_price: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </FormField>
            <FormField label="Sell Price">
              <input type="number" value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: parseInt(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </FormField>
          </div>

          {/* Visual Asset Generation */}
          <AssetGeneratorPanel
            entityType="item"
            entityId={editing?.id}
            entityData={{ name: form.name, item_type: form.item_type, rarity: form.rarity, coral_type: form.coral_type, description: form.description, slot: form.slot }}
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
