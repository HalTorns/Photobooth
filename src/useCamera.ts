import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Camera, type EventConfig } from "./types";
import { canvas, drawCover, loadImage, simulation } from "./imaging";
export function useCamera(event: EventConfig | null, eco: boolean) {
  const video = useRef<HTMLVideoElement>(document.createElement("video"));
  const stream = useRef<MediaStream | null>(null);
  const nativeFrame = useRef<HTMLImageElement | null>(null);
  const actual = useRef("simulation");
  const readyRef = useRef(false);
  const [cameras, setCameras] = useState<Camera[]>([
    { id: "simulation", label: "Caméra simulée", kind: "simulation" },
  ]);
  const [status, setStatus] = useState("Connexion…");
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(async () => {
    const devices = await navigator.mediaDevices
      .enumerateDevices()
      .catch(() => []);
    const webcams: Camera[] = devices
      .filter((d) => d.kind === "videoinput")
      .map((d, i) => ({
        id: `webcam:${d.deviceId}`,
        label: d.label || `Webcam ${i + 1}`,
        kind: "webcam",
      }));
    const dcc: Camera[] = await api("cameras").catch(() => []);
    setCameras([
      { id: "simulation", label: "Caméra simulée", kind: "simulation" },
      { id: "auto", label: "Détection automatique", kind: "auto" },
      ...webcams,
      ...dcc,
    ]);
    return { webcams, dcc };
  }, []);
  useEffect(() => {
    void refresh();
    navigator.mediaDevices.addEventListener("devicechange", refresh);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", refresh);
  }, [refresh]);
  useEffect(() => {
    if (!event) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout>;
    let polling = false;
    function mark(value: boolean, message: string) {
      if (stopped) return;
      readyRef.current = value;
      setReady(value);
      setStatus(message);
    }
    async function connect() {
      if (stopped) return;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      nativeFrame.current = null;
      mark(false, "Connexion à la caméra…");
      try {
        let id = event!.camera;
        if (id === "auto") {
          const { webcams, dcc } = await refresh();
          id = webcams[0]?.id || dcc[0]?.id || "";
          if (!id)
            throw new Error(
              "Aucune caméra détectée. Branchez une webcam ou lancez digiCamControl.",
            );
        }
        if (stopped) return;
        actual.current = id;
        await api("connectCamera", id);
        if (stopped) return;
        if (id === "simulation") {
          mark(true, "Simulation active");
          return;
        }
        if (id.startsWith("webcam:")) {
          const media = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: id.slice(7) },
              width: { ideal: eco ? 960 : 1920 },
              height: { ideal: eco ? 720 : 1080 },
            },
            audio: false,
          });
          if (stopped) {
            media.getTracks().forEach((t) => t.stop());
            return;
          }
          stream.current = media;
          video.current.srcObject = media;
          video.current.muted = true;
          video.current.playsInline = true;
          await video.current.play();
          media.getVideoTracks()[0].onended = () => {
            mark(false, "Caméra déconnectée · reconnexion…");
            retry = setTimeout(connect, 3000);
          };
          mark(true, "Caméra connectée");
          void refresh();
          return;
        }
        if (id.startsWith("digicam:")) {
          if (stopped) return;
          polling = true;
          while (!stopped && polling) {
            try {
              nativeFrame.current = await loadImage(await api("cameraPreview"));
              mark(true, "digiCamControl connecté · pilote expérimental");
            } catch {
              mark(false, "Aperçu indisponible · reconnexion…");
              await new Promise((r) => setTimeout(r, 2500));
              await api("connectCamera", id).catch(() => {});
            }
            await new Promise((r) => setTimeout(r, eco ? 300 : 150));
          }
          return;
        }
        throw new Error("Caméra inconnue. Choisissez une caméra disponible.");
      } catch (e) {
        mark(false, (e as Error).message);
        retry = setTimeout(connect, 5000);
      }
    }
    void connect();
    return () => {
      stopped = true;
      polling = false;
      clearTimeout(retry);
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      readyRef.current = false;
    };
  }, [event?.camera, eco, revision, refresh]);
  const snapshot = useCallback((width = 1280) => {
    if (!readyRef.current) throw new Error("La caméra n’est pas prête.");
    const c = canvas(width, Math.round((width * 3) / 4));
    const ctx = c.getContext("2d")!;
    if (actual.current === "simulation") {
      simulation(ctx, c.width, c.height, Date.now());
      return c;
    }
    const source = actual.current.startsWith("digicam:")
      ? nativeFrame.current
      : video.current;
    if (!source) throw new Error("Aucune image disponible.");
    const sw =
      source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const sh =
      source instanceof HTMLVideoElement ? source.videoHeight : source.height;
    if (!sw || !sh) throw new Error("Aucune image disponible.");
    drawCover(ctx, source, c.width, c.height, sw, sh);
    return c;
  }, []);
  const fullSnapshot = useCallback(() => {
    if (actual.current.startsWith("webcam:")) {
      const v = video.current;
      if (!v.videoWidth) throw new Error("Caméra indisponible.");
      const c = canvas(v.videoWidth, v.videoHeight);
      c.getContext("2d")!.drawImage(v, 0, 0);
      return c;
    }
    return snapshot(eco ? 1280 : 1920);
  }, [snapshot, eco]);
  return {
    cameras,
    status,
    ready,
    snapshot,
    fullSnapshot,
    refresh,
    reconnect: () => setRevision((v) => v + 1),
    isNative: actual.current.startsWith("digicam:"),
    actual,
  };
}
