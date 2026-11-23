import type { APIRoute } from 'astro';
import { getPosts, rss, SITE } from '../../lib/site';

export const GET: APIRoute = async ({ site }) => rss(site!, `Post on ${SITE.title}`, '/post/', await getPosts());
