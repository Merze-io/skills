import type { APIRoute } from "astro";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLlmsFullTxt,
  discoverSkillDirs,
  loadSkillBundle,
} from "../lib/distribution";

export const GET: APIRoute = async () => {
  const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const repoRoot = path.resolve(siteRoot, "..");
  const bundles = discoverSkillDirs(repoRoot).map((n) =>
    loadSkillBundle(repoRoot, n),
  );
  return new Response(buildLlmsFullTxt(bundles), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
