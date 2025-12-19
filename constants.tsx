
import { Weapon } from './types';

export const INITIAL_WEAPONS: Weapon[] = [
  { 
    id: 'p1', name: 'G-18 Pistol', damage: 20, fireRate: 300, ammo: 12, maxAmmo: 12, color: '#94a3b8', type: 'pistol', 
    zoomAmount: 18, hasScope: true, attachments: [{ name: 'RDS-1 Red Dot', type: 'sight', bonus: 'Precision' }] 
  },
  { 
    id: 's1', name: 'MP5 SMG', damage: 15, fireRate: 80, ammo: 30, maxAmmo: 30, color: '#334155', type: 'smg', 
    zoomAmount: 15, hasScope: true, attachments: [{ name: 'Reflex Sight', type: 'sight', bonus: '+ADS Speed' }] 
  },
  { 
    id: 'a1', name: 'M4 Carbine', damage: 32, fireRate: 120, ammo: 30, maxAmmo: 30, color: '#475569', type: 'ar', 
    zoomAmount: 25, hasScope: true, attachments: [{ name: 'ACOG', type: 'sight', bonus: '4x Zoom' }, { name: 'Compensator', type: 'muzzle', bonus: '-Recoil' }] 
  },
  { 
    id: 'sh1', name: 'M870 Tactical', damage: 80, fireRate: 800, ammo: 6, maxAmmo: 6, color: '#1a1a1a', type: 'shotgun', 
    zoomAmount: 5, hasScope: false, attachments: [{ name: 'Choke', type: 'muzzle', bonus: 'Tighter Spread' }] 
  },
  { 
    id: 'a2', name: 'SCAR-H Elite', damage: 45, fireRate: 180, ammo: 20, maxAmmo: 20, color: '#a16207', type: 'ar', 
    zoomAmount: 30, hasScope: true, attachments: [{ name: 'Thermal Scope', type: 'sight', bonus: 'High Vis' }, { name: 'Suppressor', type: 'muzzle', bonus: 'Silent' }] 
  },
  { 
    id: 'sn1', name: 'AWM Sniper', damage: 110, fireRate: 1200, ammo: 5, maxAmmo: 5, color: '#064e3b', type: 'sniper', 
    zoomAmount: 55, hasScope: true, attachments: [{ name: '8x Scope', type: 'sight', bonus: 'Extreme Range' }, { name: 'Heavy Barrel', type: 'muzzle', bonus: '+Bullet Velocity' }] 
  },
];

export const MAP_SIZE = 80;
export const BOT_COUNT = 12;
export const CHEST_COUNT = 8;
export const CAPTURE_SPEED = 15;
export const AI_LEVEL_UP_KILLS = 5;
export const AI_LEVEL_UP_CHESTS = 2;

export interface ObstacleData {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

export const BATTLEFIELD_OBSTACLES: ObstacleData[] = [
  // Central Hub
  { position: [0, 2.5, 0], size: [8, 5, 8], color: '#71717a' },
  // High Platforms
  { position: [0, 8, 0], size: [10, 1, 10], color: '#a1a1aa' },
  { position: [20, 6, 0], size: [6, 0.5, 6], color: '#a1a1aa' },
  { position: [-20, 6, 0], size: [6, 0.5, 6], color: '#a1a1aa' },
  { position: [0, 6, 20], size: [6, 0.5, 6], color: '#a1a1aa' },
  { position: [0, 6, -20], size: [6, 0.5, 6], color: '#a1a1aa' },
  
  // Perimeter Walls/Pillars
  { position: [20, 3, 20], size: [4, 6, 4], color: '#a1a1aa' },
  { position: [-20, 3, 20], size: [4, 6, 4], color: '#a1a1aa' },
  { position: [20, 3, -20], size: [4, 6, 4], color: '#a1a1aa' },
  { position: [-20, 3, -20], size: [4, 6, 4], color: '#a1a1aa' },
  
  // Random Crates
  { position: [10, 1, 5], size: [2, 2, 2], color: '#d4d4d8' },
  { position: [-15, 1, -10], size: [2, 2, 2], color: '#d4d4d8' },
  { position: [5, 1, -15], size: [2, 2, 2], color: '#d4d4d8' },
  { position: [-5, 1, 15], size: [2, 2, 2], color: '#d4d4d8' },
  
  // Large Walls
  { position: [30, 4, 0], size: [3, 8, 15], color: '#52525b' },
  { position: [-30, 4, 0], size: [3, 8, 15], color: '#52525b' },
];

export const LADDERS = [
  { position: [4, 4, 0], size: [0.2, 8, 1.5], color: '#facc15' },
  { position: [-4, 4, 0], size: [0.2, 8, 1.5], color: '#facc15' },
  { position: [0, 4, 4], size: [1.5, 8, 0.2], color: '#facc15' },
  { position: [0, 4, -4], size: [1.5, 8, 0.2], color: '#facc15' },
];

export const VENTS = [
  { position: [0, 9, 0], size: [10.5, 1.5, 10.5], color: '#18181b' },
  { position: [25, 0.5, 25], size: [4, 1.5, 10], color: '#18181b' },
  { position: [-25, 0.5, -25], size: [4, 1.5, 10], color: '#18181b' },
];
