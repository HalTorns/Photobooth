const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const {
  encode,
  encodeAnimation,
  encodeVideo,
  encodeFrameVideo,
} = require("../electron/media.cjs");
test("real FFmpeg exports a decodable GIF, boomerang MP4 and video MP4", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "photobooth-encode-"));
  const frames = [];
  for (let i = 0; i < 3; i++) {
    const f = path.join(folder, `${String(i).padStart(4, "0")}.jpg`);
    await encode([
      "-f",
      "lavfi",
      "-i",
      `color=c=${["red", "green", "blue"][i]}:s=160x120`,
      "-frames:v",
      "1",
      "-y",
      f,
    ]);
    frames.push(f);
  }
  const outputs = await encodeAnimation(frames, folder, "test", 4, true);
  assert.equal(outputs.length, 2);
  for (const file of outputs) {
    assert.ok((await fs.stat(file)).size > 100);
    await encode(["-i", file, "-f", "null", "-"]);
  }
  const input = path.join(folder, "source.webm");
  await encode([
    "-f",
    "lavfi",
    "-i",
    "color=c=red:s=160x120:r=10",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=44100",
    "-t",
    "1",
    "-c:v",
    "libvpx",
    "-c:a",
    "libopus",
    "-y",
    input,
  ]);
  const video = path.join(folder, "video.mp4");
  await encodeVideo(input, video);
  await encode(["-i", video, "-f", "null", "-"]);
  assert.ok((await fs.stat(video)).size > 100);
  assert.ok((await fs.stat(input)).size > 100);
  const audio = path.join(folder, "microphone.webm");
  await encode(["-i", input, "-vn", "-c:a", "copy", "-y", audio]);
  const raw = path.join(folder, "original.webm"),
    rendered = path.join(folder, "from-frames.mp4");
  await encodeFrameVideo(frames, frames, raw, rendered, 3, audio, 1);
  for (const file of [raw, rendered])
    await encode(["-i", file, "-f", "null", "-"]);
});
