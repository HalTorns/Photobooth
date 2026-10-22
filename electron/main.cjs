const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  session,
  shell,
} = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");
const { z } = require("zod");
const {
  eventSchema,
  defaultEvent,
  eventRoot,
  atomicWrite,
  hashPin,
  verifyPin,
  decodeImage,
} = require("./config.cjs");
const { DigiCam } = require("./digicam.cjs");
const { encodeAnimation, encodeFrameVideo } = require("./media.cjs");
app.setName("Photobooth");
if (process.env.PHOTOBOOTH_DATA)
  app.setPath("userData", path.resolve(process.env.PHOTOBOOTH_DATA));
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
let win,
  state,
  configFile,
  unlocked = false,
  kiosk = false,
  activeSession = null;
let failedPins = 0,
  nextPinAttempt = 0,
  connectedCamera = "",
  nativeCaptureBusy = false;
const digicam = new DigiCam();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function activeEvent() {
  return state.events.find((e) => e.id === state.activeId);
}
function admin() {
  if (!unlocked) throw new Error("Déverrouillez l’espace organisateur.");
}
function idle() {
  if (activeSession) throw new Error("Une capture est en cours.");
}
async function persist() {
  await atomicWrite(configFile, JSON.stringify(state, null, 2));
}
function publicState() {
  return {
    events: state.events,
    activeId: state.activeId,
    pinConfigured: !!state.pin,
    unlocked,
    kiosk,
    version: app.getVersion(),
    profile:
      os.totalmem() < 6 * 1024 ** 3 || os.cpus().length < 4
        ? "eco"
        : "standard",
  };
}
async function load() {
  configFile = path.join(app.getPath("userData"), "settings.json");
  try {
    const raw = JSON.parse(await fs.readFile(configFile, "utf8"));
    const schema = z.object({
      version: z.literal(1),
      pin: z
        .object({ salt: z.string().length(32), hash: z.string().length(64) })
        .nullable(),
      activeId: z.string().uuid(),
      events: z.array(eventSchema).min(1).max(100),
    });
    state = schema.parse(raw);
    if (!state.events.some((e) => e.id === state.activeId))
      throw new Error("Événement actif introuvable.");
  } catch (e) {
    if (e.code !== "ENOENT")
      throw new Error(
        "Configuration illisible. Vos fichiers ont été conservés. Restaurez settings.json depuis une sauvegarde. " +
          e.message,
      );
    const event = defaultEvent(
      path.join(app.getPath("pictures"), "Photobooth"),
    );
    state = { version: 1, pin: null, activeId: event.id, events: [event] };
    await persist();
  }
}
async function manifest(record) {
  await atomicWrite(
    path.join(record.root, "sessions", record.id + ".json"),
    JSON.stringify(
      {
        ...record,
        frames: record.frames.map((f) => path.relative(record.root, f)),
      },
      null,
      2,
    ),
  );
}
function checkSession(id) {
  if (!activeSession || id !== activeSession.id)
    throw new Error("Session de capture invalide.");
  return activeSession;
}
async function availableDisk(root) {
  await fs.mkdir(root, { recursive: true });
  const disk = await fs.statfs(root);
  return Number(disk.bavail) * Number(disk.bsize);
}
function imageData(buffer) {
  return "data:image/jpeg;base64," + buffer.toString("base64");
}
function trustedURL(url) {
  return process.env.PHOTOBOOTH_DEV
    ? url.startsWith("http://127.0.0.1:5173/")
    : url ===
        require("node:url").pathToFileURL(
          path.join(__dirname, "../dist/index.html"),
        ).href;
}
const handlers = {
  boot: async () => publicState(),
  unlock: async (input) => {
    const pin = z
      .string()
      .regex(/^(\d{4}|\d{6})$/)
      .parse(input);
    if (Date.now() < nextPinAttempt)
      throw new Error("Trop de tentatives. Réessayez dans 30 secondes.");
    if (!state.pin || !verifyPin(pin, state.pin)) {
      failedPins++;
      if (failedPins >= 5) {
        nextPinAttempt = Date.now() + 30_000;
        failedPins = 0;
      }
      throw new Error("Code PIN incorrect.");
    }
    failedPins = 0;
    unlocked = true;
    return publicState();
  },
  setPin: async (input) => {
    if (state.pin) admin();
    const pin = z
      .string()
      .regex(/^(\d{4}|\d{6})$/)
      .parse(input);
    state.pin = hashPin(pin);
    unlocked = true;
    await persist();
    return publicState();
  },
  lock: async () => {
    if (!state.pin) throw new Error("Créez d’abord un PIN.");
    unlocked = false;
    return publicState();
  },
  kiosk: async (enabled) => {
    admin();
    idle();
    if (typeof enabled !== "boolean") throw new Error("Paramètre invalide.");
    kiosk = enabled;
    win.setKiosk(enabled);
    if (enabled) unlocked = false;
    return publicState();
  },
  chooseStorage: async () => {
    admin();
    const r = await dialog.showOpenDialog(win, {
      title: "Dossier de stockage des événements",
      properties: ["openDirectory", "createDirectory"],
    });
    return r.canceled ? null : r.filePaths[0];
  },
  saveEvent: async (input) => {
    admin();
    idle();
    const event = eventSchema.parse(input);
    if (!path.isAbsolute(event.storage))
      throw new Error("Choisissez un dossier absolu.");
    if (event.cloud && !event.gallery)
      throw new Error("Renseignez le lien public de la galerie kDrive.");
    const i = state.events.findIndex((e) => e.id === event.id);
    if (i < 0) throw new Error("Événement introuvable.");
    await fs.mkdir(eventRoot(event), { recursive: true });
    state.events[i] = event;
    await persist();
    return publicState();
  },
  createEvent: async (input) => {
    admin();
    idle();
    if (state.events.length >= 100)
      throw new Error("Limite de 100 événements atteinte.");
    const name = z.string().trim().min(1).max(100).parse(input);
    const event = defaultEvent(activeEvent().storage);
    event.name = name;
    state.events.push(event);
    state.activeId = event.id;
    await persist();
    return publicState();
  },
  selectEvent: async (input) => {
    admin();
    idle();
    if (!state.events.some((e) => e.id === input))
      throw new Error("Événement introuvable.");
    state.activeId = input;
    await persist();
    return publicState();
  },
  exportEvent: async () => {
    admin();
    const r = await dialog.showSaveDialog(win, {
      title: "Exporter une configuration / un modèle",
      defaultPath: "photobooth-evenement.json",
      filters: [{ name: "Configuration Photobooth", extensions: ["json"] }],
    });
    if (!r.canceled) {
      const { storage, ...event } = activeEvent();
      await atomicWrite(
        r.filePath,
        JSON.stringify(
          { format: "photobooth-event", version: 1, event },
          null,
          2,
        ),
      );
      return true;
    }
    return false;
  },
  importEvent: async () => {
    admin();
    idle();
    if (state.events.length >= 100)
      throw new Error("Limite de 100 événements atteinte.");
    const r = await dialog.showOpenDialog(win, {
      filters: [{ name: "Configuration Photobooth", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (r.canceled) return publicState();
    const stat = await fs.stat(r.filePaths[0]);
    if (stat.size > 25_000_000)
      throw new Error("Configuration trop volumineuse.");
    const raw = JSON.parse(await fs.readFile(r.filePaths[0], "utf8"));
    if (raw.format !== "photobooth-event" || raw.version !== 1)
      throw new Error("Format de configuration inconnu.");
    const event = eventSchema.parse({
      ...raw.event,
      id: crypto.randomUUID(),
      storage: activeEvent().storage,
    });
    state.events.push(event);
    state.activeId = event.id;
    await persist();
    return publicState();
  },
  importAsset: async (kind) => {
    admin();
    z.enum(["frame", "sticker"]).parse(kind);
    const r = await dialog.showOpenDialog(win, {
      title:
        kind === "frame"
          ? "Importer un cadre transparent"
          : "Importer un sticker",
      filters: [{ name: "PNG transparent", extensions: ["png"] }],
      properties: ["openFile"],
    });
    if (r.canceled) return null;
    const file = r.filePaths[0];
    if ((await fs.stat(file)).size > 8_000_000)
      throw new Error("PNG trop volumineux (8 Mo maximum).");
    const bytes = await fs.readFile(file);
    if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
      throw new Error("Fichier PNG invalide.");
    return {
      id: crypto.randomUUID(),
      name: path.basename(file),
      kind,
      enabled: true,
      data: "data:image/png;base64," + bytes.toString("base64"),
    };
  },
  cameras: async () => digicam.list(),
  connectCamera: async (input) => {
    const id = z.string().max(300).parse(input);
    const configured = activeEvent().camera;
    if (configured !== "auto" && id !== configured)
      throw new Error("Caméra non autorisée.");
    if (nativeCaptureBusy) return true;
    if (id.startsWith("digicam:")) await digicam.select(id);
    connectedCamera = id;
    return true;
  },
  cameraPreview: async () => {
    if (!connectedCamera.startsWith("digicam:"))
      throw new Error("Pilote non actif.");
    if (nativeCaptureBusy) throw new Error("Prise de vue en cours.");
    return digicam.preview();
  },
  startSession: async (input) => {
    idle();
    if (!state.pin)
      throw new Error("Configurez votre PIN organisateur avant une capture.");
    const event = activeEvent();
    const mode = z
      .enum(["photo", "series", "gif", "boomerang", "video"])
      .parse(input);
    if (!event.modes.includes(mode))
      throw new Error("Ce mode n’est pas autorisé.");
    if (
      (event.camera === "auto" ? connectedCamera : event.camera).startsWith(
        "digicam:",
      ) &&
      ["gif", "boomerang", "video"].includes(mode)
    )
      throw new Error("Mode non validé pour le pilote digiCamControl.");
    const root = eventRoot(event);
    if ((await availableDisk(root)) < 150 * 1024 ** 2)
      throw new Error("Espace disque insuffisant : moins de 150 Mo libres.");
    const record = {
      id: crypto.randomUUID(),
      eventId: event.id,
      root,
      mode,
      status: "capturing",
      createdAt: new Date().toISOString(),
      originals: [],
      frames: [],
      outputs: [],
      fps: event.fps,
    };
    await manifest(record);
    activeSession = record;
    return record.id;
  },
  nativeCapture: async (id) => {
    const s = checkSession(id);
    const camera =
      activeEvent().camera === "auto" ? connectedCamera : activeEvent().camera;
    if (!camera.startsWith("digicam:")) throw new Error("Pilote non actif.");
    if (nativeCaptureBusy) throw new Error("Prise de vue déjà en cours.");
    nativeCaptureBusy = true;
    let bytes;
    try {
      bytes = await digicam.capture(camera);
    } finally {
      nativeCaptureBusy = false;
    }
    const file = path.join(
      s.root,
      "originaux",
      s.id,
      `${String(s.originals.length).padStart(4, "0")}.jpg`,
    );
    await atomicWrite(file, bytes);
    s.originals.push(path.relative(s.root, file));
    await manifest(s);
    return imageData(bytes);
  },
  saveFrame: async (input) => {
    const s = checkSession(input?.id);
    if (s.frames.length >= (s.mode === "video" ? 900 : 450))
      throw new Error("Limite de captures atteinte.");
    if (input.original) {
      const raw = decodeImage(input.original);
      const file = path.join(
        s.root,
        "originaux",
        s.id,
        `${String(s.frames.length).padStart(4, "0")}.jpg`,
      );
      await atomicWrite(file, raw);
      s.originals.push(path.relative(s.root, file));
    }
    const processed = decodeImage(input.processed);
    const file = path.join(
      s.root,
      "originaux",
      s.id,
      "traitement",
      `${String(s.frames.length).padStart(4, "0")}.jpg`,
    );
    await atomicWrite(file, processed);
    s.frames.push(file);
    await manifest(s);
    return true;
  },
  appendAudio: async (input) => {
    const s = checkSession(input?.id);
    if (s.mode !== "video" || s.status !== "capturing")
      throw new Error("Session vidéo invalide.");
    const bytes = input.data;
    if (
      !(bytes instanceof Uint8Array) ||
      bytes.length < 1 ||
      bytes.length > 10_000_000
    )
      throw new Error("Segment vidéo invalide.");
    s.videoBytes = (s.videoBytes || 0) + bytes.length;
    if (s.videoBytes > 600_000_000) throw new Error("Limite vidéo atteinte.");
    const file = path.join(s.root, "originaux", s.id, "microphone.webm");
    await fs.mkdir(path.dirname(file), { recursive: true });
    const handle = await fs.open(file, "a");
    try {
      await handle.writeFile(Buffer.from(bytes));
      await handle.sync();
    } finally {
      await handle.close();
    }
    if (!s.originals.includes(path.relative(s.root, file)))
      s.originals.push(path.relative(s.root, file));
    s.audioFile = path.relative(s.root, file);
    await manifest(s);
    return true;
  },
  finishSession: async (input) => {
    const s = checkSession(input?.id);
    if (s.status !== "capturing")
      throw new Error("Session déjà en traitement.");
    s.status = "processing";
    await manifest(s);
    try {
      const folder = {
        photo: "photos",
        series: "montages",
        gif: "gifs",
        boomerang: "boomerangs",
        video: "videos",
      }[s.mode];
      const dir = path.join(s.root, "public", folder);
      await fs.mkdir(dir, { recursive: true });
      const stem = `${s.createdAt.replace(/[:.]/g, "-")}_${s.id.slice(0, 8)}`;
      if (s.mode === "video") {
        if (!s.frames.length)
          throw new Error("Aucune image vidéo enregistrée.");
        const seconds = z
          .number()
          .min(0.05)
          .max(65)
          .parse(input.captureSeconds);
        const duration = Math.min(activeEvent().videoDuration, seconds);
        const rawFrames = s.originals
          .filter((f) => f.endsWith(".jpg"))
          .map((f) => path.join(s.root, f));
        const originalVideo = path.join(
          s.root,
          "originaux",
          s.id,
          "video.webm",
        );
        s.outputs = await encodeFrameVideo(
          rawFrames,
          s.frames,
          originalVideo,
          path.join(dir, stem + ".mp4"),
          s.frames.length / duration,
          s.audioFile ? path.join(s.root, s.audioFile) : null,
          duration,
        );
        s.originals.push(path.relative(s.root, originalVideo));
      } else if (["gif", "boomerang"].includes(s.mode)) {
        if (s.frames.length < 2)
          throw new Error("Pas assez d’images pour l’animation.");
        s.outputs = await encodeAnimation(
          s.frames,
          dir,
          stem,
          s.fps,
          s.mode === "boomerang",
        );
      } else {
        if (!s.frames.length) throw new Error("Aucune photo enregistrée.");
        const output = path.join(dir, stem + ".jpg");
        await atomicWrite(output, decodeImage(input.final));
        s.outputs = [output];
      }
      if (input.thumbnail)
        await atomicWrite(
          path.join(s.root, "sessions", s.id + ".jpg"),
          decodeImage(input.thumbnail),
        );
      s.outputs = s.outputs.map((f) => path.relative(s.root, f));
      s.status = "complete";
      await manifest(s);
      return { id: s.id, outputs: s.outputs, root: s.root };
    } catch (e) {
      s.status = "failed";
      s.error = e.message;
      await manifest(s);
      throw e;
    } finally {
      activeSession = null;
    }
  },
  abortSession: async (id) => {
    const s = checkSession(id);
    if (s.status === "processing") throw new Error("Traitement en cours.");
    s.status = "interrupted";
    await manifest(s);
    activeSession = null;
    return true;
  },
  recent: async () => {
    const root = eventRoot(activeEvent());
    const folder = path.join(root, "sessions");
    let names;
    try {
      names = await fs.readdir(folder);
    } catch (e) {
      if (e.code === "ENOENT") return [];
      throw e;
    }
    const records = await Promise.all(
      names
        .filter((n) => n.endsWith(".json"))
        .map(async (name) => {
          try {
            return JSON.parse(
              await fs.readFile(path.join(folder, name), "utf8"),
            );
          } catch {
            return null;
          }
        }),
    );
    return records
      .filter(Boolean)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30)
      .map(({ id, mode, status, createdAt, outputs, error }) => ({
        id,
        mode,
        status:
          activeSession?.id === id
            ? status
            : ["capturing", "processing"].includes(status)
              ? "interrupted"
              : status,
        createdAt,
        outputs,
        error,
      }));
  },
  thumbnail: async (id) => {
    z.string().uuid().parse(id);
    try {
      return imageData(
        await fs.readFile(
          path.join(eventRoot(activeEvent()), "sessions", id + ".jpg"),
        ),
      );
    } catch {
      return null;
    }
  },
  resultPreview: async (id) => {
    z.string().uuid().parse(id);
    const root = eventRoot(activeEvent());
    const record = JSON.parse(
      await fs.readFile(path.join(root, "sessions", id + ".json"), "utf8"),
    );
    const output =
      record.outputs.find((f) => f.endsWith(".gif")) ||
      record.outputs.find((f) => f.endsWith(".mp4"));
    if (!output) return null;
    const file = path.resolve(root, output);
    if (!file.startsWith(root + path.sep)) throw new Error("Chemin invalide.");
    if ((await fs.stat(file)).size > 35_000_000) return null;
    return (
      (output.endsWith(".gif")
        ? "data:image/gif;base64,"
        : "data:video/mp4;base64,") +
      (await fs.readFile(file)).toString("base64")
    );
  },
  openStorage: async () => {
    admin();
    const root = eventRoot(activeEvent());
    await fs.mkdir(root, { recursive: true });
    await shell.openPath(root);
    return root;
  },
  diagnostics: async () => {
    admin();
    const e = activeEvent();
    return {
      platform: os.platform(),
      release: os.release(),
      cpu: os.cpus()[0]?.model,
      cores: os.cpus().length,
      memoryGB: Math.round(os.totalmem() / 1024 ** 3),
      freeMB: Math.floor((await availableDisk(eventRoot(e))) / 1024 ** 2),
      dataDirectory: app.getPath("userData"),
      camera: e.camera,
      version: app.getVersion(),
    };
  },
};
app
  .whenReady()
  .then(async () => {
    if (!gotLock) return;
    await load();
    session.defaultSession.setPermissionCheckHandler(
      (contents, permission) =>
        permission === "media" && !!contents && trustedURL(contents.getURL()),
    );
    session.defaultSession.setPermissionRequestHandler(
      (contents, permission, callback) =>
        callback(
          permission === "media" && !!contents && trustedURL(contents.getURL()),
        ),
    );
    win = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 1024,
      minHeight: 720,
      backgroundColor: "#f7f5ef",
      icon: path.join(__dirname, '../assets/icon.ico'),
      show: !process.env.PHOTOBOOTH_TEST,
      webPreferences: {
        backgroundThrottling: false,
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        devTools: !!process.env.PHOTOBOOTH_DEV,
      },
    });
    win.setMenu(null);
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event, url) => {
      if (url !== win.webContents.getURL()) event.preventDefault();
    });
    win.on("close", (event) => {
      if (kiosk || activeSession) {
        event.preventDefault();
        win.webContents.send(
          "close-blocked",
          activeSession
            ? "Une capture est en cours."
            : "Utilisez le PIN organisateur pour quitter le kiosque.",
        );
      }
    });
    ipcMain.handle("photobooth", async (event, operation, input) => {
      const url = event.senderFrame?.url || "";
      const trusted = trustedURL(url);
      if (
        !trusted ||
        event.sender !== win.webContents ||
        !Object.hasOwn(handlers, operation)
      )
        return { ok: false, error: "Requête non autorisée." };
      try {
        return { ok: true, value: await handlers[operation](input) };
      } catch (e) {
        const error =
          e instanceof z.ZodError
            ? "Configuration invalide : " +
              e.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")
            : e.message;
        return { ok: false, error };
      }
    });
    if (process.env.PHOTOBOOTH_DEV) await win.loadURL("http://127.0.0.1:5173/");
    else await win.loadFile(path.join(__dirname, "../dist/index.html"));
  })
  .catch((e) => {
    dialog.showErrorBox("Photobooth — démarrage impossible", e.message);
    app.exit(1);
  });
app.on("window-all-closed", () => app.quit());
app.on("second-instance", () => {
  if (win) {
    win.restore();
    win.focus();
  }
});
