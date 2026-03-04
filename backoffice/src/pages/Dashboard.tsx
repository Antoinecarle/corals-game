import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Users, Sword, Skull, Map, ScrollText, Ship, Zap, Shield, Image, Clock } from 'lucide-react';

interface Stats {
  npcs: { total: string; published: string };
  items: { total: string; published: string };
  abyssaux: { total: string; published: string };
  zones: { total: string; published: string };
  quests: { total: string; published: string };
  ships: { total: string; published: string };
  world_events: { total: string; published: string };
  assets: { total: string };
}

interface Activity {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string;
  admin_username: string;
  created_at: string;
}

const STAT_CARDS = [
  { key: 'npcs', label: 'NPCs', icon: Users, color: 'text-blue-400' },
  { key: 'items', label: 'Items', icon: Sword, color: 'text-amber-400' },
  { key: 'abyssaux', label: 'Abyssaux', icon: Skull, color: 'text-red-400' },
  { key: 'zones', label: 'Zones', icon: Map, color: 'text-emerald-400' },
  { key: 'quests', label: 'Quests', icon: ScrollText, color: 'text-purple-400' },
  { key: 'ships', label: 'Ships', icon: Ship, color: 'text-cyan-400' },
  { key: 'world_events', label: 'Events', icon: Zap, color: 'text-orange-400' },
  { key: 'assets', label: 'Assets', icon: Image, color: 'text-pink-400' },
] as const;

export default function Dashboard() {
  const { data: stats } = useQuery<Stats>({ queryKey: ['dashboard-stats'], queryFn: () => api('/dashboard/stats') });
  const { data: activity } = useQuery<Activity[]>({ queryKey: ['dashboard-activity'], queryFn: () => api('/dashboard/recent-activity') });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of all game content</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => {
          const stat = stats?.[card.key as keyof Stats];
          const total = stat ? parseInt('total' in stat ? stat.total : '0') : 0;
          const published = stat && 'published' in stat ? parseInt(stat.published) : 0;

          return (
            <div key={card.key} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <card.icon className={`w-5 h-5 ${card.color}`} />
                <span className="text-xs text-gray-500">{published} published</span>
              </div>
              <div className="text-2xl font-bold text-white">{total}</div>
              <div className="text-sm text-gray-400">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-medium text-white">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {activity?.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No activity yet</div>
          )}
          {activity?.slice(0, 10).map(item => (
            <div key={item.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  item.action === 'create' ? 'bg-green-400' :
                  item.action === 'update' ? 'bg-blue-400' :
                  item.action === 'delete' ? 'bg-red-400' :
                  item.action === 'publish' ? 'bg-amber-400' : 'bg-gray-400'
                }`} />
                <div className="min-w-0">
                  <span className="text-sm text-white">{item.action}</span>
                  <span className="text-sm text-gray-500 mx-1">{item.entity_type}</span>
                  {item.entity_name && <span className="text-sm text-gray-300 truncate">{item.entity_name}</span>}
                </div>
              </div>
              <div className="text-xs text-gray-600 shrink-0">
                {new Date(item.created_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
