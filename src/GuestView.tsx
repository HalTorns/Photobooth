import type { RefObject } from "react";
import {
  Camera,
  Check,
  Clapperboard,
  Grid2X2,
  Images,
  Infinity as Loop,
  RefreshCw,
  Settings,
  Video,
} from "lucide-react";
import type { EventConfig, Filter, Mode } from "./types";
import { filterNames, modeNames } from "./types";
import layouts from "../assets/layouts.json";
const icons = {
  photo: Camera,
  series: Images,
  gif: Clapperboard,
  boomerang: Loop,
  video: Video,
};
type Props = {
  event: EventConfig;
  mode: Mode;
  filter: Filter;
  frame: string;
  frameEnabled: boolean;
  sticker: string;
  busy: boolean;
  ready: boolean;
  native: boolean;
  status: string;
  count: number | null;
  phase: string;
  qr: string;
  preview: RefObject<HTMLCanvasElement | null>;
  captureDisabled: boolean;
  onMode: (mode: Mode) => void;
  onFilter: (filter: Filter) => void;
  onFrame: (id: string) => void;
  onFrameEnabled: (enabled: boolean) => void;
  onSticker: (id: string) => void;
  onCapture: () => void;
  onAdmin: () => void;
  onReconnect: () => void;
  onRecent: () => void;
};
export default function GuestView(p: Props) {
  const isMontage = p.mode === "series";
  const canFrame = !isMontage || p.event.layout === "photomaton";
  const frames = p.event.assets.filter(
    (a) => a.enabled && a.kind === (isMontage ? "montage-frame" : "frame"),
  );
  const stickers = p.event.assets.filter(
    (a) => a.enabled && a.kind === "sticker",
  );
  const selectedFrame = frames.find((a) => a.id === p.frame) || frames[0];
  return (
    <>
      <header className="guest-header">
        <h1>{p.event.name}</h1>
        <button
          className="icon-button"
          aria-label="Espace organisateur"
          title="Espace organisateur"
          disabled={p.busy}
          onClick={p.onAdmin}
        >
          <Settings size={20} />
        </button>
      </header>
      <main className="guest-layout">
        <section className="guest-capture" aria-label="Prévisualisation caméra">
          <div className="viewfinder">
            <canvas ref={p.preview} width={960} height={720} />
            {!p.ready && (
              <div className="camera-empty">
                <Camera size={40} />
                <p>{p.status}</p>
                <button className="button light" onClick={p.onReconnect}>
                  <RefreshCw size={18} /> Reconnecter
                </button>
              </div>
            )}
            {p.busy && (
              <div className="capture-overlay">
                {p.count !== null && (
                  <div className="countdown" key={p.count}>
                    {p.count}
                  </div>
                )}
                <div className="phase">{p.phase}</div>
              </div>
            )}
          </div>
          <span className="sr-only" role="status">
            {p.status}
          </span>
        </section>
        <aside className="guest-controls" aria-label="Commandes de capture">
          <div className="guest-tools">
            <div
              className="mode-grid"
              role="group"
              aria-label="Mode de capture"
            >
              {p.event.modes.map((mode) => {
                const Icon = icons[mode];
                const unavailable =
                  p.native && ["gif", "boomerang", "video"].includes(mode);
                const label =
                  mode === "series"
                    ? `Photomaton ${p.event.seriesCount} photos`
                    : modeNames[mode];
                return (
                  <button
                    key={mode}
                    className={
                      "mode-button " + (p.mode === mode ? "selected" : "")
                    }
                    disabled={p.busy || unavailable}
                    title={
                      unavailable
                        ? "Mode indisponible avec cette caméra"
                        : label
                    }
                    aria-pressed={p.mode === mode}
                    onClick={() => p.onMode(mode)}
                  >
                    <Icon size={23} />
                    <span>{label}</span>
                    {p.mode === mode && (
                      <Check size={13} className="selection-check" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="filters" role="group" aria-label="Filtres">
              {p.event.filters.map((filter) => (
                <button
                  key={filter}
                  className={
                    "filter-chip " + (p.filter === filter ? "selected" : "")
                  }
                  disabled={p.busy}
                  aria-pressed={p.filter === filter}
                  onClick={() => p.onFilter(filter)}
                >
                  <span className={"filter-dot " + filter} />
                  {filterNames[filter]}
                </button>
              ))}
            </div>
            <div className="guest-frame-controls">
              <label className="guest-frame-toggle">
                <input
                  aria-label="Cadre"
                  type="checkbox"
                  checked={p.frameEnabled && canFrame && frames.length > 0}
                  disabled={p.busy || !canFrame || !frames.length}
                  onChange={(e) => p.onFrameEnabled(e.target.checked)}
                />
                <span>Cadre</span>
              </label>
              {canFrame && frames.length > 0 && p.frameEnabled && (
                <select
                  aria-label={isMontage ? "Cadre photomaton" : "Choix du cadre"}
                  disabled={p.busy}
                  value={selectedFrame?.id || ""}
                  onChange={(e) => p.onFrame(e.target.value)}
                >
                  {frames.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
              {isMontage && p.event.layout === "photomaton" && (
                <svg
                  className="guest-montage-preview"
                  viewBox="0 0 1800 2400"
                  aria-label="Aperçu photomaton : six photos et espace blanc en bas"
                >
                  <rect width="1800" height="2400" fill="white" />
                  {layouts.photomaton.windows.map((box, i) => (
                    <rect
                      key={i}
                      x={box.x}
                      y={box.y}
                      width={box.width}
                      height={box.height}
                      fill="#c5d5c8"
                    />
                  ))}
                  {p.frameEnabled && selectedFrame && (
                    <image
                      href={selectedFrame.data}
                      width="1800"
                      height="2400"
                    />
                  )}
                </svg>
              )}
            </div>
            {stickers.length > 0 && (
              <select
                aria-label="Sticker"
                value={p.sticker}
                disabled={p.busy}
                onChange={(e) => p.onSticker(e.target.value)}
              >
                <option value="">Sans sticker</option>
                {stickers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="guest-bottom">
            <div className="guest-extras">
              {p.qr && (
                <img
                  className="guest-qr"
                  src={p.qr}
                  alt="QR code de la galerie de l’événement"
                />
              )}
              <button
                className="icon-button"
                aria-label="Les derniers souvenirs"
                title="Les derniers souvenirs"
                disabled={p.busy}
                onClick={p.onRecent}
              >
                <Grid2X2 size={22} />
              </button>
            </div>
            <button
              className="shutter"
              disabled={p.captureDisabled}
              onClick={p.onCapture}
            >
              <Camera size={23} />
              {p.busy
                ? "Capture en cours…"
                : p.mode === "video"
                  ? "Enregistrer la vidéo"
                  : p.mode === "photo"
                    ? "Prendre la photo"
                    : p.mode === "series"
                      ? "Lancer le photomaton"
                      : p.mode === "gif"
                        ? "Lancer le GIF"
                        : "Lancer le boomerang"}
            </button>
          </div>
        </aside>
      </main>
    </>
  );
}
