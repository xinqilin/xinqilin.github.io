// Shiki transformer: wraps each highlighted <pre> in a single frame with a
// title bar (language + copy button), so the code itself is never covered.
const el = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });

export function codeFrame() {
  return {
    name: 'code-frame',
    root(root) {
      const pre = root.children.find((n) => n.type === 'element' && n.tagName === 'pre');
      if (!pre) return;
      const lang = this.options.lang && this.options.lang !== 'plaintext' ? this.options.lang : 'text';
      root.children = [
        el('figure', { className: ['code'] }, [
          el('figcaption', { className: ['code-bar'] }, [
            el('span', {}, [text(lang)]),
            el('button', { type: 'button', className: ['code-copy'], 'aria-label': '複製程式碼' }, [text('複製')]),
          ]),
          pre,
        ]),
      ];
    },
  };
}
