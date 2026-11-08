import { readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { parse as parseHtml } from 'parse5';
import { init, parse as parseImports } from 'es-module-lexer';

export async function createPageAssetMeasurer(outputRoot) {
  await init();
  const root = resolve(outputRoot);
  const sizes = new Map();
  const dependencies = new Map();
  const assetFile = (url, parent = root) => {
    if (!url || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return null;
    const pathname = decodeURIComponent(url.split(/[?#]/)[0]);
    const file = pathname.startsWith('/')
      ? resolve(root, `.${pathname}`)
      : resolve(parent, pathname);
    if (!file.startsWith(`${root}${sep}`)) throw new Error(`Asset leaves build output: ${url}`);
    return file;
  };
  const gzipSize = (file) => {
    if (!sizes.has(file)) sizes.set(file, gzipSync(readFileSync(file)).byteLength);
    return sizes.get(file);
  };
  const moduleImports = (file) => {
    if (!dependencies.has(file)) {
      const [imports] = parseImports(readFileSync(file, 'utf8'));
      dependencies.set(
        file,
        imports
          .filter(
            (entry) =>
              entry.type === 'static' && entry.specifier && /^(?:\.|\/)/.test(entry.specifier)
          )
          .map((entry) => assetFile(entry.specifier, dirname(file)))
          .filter(Boolean)
      );
    }
    return dependencies.get(file);
  };

  return (html, pagePath = 'index.html') => {
    const scripts = new Set();
    const stylesheets = new Set();
    const parent = dirname(resolve(root, pagePath));
    const addScript = (url) => {
      const file = assetFile(url, parent);
      if (file) scripts.add(file);
    };
    const visit = (node) => {
      const attributes = Object.fromEntries(
        (node.attrs ?? []).map(({ name, value }) => [name, value])
      );
      if (node.tagName === 'script') addScript(attributes.src);
      if (node.tagName === 'link' && attributes.rel === 'modulepreload') addScript(attributes.href);
      if (node.tagName === 'link' && attributes.rel === 'stylesheet') {
        const file = assetFile(attributes.href, parent);
        if (file) stylesheets.add(file);
      }
      if (node.tagName === 'astro-island' && ['load', 'idle'].includes(attributes.client)) {
        addScript(attributes['component-url']);
        addScript(attributes['renderer-url']);
      }
      for (const child of node.childNodes ?? []) visit(child);
    };
    visit(parseHtml(html));
    const visited = new Set();
    const collect = (file) => {
      if (visited.has(file)) return;
      visited.add(file);
      for (const dependency of moduleImports(file)) collect(dependency);
    };
    for (const script of scripts) collect(script);
    return {
      htmlBytes: Buffer.byteLength(html),
      initialJavaScriptGzipBytes: [...visited].reduce((sum, file) => sum + gzipSize(file), 0),
      stylesheetGzipBytes: [...stylesheets].reduce((sum, file) => sum + gzipSize(file), 0),
      initialJavaScriptFiles: visited.size,
    };
  };
}
