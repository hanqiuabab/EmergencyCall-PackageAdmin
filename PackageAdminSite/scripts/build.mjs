import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(siteRoot, "..");
const output = resolve(siteRoot, "dist");

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, "data"), { recursive: true });

for (const file of ["index.html", "styles.css", "app.js", "core.mjs", "og.png"]) {
  await cp(resolve(siteRoot, file), resolve(output, file));
}

await cp(
  resolve(repositoryRoot, "NumberPackages/Source/regions.json"),
  resolve(output, "data/regions.json")
);
await cp(
  resolve(repositoryRoot, "NumberPackages/Source/contacts.json"),
  resolve(output, "data/contacts.json")
);

console.log(`Built package admin site at ${output}`);
