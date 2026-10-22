// HTTP protocol documented by digiCamControl. Hardware validation remains required.
const path = require("node:path");
class DigiCam {
  constructor(port = 5513) {
    this.base = `http://127.0.0.1:${port}`;
  }
  async request(route, binary = false) {
    const response = await fetch(this.base + route, {
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`digiCamControl : HTTP ${response.status}`);
    return binary
      ? Buffer.from(await response.arrayBuffer())
      : (await response.text()).trim();
  }
  command(slc, param1 = "", param2 = "", camera = "") {
    return this.request(
      "/?" +
        new URLSearchParams({
          slc,
          param1,
          param2,
          ...(camera ? { camera } : {}),
        }),
    );
  }
  async list() {
    try {
      const raw = await this.command("list", "cameras");
      if (/^error|<html|<!doctype/i.test(raw)) return [];
      return raw
        .split(/[\r\n;]+/)
        .map((x) => x.trim())
        .filter((x) => x && x !== "OK")
        .map((id) => ({
          id: `digicam:${id}`,
          label: `digiCamControl · ${id}`,
          kind: "digicam",
        }));
    } catch {
      return [];
    }
  }
  async select(id) {
    await this.command("set", "camera", id.replace("digicam:", ""));
    await this.request("/?CMD=LiveViewWnd_Show");
  }
  async preview() {
    const bytes = await this.request("/liveview.jpg", true);
    this.checkJpeg(bytes);
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  }
  checkJpeg(bytes) {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8)
      throw new Error("Aucune image JPEG reçue de digiCamControl.");
  }
  async capture(id) {
    const before = await this.command("get", "lastcaptured");
    await this.command("capture", "", "", id.replace("digicam:", ""));
    const until = Date.now() + 60_000;
    while (Date.now() < until) {
      await new Promise((r) => setTimeout(r, 500));
      const last = await this.command("get", "lastcaptured");
      if (last && last !== "-" && last !== before && !/^error/i.test(last)) {
        const name = path.win32.basename(last.replace(/^"|"$/g, ""));
        const bytes = await this.request(
          "/image/" + encodeURIComponent(name),
          true,
        );
        this.checkJpeg(bytes);
        await this.request("/?CMD=LiveViewWnd_Show").catch(() => {});
        return bytes;
      }
    }
    throw new Error(
      "digiCamControl : délai de capture dépassé. Vérifiez le mode JPEG et la connexion USB.",
    );
  }
}
module.exports = { DigiCam };
