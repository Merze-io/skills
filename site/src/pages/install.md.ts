import type { APIRoute } from "astro";
import { AGENTS } from "../data/agents";
import { buildInstallMarkdown } from "../lib/install";
import { listPublishableSkillDirs } from "../lib/skill-sources";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(siteRoot, "..");

export const GET: APIRoute = () => {
  const names = listPublishableSkillDirs(repoRoot);
  const body = buildInstallMarkdown(names, AGENTS);
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
};
