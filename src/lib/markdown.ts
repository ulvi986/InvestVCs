// Minimal, dependency-free markdown -> HTML renderer used for AI analysis output.
// Handles headings, bold/italic, simple bullet lists and paragraphs.
export function renderMarkdown(text: string): string {
  return text
    .replace(/### (.*)/g, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/## (.*)/g, '<h2 class="text-lg font-bold mt-5 mb-2">$1</h2>')
    .replace(/# (.*)/g, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\*   /gm, '• ')
    .replace(/^\- /gm, '• ')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n(• )/g, '<br/>$1')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p class="mb-3">')
    .replace(/$/, '</p>');
}
