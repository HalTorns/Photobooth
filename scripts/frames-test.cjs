const { _electron: electron, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const { defaultEvent, hashPin } = require("../electron/config.cjs");
const layouts = require("../assets/layouts.json");
const repo = path.resolve(__dirname, "..");
(async () => {
  const base = path.join(repo, ".test-data");
  await fs.mkdir(base, { recursive: true });
  const data = await fs.mkdtemp(path.join(base, "frames-"));
  const settings = path.join(data, "settings");
  await fs.mkdir(settings);
  const oldEvent = {
    ...defaultEvent(path.join(data, "media")),
    layout: "grid",
    assets: [],
    countdown: 1,
    interval: 1,
    returnSeconds: 30,
    cloud: true,
    gallery: "https://example.invalid/galerie",
  };
  const old = {
    version: 1,
    pin: hashPin("4321"),
    activeId: oldEvent.id,
    events: [oldEvent],
  };
  await fs.writeFile(path.join(settings, "settings.json"), JSON.stringify(old));
  const env = {
    ...process.env,
    PHOTOBOOTH_DATA: settings,
    PHOTOBOOTH_TEST: "1",
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.PHOTOBOOTH_DEV;
  let app;
  try {
    app = await electron.launch({
      executablePath: process.env.PHOTOBOOTH_EXE_PATH || undefined,
      args: process.env.PHOTOBOOTH_EXE_PATH ? [] : [repo],
      env,
    });
    const page = await app.firstWindow();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page
      .getByRole("heading", { name: oldEvent.name, exact: true })
      .waitFor();
    const config = JSON.parse(
      await fs.readFile(path.join(settings, "settings.json"), "utf8"),
    );
    assert.equal(config.version, 2);
    assert.equal(config.events[0].layout, "photomaton");
    assert.deepEqual(config.pin, old.pin);
    assert.deepEqual(
      JSON.parse(
        await fs.readFile(
          path.join(settings, "settings.json.v1.backup"),
          "utf8",
        ),
      ),
      old,
    );
    await expect(
      page.getByRole("button", { name: "Photomaton 6 photos", exact: true }),
    ).toBeVisible();
    assert.equal(
      await page
        .locator(".topbar,.footer,.creative-intro,.memory-card,.control-label")
        .count(),
      0,
    );
    await assert.rejects(
      page.evaluate(() =>
        window.photobooth.invoke("exportFrameTemplate", {
          kind: "photo",
          guide: false,
        }),
      ),
      /organisateur/,
    );
    console.log(
      "PASS migration preserves PIN and events, promotes the six-photo default and backs up old settings",
    );
    await page.getByRole("button", { name: "Espace organisateur" }).click();
    await page.getByLabel("Code PIN", { exact: true }).fill("4321");
    await page
      .getByRole("button", { name: "Déverrouiller", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Cadres & effets", exact: true })
      .click();
    const files = {};
    for (const [index, kind] of ["photo", "photomaton"].entries())
      for (const guide of [false, true]) {
        const file = path.join(
          data,
          `${kind}-${guide ? "reperes" : "modele"}.png`,
        );
        await app.evaluate(({ dialog }, file) => {
          dialog.showSaveDialog = async () => ({
            canceled: false,
            filePath: file,
          });
        }, file);
        await page
          .locator(".template-card")
          .nth(index)
          .getByRole("button", {
            name: guide ? "Repères PNG" : "Modèle PNG",
            exact: true,
          })
          .click();
        await expect
          .poll(async () =>
            fs
              .stat(file)
              .then((s) => s.size)
              .catch(() => 0),
          )
          .toBeGreaterThan(0);
        files[`${kind}-${guide ? "reperes" : "modele"}`] = file;
      }
    async function inspectImage(file, points) {
      const base64 = (await fs.readFile(file)).toString("base64");
      return page.evaluate(
        async ({ base64, points }) => {
          const image = new Image();
          image.src = "data:image/png;base64," + base64;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0);
          return {
            width: image.width,
            height: image.height,
            pixels: points.map(([x, y]) => [
              ...ctx.getImageData(x, y, 1, 1).data,
            ]),
          };
        },
        { base64, points },
      );
    }
    for (const kind of ["photo", "photomaton"]) {
      const spec = layouts[kind],
        box = spec.windows[0];
      const image = await inspectImage(files[kind + "-modele"], [
        [10, 10],
        [box.x + 20, box.y + 20],
      ]);
      assert.equal(image.width, spec.width);
      assert.equal(image.height, spec.height);
      assert.deepEqual(image.pixels[0], [255, 255, 255, 255]);
      assert.equal(image.pixels[1][3], 0);
      const guide = await inspectImage(files[kind + "-reperes"], [
        [box.x + 20, box.y + 20],
      ]);
      assert.equal(guide.pixels[0][3], 255);
    }
    const custom = path.join(data, "Mon cadre photomaton.png");
    const customData = await page.evaluate(
      async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = 1800;
        c.height = 2400;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        ctx.fillStyle = "#194c9f";
        ctx.fillRect(60, 2025, 1680, 315);
        return c.toDataURL("image/png");
      },
      "data:image/png;base64," +
        (await fs.readFile(files["photomaton-modele"])).toString("base64"),
    );
    await fs.writeFile(custom, Buffer.from(customData.split(",")[1], "base64"));
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, files["photo-modele"]);
    await assert.rejects(
      page.evaluate(() =>
        window.photobooth.invoke("importAsset", "montage-frame"),
      ),
      /1800.*2400/,
    );
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [file],
      });
    }, custom);
    await page
      .getByRole("button", {
        name: "Importer un cadre photomaton",
        exact: true,
      })
      .click();
    await expect(
      page
        .locator(".asset-grid")
        .getByText("Mon cadre photomaton.png", { exact: true }),
    ).toBeVisible();
    console.log(
      "PASS model/guide downloads, dimensions, transparent windows, custom-frame import and wrong-size rejection",
    );
    await page
      .getByRole("button", { name: "Retour aux invités", exact: true })
      .click();
    await expect(page.locator(".shutter")).toBeEnabled();
    await page.screenshot({
      path: path.join(repo, "test-results", "guest-minimal.png"),
    });
    await page.evaluate(async () => {
      await window.photobooth.invoke("unlock", "4321");
      await window.photobooth.invoke("kiosk", true);
    });
    assert.equal(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].isKiosk(),
      ),
      true,
    );
    async function take() {
      await expect(page.locator(".shutter")).toBeEnabled();
      await page.locator(".shutter").click();
      await page.waitForFunction(
        () =>
          document.querySelector(".result-dialog") ||
          document.querySelector(".error-banner"),
        null,
        { timeout: 45000 },
      );
      if (await page.locator(".error-banner").count())
        throw new Error(await page.locator(".error-banner").textContent());
      const record = (
        await page.evaluate(() => window.photobooth.invoke("recent"))
      )[0];
      const root = path.join(oldEvent.storage, "evenement-" + oldEvent.id);
      const manifest = JSON.parse(
        await fs.readFile(
          path.join(root, "sessions", record.id + ".json"),
          "utf8",
        ),
      );
      return { manifest, root, file: path.join(root, manifest.outputs[0]) };
    }
    const checkbox = page.getByRole("checkbox", { name: "Cadre", exact: true });
    // Toggle is available in every classic capture mode, while staying in kiosk.
    for (const name of ["Photo", "GIF animé", "Boomerang", "Vidéo"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await checkbox.check();
      await expect(page.locator(".shutter")).toBeEnabled();
      await checkbox.uncheck();
    }
    await page.getByRole("button", { name: "Photo", exact: true }).click();
    await checkbox.check();
    let capture = await take();
    let image = await inspectImage(capture.file, [[3, 3]]);
    assert.ok(image.pixels[0].slice(0, 3).every((v) => v > 245));
    await page.getByRole("button", { name: "Encore un souvenir" }).click();
    await checkbox.uncheck();
    capture = await take();
    image = await inspectImage(capture.file, [[3, 3]]);
    assert.ok(image.pixels[0].slice(0, 3).some((v) => v < 150));
    await page.getByRole("button", { name: "Encore un souvenir" }).click();
    console.log(
      "PASS kiosk frame toggle for classic modes and framed/unframed photo exports",
    );
    await checkbox.check();
    await page
      .getByRole("button", { name: "Photomaton 6 photos", exact: true })
      .click();
    await checkbox.check();
    await page
      .getByLabel("Cadre photomaton", { exact: true })
      .selectOption({ label: "Mon cadre photomaton.png" });
    const points = layouts.photomaton.windows.map((box) => [
      box.x + box.width / 2,
      box.y + box.height / 2,
    ]);
    points.push([900, 800], [900, 2180]);
    capture = await take();
    assert.equal(capture.manifest.originals.length, 6);
    image = await inspectImage(capture.file, points);
    assert.equal(image.width, 1800);
    assert.equal(image.height, 2400);
    for (const pixel of image.pixels.slice(0, 6))
      assert.ok(pixel.slice(0, 3).some((v) => v < 230));
    assert.ok(image.pixels[6].slice(0, 3).every((v) => v > 245));
    assert.ok(image.pixels[7][2] > 120 && image.pixels[7][0] < 70);
    await page.screenshot({
      path: path.join(repo, "test-results", "photomaton-custom.png"),
    });
    await page.getByRole("button", { name: "Encore un souvenir" }).click();
    await checkbox.uncheck();
    capture = await take();
    image = await inspectImage(capture.file, [[900, 2180]]);
    assert.ok(image.pixels[0].slice(0, 3).every((v) => v > 245));
    assert.equal(capture.manifest.originals.length, 6);
    await page.getByRole("button", { name: "Encore un souvenir" }).click();
    // No photo-level frame leaked into any montage cell.
    const processed = await inspectImage(
      path.join(capture.root, capture.manifest.frames[0]),
      [[3, 3]],
    );
    assert.ok(processed.pixels[0].slice(0, 3).some((v) => v < 150));
    assert.deepEqual(errors, []);
    console.log(
      "PASS six originals, portrait 2×3 positions, white gaps/footer, custom footer and montage frame toggle",
    );
    console.log("Frame test data: " + data);
  } finally {
    if (app) await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
