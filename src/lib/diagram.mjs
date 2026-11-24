// Step-through diagrams. A ```diagram block in Markdown becomes an SVG figure at build time
// (Sätteri hast plugin); src/lib/diagram-client.ts adds step controls in the browser.
// The source picks the kind: `actors:` makes a sequence diagram, `row:` makes a scene.
//
// Sequence (time runs down; earlier steps stay on screen):
//   title: 持有者在 GC 停頓時失去鎖
//   actors: A 實例 A | L 鎖服務
//   A -> L: 取得鎖           request (solid arrow)
//     narration for the step above (indented, optional, may span lines)
//   L --> A: 成功            reply (dashed arrow)
//   note L: 到期釋放          note over an actor
//   pause A: GC 停頓          note plus a bar on the lifeline until the actor's next step
//   A -> L: 寫入 [danger]     tone suffix: [ok] or [danger]
//
// Scene (fixed architecture; each step shows only its own traffic and notes):
//   title: 加上 Redis 之後
//   row: U 使用者 | API 商品 API | R Redis     a grid row of nodes; `.` leaves a cell empty
//   row: . | DB MySQL | .
//   step: 熱門 key 過期                        starts a step; indented lines are its narration
//   note R: key 過期 [danger]                  note beside a node
//   API => DB: 3,000 個同時查 [danger]          => heavy traffic, -> request, --> reply
//
// Without JavaScript a sequence shows every step, a scene shows its first step, and both list the full narration.

import { readFileSync } from 'node:fs';

const TONE = /\s*\[(ok|danger)\]$/;
const NOTE = /^note\s+(\S+)\s*:\s*(.+)$/;

const fail = (l, why) => {
  throw new Error(`diagram line ${l.line}: ${why}: "${l.text}"`);
};

/** "ID 顯示名稱" -> { id, name } */
const named = (part) => {
  const [id, ...name] = part.trim().split(/\s+/);
  return { id, name: name.join(' ') || id };
};

/** Parse diagram source; throws with a line number on anything it does not understand. */
export function parseDiagram(source) {
  const lines = source
    .split('\n')
    .map((raw, i) => ({ raw, text: raw.trim(), line: i + 1, narration: /^\s/.test(raw) }))
    .filter((l) => l.text);
  const isTitle = (l) => !l.narration && /^title\s*:/.test(l.text);
  const title = lines.find(isTitle)?.text.replace(/^title\s*:\s*/, '');
  if (!title) throw new Error('diagram: missing title:');
  const body = lines.filter((l) => !isTitle(l));
  const model = body.some((l) => !l.narration && /^row\s*:/.test(l.text)) ? parseScene(body) : parseSequence(body);
  if (!model.steps.length) throw new Error('diagram: no steps');
  return { title, ...model };
}

function parseSequence(body) {
  const actors = [];
  const steps = [];
  const has = (l, id) => actors.some((a) => a.id === id) || fail(l, `unknown actor ${id}`);
  for (const l of body) {
    if (l.narration) {
      (steps.at(-1) ?? fail(l, 'narration before any step')).say += l.text;
      continue;
    }
    let m;
    if ((m = l.text.match(/^actors\s*:\s*(.+)$/))) {
      for (const part of m[1].split('|')) {
        const a = named(part);
        if (actors.some((b) => b.id === a.id)) fail(l, `duplicate actor ${a.id}`);
        actors.push(a);
      }
      continue;
    }
    const tone = l.text.match(TONE)?.[1];
    const text = l.text.replace(TONE, '');
    if ((m = text.match(/^(\S+)\s*(-->|->)\s*(\S+)\s*:\s*(.+)$/))) {
      has(l, m[1]);
      has(l, m[3]);
      if (m[1] === m[3]) fail(l, 'an arrow needs two different actors');
      steps.push({ kind: m[2] === '->' ? 'msg' : 'reply', from: m[1], to: m[3], text: m[4], say: '', tone });
    } else if ((m = text.match(/^(note|pause)\s+(\S+)\s*:\s*(.+)$/))) {
      has(l, m[2]);
      steps.push({ kind: m[1], from: m[2], text: m[3], say: '', tone });
    } else {
      fail(l, 'expected actors:, an arrow, note or pause');
    }
  }
  if (actors.length < 2) throw new Error('diagram: actors: needs at least two actors');
  return { kind: 'seq', actors, steps };
}

function parseScene(body) {
  const nodes = [];
  const steps = [];
  let rows = 0;
  let cols = 0;
  const has = (l, id) => nodes.some((n) => n.id === id) || fail(l, `unknown node ${id}`);
  for (const l of body) {
    if (l.narration) {
      (steps.at(-1) ?? fail(l, 'narration before any step')).say += l.text;
      continue;
    }
    let m;
    if ((m = l.text.match(/^row\s*:\s*(.+)$/))) {
      if (steps.length) fail(l, 'row: must come before the first step');
      const cells = m[1].split('|');
      cells.forEach((cell, c) => {
        if (cell.trim() === '.') return;
        if (!cell.trim()) fail(l, 'empty cell, write . for a gap');
        const n = named(cell);
        if (nodes.some((o) => o.id === n.id)) fail(l, `duplicate node ${n.id}`);
        nodes.push({ ...n, r: rows, c });
      });
      rows += 1;
      cols = Math.max(cols, cells.length);
      continue;
    }
    if ((m = l.text.match(/^step\s*:\s*(.+)$/))) {
      steps.push({ label: m[1], say: '', items: [] });
      continue;
    }
    const step = steps.at(-1) ?? fail(l, 'flow or note before the first step');
    const tone = l.text.match(TONE)?.[1];
    const text = l.text.replace(TONE, '');
    if ((m = text.match(/^(\S+)\s*(=>|-->|->)\s*(\S+)\s*:\s*(.+)$/))) {
      has(l, m[1]);
      has(l, m[3]);
      if (m[1] === m[3]) fail(l, 'a flow needs two different nodes');
      step.items.push({ kind: 'flow', op: m[2], from: m[1], to: m[3], text: m[4], tone });
    } else if ((m = text.match(NOTE))) {
      has(l, m[1]);
      step.items.push({ kind: 'note', at: m[1], text: m[2], tone });
    } else {
      fail(l, 'expected row:, step:, a flow or note');
    }
  }
  if (nodes.length < 2) throw new Error('diagram: row: needs at least two nodes');
  const empty = steps.find((s) => !s.items.length);
  if (empty) throw new Error(`diagram: step "${empty.label}" has no flow or note`);
  return { kind: 'scene', nodes, rows, cols, steps };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (v) => Math.round(v * 10) / 10;

/** Rough text width in px: CJK and full-width characters are 1em, everything else about 0.6em. */
const textWidth = (s, size) => [...s].reduce((w, c) => w + (/[⺀-￿]/.test(c) ? size : size * 0.6), 0);

const PAD = 20;
const FONT = 13;
const NOTE_H = 28;

/** Arrowhead with its point at (x, y), pointing along the unit vector (ux, uy). */
function tip(x, y, ux, uy) {
  const bx = x - ux * 11;
  const by = y - uy * 11;
  return `M${r1(x)} ${r1(y)}L${r1(bx - uy * 5)} ${r1(by + ux * 5)}L${r1(bx + uy * 5)} ${r1(by - ux * 5)}Z`;
}

/** Note box with its top-left corner at (x, y). */
function note(x, y, w, text) {
  return (
    `<rect class="dg-note" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${NOTE_H}" rx="6"/>` +
    `<text class="dg-note-text" x="${r1(x + w / 2)}" y="${r1(y + NOTE_H / 2)}">${esc(text)}</text>`
  );
}

/** The figure around an SVG: title bar with controls, canvas, numbered narration. */
function figure(id, kind, title, width, height, svgBody, says, start) {
  return (
    `<figure class="dg dg-${kind}" id="${id}" data-start="${start}">` +
    `<figcaption class="dg-bar"><span class="dg-title">${esc(title)}</span>` +
    `<span class="dg-controls"><button type="button" data-act="prev">上一步</button><span class="dg-count">${start + 1} / ${says.length}</span>` +
    `<button type="button" data-act="next">下一步</button><button type="button" data-act="play">播放</button></span></figcaption>` +
    `<div class="dg-canvas"><svg viewBox="0 0 ${width} ${height}" width="${width}" role="img" aria-labelledby="${id}-t">` +
    `<title id="${id}-t">${esc(title)}</title>${svgBody}</svg></div>` +
    `<ol class="dg-says">${says.map((s, i) => `<li data-n="${String(i + 1).padStart(2, '0')}">${s}</li>`).join('')}</ol></figure>`
  );
}

const ACTOR_W = 130;
const ACTOR_H = 36;
const GAP = 180;
const ROW = { msg: 40, reply: 40, note: 46, pause: 46 };

function renderSequence({ title, actors, steps }, id) {
  const x = Object.fromEntries(actors.map((a, i) => [a.id, PAD + ACTOR_W / 2 + i * GAP]));
  const width = PAD * 2 + ACTOR_W + GAP * (actors.length - 1);

  let y = PAD + ACTOR_H + 34;
  const ys = steps.map((s) => {
    const at = y;
    y += ROW[s.kind];
    return at;
  });
  const bottom = y;

  // Each note also gets an opaque patch outside its step group, so a faded note never shows the lifeline through it.
  const masks = [];
  const noteAt = (cx, cy, text) => {
    const w = Math.min(Math.max(textWidth(text, FONT) + 24, 110), GAP * 2 - 20);
    masks.push(`<rect class="dg-mask" x="${r1(cx - w / 2)}" y="${cy - 14}" width="${r1(w)}" height="${NOTE_H}" rx="6"/>`);
    return note(cx - w / 2, cy - 14, w, text);
  };

  const body = steps.map((s, i) => {
    const cls = ['dg-step', `is-${s.kind}`, s.tone && `is-${s.tone}`].filter(Boolean).join(' ');
    const cy = ys[i];
    if (s.kind === 'note' || s.kind === 'pause') {
      let bar = '';
      if (s.kind === 'pause') {
        const next = steps.findIndex((t, j) => j > i && (t.from === s.from || t.to === s.from));
        const end = next === -1 ? bottom : ys[next] - 12;
        bar = `<rect class="dg-pause" x="${x[s.from] - 6}" y="${cy - 14}" width="12" height="${end - cy + 14}" rx="3"/>`;
      }
      return `<g class="${cls}">${bar}${noteAt(x[s.from], cy, s.text)}</g>`;
    }
    const x1 = x[s.from];
    const x2 = x[s.to];
    const dir = Math.sign(x2 - x1);
    const burst = s.tone === 'danger' ? `<circle class="dg-burst" cx="${x2}" cy="${cy}" r="10"/>` : '';
    return (
      `<g class="${cls}" data-x1="${x1 + dir * 6}" data-x2="${x2 - dir * 12}" data-y="${cy}">` +
      `<line class="dg-line" x1="${x1 + dir * 6}" y1="${cy}" x2="${x2 - dir * 10}" y2="${cy}"/><path class="dg-tip" d="${tip(x2 - dir * 2, cy, dir, 0)}"/>` +
      `<text class="dg-label" x="${(x1 + x2) / 2}" y="${cy - 9}">${esc(s.text)}</text>${burst}</g>`
    );
  });

  const heads = actors.map(
    (a) =>
      `<line class="dg-life" x1="${x[a.id]}" y1="${PAD + ACTOR_H}" x2="${x[a.id]}" y2="${bottom}"/>` +
      `<rect class="dg-actor" x="${x[a.id] - ACTOR_W / 2}" y="${PAD}" width="${ACTOR_W}" height="${ACTOR_H}" rx="6"/>` +
      `<text class="dg-actor-name" x="${x[a.id]}" y="${PAD + ACTOR_H / 2}">${esc(a.name)}</text>`,
  );

  const svgBody = `${heads.join('')}${masks.join('')}${body.join('')}<circle class="dg-packet" r="6"/>`;
  const says = steps.map((s) => esc(s.say || s.text));
  return figure(id, 'seq', title, width, bottom + PAD, svgBody, says, steps.length - 1);
}

const CELL_W = 240;
const CELL_H = 140;
const NODE_W = 120;
const NODE_H = 40;
const NOTE_GAP = 8;
const NOTE_ROOM = NOTE_GAP + NOTE_H + 8; // kept above the first row and below the last row

function renderScene({ title, nodes, rows, cols, steps }, id) {
  const width = PAD * 2 + cols * CELL_W;
  const height = PAD * 2 + NOTE_ROOM * 2 + NODE_H + (rows - 1) * CELL_H;
  const at = Object.fromEntries(
    nodes.map((n) => [n.id, { ...n, x: PAD + CELL_W / 2 + n.c * CELL_W, y: PAD + NOTE_ROOM + NODE_H / 2 + n.r * CELL_H }]),
  );

  const box = (n, cls) =>
    `<rect class="${cls}" x="${n.x - NODE_W / 2}" y="${n.y - NODE_H / 2}" width="${NODE_W}" height="${NODE_H}" rx="6"/>` +
    `<text class="dg-actor-name" x="${n.x}" y="${n.y}">${esc(n.name)}</text>`;

  // A center-to-center segment clipped to both node boxes, leaving a small gap.
  const ends = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.min(dx ? (NODE_W / 2 + 6) / Math.abs(dx) : Infinity, dy ? (NODE_H / 2 + 6) / Math.abs(dy) : Infinity);
    return [a.x + dx * t, a.y + dy * t, b.x - dx * t, b.y - dy * t];
  };

  // Every pair that ever exchanges traffic is drawn as a faint base edge.
  const pairs = new Map();
  for (const s of steps) {
    for (const it of s.items) if (it.kind === 'flow') pairs.set([it.from, it.to].sort().join(' '), [at[it.from], at[it.to]]);
  }
  const edges = [...pairs.values()].map(([a, b]) => {
    const [x1, y1, x2, y2] = ends(a, b);
    return `<line class="sc-edge" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"/>`;
  });

  const flow = (f) => {
    const [x1, y1, x2, y2] = ends(at[f.from], at[f.to]);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    const heavy = f.op === '=>';
    const cls = ['sc-flow', heavy && 'is-heavy', f.op === '-->' && 'is-reply', f.tone && `is-${f.tone}`].filter(Boolean).join(' ');
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    // Horizontal: label above the line. Vertical: label to the right. Diagonal: on the line, with a halo.
    const label =
      Math.abs(uy) < 0.01
        ? `<text class="dg-label" x="${r1(mx)}" y="${r1(my - 9)}">`
        : Math.abs(ux) < 0.01
          ? `<text class="dg-label is-side" x="${r1(mx + 10)}" y="${r1(my)}">`
          : `<text class="dg-label is-mid" x="${r1(mx)}" y="${r1(my)}">`;
    const n = heavy ? 5 : 3;
    const dur = heavy ? 1.2 : 1.8;
    const dots = Array.from(
      { length: n },
      (_, k) => `<circle class="sc-dot" r="${heavy ? 4 : 3.5}" style="animation-duration:${dur}s;animation-delay:-${r1((dur * k) / n)}s"/>`,
    ).join('');
    return (
      `<g class="${cls}" style="--x1:${r1(x1)}px;--y1:${r1(y1)}px;--x2:${r1(x2 - ux * 11)}px;--y2:${r1(y2 - uy * 11)}px">` +
      `<line class="dg-line" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2 - ux * 9)}" y2="${r1(y2 - uy * 9)}"/>` +
      `<path class="dg-tip" d="${tip(x2, y2, ux, uy)}"/>${dots}${label}${esc(f.text)}</text></g>`
    );
  };

  // Notes sit below nodes in the last row and above every other node.
  const noteFor = (it) => {
    const n = at[it.at];
    const w = Math.max(textWidth(it.text, FONT) + 24, 80);
    const x = Math.min(Math.max(n.x - w / 2, 4), width - 4 - w);
    const below = rows > 1 && n.r === rows - 1;
    const y = below ? n.y + NODE_H / 2 + NOTE_GAP : n.y - NODE_H / 2 - NOTE_GAP - NOTE_H;
    return `<g class="sc-note${it.tone ? ` is-${it.tone}` : ''}">${note(x, y, w, it.text)}</g>`;
  };

  const body = steps.map((s) => {
    // Nodes this step touches are redrawn on top of the dimmed base; a danger flow or note turns its node red.
    const hot = new Map();
    for (const it of s.items) {
      for (const nid of it.kind === 'flow' ? [it.from, it.to] : [it.at]) hot.set(nid, hot.get(nid) ?? false);
      if (it.tone === 'danger') hot.set(it.kind === 'flow' ? it.to : it.at, true);
    }
    const lit = [...hot].map(([nid, danger]) => box(at[nid], `dg-actor is-on${danger ? ' is-danger' : ''}`)).join('');
    return `<g class="dg-step">${lit}${s.items.map((it) => (it.kind === 'flow' ? flow(it) : noteFor(it))).join('')}</g>`;
  });

  const base = `<g class="sc-base">${edges.join('')}${nodes.map((n) => box(at[n.id], 'dg-actor')).join('')}</g>`;
  const says = steps.map((s) => `<strong>${esc(s.label)}</strong>${esc(s.say)}`);
  return figure(id, 'scene', title, width, height, base + body.join(''), says, 0);
}

/** Render a parsed diagram to the figure HTML (SVG, controls, narration). */
export function renderDiagram(model, id) {
  return model.kind === 'scene' ? renderScene(model, id) : renderSequence(model, id);
}

/** FNV-1a, so ids are stable across builds and unique per diagram source. */
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

/** Sätteri hast plugin: replaces each ```diagram code block with the rendered figure. */
export function diagramPlugin() {
  return {
    // Astro reuses rendered Markdown until its serialized config changes, and functions are not serialized
    // (also in CI: withastro/action caches node_modules/.astro). A hash of this file in the name re-renders
    // every post whenever the renderer changes.
    name: `diagram-${hash(readFileSync(new URL(import.meta.url), 'utf8'))}`,
    element: {
      filter: ['pre'],
      visit(node, ctx) {
        const code = node.children?.find((c) => c.type === 'element' && c.tagName === 'code');
        const cls = code?.properties?.className;
        if (!Array.isArray(cls) || !cls.includes('language-diagram')) return;
        const source = ctx.textContent(code);
        try {
          return { type: 'raw', value: renderDiagram(parseDiagram(source), `dg-${hash(source)}`) };
        } catch (err) {
          throw new Error(`${ctx.fileURL?.pathname ?? 'markdown'}: ${err.message}`);
        }
      },
    },
  };
}
