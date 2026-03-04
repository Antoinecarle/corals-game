import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NPCManager from './pages/NPCManager';
import ItemManager from './pages/ItemManager';
import AbyssauxManager from './pages/AbyssauxManager';
import ZoneManager from './pages/ZoneManager';
import QuestDesigner from './pages/QuestDesigner';
import ShipBuilder from './pages/ShipBuilder';
import WorldEvents from './pages/WorldEvents';
import FactionsManager from './pages/FactionsManager';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="npcs" element={<NPCManager />} />
        <Route path="items" element={<ItemManager />} />
        <Route path="abyssaux" element={<AbyssauxManager />} />
        <Route path="zones" element={<ZoneManager />} />
        <Route path="quests" element={<QuestDesigner />} />
        <Route path="ships" element={<ShipBuilder />} />
        <Route path="world-events" element={<WorldEvents />} />
        <Route path="factions" element={<FactionsManager />} />
      </Route>
    </Routes>
  );
}
