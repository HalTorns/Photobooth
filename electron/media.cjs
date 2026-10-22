const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const ffmpeg = require("ffmpeg-static");
const { atomicWrite } = require("./config.cjs");
function executable() {
  return ffmpeg.replace("app.asar", "app.asar.unpacked");
}
function encode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      executable(),
      ["-hide_banner", "-loglevel", "error", "-nostdin", ...args],
      { windowsHide: true },
    );
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          "Encodage interrompu après 5 minutes. Les originaux sont conservés.",
        ),
      );
    }, 300_000);
    child.stderr.on("data", (data) => {
      stderr = (stderr + data).slice(-4000);
    });
    child.on("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      code === 0
        ? resolve()
        : reject(new Error(`Encodage impossible : ${stderr}`));
    });
  });
}
async function encodeAnimation(frames, folder, stem, fps, boomerang) {
  let ordered = [...frames];
  if (boomerang && frames.length > 2)
    ordered.push(...frames.slice(1, -1).reverse());
  const work = await fs.mkdtemp(path.join(os.tmpdir(), "photobooth-encoding-"));
  if (
    !work.startsWith(path.resolve(os.tmpdir()) + path.sep) ||
    !path.basename(work).startsWith("photobooth-encoding-")
  )
    throw new Error("Dossier de traitement invalide.");
  await fs.mkdir(work, { recursive: true });
  try {
    for (let i = 0; i < ordered.length; i++)
      await fs.copyFile(
        ordered[i],
        path.join(work, `${String(i).padStart(4, "0")}.jpg`),
      );
    const input = [
      "-framerate",
      String(fps),
      "-i",
      path.join(work, "%04d.jpg"),
    ];
    const gif = path.join(folder, stem + ".gif");
    const gifTmp = path.join(work, "result.gif");
    await encode([
      ...input,
      "-filter_complex",
      "[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer",
      "-loop",
      "0",
      "-y",
      gifTmp,
    ]);
    await atomicWrite(gif, await fs.readFile(gifTmp));
    const outputs = [gif];
    if (boomerang) {
      const mp4Tmp = path.join(work, "result.mp4");
      const mp4 = path.join(folder, stem + ".mp4");
      await encode([
        ...input,
        "-vf",
        "pad=ceil(iw/2)*2:ceil(ih/2)*2",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-y",
        mp4Tmp,
      ]);
      await atomicWrite(mp4, await fs.readFile(mp4Tmp));
      outputs.push(mp4);
    }
    return outputs;
  } finally {
    await fs.rm(work, { recursive: true, force: true });
  }
}
async function encodeVideo(original, target) {
  const temp = target + ".part.mp4";
  try {
    await encode([
      "-i",
      original,
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "-y",
      temp,
    ]);
    await fs.rename(temp, target);
    return [target];
  } catch (e) {
    await fs.rm(temp, { force: true });
    throw e;
  }
}
async function encodeFrameVideo(
  rawFrames,
  processedFrames,
  original,
  target,
  fps,
  audio,
  duration,
) {
  if (!rawFrames.length || rawFrames.length !== processedFrames.length)
    throw new Error("Séquence vidéo incomplète.");
  const input = (frames) => [
    "-framerate",
    String(fps),
    "-i",
    path.join(path.dirname(frames[0]), "%04d.jpg"),
    ...(audio ? ["-i", audio] : []),
  ];
  const originalTemp = original + ".part.webm",
    targetTemp = original + ".render.part.mp4";
  try {
    await encode([
      ...input(rawFrames),
      "-t",
      String(duration),
      "-c:v",
      "libvpx",
      "-deadline",
      "realtime",
      "-cpu-used",
      "5",
      "-b:v",
      "2M",
      ...(audio ? ["-c:a", "libopus"] : []),
      "-y",
      originalTemp,
    ]);
    await fs.rename(originalTemp, original);
    await encode([
      ...input(processedFrames),
      "-t",
      String(duration),
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      ...(audio ? ["-c:a", "aac"] : []),
      "-movflags",
      "+faststart",
      "-y",
      targetTemp,
    ]);
    await atomicWrite(target, await fs.readFile(targetTemp));
    await fs.rm(targetTemp, { force: true });
    return [target];
  } catch (e) {
    await fs.rm(originalTemp, { force: true });
    await fs.rm(targetTemp, { force: true });
    throw e;
  }
}
module.exports = {
  encodeAnimation,
  encodeVideo,
  encodeFrameVideo,
  encode,
  executable,
};
