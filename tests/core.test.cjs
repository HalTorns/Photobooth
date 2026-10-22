const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const {
  eventSchema,
  defaultEvent,
  eventRoot,
  atomicWrite,
  hashPin,
  verifyPin,
  decodeImage,
} = require("../electron/config.cjs");
const { DigiCam } = require("../electron/digicam.cjs");
test("configuration rejects unsupported modes, missing filters and invalid limits", () => {
  const event = defaultEvent(os.tmpdir());
  assert.equal(eventSchema.parse(event).seriesCount, 6);
  for (const override of [
    { modes: [] },
    { modes: ["panorama"] },
    { countdown: 0 },
    { seriesCount: 999 },
    { fps: 60 },
    { filters: [] },
    { gallery: "javascript:alert(1)" },
  ])
    assert.equal(
      eventSchema.safeParse({ ...event, ...override }).success,
      false,
    );
});
test("renaming an event keeps its media location; another event is isolated", () => {
  const event = defaultEvent(os.tmpdir());
  assert.equal(eventRoot(event), eventRoot({ ...event, name: "Autre nom" }));
  assert.notEqual(eventRoot(event), eventRoot(defaultEvent(os.tmpdir())));
});
test("PIN is salted, never stored in clear and rejects wrong values", () => {
  const one = hashPin("123456"),
    two = hashPin("123456");
  assert.notEqual(one.hash, two.hash);
  assert.equal(verifyPin("123456", one), true);
  assert.equal(verifyPin("1234", one), false);
  assert.ok(!JSON.stringify(one).includes("123456"));
});
test("atomic writes leave a complete readable file and no temporary files", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "photobooth-write-"));
  const file = path.join(folder, "config.json");
  await atomicWrite(file, '{"version":1}');
  await atomicWrite(file, '{"version":2}');
  assert.deepEqual(JSON.parse(await fs.readFile(file, "utf8")), { version: 2 });
  assert.deepEqual(await fs.readdir(folder), ["config.json"]);
});
test("media boundary refuses non-images and invalid signatures", () => {
  assert.throws(() => decodeImage("data:text/html;base64,PGh0bWw+"));
  assert.throws(() => decodeImage("data:image/jpeg;base64,bm90YWpwZw=="));
  assert.deepEqual(
    decodeImage("data:image/jpeg;base64,/9g="),
    Buffer.from([255, 216]),
  );
});
test("digiCamControl bridge waits for a new capture and downloads its JPEG", async (t) => {
  let last = "old.jpg";
  const calls = [];
  const server = http.createServer((req, res) => {
    calls.push(req.url);
    const url = new URL(req.url, "http://localhost");
    if (url.searchParams.get("slc") === "list") res.end("Nikon_123\nCanon_456");
    else if (url.searchParams.get("slc") === "capture") {
      last = "new.jpg";
      res.end("OK");
    } else if (url.searchParams.get("param1") === "lastcaptured") res.end(last);
    else if (
      url.pathname === "/image/new.jpg" ||
      url.pathname === "/liveview.jpg"
    )
      res.end(Buffer.from([255, 216, 255, 217]));
    else res.end("OK");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((r) => server.close(r)));
  const camera = new DigiCam(server.address().port);
  assert.equal((await camera.list()).length, 2);
  await camera.select("digicam:Nikon_123");
  assert.equal(
    (await camera.capture("digicam:Nikon_123")).subarray(0, 2).toString("hex"),
    "ffd8",
  );
  assert.ok(calls.some((url) => url.includes("camera=Nikon_123")));
  assert.match(await camera.preview(), /^data:image\/jpeg/);
});
