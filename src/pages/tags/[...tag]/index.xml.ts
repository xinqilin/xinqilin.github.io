import type { APIRoute, GetStaticPaths } from 'astro';
import { getPosts, groupByTag, rss, SITE, type Post } from '../../../lib/site';

export const getStaticPaths = (async () =>
  [...groupByTag(await getPosts())].map(([slug, t]) => ({ params: { tag: slug }, props: { name: t.name, posts: t.posts } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ site, params, props }) => {
  const { name, posts } = props as { name: string; posts: Post[] };
  return rss(site!, `${name} on ${SITE.title}`, `/tags/${params.tag}/`, posts);
};
