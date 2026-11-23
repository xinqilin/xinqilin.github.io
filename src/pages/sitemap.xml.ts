import type { APIRoute } from 'astro';
import { encodePath, formatDate, getPosts, postPath } from '../lib/site';
import { pagePaths } from '../lib/routes';

export const GET: APIRoute = async ({ site }) => {
  const lastmod = new Map((await getPosts()).map((p) => [postPath(p), formatDate(p.data.date)]));
  const urls = (await pagePaths())
    .map((path) => {
      const date = lastmod.get(path);
      return `<url><loc>${new URL(encodePath(path), site).href}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}</url>`;
    })
    .join('');
  return new Response(`<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
