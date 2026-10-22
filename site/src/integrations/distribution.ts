import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { writeDistributionArtifacts } from "../lib/distribution";

/**
 * After the Astro static build, copy skill raw files, archives, discovery
 * indexes, skills.json v1, and llms files into dist/.
 */
export function distributionIntegration(): AstroIntegration {
  return {
    name: "merze-skills-distribution",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const distDir = fileURLToPath(dir);
        const siteRoot = path.resolve(distDir, "..");
        const repoRoot = path.resolve(siteRoot, "..");
        const bundles = writeDistributionArtifacts(repoRoot, distDir);
        logger.info(
          `distribution: wrote ${bundles.length} skill(s), archives, discovery index, skills.json, llms`,
        );
      },
    },
  };
}
