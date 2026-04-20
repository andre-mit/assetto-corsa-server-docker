export interface AcServerSession {
  NAME: string;
  TIME?: number;
  LAPS?: number;
  WAIT_TIME?: number;
  IS_OPEN: 0 | 1 | 2;
}

export interface AcDynamicTrack {
  SESSION_START: number;
  RANDOMNESS: number;
  SESSION_TRANSFER: number;
  LAP_gain: number;
}

export interface AcServerConfig {
  SERVER: {
    NAME: string;
    CARS: string;
    TRACK: string;
    TRACK_CONFIG?: string;
    SUN_ANGLE: number;
    PASSWORD?: string;
    ADMIN_PASSWORD: string;
    UDP_PORT: number;
    TCP_PORT: number;
    HTTP_PORT: number;
    MAX_CLIENTS: number;
    TICK_HZ: number;
    CLIENT_SEND_INTERVAL_HZ: number;
    WELCOMEMESSAGE?: string;
    LOCKED_ENTRY_LIST: 0 | 1;
    LOOP_MODE: 0 | 1;
    REGISTER_TO_LOBBY: 0 | 1;

    TC_ALLOWED: 0 | 1 | 2;
    ABS_ALLOWED: 0 | 1 | 2;
    STABILITY_ALLOWED: 0 | 1;
    AUTOCLUTCH_ALLOWED: 0 | 1;
    TYRE_BLANKETS_ALLOWED: 0 | 1;
    FORCE_VIRTUAL_MIRROR: 0 | 1;
    LEGAL_TYRES?: string;
  };
  PRACTICE?: AcServerSession;
  QUALIFY?: AcServerSession;
  RACE?: AcServerSession;
  DYNAMIC_TRACK?: AcDynamicTrack;
}

export interface AcCspConfig {
  PITS: {
    ALLOW_TO_DRIVE_BACK: boolean;
    TELEPORT_TO_PITS_ON_WRONG_WAY: boolean;
  };
  WEATHER: {
    ENABLE_DYNAMIC: boolean;
    SCRIPT: string;
  };
  RAIN: {
    ENABLE: boolean;
    INTENSITY: number;
    WETNESS: number;
  };
  TIME: {
    MULTIPLIER: number;
  };
}

export interface AcEntryListSlot {
  MODEL: string;
  SKIN?: string;
  SPECTATOR_MODE: 0 | 1;
  DRIVERNAME?: string;
  TEAM?: string;
  GUID?: string;
  BALLAST: number;
  RESTRICTOR: number;
}

export type AcEntryList = Record<string, AcEntryListSlot>;

export interface Track {
  id: string;
  folderName: string;
  name: string;
  pitboxes: number;
  isMod: boolean;
  s3ImageUrl: string | null;
  createdAt: string | Date;
}

export interface Car {
  id: string;
  folderName: string;
  name: string;
  brand: string | null;
  isMod: boolean;
  s3ImageUrl: string | null;
  createdAt: string | Date;
}

export type Job = {
  id: string;
  type: string;
  target: string;
  status: string;
  progress: number;
  error: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CarUIData {
  name?: string;
  brand?: string;
}

export interface TrackUIData {
  name?: string;
  pitboxes?: string | number;
}