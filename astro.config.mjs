import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ai-metadata-remover.online',
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    format: 'directory',
  },
  image: {
    service: { entrypoint: 'astro/assets/services/noop' },
  },
  prefetch: false,
});
