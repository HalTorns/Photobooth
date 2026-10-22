const { _electron: electron, expect } = require("@playwright/test");
const fs = require("node:fs/promises"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { encode } = require("../electron/media.cjs");
const layouts = require("../assets/layouts.json");
const repo = path.resolve(__dirname, "..");
(async () => {
  const base = path.join(repo, ".test-data");
  await fs.mkdir(base, { recursive: true });
  const data = await fs.mkdtemp(path.join(base, "stickers-"));
  await fs.mkdir(path.join(repo, "test-results"), { recursive: true });
  const env = {
    ...process.env,
    PHOTOBOOTH_TEST: "1",
    PHOTOBOOTH_DATA: path.join(data, "settings"),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.PHOTOBOOTH_DEV;
  let app;
  async function launch() {
    app = await electron.launch({
      executablePath: process.env.PHOTOBOOTH_EXE_PATH || undefined,
      args: process.env.PHOTOBOOTH_EXE_PATH ? [] : [repo],
      env,
    });
    const page = await app.firstWindow();
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
    await page.evaluate(
      async (storage) => {
        await window.photobooth.invoke("setPin", "2468");
        const boot = await window.photobooth.invoke("boot"),
          event = boot.events[0];
        const stickers = Array.from({ length: 18 }, (_, i) => {
          const c = document.createElement("canvas");
          c.width = 80;
          c.height = 80;
          const ctx = c.getContext("2d");
          ctx.fillStyle =
            i === 0
              ? "#fa1414"
              : i === 1
                ? "#1428f0"
                : `hsl(${i * 23} 65% 55%)`;
          ctx.fillRect(0, 0, 80, 80);
          return {
            id: crypto.randomUUID(),
            name: i === 0 ? "Rouge" : i === 1 ? "Bleu" : `Sticker ${i + 1}`,
            kind: "sticker",
            enabled: true,
            data: c.toDataURL("image/png"),
          };
        });
        await window.photobooth.invoke("saveEvent", {
          ...event,
          storage,
          assets: [...event.assets, ...stickers],
          mirror: false,
          countdown: 1,
          interval: 1,
          duration: 1,
          fps: 4,
          videoDuration: 1,
          returnSeconds: 40,
          quality: "eco",
          cloud: true,
          gallery: "https://example.invalid/galerie",
        });
      },
      path.join(data, "media"),
    );
    await close();
    page = await launch();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const red = page.getByRole("button", {
        name: "Ajouter le sticker Rouge",
        exact: true,
      }),
      blue = page.getByRole("button", {
        name: "Ajouter le sticker Bleu",
        exact: true,
      });
    await expect(red).toBeEnabled();
    await expect(page.locator(".sticker-tile")).toHaveCount(18);
    await page
      .getByRole("button", { name: "Voir les photos précédentes", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Derniers souvenirs" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retour à la capture" }).click();
    const library = page.getByRole("region", {
      name: "Bibliothèque de stickers",
    });
    await library.hover();
    await page.mouse.wheel(0, 500);
    await expect
      .poll(() => library.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(0);
    for (let i = 0; i < 35; i++) await red.click();
    await expect(page.locator(".placed-sticker")).toHaveCount(35);
    const view = page.locator(".viewfinder");
    let rect = await view.boundingBox();
    let sticker = page.locator(".placed-sticker").last();
    let box = await sticker.boundingBox();
    assert.ok(Math.abs(box.x + box.width / 2 - (rect.x + rect.width / 2)) < 3);
    assert.ok(
      Math.abs(box.y + box.height / 2 - (rect.y + rect.height / 2)) < 3,
    );
    async function dragTo(element, x, y) {
      const box = await element.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(x, y, { steps: 8 });
      await page.mouse.up();
    }
    await dragTo(
      sticker,
      rect.x + rect.width * 0.25,
      rect.y + rect.height * 0.25,
    );
    const trash = await page
      .getByRole("button", { name: "Corbeille des stickers" })
      .boundingBox();
    await dragTo(
      sticker,
      trash.x + trash.width / 2,
      trash.y + trash.height / 2,
    );
    await expect(page.locator(".placed-sticker")).toHaveCount(34);
    await blue.click();
    sticker = page.locator(".placed-sticker").last();
    box = await sticker.boundingBox();
    rect = await view.boundingBox();
    const tx = rect.x + rect.width * 0.7,
      ty = rect.y + rect.height * 0.3;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 1,
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 },
      ],
    });
    for (let i = 1; i <= 6; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: box.x + box.width / 2 + ((tx - (box.x + box.width / 2)) * i) / 6,
            y:
              box.y +
              box.height / 2 +
              ((ty - (box.y + box.height / 2)) * i) / 6,
            id: 1,
          },
        ],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    box = await sticker.boundingBox();
    assert.ok(Math.abs(box.x + box.width / 2 - tx) < 3);
    assert.ok(Math.abs(box.y + box.height / 2 - ty) < 3);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(1024, 720),
    );
    const previous = await page
        .getByRole("button", { name: "Voir les photos précédentes" })
        .boundingBox(),
      shutter = await page.locator(".shutter").boundingBox();
    const innerHeight = await page.evaluate(() => window.innerHeight);
    assert.ok(previous.y + previous.height <= shutter.y);
    assert.ok(shutter.y + shutter.height <= innerHeight);
    assert.ok((await library.boundingBox()).height >= 95);
    await expect(
      page.getByAltText("QR code de la galerie de l’événement"),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(repo, "test-results", "stickers.png"),
    });
    console.log(
      "PASS scrollable library, 35 duplicate instances, center placement, mouse/touch drag, trash, resize and previous-photos button",
    );
    async function take() {
      await expect(page.locator(".shutter")).toBeEnabled();
      await page.locator(".shutter").click();
      await page.waitForFunction(
        () =>
          document.querySelector(".result-dialog") ||
          document.querySelector(".error-banner"),
        null,
        { timeout: 60000 },
      );
      if (await page.locator(".error-banner").count())
        throw new Error(await page.locator(".error-banner").textContent());
      await expect(page.locator(".placed-sticker")).toHaveCount(0);
      await expect(page.locator(".sticker-trash")).toHaveCount(0);
      const boot = await page.evaluate(() => window.photobooth.invoke("boot"));
      const root = path.join(
        boot.events[0].storage,
        "evenement-" + boot.activeId,
      );
      const shot = (
        await page.evaluate(() => window.photobooth.invoke("recent"))
      )[0];
      const record = JSON.parse(
        await fs.readFile(
          path.join(root, "sessions", shot.id + ".json"),
          "utf8",
        ),
      );
      return { root, record, file: path.join(root, record.outputs[0]) };
    }
    async function pixels(file, points) {
      const bytes = (await fs.readFile(file)).toString("base64");
      return page.evaluate(
        async ({ bytes, points, mime }) => {
          const image = new Image();
          image.src = "data:" + mime + ";base64," + bytes;
          await image.decode();
          const c = document.createElement("canvas");
          c.width = image.width;
          c.height = image.height;
          const ctx = c.getContext("2d");
          ctx.drawImage(image, 0, 0);
          return points.map(([x, y]) => [
            ...ctx.getImageData(
              Math.round(x * c.width),
              Math.round(y * c.height),
              1,
              1,
            ).data,
          ]);
        },
        {
          bytes,
          points,
          mime: file.endsWith(".gif") ? "image/gif" : "image/jpeg",
        },
      );
    }
    const isRed = (p) => p[0] > 200 && p[1] < 70 && p[2] < 70,
      isBlue = (p) => p[2] > 180 && p[0] < 70;
    let captured = await take();
    let rgb = await pixels(captured.file, [
      [0.5, 0.5],
      [0.7, 0.3],
      [0.25, 0.25],
    ]);
    assert.ok(isRed(rgb[0]));
    assert.ok(isBlue(rgb[1]));
    assert.ok(!isRed(rgb[2]));
    assert.ok(
      !isRed(
        (
          await pixels(path.join(captured.root, captured.record.originals[0]), [
            [0.5, 0.5],
          ])
        )[0],
      ),
    );
    await page.getByRole("button", { name: "Encore un souvenir" }).click();
    await page
      .getByRole("button", { name: "Voir les photos précédentes" })
      .click();
    await expect(page.locator(".recent-grid article")).toHaveCount(1);
    await page.getByRole("button", { name: "Retour à la capture" }).click();
    console.log(
      "PASS positioned stickers in photo export, untouched original, clearing after capture and album access",
    );
    for (const [mode, name] of [
      ["gif", "GIF animé"],
      ["boomerang", "Boomerang"],
      ["video", "Vidéo"],
      ["series", "Photomaton 6 photos"],
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      await red.click();
      rect = await view.boundingBox();
      await dragTo(
        page.locator(".placed-sticker").last(),
        rect.x + rect.width * 0.3,
        rect.y + rect.height * 0.6,
      );
      captured = await take();
      let output = captured.file;
      if (mode === "video") {
        output = path.join(data, "video-frame.jpg");
        await encode(["-i", captured.file, "-frames:v", "1", "-y", output]);
      }
      if (mode === "series") {
        const normalized = layouts.photomaton.windows.map((box) => [
          (box.x + box.width * 0.3) / 1800,
          (box.y + box.height * 0.6) / 2400,
        ]);
        rgb = await pixels(output, normalized);
        assert.equal(captured.record.originals.length, 6);
        assert.ok(rgb.every(isRed));
      } else {
        rgb = await pixels(output, [[0.3, 0.6]]);
        assert.ok(
          isRed(rgb[0]),
          mode + " export has sticker at the chosen position",
        );
      }
      await page.getByRole("button", { name: "Encore un souvenir" }).click();
      console.log("PASS " + mode + " sticker export and automatic clearing");
    }
    assert.deepEqual(errors, []);
    console.log("Sticker test data: " + data);
  } finally {
    if (app) await close().catch(() => {});
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
