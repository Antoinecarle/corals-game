// Client configuration
export const CONFIG = {
  // Server (unused for now — offline mode)
  SERVER_URL: (import.meta.env.VITE_SERVER_URL as string) || 'ws://localhost:3001',

  // Rendering
  BACKGROUND_COLOR: 0x0a0a1a,
  TARGET_FPS: 60,

  // Camera
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 2.0,
  DEFAULT_ZOOM: 1.0,

  // Map generation
  MAP_SIZE: 256,

  // Animation
  WALK_FRAME_DURATION: 150, // ms per walk frame
  IDLE_FRAME_DURATION: 600, // ms per idle frame
} as const;
