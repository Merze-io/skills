import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const namePattern = /^[a-z0-9-]{1,64}$/;

const skillSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(namePattern, "name must match /^[a-z0-9-]{1,64}$/"),
    description: z.string().min(1).max(1024),
    metadata: z
      .object({
        version: z.string().optional(),
        source: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

// One level deep. Negations skip underscore folders, site/, and node_modules/.
const skills = defineCollection({
  loader: glob({
    pattern: ["*/SKILL.md", "!_*/**", "!.*/**", "!site/**", "!node_modules/**"],
    base: "..",
  }),
  schema: skillSchema,
});

const supporting = defineCollection({
  loader: glob({
    pattern: [
      "*/*.md",
      "!_*/**",
      "!.*/**",
      "!site/**",
      "!node_modules/**",
      "!*/SKILL.md",
    ],
    base: "..",
  }),
  schema: z.object({}).passthrough(),
});

export const collections = { skills, supporting };
