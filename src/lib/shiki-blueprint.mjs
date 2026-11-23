// Code block colors of the "blueprint" theme: dark navy panel on a light page.
export default {
  name: 'blueprint',
  type: 'dark',
  colors: { 'editor.background': '#10233f', 'editor.foreground': '#d6e3f5' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#7f97b8' } },
    { scope: ['string', 'punctuation.definition.string'], settings: { foreground: '#9fe3b8' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: '#f7a8a8' } },
    { scope: ['keyword', 'storage.modifier', 'storage.type.primitive', 'keyword.control', 'keyword.operator.new', 'variable.language'], settings: { foreground: '#7cc4ff' } },
    { scope: ['storage.type', 'entity.name.type', 'entity.name.class', 'support.class', 'support.type', 'entity.other.inherited-class'], settings: { foreground: '#b9a7ff' } },
    { scope: ['storage.type.annotation', 'punctuation.definition.annotation', 'meta.declaration.annotation', 'meta.decorator', 'entity.name.function.decorator'], settings: { foreground: '#f4c16b' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call entity.name.function'], settings: { foreground: '#ffd78f' } },
    { scope: ['entity.name.tag', 'support.type.property-name', 'variable.other.property', 'entity.other.attribute-name'], settings: { foreground: '#8fd3ff' } },
    { scope: ['markup.heading', 'markup.bold'], settings: { foreground: '#7cc4ff', fontStyle: 'bold' } },
    { scope: ['markup.inserted'], settings: { foreground: '#9fe3b8' } },
    { scope: ['markup.deleted'], settings: { foreground: '#f7a8a8' } },
  ],
};
