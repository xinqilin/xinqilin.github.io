import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'post'>;
/** Active item in the header navigation. */
export type Nav = 'home' | 'me' | 'posts' | 'categories';

export const SITE = {
  title: "Bill.Lin's Notes",
  description: '技術筆記與開發心得分享',
  author: 'Bill Lin',
};

export const SERIES_CATEGORY = 'SystemDesign';
const SERIES_MAP_ID = 'systemdesign/system-design-thinking';

let cache: Post[] | undefined;

/** Published posts, newest first. Fails the build when a post's category does not match its directory. */
export async function getPosts(): Promise<Post[]> {
  if (cache) return cache;
  const posts = await getCollection('post', ({ data }) => !data.draft);
  for (const p of posts) {
    const dir = p.id.split('/')[0];
    if (categoryOf(p).toLowerCase() !== dir) {
      throw new Error(`${p.id}: categories ["${categoryOf(p)}"] does not match directory "${dir}"`);
    }
  }
  cache = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return cache;
}

export const categoryOf = (p: Post) => p.data.categories[0];
export const postPath = (p: Post) => `/post/${p.id}/`;
export const categoryPath = (category: string) => `/categories/${category.toLowerCase()}/`;
export const sectionPath = (category: string) => `/post/${category.toLowerCase()}/`;

/** Same rule as Hugo's urlize, verified against all 433 existing tags. */
export const tagSlug = (tag: string) =>
  tag.trim().toLowerCase().replace(/ /g, '-').replace(/[^\p{L}\p{N}_./+\-#~]/gu, '');
export const tagPath = (tag: string) => encodePath(`/tags/${tagSlug(tag)}/`);

export function groupByCategory(posts: Post[]) {
  const map = new Map<string, Post[]>();
  for (const p of posts) map.set(categoryOf(p), [...(map.get(categoryOf(p)) ?? []), p]);
  return map;
}

/** Tags grouped by URL slug; the first spelling seen becomes the display name. */
export function groupByTag(posts: Post[]) {
  const map = new Map<string, { name: string; posts: Post[] }>();
  for (const p of posts) {
    for (const t of p.data.tags) {
      const slug = tagSlug(t);
      const entry = map.get(slug) ?? { name: t, posts: [] };
      if (!entry.posts.includes(p)) entry.posts.push(p);
      map.set(slug, entry);
    }
  }
  return map;
}

const dateFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' });
export const formatDate = (d: Date) => dateFormat.format(d);

/** Chinese at ~400 characters a minute plus English words at ~200 a minute. */
export function readingMinutes(body = '') {
  const cjk = (body.match(/[一-鿿]/g) ?? []).length;
  const words = (body.match(/[A-Za-z]+/g) ?? []).length;
  return Math.max(1, Math.round(cjk / 400 + words / 200));
}

/** Rough plain text for the search index. */
export function plainText(body = '') {
  return body
    .replace(/```[^\n]*\n/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^[#>\-*|\s]+/gm, '')
    .replace(/[*_`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SeriesPart {
  label: string;
  posts: Post[];
}

/** System Design parts, parsed from the series map table in system-design-thinking.md. */
export async function getSeries(): Promise<SeriesPart[]> {
  const map = await getEntry('post', SERIES_MAP_ID);
  if (!map) throw new Error(`series map ${SERIES_MAP_ID} not found`);
  const byId = new Map((await getPosts()).map((p) => [p.id, p]));
  const parts: SeriesPart[] = [];
  for (const line of (map.body ?? '').split('\n')) {
    const row = line.match(/^\|\s*(\d+)\s+(.+?)\s*\|[^|]*\|(.*)\|\s*$/);
    if (!row) continue;
    const ids = row[3].trim() === '本篇'
      ? [SERIES_MAP_ID]
      : [...row[3].matchAll(/\]\(\/post\/systemdesign\/([a-z0-9-]+)\/\)/g)].map((m) => `systemdesign/${m[1]}`);
    const posts = ids.map((id) => byId.get(id)).filter((p): p is Post => Boolean(p));
    parts.push({ label: `Part ${row[1]} ${row[2]}`, posts });
  }
  return parts;
}

export interface SideGroup {
  label: string;
  posts: Post[];
  open: boolean;
}

/** Left column of the article page: the series for System Design, otherwise the same category. */
export async function sidebarFor(post: Post): Promise<{ title: string; groups: SideGroup[]; order: Post[] }> {
  if (categoryOf(post) === SERIES_CATEGORY) {
    const parts = await getSeries();
    if (parts.some((part) => part.posts.includes(post))) {
      return {
        title: 'System Design 系列',
        groups: parts.map((part) => ({ ...part, open: part.posts.includes(post) })),
        order: parts.flatMap((part) => part.posts),
      };
    }
  }
  // Oldest first, so the sidebar order and prev/next agree.
  const same = (await getPosts())
    .filter((p) => categoryOf(p) === categoryOf(post))
    .sort((a, b) => a.data.date.valueOf() - b.data.date.valueOf() || a.data.title.localeCompare(b.data.title, 'zh-Hant'));
  return { title: categoryOf(post), groups: [{ label: categoryOf(post), posts: same, open: true }], order: same };
}

/** href for a path whose segments may contain characters such as '#' or '+'. */
export const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

const xml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' })[c] as string);

/** RSS 2.0 feed for a list page at `path` (with trailing slash). */
export function rss(site: URL, title: string, path: string, posts: Post[]) {
  const abs = (p: string) => new URL(encodePath(p), site).href;
  const items = posts
    .map((p) => {
      const link = abs(postPath(p));
      return `<item><title>${xml(p.data.title)}</title><link>${link}</link><pubDate>${p.data.date.toUTCString()}</pubDate><guid>${link}</guid><description>${xml(p.data.description)}</description></item>`;
    })
    .join('');
  const body =
    `<?xml version="1.0" encoding="utf-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>` +
    `<title>${xml(title)}</title><link>${abs(path)}</link><description>${xml(`Recent content in ${title}`)}</description><language>zh-tw</language>` +
    (posts[0] ? `<lastBuildDate>${posts[0].data.date.toUTCString()}</lastBuildDate>` : '') +
    `<atom:link href="${abs(`${path}index.xml`)}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}

/** Section pages /post/<category>/: every category with posts, plus sections that only have an _index.md so far. */
export async function getSections() {
  const sections = await getCollection('section');
  const byCategory = groupByCategory(await getPosts());
  const names = new Map([...byCategory.keys()].map((n) => [n.toLowerCase(), n]));
  for (const s of sections) if (!names.has(s.id)) names.set(s.id, s.data.title);
  return [...names].map(([id, name]) => ({
    id,
    name,
    posts: byCategory.get(name) ?? [],
    section: sections.find((s) => s.id === id),
  }));
}
