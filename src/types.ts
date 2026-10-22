export type Mode = "photo" | "series" | "gif" | "boomerang" | "video";
export type Filter = "normal" | "mono" | "sepia" | "warm";
export type Asset = {
  id: string;
  name: string;
  kind: "frame" | "sticker";
  enabled: boolean;
  data: string;
};
export type EventConfig = {
  id: string;
  name: string;
  storage: string;
  camera: string;
  modes: Mode[];
  countdown: number;
  seriesCount: number;
  interval: number;
  duration: number;
  fps: number;
  videoDuration: number;
  audio: boolean;
  mirror: boolean;
  quality: "auto" | "eco" | "high";
  layout: "grid" | "strip" | "square";
  returnSeconds: number;
  cloud: boolean;
  gallery: string;
  filters: Filter[];
  assets: Asset[];
};
export type Boot = {
  events: EventConfig[];
  activeId: string;
  pinConfigured: boolean;
  unlocked: boolean;
  kiosk: boolean;
  version: string;
  profile: "eco" | "standard";
};
export type Camera = {
  id: string;
  label: string;
  kind: "simulation" | "webcam" | "digicam" | "auto";
};
export type Shot = {
  id: string;
  mode: Mode;
  status: string;
  createdAt: string;
  outputs: string[];
  error?: string;
};
declare global {
  interface Window {
    photobooth: {
      invoke: (operation: string, input?: unknown) => Promise<any>;
      onCloseBlocked: (callback: (message: string) => void) => () => void;
    };
  }
}
export const api = <T = any>(operation: string, input?: unknown): Promise<T> =>
  window.photobooth.invoke(operation, input);
export const modeNames: Record<Mode, string> = {
  photo: "Photo",
  series: "Série",
  gif: "GIF animé",
  boomerang: "Boomerang",
  video: "Vidéo",
};
export const filterNames: Record<Filter, string> = {
  normal: "Naturel",
  mono: "Noir & blanc",
  sepia: "Sépia",
  warm: "Chaleureux",
};
