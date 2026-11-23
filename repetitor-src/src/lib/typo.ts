/**
 * Русская вёрстка: короткие предлоги и союзы не висят в конце строки,
 * число не отрывается от следующего слова. Работает по тексту страницы,
 * в том числе по тому, что React дорисовывает потом.
 */
const BIND = /(^|[\s(«"])((?!(?:же|ли|бы)\s)[а-яё]{1,2}|\d+)[ \t\n]+(?=\S)/gi;
const TAIL = /(^|[\s(«"])((?!(?:же|ли|бы)\s)[а-яё]{1,2}|\d+)[ \t\n]+$/i;
const HEAD = /(^|[\s(«"])([а-яё]{1,2}|\d+)$/i;
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE']);

export function typo(s: string) {
  let prev;
  do { prev = s; s = s.replace(BIND, '$1$2\u00a0'); } while (s !== prev);
  return s;
}

function fix(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const p = node.parentElement;
    if (!p || SKIP.has(p.tagName) || p.isContentEditable) return;
    const v = node.nodeValue || '';
    if (!/\s/.test(v)) return;
    let t = typo(v);
    // React дробит текст на куски: «с » + «2009» + « года». Связываем и через границу кусков.
    const prev = node.previousSibling, next = node.nextSibling;
    if (next && TAIL.test(t)) t = t.replace(/[ \t\n]+$/, '\u00a0');
    if (prev && prev.nodeType === Node.TEXT_NODE && HEAD.test(prev.nodeValue || '')) t = t.replace(/^[ \t\n]+/, '\u00a0');
    if (t !== v) node.nodeValue = t;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || SKIP.has((node as Element).tagName)) return;
  const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) fix(n);
}

export function typeset(root: Node = document.body) {
  fix(root);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') fix(m.target);
      else m.addedNodes.forEach(fix);
    }
  }).observe(root, { subtree: true, childList: true, characterData: true });
}
