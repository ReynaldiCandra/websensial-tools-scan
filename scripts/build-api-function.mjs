import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// esbuild is a dependency of artifacts/api-server — resolve from there so this
// script works regardless of where it is invoked from.
const requireFromApiServer = createRequire(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../artifacts/api-server/package.json"),
);
const { build: esbuild } = await import(requireFromApiServer.resolve("esbuild"));

globalThis.require = createRequire(import.meta.url);

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

async function run() {
  await esbuild({
    entryPoints: [path.resolve(rootDir, "api/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: path.resolve(rootDir, "api/index.mjs"),
    logLevel: "info",
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "pg-native",
      "fsevents",
      "bufferutil",
      "utf-8-validate",
    ],
    sourcemap: false,
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
    },
  });
  console.log("✓ api/index.mjs berhasil dibundle untuk Vercel function");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
