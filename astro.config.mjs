// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import blueprint from './src/lib/shiki-blueprint.mjs';
import { codeFrame } from './src/lib/code-frame.mjs';
import { diagramPlugin } from './src/lib/diagram.mjs';

// Chinese characters fall through to the OS font; only Latin Plex files are self-hosted.
const CJK = ['PingFang TC', 'Microsoft JhengHei', 'Noto Sans CJK TC'];

export default defineConfig({
  site: 'https://bill-lin.dev',
  publicDir: './static',
  outDir: './dist',
  trailingSlash: 'always',
  // v7 defaults to 'jsx' whitespace rules; keep the v6 HTML-aware compression.
  compressHTML: true,
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-plex-sans',
      weights: [500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: [...CJK, 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-plex-mono',
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: [...CJK, 'monospace'],
    },
  ],
  markdown: {
    processor: satteri({ hastPlugins: [diagramPlugin()] }),
    syntaxHighlight: { type: 'shiki', excludeLangs: ['mermaid', 'diagram'] },
    shikiConfig: { theme: blueprint, transformers: [codeFrame()] },
  },
});
