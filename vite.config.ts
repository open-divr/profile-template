// Build settings for a profile. The platform serves the built `dist/` from a per-deploy path inside a
// sandboxed iframe whose Content-Security-Policy only allows scripts, styles, images, media and fonts from
// that same path. So the output must:
// - reference every asset relatively (`base: './'`), because the deploy path is not known at build time;
// - contain no inline scripts and no module-preload helper, which injects `<link>` elements at run time;
// - bundle everything it needs: nothing may load from another origin at run time.
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    // The profile SDK ships its TypeScript sources next to the compiled files; building from them keeps the
    // bundle identical to the installed SDK version even before that package has been compiled.
    conditions: ['source', ...defaultClientConditions],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // No polyfill and no preload list: every chunk is fetched by the browser's own module loader.
    modulePreload: { polyfill: false, resolveDependencies: () => [] },
    // Source maps are allowed by the platform but double the upload; turn them on if you want them.
    sourcemap: false,
    // Keep the HTML free of inline code; small assets may still become data: URLs, which the policy allows.
    assetsInlineLimit: 4096,
  },
});
