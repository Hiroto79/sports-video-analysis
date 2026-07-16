export interface Player {
  id: string;
  name: string;
  number?: string; // Jersey number (optional)
  hotkey: string;  // Keyboard shortcut key (e.g. '1', '2', etc.)
  teamName?: string; // Team name/identifier (Home/Away, e.g. "HOU", "LAD")
  hand?: 'R' | 'L' | 'S';  // Handedness (fallback)
  throws?: 'R' | 'L';      // Throw: 'R' (Right) or 'L' (Left)
  bats?: 'R' | 'L' | 'S';  // Bat: 'R' (Right), 'L' (Left), or 'S' (Switch/Both)
  positionType?: 'batter' | 'pitcher' | 'both'; // Player category (野手・打者 / 投手)
  battingOrder?: number; // Batting lineup order (1-9)
  sourceCsvName?: string; // CSV filename from which player was loaded
}

export type ButtonType = 'code' | 'label';

export interface ButtonConfig {
  id: string;
  name: string;
  type: ButtonType;
  hotkey: string;    // Keyboard shortcut key (e.g. 's', 'p')
  color: string;     // Tailwind color class
  textColor?: string; // Tailwind text color class (e.g., text-white, text-yellow-300)
  leadIn: number;    // For 'code' buttons (seconds before)
  leadOut: number;   // For 'code' buttons (seconds after)
  groupName?: string; // For 'label' buttons (e.g., "Pitch Type", "Result")
  x?: number;        // Canvas X coordinate in pixels
  y?: number;        // Canvas Y coordinate in pixels
  w?: number;        // Canvas width in pixels
  h?: number;        // Canvas height in pixels
  fontSize?: number; // Button label font size in pixels (e.g. 8 to 24, default 11)
  badgePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'none' | 'default'; // Position of hotkey badge
  linkTrigger?: 'none' | 'hit' | 'out' | 'score' | 'pitch' | 'walk'; // Activation Link trigger (e.g. 'hit' for single/double/triple/HR, 'pitch' for pitch)
}

export interface TaggedEvent {
  id: string;
  timestamp: number;    // Exact trigger time in seconds
  startTime: number;    // Instance start
  endTime: number;      // Instance end
  playerId?: string;    // Associated player ID (optional)
  playerName?: string;  // Associated player Name (optional)
  actionId: string;     // Code button ID that created the instance
  actionName: string;   // Code button name (e.g. "Pitch")
  color: string;        // Visual color representing the event
  labels: Record<string, string>; // Mapped metadata, e.g. {"Pitch Type": "Fastball", "Result": "Strike", "Count": "1-1"}
  createdAt: number;    // Wall clock timestamp
}

export interface CustomPreset {
  id: string;
  name: string;
  buttons: ButtonConfig[];
}
