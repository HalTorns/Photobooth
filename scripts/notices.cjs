const fs = require("node:fs/promises");
const path = require("node:path");
const seen = new Set();
const notices = [];
async function walk(name, from) {
  let file;
  try {
    file = require.resolve(name + "/package.json", { paths: [from] });
  } catch {
    return;
  }
  if (seen.has(file)) return;
  seen.add(file);
  const pkg = JSON.parse(await fs.readFile(file, "utf8"));
  notices.push({
    name: pkg.name,
    version: pkg.version,
    license: pkg.license || "SEE PACKAGE LICENSE",
    repository: pkg.repository?.url || pkg.repository || null,
  });
  for (const dependency of Object.keys(pkg.dependencies || {}))
    await walk(dependency, path.dirname(file));
}
(async () => {
  const root = path.resolve(__dirname, "..");
  const pkg = require("../package.json");
  for (const name of Object.keys(pkg.dependencies)) await walk(name, root);
  await fs.mkdir(path.join(root, "licenses"), { recursive: true });
  await fs.writeFile(
    path.join(root, "licenses", "dependencies.json"),
    JSON.stringify(
      notices.sort((a, b) => a.name.localeCompare(b.name)),
      null,
      2,
    ) + "\n",
  );
  console.log(`${notices.length} dependency license records written.`);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
