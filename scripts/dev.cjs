const { spawn } = require("node:child_process");
const path = require("node:path");
const vite = spawn(
  process.execPath,
  [
    path.join(
      path.dirname(require.resolve("vite/package.json")),
      "bin/vite.js",
    ),
  ],
  {
    stdio: "inherit",
  },
);
let app;
let stopped = false;
const stop = () => {
  stopped = true;
  app?.kill();
  vite.kill();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
vite.on("exit", (code) => {
  if (!stopped) {
    stop();
    process.exit(code || 1);
  }
});
(async () => {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5173")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready || stopped) {
    stop();
    throw new Error("Le serveur de développement n’a pas démarré.");
  }
  const env = { ...process.env, PHOTOBOOTH_DEV: "1" };
  delete env.ELECTRON_RUN_AS_NODE;
  app = spawn(require("electron"), ["."], { env, stdio: "inherit" });
  app.on("exit", () => {
    vite.kill();
    process.exit();
  });
})().catch((e) => {
  console.error(e.message);
  stop();
  process.exitCode = 1;
});
