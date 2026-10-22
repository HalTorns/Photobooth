import type { Asset, Filter, StickerPlacement } from "./types";
import layouts from "../assets/layouts.json";
export const filters: Record<Filter, string> = {
  normal: "none",
  mono: "grayscale(1)",
  sepia: "sepia(0.9)",
  warm: "sepia(0.25) saturate(1.25)",
};
export function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
export async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
export function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  w: number,
  h: number,
  sw: number,
  sh: number,
) {
  const ratio = Math.max(w / sw, h / sh);
  const dw = sw * ratio,
    dh = sh * ratio;
  ctx.drawImage(source, (w - dw) / 2, (h - dh) / 2, dw, dh);
}
export function simulation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
) {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#143a38");
  gradient.addColorStop(0.6, "#246461");
  gradient.addColorStop(1, "#131f30");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  const x = w * (0.68 + Math.sin(t / 7000) * 0.035);
  ctx.fillStyle = "#e3bc80";
  ctx.beginPath();
  ctx.arc(x, h * 0.32, h * 0.12, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = ["#397b72", "#235950", "#173b38"][i];
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let j = 0; j <= 40; j++) {
      const xx = (j / 40) * w;
      ctx.lineTo(
        xx,
        h * (0.58 + i * 0.12) +
          Math.sin((xx / w) * 7 + i + t / 10000) * h * 0.08,
      );
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.font = `${w * 0.013}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("CAMÉRA SIMULÉE · AUCUNE PRISE DE VUE RÉELLE", w / 2, h * 0.91);
}
export function compose(
  raw: HTMLCanvasElement,
  filter: Filter,
  frame: HTMLImageElement | null,
  stickers: { placement: StickerPlacement; image: HTMLImageElement }[] = [],
) {
  const c = canvas(raw.width, raw.height);
  const ctx = c.getContext("2d")!;
  ctx.filter = filters[filter];
  ctx.drawImage(raw, 0, 0);
  ctx.filter = "none";
  if (frame) ctx.drawImage(frame, 0, 0, c.width, c.height);
  for (const { placement: p, image } of stickers)
    ctx.drawImage(
      image,
      (p.x - p.width / 2) * c.width,
      (p.y - p.height / 2) * c.height,
      p.width * c.width,
      p.height * c.height,
    );
  return c;
}
export async function montage(
  images: string[],
  layout: "photomaton" | "grid" | "strip" | "square",
  label: string,
  frame: HTMLImageElement | null = null,
) {
  const loaded = await Promise.all(images.map(loadImage));
  if (layout === "photomaton") {
    if (loaded.length !== 6)
      throw new Error("Le photomaton nécessite six photos.");
    const spec = layouts.photomaton;
    const c = canvas(spec.width, spec.height);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    loaded.forEach((img, i) => {
      const box = spec.windows[i];
      ctx.save();
      ctx.translate(box.x, box.y);
      ctx.beginPath();
      ctx.rect(0, 0, box.width, box.height);
      ctx.clip();
      drawCover(ctx, img, box.width, box.height, img.width, img.height);
      ctx.restore();
    });
    if (frame) ctx.drawImage(frame, 0, 0, c.width, c.height);
    return c;
  }
  const cols =
    layout === "strip"
      ? 1
      : layout === "square"
        ? Math.ceil(Math.sqrt(images.length))
        : Math.min(3, images.length);
  const rows = Math.ceil(images.length / cols);
  const gap = 24;
  const cellW = layout === "strip" ? 600 : 640;
  const width = cols * cellW + (cols + 1) * gap;
  const cellH =
    layout === "square" ? (width - 90 - (rows + 1) * gap) / rows : 480;
  const c = canvas(
    width,
    layout === "square" ? width : rows * cellH + (rows + 1) * gap + 90,
  );
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#faf7ef";
  ctx.fillRect(0, 0, c.width, c.height);
  loaded.forEach((img, i) => {
    ctx.save();
    ctx.translate(
      gap + (i % cols) * (cellW + gap),
      gap + Math.floor(i / cols) * (cellH + gap),
    );
    ctx.beginPath();
    ctx.rect(0, 0, cellW, cellH);
    ctx.clip();
    drawCover(ctx, img, cellW, cellH, img.width, img.height);
    ctx.restore();
  });
  ctx.fillStyle = "#194d45";
  ctx.textAlign = "center";
  ctx.font = `${Math.min(36, c.width / 22)}px Georgia`;
  ctx.fillText(label, c.width / 2, c.height - 42, c.width - 48);
  return c;
}
export async function assetImage(id: string, assets: Asset[]) {
  const asset = assets.find((a) => a.id === id && a.enabled);
  return asset ? loadImage(asset.data) : null;
}
export const jpeg = (c: HTMLCanvasElement, quality = 0.92) =>
  c.toDataURL("image/jpeg", quality);
