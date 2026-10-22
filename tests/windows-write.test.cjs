const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { atomicWrite } = require("../electron/config.cjs");
test("atomic writes retry a temporary Windows file lock without removing the existing file", async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "photobooth-lock-"));
  const file = path.join(folder, "settings.json");
  await atomicWrite(file, "old");
  const rename = fs.rename;
  let attempts = 0;
  fs.rename = async (...args) => {
    attempts++;
    if (attempts < 3) {
      assert.equal(await fs.readFile(file, "utf8"), "old");
      throw Object.assign(new Error("locked"), { code: "EPERM" });
    }
    return rename(...args);
  };
  try {
    await atomicWrite(file, "new");
    assert.equal(await fs.readFile(file, "utf8"), "new");
    assert.equal(attempts, 3);
  } finally {
    fs.rename = rename;
  }
});
