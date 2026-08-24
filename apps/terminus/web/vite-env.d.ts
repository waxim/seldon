/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where `@seldon/client` points. Same-origin `/api` by default. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
