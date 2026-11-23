import type { APIRoute } from 'astro';
import { getPosts, plainText, postPath } from '../lib/site';

// Client-side search index read by static/js/search.js. Relative permalinks so local preview stays local.
export const GET: APIRoute = async () => {
  const index = (await getPosts()).map((p) => ({
    title: p.data.title,
    tags: p.data.tags,
    content: plainText(p.body),
    permalink: postPath(p),
  }));
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
