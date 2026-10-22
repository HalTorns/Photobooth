const { _electron: electron, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const repo = path.resolve(__dirname, "..");
const errors = [];
(async () => {
  const base = path.join(repo, ".test-data");
  await fs.mkdir(base, { recursive: true });
  const data = await fs.mkdtemp(path.join(base, "run-"));
  const env = {
    ...process.env,
    PHOTOBOOTH_DATA: path.join(data, "settings"),
    PHOTOBOOTH_TEST: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.PHOTOBOOTH_DEV;
  let app;
  const launch = async () => {
    app = await electron.launch({
      executablePath: process.env.PHOTOBOOTH_EXE_PATH || undefined,
      args: process.env.PHOTOBOOTH_EXE_PATH ? [] : [repo],
      env,
      timeout: 60000,
    });
    const page = await app.firstWindow();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.waitForFunction(() => !!window.photobooth);
    await page
      .getByRole("heading", { name: "Mon premier événement", exact: true })
      .waitFor();
    return page;
  };
  try {
    let page = await launch();
    await page.getByLabel("Code PIN", { exact: true }).fill("1234");
    await page.getByLabel("Confirmer le PIN").fill("1234");
    await page.getByRole("button", { name: "Créer mon PIN" }).click();
    await expect(
      page.getByRole("heading", { name: "Organisateur", exact: true }),
    ).toBeVisible();
    await page.evaluate(
      async (storage) => {
        const boot = await window.photobooth.invoke("boot");
        const e = boot.events[0];
        await window.photobooth.invoke("saveEvent", {
          ...e,
          storage,
          countdown: 1,
          interval: 1,
          seriesCount: 3,
          layout: "grid",
          duration: 1,
          fps: 4,
          videoDuration: 1,
          returnSeconds: 30,
          quality: "eco",
        });
      },
      path.join(data, "media"),
    );
    // Restart to exercise settings persistence and load the new capture settings.
    await app.close();
    page = await launch();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await fs.mkdir(path.join(repo, "test-results"), { recursive: true });
    await page.screenshot({
      path: path.join(repo, "test-results", "photobooth.png"),
    });
    await assert.rejects(
      page.evaluate(() => window.photobooth.invoke("saveEvent", {})),
      /organisateur/,
    );
    await assert.rejects(
      page.evaluate(() => window.photobooth.invoke("unlock", "9999")),
      /incorrect/,
    );
    console.log("PASS setup, settings persistence and PIN boundary");
    for (const mode of ["photo", "series", "gif", "boomerang", "video"]) {
      const names = {
        photo: "Photo",
        series: "Photomaton 3 photos",
        gif: "GIF animé",
        boomerang: "Boomerang",
        video: "Vidéo",
      };
      await page
        .getByRole("button", { name: names[mode], exact: true })
        .click();
      await page.locator(".shutter").click();
      await page.waitForFunction(
        () =>
          document.querySelector(".result-dialog") ||
          document.querySelector(".error-banner"),
        null,
        { timeout: 90000 },
      );
      const captureError = (await page.locator(".error-banner").count())
        ? await page.locator(".error-banner").textContent()
        : null;
      if (captureError) throw new Error(`${mode}: ${captureError}`);
      await expect(
        page.getByRole("dialog", { name: "Votre souvenir" }),
      ).toBeVisible({ timeout: 90000 });
      const shot = await page.evaluate(async () => {
        const list = await window.photobooth.invoke("recent");
        return list[0];
      });
      assert.equal(shot.mode, mode);
      assert.equal(shot.status, "complete");
      const boot = await page.evaluate(() => window.photobooth.invoke("boot"));
      const event = boot.events[0];
      const root = path.join(event.storage, `evenement-${event.id}`);
      const record = JSON.parse(
        await fs.readFile(
          path.join(root, "sessions", shot.id + ".json"),
          "utf8",
        ),
      );
      assert.ok(record.originals.length > 0);
      for (const file of [...record.originals, ...record.outputs])
        assert.ok((await fs.stat(path.join(root, file))).size > 0);
      if (mode === "series") assert.equal(record.originals.length, 3);
      if (mode === "boomerang") assert.equal(record.outputs.length, 2);
      if (mode === "video") assert.ok(record.outputs[0].endsWith(".mp4"));
      if (mode === "series")
        await page.screenshot({
          path: path.join(repo, "test-results", "series.png"),
        });
      console.log(
        `PASS ${mode}: ${record.originals.length} original(s), ${record.outputs.length} export(s)`,
      );
      await page.getByRole("button", { name: "Encore un souvenir" }).click();
    }
    await page.getByRole("button", { name: "Les derniers souvenirs" }).click();
    await expect(page.locator(".recent-grid article")).toHaveCount(5);
    await page.getByRole("button", { name: "Retour à la capture" }).click();
    // Leave an interrupted session and verify it is reported after a forced process exit.
    await page.evaluate(async () => {
      const id = await window.photobooth.invoke("startSession", "photo");
      const c = document.createElement("canvas");
      c.width = 20;
      c.height = 20;
      const image = c.toDataURL("image/jpeg");
      await window.photobooth.invoke("saveFrame", {
        id,
        original: image,
        processed: image,
      });
    });
    const closed = app.waitForEvent("close");
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
    await closed;
    page = await launch();
    const recent = await page.evaluate(() =>
      window.photobooth.invoke("recent"),
    );
    assert.equal(recent[0].status, "interrupted");
    assert.equal(recent.filter((s) => s.status === "complete").length, 5);
    await page.evaluate(() => window.photobooth.invoke("unlock", "1234"));
    const diag = await page.evaluate(() =>
      window.photobooth.invoke("diagnostics"),
    );
    assert.ok(diag.freeMB > 0);
    await page.evaluate(async () => {
      await window.photobooth.invoke("kiosk", true);
    });
    await assert.rejects(
      page.evaluate(() => window.photobooth.invoke("kiosk", false)),
      /organisateur/,
    );
    await page.evaluate(async () => {
      await window.photobooth.invoke("unlock", "1234");
      await window.photobooth.invoke("kiosk", false);
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS album, interrupted-session recovery, diagnostics and kiosk PIN",
    );
    console.log("E2E data: " + data);
  } finally {
    if (app) await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
