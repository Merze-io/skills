import type { APIRoute } from "astro";
import {
  getSkillListItems,
  githubBlobUrl,
  installCommand,
} from "../lib/skills";

export const GET: APIRoute = async () => {
  const skills = await getSkillListItems();
  const payload = {
    generatedAt: new Date().toISOString(),
    source: "https://github.com/Merze-io/skills",
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
      install: installCommand(s.slug),
      url: `https://skills.merze.ai/${s.slug}/`,
      github: githubBlobUrl(s.slug),
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
