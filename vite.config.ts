// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Charge le .env dans process.env pour les server functions en local.
// Vite n'expose que les variables VITE_* ; les clés serveur (GROQ_API_KEY,
// SUPABASE_SERVICE_ROLE_KEY, etc.) doivent être injectées manuellement.
// process.loadEnvFile existe depuis Node 20.12+ / 22+.
try {
  (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.(
    ".env",
  );
} catch {
  // .env absent ou Node trop ancien — on ignore silencieusement.
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
