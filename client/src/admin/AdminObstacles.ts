import { ObstacleType } from '../iso/MapGenerator.js';

export interface ObstacleInfo {
  type: ObstacleType;
  label: string;
  icon: string; // emoji for UI
}

/** All placeable obstacle types with their metadata. */
export const ADMIN_OBSTACLES: ObstacleInfo[] = [
  { type: ObstacleType.Tree, label: 'Tree', icon: '🌲' },
  { type: ObstacleType.Rock, label: 'Rock', icon: '🪨' },
  { type: ObstacleType.Bush, label: 'Bush', icon: '🌿' },
  { type: ObstacleType.Crate, label: 'Crate', icon: '📦' },
  { type: ObstacleType.Lantern, label: 'Lantern', icon: '🏮' },
  { type: ObstacleType.Palm, label: 'Palm', icon: '🌴' },
];

export function getObstacleLabel(type: ObstacleType): string {
  return ADMIN_OBSTACLES.find((o) => o.type === type)?.label ?? 'Unknown';
}
