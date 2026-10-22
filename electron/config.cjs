const { z } = require("zod");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const fsSync = require("node:fs");
const modes = ["photo", "series", "gif", "boomerang", "video"];
const asset = z.object({
  id: z.string().uuid(),
  name: z.string().max(100),
  kind: z.enum(["frame", "montage-frame", "sticker"]),
  enabled: z.boolean(),
  data: z.string().startsWith("data:image/png;base64,").max(12_000_000),
});
const eventSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(100),
    storage: z.string().min(1).max(1000),
    camera: z.string().min(1).max(300),
    modes: z.array(z.enum(modes)).min(1).max(5),
    countdown: z.number().int().min(1).max(15),
    seriesCount: z.number().int().min(2).max(12),
    interval: z.number().int().min(1).max(15),
    duration: z.number().int().min(1).max(30),
    fps: z.number().int().min(2).max(15),
    videoDuration: z.number().int().min(1).max(60),
    audio: z.boolean(),
    mirror: z.boolean(),
    quality: z.enum(["auto", "eco", "high"]),
    layout: z.enum(["photomaton", "grid", "strip", "square"]),
    returnSeconds: z.number().int().min(3).max(60),
    cloud: z.boolean(),
    gallery: z
      .string()
      .max(2000)
      .refine(
        (v) => !v || /^https:\/\/[^\s]+$/.test(v),
        "Un lien HTTPS est requis.",
      ),
    filters: z
      .array(z.enum(["normal", "mono", "sepia", "warm"]))
      .min(1)
      .max(4),
    assets: z.array(asset).max(30),
  })
  .superRefine((event, ctx) => {
    if (event.layout === "photomaton" && event.seriesCount !== 6)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seriesCount"],
        message: "Le format photomaton utilise exactement six photos.",
      });
    if (event.assets.reduce((n, a) => n + a.data.length, 0) > 24_000_000)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assets"],
        message: "Les éléments graphiques de l’événement dépassent 24 Mo.",
      });
  });
function defaultFrameAssets() {
  return [
    { kind: "frame", file: "photo-modele.png", name: "Classique blanc" },
    {
      kind: "montage-frame",
      file: "photomaton-modele.png",
      name: "Photomaton blanc",
    },
  ].map(({ kind, file, name }) => ({
    id: crypto.randomUUID(),
    kind,
    name,
    enabled: true,
    data:
      "data:image/png;base64," +
      fsSync
        .readFileSync(path.join(__dirname, "../assets/templates", file))
        .toString("base64"),
  }));
}
function defaultEvent(storage) {
  return {
    id: crypto.randomUUID(),
    name: "Mon premier événement",
    storage,
    camera: "simulation",
    modes,
    countdown: 5,
    seriesCount: 6,
    interval: 3,
    duration: 3,
    fps: 8,
    videoDuration: 10,
    audio: false,
    mirror: true,
    quality: "auto",
    layout: "photomaton",
    returnSeconds: 12,
    cloud: false,
    gallery: "",
    filters: ["normal", "mono", "sepia", "warm"],
    assets: defaultFrameAssets(),
  };
}
function withDefaultFrames(assets) {
  const result = [...assets];
  let total = result.reduce((n, a) => n + a.data.length, 0);
  for (const frame of defaultFrameAssets())
    if (
      !result.some((a) => a.kind === frame.kind) &&
      result.length < 30 &&
      total + frame.data.length <= 24_000_000
    ) {
      result.push(frame);
      total += frame.data.length;
    }
  return result;
}
function slug(name) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 60) || "evenement"
  );
}
function eventRoot(event) {
  return path.join(event.storage, `evenement-${event.id}`);
}
async function atomicWrite(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${crypto.randomUUID()}.part`;
  const handle = await fs.open(tmp, "wx");
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(tmp, file);
      break;
    } catch (error) {
      if (attempt >= 7 || !["EPERM", "EBUSY", "EACCES"].includes(error.code))
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
}
function hashPin(pin, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(pin, salt, 32).toString("hex") };
}
function verifyPin(pin, saved) {
  const candidate = hashPin(pin, saved.salt);
  return crypto.timingSafeEqual(
    Buffer.from(candidate.hash, "hex"),
    Buffer.from(saved.hash, "hex"),
  );
}
function decodeImage(data) {
  if (
    typeof data !== "string" ||
    data.length > 45_000_000 ||
    !/^data:image\/(jpeg|png);base64,/.test(data)
  )
    throw new Error("Image invalide ou trop volumineuse.");
  const buffer = Buffer.from(data.split(",")[1], "base64");
  if (
    !(buffer[0] === 0xff && buffer[1] === 0xd8) &&
    !(buffer[0] === 0x89 && buffer[1] === 0x50)
  )
    throw new Error("Format image invalide.");
  return buffer;
}
module.exports = {
  eventSchema,
  defaultEvent,
  defaultFrameAssets,
  withDefaultFrames,
  eventRoot,
  atomicWrite,
  hashPin,
  verifyPin,
  slug,
  decodeImage,
  modes,
};
