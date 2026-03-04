import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Users, Sword, Skull, Map, ScrollText, Ship, Zap,
  Shield, LogOut, Anchor, ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/factions', label: 'Factions', icon: Shield },
  { path: '/npcs', label: 'NPCs', icon: Users },
  { path: '/items', label: 'Items', icon: Sword },
  { path: '/abyssaux', label: 'Abyssaux', icon: Skull },
  { path: '/zones', label: 'Zones', icon: Map },
  { path: '/quests', label: 'Quests', icon: ScrollText },
  { path: '/ships', label: 'Ships', icon: Ship },
  { path: '/world-events', label: 'World Events', icon: Zap },
];

export default function Layout() {
  const { admin, logout } = useAuth();
  const location = useLocation();

  const currentPage = NAV_ITEMS.find(item =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  );

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Anchor className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">CORALS</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Backoffice</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm text-white truncate">{admin?.username}</div>
              <div className="text-xs text-gray-500 truncate">{admin?.role}</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-800 flex items-center px-6 shrink-0 bg-gray-900/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">CORALS</span>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <span className="text-white font-medium">{currentPage?.label || 'Page'}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
