#!/usr/bin/env node
/**
 * Gera dist/ no formato que o Google Apps Script aceita (somente .js/.gs e .html).
 *   src/js/X.js     → dist/js/X.js
 *   src/html/X.html → dist/html/X.html
 *   src/css/X.css   → dist/css/X.html   (conteúdo dentro de <style>; incluído como 'css/X')
 *   src/appsscript.json → dist/appsscript.json
 * Use dist/ como rootDir do clasp ou copie os arquivos de dist/ para o editor do Apps Script.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(raiz, 'src'), dist = join(raiz, 'dist');
rmSync(dist, { recursive: true, force: true });
for (const p of ['js', 'html', 'css']) mkdirSync(join(dist, p), { recursive: true });

copyFileSync(join(src, 'appsscript.json'), join(dist, 'appsscript.json'));
let n = 0;
for (const f of readdirSync(join(src, 'js')).filter(f => f.endsWith('.js'))) { copyFileSync(join(src, 'js', f), join(dist, 'js', f)); n++; }
for (const f of readdirSync(join(src, 'html')).filter(f => f.endsWith('.html'))) { copyFileSync(join(src, 'html', f), join(dist, 'html', f)); n++; }
for (const f of readdirSync(join(src, 'css')).filter(f => f.endsWith('.css'))) {
  const css = readFileSync(join(src, 'css', f), 'utf8');
  if (/<\/style/i.test(css)) throw new Error(f + ' contém </style>, o que quebraria o HTML gerado.');
  const nome = f.replace(/\.css$/, '');
  writeFileSync(join(dist, 'css', nome + '.html'), '<style data-css="' + nome + '">\n' + css + '</style>\n');
  n++;
}
console.log(`dist/ gerado com ${n} arquivos + appsscript.json`);
