/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SOURCE_DATE?: string;
  readonly SOURCE_COMMIT?: string;
  readonly SOURCE_COMMIT_DATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
