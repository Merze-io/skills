import pageSeo from "../../data/page-seo.json";
import { resolveSupportingMetadata, validatePageSeo } from "./seo.mjs";

type Presentation = { title?: string; description?: string };

// Validate once during the build; these overrides never alter skill-package files.
const overrides: Record<string, Presentation> = validatePageSeo(pageSeo);

export function getPageSeo(canonicalPath: string): Presentation {
  return overrides[canonicalPath] ?? {};
}

export function getSupportingMetadata({ canonicalPath, body, filename, skillTitle }: {
  canonicalPath: string;
  body: string;
  filename: string;
  skillTitle: string;
}): { title: string; description: string } {
  return resolveSupportingMetadata({
    override: getPageSeo(canonicalPath),
    body,
    filename,
    skillTitle,
  });
}
