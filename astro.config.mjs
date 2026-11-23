// @ts-check
import { defineConfig } from 'astro/config';
import blueprint from './src/lib/shiki-blueprint.mjs';
import { codeFrame } from './src/lib/code-frame.mjs';
import { remarkHeadingId } from './src/lib/remark-heading-id.mjs';

export default defineConfig({
  site: 'https://bill-lin.dev',
  publicDir: './static',
  outDir: './dist',
  trailingSlash: 'always',
  markdown: {
    remarkPlugins: [remarkHeadingId],
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid'] },
    shikiConfig: { theme: blueprint, transformers: [codeFrame()] },
  },
});
