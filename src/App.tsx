import { useCallback, useEffect, useRef, useState } from "react";
import {
  Aperture,
  ArrowLeft,
  ArrowRight,
  Camera as CameraIcon,
  ChevronRight,
  Download,
  FolderOpen,
  Image,
  Images,
  Lock,
  Monitor,
  Plus,
  QrCode,
  RefreshCw,
  Settings,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import {
  api,
  filterNames,
  modeNames,
  type Asset,
  type Boot,
  type Camera,
  type EventConfig,
  type Filter,
  type Mode,
  type Shot,
} from "./types";
import {
  assetImage,
  canvas,
  compose,
  drawCover,
  jpeg,
  loadImage,
  montage,
} from "./imaging";
import { useCamera } from "./useCamera";
import { useStickers } from "./useStickers";
import GuestView from "./GuestView";
import photoGuide from "../assets/templates/photo-reperes.png";
import montageGuide from "../assets/templates/photomaton-reperes.png";
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
type Result = { id: string; image: string; video?: string; outputs: string[] };
export default function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [view, setView] = useState<"booth" | "admin">("booth");
  const [error, setError] = useState("");
  const [pinModal, setPinModal] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [mode, setMode] = useState<Mode>("photo");
  const [filter, setFilter] = useState<Filter>("normal");
  const [frame, setFrame] = useState("");
  const [frameEnabled, setFrameEnabled] = useState(false);
  const [montageFrame, setMontageFrame] = useState("");
  const [montageFrameEnabled, setMontageFrameEnabled] = useState(false);
  const [montageFrameImg, setMontageFrameImg] =
    useState<HTMLImageElement | null>(null);
  const [frameImg, setFrameImg] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [phase, setPhase] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [returnIn, setReturnIn] = useState(0);
  const [qr, setQr] = useState("");
  const preview = useRef<HTMLCanvasElement>(null);
  const latestPreview = useRef<HTMLCanvasElement | null>(null);
  const event = boot?.events.find((e) => e.id === boot.activeId) || null;
  const eco =
    event?.quality === "eco" ||
    (event?.quality === "auto" && boot?.profile === "eco");
  const camera = useCamera(event, !!eco);
  const notify = useCallback(
    (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    [],
  );
  const stickerStudio = useStickers(event?.id, event?.assets, notify);
  useEffect(() => {
    api<Boot>("boot").then(setBoot).catch(notify);
    return window.photobooth.onCloseBlocked(setError);
  }, [notify]);
  useEffect(() => {
    if (!event) return;
    setMode(event.modes[0]);
    setFilter(event.filters[0]);
    setFrame("");
    setFrameEnabled(false);
    setMontageFrame("");
    setMontageFrameEnabled(false);
    setResult(null);
  }, [event?.id]);
  useEffect(() => {
    if (event && !event.modes.includes(mode)) setMode(event.modes[0]);
    if (event && !event.filters.includes(filter)) setFilter(event.filters[0]);
  }, [event, mode, filter]);
  useEffect(() => {
    let cancelled = false;
    setFrameImg(null);
    const selected =
      event?.assets.find(
        (a) => a.id === frame && a.kind === "frame" && a.enabled,
      )?.id ||
      event?.assets.find((a) => a.kind === "frame" && a.enabled)?.id ||
      "";
    assetImage(frameEnabled ? selected : "", event?.assets || [])
      .then((img) => {
        if (!cancelled) setFrameImg(img);
      })
      .catch(notify);
    return () => {
      cancelled = true;
    };
  }, [frame, frameEnabled, event?.assets, notify]);
  useEffect(() => {
    let cancelled = false;
    setMontageFrameImg(null);
    const selected =
      event?.assets.find(
        (a) => a.id === montageFrame && a.kind === "montage-frame" && a.enabled,
      )?.id ||
      event?.assets.find((a) => a.kind === "montage-frame" && a.enabled)?.id ||
      "";
    assetImage(montageFrameEnabled ? selected : "", event?.assets || [])
      .then((img) => {
        if (!cancelled) setMontageFrameImg(img);
      })
      .catch(notify);
    return () => {
      cancelled = true;
    };
  }, [montageFrame, montageFrameEnabled, event?.assets, notify]);
  useEffect(() => {
    let cancelled = false;
    setQr("");
    if (event?.cloud && event.gallery)
      QRCode.toDataURL(event.gallery, {
        width: 240,
        margin: 1,
        color: { dark: "#193f38", light: "#ffffff" },
      })
        .then((src) => {
          if (!cancelled) setQr(src);
        })
        .catch(notify);
    return () => {
      cancelled = true;
    };
  }, [event?.cloud, event?.gallery, notify]);
  useEffect(() => {
    if (!event || view !== "booth" || !camera.ready) return;
    const draw = () => {
      try {
        let raw = camera.snapshot(eco ? 640 : 960);
        if (event.mirror) {
          const mirrored = canvas(raw.width, raw.height);
          const ctx = mirrored.getContext("2d")!;
          ctx.translate(raw.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(raw, 0, 0);
          raw = mirrored;
        }
        const out = compose(
          raw,
          filter,
          mode === "series" ? null : frameImg,
          [],
        );
        latestPreview.current = out;
        const target = preview.current;
        if (target) {
          if (target.width !== out.width) {
            target.width = out.width;
            target.height = out.height;
          }
          target.getContext("2d")!.drawImage(out, 0, 0);
        }
      } catch {
        /* Camera lifecycle hook owns connection errors. */
      }
    };
    draw();
    const timer = setInterval(draw, eco ? 100 : 50);
    return () => clearInterval(timer);
  }, [
    view,
    event?.id,
    event?.mirror,
    eco,
    camera.ready,
    camera.snapshot,
    filter,
    frameImg,
    mode,
  ]);
  const closeResult = useCallback(() => {
    setResult((current) => {
      if (current?.video) URL.revokeObjectURL(current.video);
      return null;
    });
  }, []);
  useEffect(() => {
    if (!result || !event) return;
    setReturnIn(event.returnSeconds);
    const timer = setInterval(() => setReturnIn((v) => v - 1), 1000);
    const timeout = setTimeout(closeResult, event.returnSeconds * 1000);
    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [result, event?.returnSeconds, closeResult]);
  async function showAdmin() {
    if (busy) return;
    if (boot?.unlocked) {
      setView("admin");
      return;
    }
    setPinModal(true);
  }
  async function countdown(seconds: number, label = "Préparez votre sourire") {
    setPhase(label);
    for (let i = seconds; i > 0; i--) {
      setCount(i);
      await delay(1000);
    }
    setCount(null);
  }
  async function captureOne(sessionId: string) {
    let raw: HTMLCanvasElement;
    let original: string | undefined;
    if (camera.actual.current.startsWith("digicam:")) {
      const img = await loadImage(
        await api<string>("nativeCapture", sessionId),
      );
      raw = canvas(img.width, img.height);
      raw.getContext("2d")!.drawImage(img, 0, 0);
    } else {
      raw = camera.fullSnapshot();
      original = jpeg(raw, 0.96);
    }
    const sized = canvas(
      Math.min(raw.width, eco ? 960 : 1920),
      Math.round(Math.min(raw.width, eco ? 960 : 1920) * 0.75),
    );
    drawCover(
      sized.getContext("2d")!,
      raw,
      sized.width,
      sized.height,
      raw.width,
      raw.height,
    );
    const out = compose(
      sized,
      filter,
      mode === "series" ? null : frameImg,
      stickerStudio.rendered,
    );
    const processed = jpeg(out);
    await api("saveFrame", { id: sessionId, original, processed });
    return processed;
  }
  async function recordVideo(sessionId: string) {
    const width = eco ? 640 : 1280;
    const targetFps = eco ? 10 : 15;
    let audio: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let audioError: Error | null = null;
    let writes = Promise.resolve();
    let thumbnail = "";
    try {
      if (event!.audio) {
        audio = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        const mime = ["audio/webm;codecs=opus", "audio/webm"].find((m) =>
          MediaRecorder.isTypeSupported(m),
        );
        if (!mime)
          throw new Error("Enregistrement du microphone indisponible.");
        recorder = new MediaRecorder(audio, { mimeType: mime });
        recorder.ondataavailable = (e) => {
          if (e.data.size)
            writes = writes
              .then(async () => {
                await api("appendAudio", {
                  id: sessionId,
                  data: new Uint8Array(await e.data.arrayBuffer()),
                });
              })
              .catch((e) => {
                audioError = e;
              });
        };
        recorder.onerror = () => {
          audioError = new Error("Le microphone a été interrompu.");
        };
        recorder.start(500);
      }
      const start = performance.now();
      let count = 0;
      while (
        count < event!.videoDuration * targetFps &&
        performance.now() - start < event!.videoDuration * 1000
      ) {
        const raw = camera.snapshot(width);
        const processed = jpeg(
          compose(raw, filter, frameImg, stickerStudio.rendered),
          0.9,
        );
        thumbnail = processed;
        await api("saveFrame", {
          id: sessionId,
          original: jpeg(raw, 0.94),
          processed,
        });
        count++;
        setPhase("Enregistrement en cours");
        setCount(
          Math.max(
            1,
            Math.ceil(
              event!.videoDuration - (performance.now() - start) / 1000,
            ),
          ),
        );
        if (audioError) throw audioError;
        await delay(
          Math.max(0, start + (count * 1000) / targetFps - performance.now()),
        );
      }
      const seconds = Math.max(0.05, (performance.now() - start) / 1000);
      if (recorder && recorder.state !== "inactive") {
        const stopped = new Promise<void>((resolve) => {
          recorder!.onstop = () => resolve();
        });
        recorder.stop();
        await stopped;
      }
      await writes;
      if (audioError) throw audioError;
      if (!count) throw new Error("Aucune image vidéo enregistrée.");
      setCount(null);
      return { thumb: thumbnail, seconds };
    } finally {
      if (recorder && recorder.state !== "inactive") {
        const stopped = new Promise<void>((resolve) => {
          recorder!.onstop = () => resolve();
        });
        recorder.stop();
        await stopped;
      }
      await writes;
      audio?.getTracks().forEach((track) => track.stop());
    }
  }
  async function capture() {
    if (!event || busyRef.current || !camera.ready) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    let id: string | undefined;
    try {
      id = await api<string>("startSession", mode);
      await countdown(event.countdown);
      let image = "",
        video: string | undefined,
        captureSeconds: number | undefined;
      const frames: string[] = [];
      if (mode === "video") {
        const recorded = await recordVideo(id);
        image = recorded.thumb;
        captureSeconds = recorded.seconds;
      } else if (mode === "gif" || mode === "boomerang") {
        const start = performance.now();
        let n = 0;
        const max = event.duration * event.fps;
        while (
          n < max &&
          (n < 2 || performance.now() - start < event.duration * 1000)
        ) {
          setPhase(
            `Bougez ! · ${Math.max(1, Math.ceil(event.duration - (performance.now() - start) / 1000))} s`,
          );
          const raw = camera.snapshot(eco ? 480 : 640);
          const processed = jpeg(
            compose(raw, filter, frameImg, stickerStudio.rendered),
            0.88,
          );
          await api("saveFrame", { id, original: jpeg(raw, 0.92), processed });
          if (n === 0) image = processed;
          n++;
          await delay(
            Math.max(0, start + (n * 1000) / event.fps - performance.now()),
          );
        }
      } else {
        const total = mode === "series" ? event.seriesCount : 1;
        for (let i = 0; i < total; i++) {
          setPhase(`Capture ${i + 1} / ${total}`);
          const image = await captureOne(id);
          frames.push(image);
          if (i < total - 1)
            await countdown(event.interval, `Photo ${i + 2} sur ${total}`);
        }
        image =
          mode === "series"
            ? jpeg(
                await montage(
                  frames,
                  event.layout,
                  event.name,
                  montageFrameEnabled ? montageFrameImg : null,
                ),
              )
            : frames[0];
      }
      setPhase("Vos souvenirs prennent forme…");
      const thumb = canvas(640, 480);
      const img = await loadImage(image);
      drawCover(thumb.getContext("2d")!, img, 640, 480, img.width, img.height);
      const saved = await api<{ id: string; outputs: string[] }>(
        "finishSession",
        { id, final: image, thumbnail: jpeg(thumb, 0.8), captureSeconds },
      );
      let animation: string | undefined;
      if (mode === "gif" || mode === "boomerang" || mode === "video")
        animation = await api<string>("resultPreview", saved.id).catch(
          () => undefined,
        );
      if (mode === "video" && animation) {
        video = animation;
        animation = undefined;
      }
      stickerStudio.clear();
      setResult({
        id: saved.id,
        image: animation || image,
        video,
        outputs: saved.outputs,
      });
    } catch (e) {
      notify(e);
      if (id) await api("abortSession", id).catch(() => {});
    } finally {
      setBusy(false);
      busyRef.current = false;
      setCount(null);
      setPhase("");
    }
  }
  if (!boot || !event)
    return (
      <div className="loading">
        <Aperture size={40} />
        <h1>Photobooth</h1>
        <p>{error || "Préparation de votre espace…"}</p>
      </div>
    );
  const native = camera.actual.current.startsWith("digicam:");
  return (
    <div className={"app-shell" + (view === "booth" ? " guest-shell" : "")}>
      {view === "admin" && (
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <Aperture size={25} />
            </span>
            <span>
              photobooth<span className="brand-dot">.</span>
            </span>
            <span className="brand-label">LES BONS MOMENTS RESTENT</span>
          </div>
          <div className="top-actions">
            <span className="offline-label">
              <span className="dot" /> Capture hors ligne
            </span>
            <button
              className="icon-button"
              title="Espace organisateur"
              aria-label="Espace organisateur"
              disabled={busy}
              onClick={showAdmin}
            >
              <Settings size={20} />
            </button>
          </div>
        </header>
      )}
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button aria-label="Fermer le message" onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}
      {view === "admin" ? (
        <Admin
          key={event.id}
          boot={boot}
          event={event}
          cameras={camera.cameras}
          onBoot={setBoot}
          onError={notify}
          onRefresh={camera.refresh}
          onClose={async () => {
            setBoot(await api("lock"));
            setView("booth");
          }}
        />
      ) : (
        <GuestView
          event={event}
          mode={mode}
          filter={filter}
          frame={mode === "series" ? montageFrame : frame}
          frameEnabled={mode === "series" ? montageFrameEnabled : frameEnabled}
          stickerAssets={stickerStudio.assets}
          stickers={stickerStudio.placements}
          readyStickerIds={new Set(stickerStudio.images.keys())}
          busy={busy}
          ready={camera.ready}
          native={native}
          status={camera.status}
          count={count}
          phase={phase}
          qr={qr}
          preview={preview}
          captureDisabled={
            busy ||
            !camera.ready ||
            !boot.pinConfigured ||
            (native && ["gif", "boomerang", "video"].includes(mode)) ||
            (mode === "series"
              ? montageFrameEnabled &&
                event.layout === "photomaton" &&
                event.assets.some(
                  (a) => a.enabled && a.kind === "montage-frame",
                ) &&
                !montageFrameImg
              : frameEnabled &&
                event.assets.some((a) => a.enabled && a.kind === "frame") &&
                !frameImg)
          }
          onMode={setMode}
          onFilter={setFilter}
          onFrame={mode === "series" ? setMontageFrame : setFrame}
          onFrameEnabled={
            mode === "series" ? setMontageFrameEnabled : setFrameEnabled
          }
          onAddSticker={stickerStudio.add}
          onMoveSticker={stickerStudio.move}
          onRemoveSticker={stickerStudio.remove}
          onCapture={capture}
          onAdmin={showAdmin}
          onReconnect={camera.reconnect}
          onRecent={() => setGallery(true)}
        />
      )}
      {(!boot.pinConfigured || pinModal) && (
        <PinDialog
          setup={!boot.pinConfigured}
          onClose={boot.pinConfigured ? () => setPinModal(false) : undefined}
          onSubmit={async (pin) => {
            setBoot(await api(boot.pinConfigured ? "unlock" : "setPin", pin));
            setPinModal(false);
            setView("admin");
          }}
        />
      )}
      {result && (
        <div className="modal-backdrop">
          <section
            className="result-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Votre souvenir"
          >
            {result.video ? (
              <video controls autoPlay loop src={result.video} />
            ) : (
              <img
                className="result-media"
                src={result.image}
                alt="Votre création enregistrée"
              />
            )}
            <div className="result-bottom">
              <span className="sr-only">
                Enregistré. Retour dans {returnIn} secondes.
              </span>
              {qr && (
                <img
                  className="result-qr"
                  src={qr}
                  alt="Scanner pour ouvrir la galerie"
                />
              )}
              <button className="button primary" onClick={closeResult}>
                Encore un souvenir <ArrowRight size={18} />
              </button>
            </div>
          </section>
        </div>
      )}
      {gallery && <Recent onClose={() => setGallery(false)} onError={notify} />}
    </div>
  );
}
function PinDialog({
  setup,
  onClose,
  onSubmit,
}: {
  setup: boolean;
  onClose?: () => void;
  onSubmit: (pin: string) => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div className="modal-backdrop">
      <form
        className="pin-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={setup ? "Créer votre PIN" : "Accès organisateur"}
        onSubmit={async (e) => {
          e.preventDefault();
          if (setup && pin !== confirm) {
            setError("Les deux codes sont différents.");
            return;
          }
          setPending(true);
          try {
            await onSubmit(pin);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setPending(false);
          }
        }}
      >
        {onClose && (
          <button
            className="modal-close"
            type="button"
            aria-label="Fermer"
            onClick={onClose}
          >
            <X />
          </button>
        )}
        <span className="dialog-icon">
          <Lock size={28} />
        </span>
        <div className="eyebrow">ESPACE ORGANISATEUR</div>
        <h2>
          {setup ? "Un code pour vos réglages." : "Bienvenue en coulisses."}
        </h2>
        <p>
          {setup
            ? "Choisissez un PIN de 4 ou 6 chiffres. Il protège les réglages et la sortie du kiosque."
            : "Saisissez votre PIN pour accéder aux réglages."}
        </p>
        <label>
          Code PIN
          <input
            autoFocus
            aria-label="Code PIN"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="(\d{4}|\d{6})"
            maxLength={6}
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        {setup && (
          <label>
            Confirmer le PIN
            <input
              aria-label="Confirmer le PIN"
              type="password"
              inputMode="numeric"
              pattern="(\d{4}|\d{6})"
              maxLength={6}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <button className="button primary" type="submit" disabled={pending}>
          {pending
            ? "Vérification…"
            : setup
              ? "Créer mon PIN"
              : "Déverrouiller"}
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}
function Recent({
  onClose,
  onError,
}: {
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let stop = false;
    api<Shot[]>("recent")
      .then(async (items) => {
        if (stop) return;
        setShots(items);
        setLoading(false);
        for (const item of items) {
          const image = await api<string | null>("thumbnail", item.id);
          if (stop) return;
          if (image) setThumbs((prev) => ({ ...prev, [item.id]: image }));
        }
      })
      .catch((e) => {
        setLoading(false);
        onError(e);
      });
    return () => {
      stop = true;
    };
  }, [onError]);
  return (
    <div className="modal-backdrop">
      <section
        className="recent-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Derniers souvenirs"
      >
        <button
          className="modal-close"
          aria-label="Fermer les souvenirs"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="eyebrow">L’ALBUM DE LA SOIRÉE</div>
        <h2>Les derniers souvenirs</h2>
        <p>Les 30 dernières sessions de cet événement.</p>
        <div className="recent-grid">
          {shots.map((s) => (
            <article key={s.id}>
              {thumbs[s.id] ? (
                <img src={thumbs[s.id]} alt={modeNames[s.mode]} />
              ) : (
                <div className="thumb-placeholder">
                  <Image size={32} />
                </div>
              )}
              <strong>{modeNames[s.mode]}</strong>
              <span>
                {new Date(s.createdAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                ·{" "}
                {s.status === "complete"
                  ? "Enregistré"
                  : s.status === "interrupted"
                    ? "Interrompu · originaux conservés"
                    : s.status === "failed"
                      ? "Échec · originaux conservés"
                      : "En cours"}
              </span>
            </article>
          ))}
        </div>
        {!shots.length && (
          <div className="empty-state">
            <Images size={40} />
            <h3>{loading ? "Chargement…" : "L’histoire commence ici."}</h3>
            <p>Vos prochaines captures apparaîtront dans cet album.</p>
          </div>
        )}
        <button className="button primary" onClick={onClose}>
          Retour à la capture
        </button>
      </section>
    </div>
  );
}
function Admin({
  boot,
  event,
  cameras,
  onBoot,
  onError,
  onRefresh,
  onClose,
}: {
  boot: Boot;
  event: EventConfig;
  cameras: Camera[];
  onBoot: (boot: Boot) => void;
  onError: (e: unknown) => void;
  onRefresh: () => Promise<unknown>;
  onClose: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<EventConfig>(event);
  const [tab, setTab] = useState("event");
  const [saveStatus, setSaveStatus] = useState("Enregistré");
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [diagnostics, setDiagnostics] = useState<Record<
    string,
    unknown
  > | null>(null);
  const initial = useRef(true);
  const queue = useRef(Promise.resolve());
  const latest = useRef(draft);
  latest.current = draft;
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const change = <K extends keyof EventConfig>(key: K, value: EventConfig[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const save = useCallback(
    async (config: EventConfig) => {
      setSaveStatus("Enregistrement…");
      const task = queue.current
        .catch(() => {})
        .then(async () => {
          const b = await api<Boot>("saveEvent", config);
          onBoot(b);
          setSaveStatus("Enregistré");
        });
      queue.current = task;
      try {
        await task;
      } catch (e) {
        setSaveStatus("À corriger");
        throw e;
      }
    },
    [onBoot],
  );
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    if (draft.cloud && !draft.gallery) {
      setSaveStatus("Lien de galerie requis");
      return;
    }
    debounce.current = setTimeout(() => save(draft).catch(onError), 650);
    return () => clearTimeout(debounce.current);
  }, [draft, save, onError]);
  const run = async (task: () => Promise<unknown>) => {
    clearTimeout(debounce.current);
    try {
      await save(latest.current);
      await task();
    } catch (e) {
      onError(e);
    }
  };
  const toggle = <T,>(values: T[], value: T) =>
    values.includes(value)
      ? values.length > 1
        ? values.filter((v) => v !== value)
        : values
      : [...values, value];
  const number = (
    key:
      | "countdown"
      | "seriesCount"
      | "interval"
      | "duration"
      | "fps"
      | "videoDuration"
      | "returnSeconds",
    label: string,
    min: number,
    max: number,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        disabled={key === "seriesCount" && draft.layout === "photomaton"}
        value={draft[key]}
        onChange={(e) =>
          change(
            key,
            Math.max(min, Math.min(max, Number(e.target.value) || min)),
          )
        }
      />
    </label>
  );
  const tabs = [
    { id: "event", name: "Événement", icon: FolderOpen },
    { id: "camera", name: "Caméra & capture", icon: CameraIcon },
    { id: "creative", name: "Cadres & effets", icon: Sparkles },
    { id: "sharing", name: "Stockage & partage", icon: QrCode },
    { id: "system", name: "Application", icon: Monitor },
  ];
  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <div className="eyebrow">LES COULISSES</div>
        <h1>Organisateur</h1>
        <p>Tout est prêt pour une belle soirée.</p>
        <nav>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={19} />
              {t.name}
              <ChevronRight size={16} />
            </button>
          ))}
        </nav>
        <div className="admin-save">
          <span
            className={"dot " + (saveStatus === "Enregistré" ? "" : "amber")}
          />
          {saveStatus}
        </div>
        <button className="button primary" onClick={() => run(onClose)}>
          <ArrowLeft size={18} /> Retour aux invités
        </button>
      </aside>
      <section className="admin-content">
        <div className="eyebrow">{event.name}</div>
        <h2>{tabs.find((t) => t.id === tab)?.name}</h2>
        {tab === "event" && (
          <>
            <div className="settings-card">
              <h3>Votre événement</h3>
              <label>
                Nom de l’événement
                <input
                  value={draft.name}
                  maxLength={100}
                  onChange={(e) => change("name", e.target.value)}
                />
              </label>
              <label>
                Événement actif
                <select
                  aria-label="Événement actif"
                  value={event.id}
                  onChange={(e) =>
                    run(async () =>
                      onBoot(await api("selectEvent", e.target.value)),
                    )
                  }
                >
                  {boot.events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="new-event">
                <input
                  aria-label="Nom du nouvel événement"
                  placeholder="Un autre événement…"
                  value={newName}
                  maxLength={100}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button
                  className="button secondary"
                  disabled={!newName.trim()}
                  onClick={() =>
                    run(async () => onBoot(await api("createEvent", newName)))
                  }
                >
                  <Plus size={18} /> Créer
                </button>
              </div>
            </div>
            <div className="settings-card">
              <h3>Configurations réutilisables</h3>
              <p>
                Les cadres et stickers sont inclus. Un import crée un nouvel
                événement dans votre dossier de stockage actuel.
              </p>
              <div className="button-row">
                <button
                  className="button secondary"
                  onClick={() => run(() => api("exportEvent"))}
                >
                  <Download size={18} /> Exporter / créer un modèle
                </button>
                <button
                  className="button secondary"
                  onClick={() =>
                    run(async () => onBoot(await api("importEvent")))
                  }
                >
                  <Upload size={18} /> Importer un modèle
                </button>
              </div>
            </div>
          </>
        )}
        {tab === "camera" && (
          <>
            <div className="settings-card">
              <div className="card-heading">
                <h3>Source d’image</h3>
                <button
                  className="button subtle"
                  onClick={() => onRefresh().catch(onError)}
                >
                  <RefreshCw size={16} /> Rechercher
                </button>
              </div>
              <label>
                Caméra
                <select
                  value={draft.camera}
                  onChange={(e) => change("camera", e.target.value)}
                >
                  {!cameras.some((c) => c.id === draft.camera) && (
                    <option value={draft.camera}>
                      {draft.camera} · déconnectée
                    </option>
                  )}
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="info-note">
                La simulation sert aux tests sans matériel. Le pilote
                digiCamControl nécessite son serveur web local sur le port 5513
                ; seuls la photo et la série sont activés avant les tests
                matériels.
              </div>
              <div className="form-grid">
                <label>
                  Qualité
                  <select
                    value={draft.quality}
                    onChange={(e) =>
                      change(
                        "quality",
                        e.target.value as EventConfig["quality"],
                      )
                    }
                  >
                    <option value="auto">Automatique</option>
                    <option value="eco">Économique</option>
                    <option value="high">Haute</option>
                  </select>
                </label>
                {number("countdown", "Compte à rebours (secondes)", 1, 15)}
                {number(
                  "returnSeconds",
                  "Retour après résultat (secondes)",
                  3,
                  60,
                )}
              </div>
              <CheckField
                label="Aperçu miroir (les fichiers gardent leur sens naturel)"
                checked={draft.mirror}
                onChange={(v) => change("mirror", v)}
              />
            </div>
            <div className="settings-card">
              <h3>Modes proposés aux invités</h3>
              <div className="checkbox-list">
                {(Object.keys(modeNames) as Mode[]).map((m) => (
                  <CheckField
                    key={m}
                    label={modeNames[m]}
                    checked={draft.modes.includes(m)}
                    onChange={() => change("modes", toggle(draft.modes, m))}
                  />
                ))}
              </div>
              <div className="form-grid">
                {number("seriesCount", "Photos par série", 2, 12)}
                {number("interval", "Intervalle entre photos (s)", 1, 15)}
                <label>
                  Format du montage
                  <select
                    value={draft.layout}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        layout: e.target.value as EventConfig["layout"],
                        ...(e.target.value === "photomaton"
                          ? { seriesCount: 6 }
                          : {}),
                      }))
                    }
                  >
                    <option value="photomaton">
                      Photomaton 6 photos · vertical 2 × 3
                    </option>
                    <option value="grid">Grille paysage</option>
                    <option value="strip">Bande verticale</option>
                    <option value="square">Grille compacte</option>
                  </select>
                </label>
                {number("duration", "Capture GIF / boomerang (s)", 1, 30)}
                {number("fps", "Lecture GIF / boomerang (images/s)", 2, 15)}
                {number("videoDuration", "Durée vidéo maximale (s)", 1, 60)}
              </div>
              <CheckField
                label="Enregistrer le microphone avec la vidéo"
                checked={draft.audio}
                onChange={(v) => change("audio", v)}
              />
            </div>
          </>
        )}
        {tab === "creative" && (
          <>
            <FrameTemplates onError={onError} />
            <div className="settings-card">
              <h3>Filtres disponibles</h3>
              <div className="checkbox-list">
                {(Object.keys(filterNames) as Filter[]).map((f) => (
                  <CheckField
                    key={f}
                    label={filterNames[f]}
                    checked={draft.filters.includes(f)}
                    onChange={() => change("filters", toggle(draft.filters, f))}
                  />
                ))}
              </div>
            </div>
            <div className="settings-card">
              <div className="card-heading">
                <div>
                  <h3>Cadres & stickers PNG</h3>
                  <p>
                    Cadres photo au ratio 4:3. Cadres photomaton : 1800 × 2400
                    px, appliqués une fois au montage. Les fenêtres des photos
                    doivent rester transparentes.
                  </p>
                </div>
              </div>
              <div className="button-row">
                {(["frame", "montage-frame", "sticker"] as const).map(
                  (kind) => (
                    <button
                      key={kind}
                      className="button secondary"
                      onClick={async () => {
                        try {
                          const asset = await api<Asset | null>(
                            "importAsset",
                            kind,
                          );
                          if (asset) change("assets", [...draft.assets, asset]);
                        } catch (e) {
                          onError(e);
                        }
                      }}
                    >
                      <Plus size={18} />
                      {kind === "frame"
                        ? "Importer un cadre"
                        : kind === "montage-frame"
                          ? "Importer un cadre photomaton"
                          : "Importer un sticker"}
                    </button>
                  ),
                )}
              </div>
              <div className="asset-grid">
                {draft.assets.map((a) => (
                  <article key={a.id}>
                    <div className="asset-thumb">
                      <img src={a.data} alt={a.name} />
                    </div>
                    <CheckField
                      label={a.name}
                      checked={a.enabled}
                      onChange={(v) =>
                        change(
                          "assets",
                          draft.assets.map((item) =>
                            item.id === a.id ? { ...item, enabled: v } : item,
                          ),
                        )
                      }
                    />
                    <span>
                      {a.kind === "frame"
                        ? "Cadre photo"
                        : a.kind === "montage-frame"
                          ? "Cadre photomaton"
                          : "Sticker"}
                    </span>
                  </article>
                ))}
              </div>
              {!draft.assets.length && (
                <p className="muted">
                  Importez vos éléments transparents pour personnaliser cet
                  événement.
                </p>
              )}
            </div>
          </>
        )}
        {tab === "sharing" && (
          <>
            <div className="settings-card">
              <h3>Stockage local</h3>
              <p>
                Les fichiers sont conservés sans suppression automatique. Chaque
                événement possède son propre dossier stable, même si vous le
                renommez.
              </p>
              <label>
                Dossier parent
                <input readOnly value={draft.storage} />
              </label>
              <div className="button-row">
                <button
                  className="button secondary"
                  onClick={async () => {
                    try {
                      const folder = await api<string | null>("chooseStorage");
                      if (folder) change("storage", folder);
                    } catch (e) {
                      onError(e);
                    }
                  }}
                >
                  <FolderOpen size={18} /> Choisir le dossier
                </button>
                <button
                  className="button subtle"
                  onClick={() => run(() => api("openStorage"))}
                >
                  Ouvrir les fichiers <ChevronRight size={16} />
                </button>
              </div>
              <div className="info-note">
                Changer le dossier ne déplace pas les captures existantes. Elles
                restent dans l’ancien emplacement.
              </div>
            </div>
            <div className="settings-card">
              <h3>Galerie kDrive</h3>
              <CheckField
                label="Afficher le QR code de la galerie"
                checked={draft.cloud}
                onChange={(v) => change("cloud", v)}
              />
              <label>
                Lien HTTPS du dossier public
                <input
                  type="url"
                  placeholder="https://…"
                  value={draft.gallery}
                  onChange={(e) => change("gallery", e.target.value)}
                />
              </label>
              <div className="info-note">
                1. Synchronisez le dossier de stockage avec l’application
                kDrive.
                <br />
                2. Partagez le sous-dossier <strong>public</strong> de
                l’événement.
                <br />
                3. Collez son lien ici. Les originaux restent en dehors de ce
                sous-dossier public.
                <br />
                <br />
                Le QR code ouvre ce lien. Les délais et l’état des transferts
                sont gérés par kDrive.
              </div>
            </div>
          </>
        )}
        {tab === "system" && (
          <>
            <div className="settings-card">
              <h3>Mode kiosque</h3>
              <p>
                Le plein écran protège les commandes de l’application. Les
                raccourcis et protections système dépendent de la configuration
                Windows.
              </p>
              <button
                className="button primary"
                onClick={() =>
                  run(async () => {
                    onBoot(await api("kiosk", !boot.kiosk));
                    if (!boot.kiosk) await onClose();
                  })
                }
              >
                <Monitor size={18} />
                {boot.kiosk ? "Quitter le plein écran" : "Lancer le kiosque"}
              </button>
            </div>
            <div className="settings-card">
              <h3>Changer le PIN</h3>
              <div className="new-event">
                <input
                  type="password"
                  aria-label="Nouveau PIN"
                  inputMode="numeric"
                  placeholder="Nouveau PIN à 4 ou 6 chiffres"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                />
                <button
                  className="button secondary"
                  disabled={!/^(\d{4}|\d{6})$/.test(newPin)}
                  onClick={async () => {
                    try {
                      onBoot(await api("setPin", newPin));
                      setNewPin("");
                      setSaveStatus("PIN modifié");
                    } catch (e) {
                      onError(e);
                    }
                  }}
                >
                  <Lock size={16} /> Modifier
                </button>
              </div>
            </div>
            <div className="settings-card">
              <h3>Diagnostic du PC</h3>
              <p>
                À consulter sur le PC du photobooth lors des essais matériels.
              </p>
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    setDiagnostics(await api("diagnostics"));
                  } catch (e) {
                    onError(e);
                  }
                }}
              >
                <RefreshCw size={17} /> Relever la configuration
              </button>
              {diagnostics && (
                <dl className="diagnostics">
                  {Object.entries(diagnostics).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="check-field">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function FrameTemplates({ onError }: { onError: (e: unknown) => void }) {
  const [message, setMessage] = useState("");
  return (
    <div className="settings-card">
      <h3>Modèles de cadres personnalisables</h3>
      <p>
        Téléchargez le modèle PNG, ajoutez vos textes et décorations, puis
        importez-le comme cadre. Conservez ses dimensions et la transparence des
        fenêtres photo. Les repères sont un guide séparé, à ne pas importer.
      </p>
      <div className="template-cards">
        {(
          [
            {
              kind: "photo",
              title: "Photo classique",
              dimensions: "1800 × 1350 px · 4:3",
              image: photoGuide,
            },
            {
              kind: "photomaton",
              title: "Photomaton 6 photos",
              dimensions: "1800 × 2400 px · 2 colonnes × 3 rangées",
              image: montageGuide,
            },
          ] as const
        ).map((template) => (
          <article className="template-card" key={template.kind}>
            <img
              src={template.image}
              alt={"Repères du cadre " + template.title}
            />
            <h4>{template.title}</h4>
            <p>{template.dimensions}</p>
            <div className="button-row">
              {[false, true].map((guide) => (
                <button
                  key={String(guide)}
                  className="button secondary"
                  onClick={async () => {
                    try {
                      const saved = await api<boolean>("exportFrameTemplate", {
                        kind: template.kind,
                        guide,
                      });
                      if (saved) setMessage("Fichier enregistré.");
                    } catch (e) {
                      onError(e);
                    }
                  }}
                >
                  <Download size={16} />
                  {guide ? "Repères PNG" : "Modèle PNG"}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
