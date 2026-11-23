import { categoryPath, getPosts, getSections, groupByCategory, groupByTag, postPath } from './site';

/** Every HTML page the site renders (except alias redirects), as decoded paths with trailing slash. */
export async function pagePaths() {
  const posts = await getPosts();
  const categories = [...groupByCategory(posts).keys()];
  return [
    '/', '/posts/', '/post/', '/categories/', '/tags/', '/about/',
    ...(await getSections()).map((s) => `/post/${s.id}/`),
    ...categories.map(categoryPath),
    ...[...groupByTag(posts).keys()].map((slug) => `/tags/${slug}/`),
    ...posts.map(postPath),
  ];
}
