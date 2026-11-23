import type { APIRoute, GetStaticPaths } from 'astro';
import { getSections, rss, SITE, type Post } from '../../../lib/site';

export const getStaticPaths = (async () =>
  (await getSections()).map((s) => ({ params: { category: s.id }, props: { name: s.name, posts: s.posts } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ site, params, props }) => {
  const { name, posts } = props as { name: string; posts: Post[] };
  return rss(site!, `${name} on ${SITE.title}`, `/post/${params.category}/`, posts);
};
