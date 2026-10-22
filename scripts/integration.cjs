const { _electron: electron, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const repo = path.resolve(__dirname, "..");
(async () => {
  const base = path.join(repo, ".test-data");
  await fs.mkdir(base, { recursive: true });
  const data = await fs.mkdtemp(path.join(base, "integration-"));
  const env = {
    ...process.env,
    PHOTOBOOTH_DATA: path.join(data, "settings"),
    PHOTOBOOTH_TEST: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.PHOTOBOOTH_DEV;
  let app;
  async function launch() {
    app = await electron.launch({
      args: [
        repo,
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
      ],
      env,
    });
    const page = await app.firstWindow();
    await page.waitForFunction(() => !!window.photobooth);
    await page
      .getByRole("heading", { name: "Mon premier événement", exact: true })
      .waitFor();
    return page;
  }
  async function close() {
    const closed = app.waitForEvent("close");
    await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
    await closed;
  }
  try {
    let page = await launch();
    await page.evaluate(() => window.photobooth.invoke("setPin", "654321"));
    await page.evaluate(
      async ({ storage, id }) => {
        const boot = await window.photobooth.invoke("boot");
        const e = boot.events[0];
        const c = document.createElement("canvas");
        c.width = 640;
        c.height = 480;
        const ctx = c.getContext("2d");
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 40;
        ctx.strokeRect(0, 0, 640, 480);
        await window.photobooth.invoke("saveEvent", {
          ...e,
          storage,
          camera: "auto",
          audio: true,
          cloud: true,
          gallery: "https://example.invalid/galerie",
          quality: "eco",
          countdown: 1,
          videoDuration: 2,
          assets: [
            {
              id,
              name: "Cadre rouge de test",
              kind: "frame",
              enabled: true,
              data: c.toDataURL("image/png"),
            },
          ],
        });
      },
      { storage: path.join(data, "media"), id: crypto.randomUUID() },
    );
    await close();
    page = await launch();
    await expect(
      page.getByText("Caméra connectée", { exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByAltText("QR code de la galerie de l’événement"),
    ).toBeVisible();
    await page
      .getByLabel("Cadre", { exact: true })
      .selectOption({ label: "Cadre rouge de test" });
    await page
      .getByRole("button", { name: "Noir & blanc", exact: true })
      .click();
    for (const mode of ["Photo", "Vidéo"]) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      await page.locator(".shutter").click();
      await page.waitForFunction(
        () =>
          document.querySelector(".result-dialog") ||
          document.querySelector(".error-banner"),
        null,
        { timeout: 30000 },
      );
      if (await page.locator(".error-banner").count())
        throw new Error(await page.locator(".error-banner").textContent());
      await expect(
        page.getByRole("dialog", { name: "Votre souvenir" }),
      ).toBeVisible();
      if (mode === "Photo") {
        const pixel = await page
          .locator(".result-media")
          .evaluate(async (image) => {
            await image.decode();
            const c = document.createElement("canvas");
            c.width = image.naturalWidth;
            c.height = image.naturalHeight;
            const ctx = c.getContext("2d");
            ctx.drawImage(image, 0, 0);
            return [...ctx.getImageData(3, 3, 1, 1).data];
          });
        assert.ok(
          pixel[0] > 200 && pixel[1] < 60 && pixel[2] < 60,
          "Export retains the frame color outside the monochrome effect",
        );
      }
      await page.getByRole("button", { name: "Encore un souvenir" }).click();
      console.log(
        "PASS fake webcam " +
          mode +
          " with frame, filter, QR and microphone enabled",
      );
    }
    await page.evaluate(() => window.photobooth.invoke("unlock", "654321"));
    const exportFile = path.join(data, "template.json");
    await app.evaluate(({ dialog }, file) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, exportFile);
    await page.evaluate(() => window.photobooth.invoke("exportEvent"));
    const template = JSON.parse(await fs.readFile(exportFile, "utf8"));
    assert.equal(template.event.storage, undefined);
    assert.equal(template.pin, undefined);
    assert.equal(template.event.assets.length, 1);
    const imported = await page.evaluate(() =>
      window.photobooth.invoke("importEvent"),
    );
    assert.equal(imported.events.length, 2);
    assert.notEqual(imported.events[0].id, imported.events[1].id);
    assert.equal(imported.events[0].storage, imported.events[1].storage);
    console.log(
      "PASS template export/import excludes PIN, embeds assets and assigns a new event ID",
    );
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(1024, 720),
    );
    const fits = await page
      .locator(".shutter")
      .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight);
    assert.ok(fits, "Shutter stays visible at 1024×768");
    await page.screenshot({
      path: path.join(repo, "test-results", "compact.png"),
    });
    const qrFits = await page
      .getByAltText("QR code de la galerie de l’événement")
      .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight);
    assert.ok(qrFits, "QR remains visible at 1024×720");
    console.log("PASS tactile layout and QR at 1024×720");
  } finally {
    if (app) await close().catch(() => {});
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
