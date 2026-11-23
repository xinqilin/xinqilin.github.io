// Hugo-style custom heading IDs: "## Title {#custom-id}" -> <h2 id="custom-id">Title</h2>,
// so existing anchor URLs keep working.
const ATTR = /\s*\{#([^\s}]+)\}\s*$/;

export function remarkHeadingId() {
  const walk = (node) => {
    if (node.type === 'heading') {
      const last = node.children.at(-1);
      const m = last?.type === 'text' ? last.value.match(ATTR) : null;
      if (m) {
        last.value = last.value.slice(0, m.index);
        node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id: m[1] } };
      }
      return;
    }
    node.children?.forEach(walk);
  };
  return (tree) => walk(tree);
}
