
export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  WIN = 'WIN'
}

export enum GameMode {
  SKIRMISH = 'SKIRMISH',
  DOMINATION = 'DOMINATION',
  KING_OF_THE_HILL = 'KING_OF_THE_HILL',
  SCAVENGER = 'SCAVENGER'
}

export interface Attachment {
  name: string;
  type: 'muzzle' | 'sight' | 'mag' | 'grip';
  bonus: string;
}

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  fireRate: number;
  ammo: number;
  maxAmmo: number;
  color: string;
  type: 'pistol' | 'smg' | 'ar' | 'sniper' | 'shotgun';
  zoomAmount: number; // FOV reduction factor (e.g., 20)
  hasScope: boolean;
  attachments: Attachment[];
}

export interface Entity {
  id: string;
  position: [number, number, number];
  health: number;
  type: 'bot' | 'chest' | 'player' | 'point' | 'item';
}

export interface Bot extends Entity {
  lastShot: number;
  state: 'idle' | 'chase' | 'attack';
  difficulty: number;
  speed: number;
}

export interface Chest extends Entity {
  opened: boolean;
  weaponInside: Weapon;
}

export interface ControlPoint extends Entity {
  owner: 'none' | 'player' | 'bots';
  captureProgress: number; // -100 to 100 (-100 = bots, 100 = player)
  label: string;
}

export interface ScavengeItem extends Entity {
  collected: boolean;
}

export interface GameState {
  status: GameStatus;
  mode: GameMode;
  score: number;
  health: number;
  maxHealth: number;
  weapon: Weapon;
  bots: Bot[];
  chests: Chest[];
  controlPoints: ControlPoint[];
  items: ScavengeItem[];
  logs: string[];
  intel: string;
  aiLevel: number;
  chestsOpened: number;
  kills: number;
  isAiming: boolean;
  isInvisible: boolean;
}
