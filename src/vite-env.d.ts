/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __OPENSLACK_E2E_RELAYS?: string[];
  __OPENSLACK_E2E_RELAY_PORT?: number;
  __openslack_mock_relays_active?: boolean;
}
