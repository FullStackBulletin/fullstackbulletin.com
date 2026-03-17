// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import pagefind from 'astro-pagefind';

export default defineConfig({
  integrations: [pagefind()],
  vite: {
    plugins: [tailwindcss()],
  },
});
