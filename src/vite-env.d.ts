/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEO_WORKER_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
