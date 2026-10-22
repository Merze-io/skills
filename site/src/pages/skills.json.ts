import type { APIRoute } from "astro";
import {
  getSkillListItems,
  installHint,
  skillFileUrl,
} from "../lib/skills";

export const GET: APIRoute = async () => {
  const skills = await getSkillListItems();
  const payload = {
    generatedAt: new Date().toISOString(),
    source: "https://skills.merze.ai",
    site: "https://skills.merze.ai",
    skills: skills.map((s) => ({
      name: s.name,
      slug: s.slug,
      description: s.description,
      summary: s.summary,
      version: s.version,
      category: s.category,
      tags: s.tags,
      hasSupporting: s.hasSupporting,
      updatedAt: s.updatedAt,
      install: installHint(s.slug),
      url: `https://skills.merze.ai/${s.slug}/`,
      download: `https://skills.merze.ai${skillFileUrl(s.slug)}`,
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
