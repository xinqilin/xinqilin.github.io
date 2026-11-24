// @ts-check
import { defineConfig } from 'astro/config';
import blueprint from './src/lib/shiki-blueprint.mjs';
import { codeFrame } from './src/lib/code-frame.mjs';

export default defineConfig({
  site: 'https://bill-lin.dev',
  publicDir: './static',
  outDir: './dist',
  trailingSlash: 'always',
  // v7 defaults to 'jsx' whitespace rules; keep the v6 HTML-aware compression.
  compressHTML: true,
  markdown: {
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
    shikiConfig: { theme: blueprint, transformers: [codeFrame()] },
  },
});
