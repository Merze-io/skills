import type { APIRoute } from "astro";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSkillsIndexJson,
  discoverSkillDirs,
  loadSkillBundle,
} from "../lib/distribution";

/**
 * skills.json v1. The distribution integration also writes this file on
 * `astro:build:done` (same deterministic bytes) after archives exist.
 */
export const GET: APIRoute = async () => {
  const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const repoRoot = path.resolve(siteRoot, "..");
  const bundles = discoverSkillDirs(repoRoot).map((n) =>
    loadSkillBundle(repoRoot, n),
  );
  const body = buildSkillsIndexJson(bundles);
  return new Response(body, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
