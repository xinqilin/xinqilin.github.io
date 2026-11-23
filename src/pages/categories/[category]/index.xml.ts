import type { APIRoute, GetStaticPaths } from 'astro';
import { getPosts, groupByCategory, rss, SITE, type Post } from '../../../lib/site';

export const getStaticPaths = (async () =>
  [...groupByCategory(await getPosts())].map(([name, posts]) => ({ params: { category: name.toLowerCase() }, props: { name, posts } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ site, params, props }) => {
  const { name, posts } = props as { name: string; posts: Post[] };
  return rss(site!, `${name} on ${SITE.title}`, `/categories/${params.category}/`, posts);
};
