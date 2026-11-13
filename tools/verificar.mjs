#!/usr/bin/env node
/**
 * Verificador estático do projeto Ateky Organizacional (Google Apps Script em src/).
 * Uso: node tools/verificar.mjs        (saída legível)
 *      node tools/verificar.mjs --json (saída JSON para automação)
 * Código de saída: 0 = sem erros, 1 = há erros.
 *
 * Checagens:
 *  1. Sintaxe de cada .js (node --check)
 *  2. Funções/constantes globais declaradas em mais de um arquivo (no Apps Script a última vence, sem aviso)
 *  3. Chamadas a funções do projeto (prefixos org/orga/dt/dt2/dx) que não existem
 *  4. Funções chamadas do navegador (google.script.run / api('...')) que não existem ou são privadas (terminam com _)
 *  5. Arquivos HTML incluídos via HtmlService que não existem
 */
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(raiz, 'src');
// Estrutura: src/js/*.js e src/html/*.html. Nomes no formato "js/X.js" e "html/X.html"
// (no Apps Script, a pasta faz parte do nome do arquivo).
const js = readdirSync(join(src, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f);
const html = readdirSync(join(src, 'html')).filter(f => f.endsWith('.html')).map(f => 'html/' + f);
const ler = f => readFileSync(join(src, f), 'utf8');

const erros = [];
const avisos = [];
const add = (lista, tipo, arquivo, detalhe) => lista.push({ tipo, arquivo, detalhe });

// 1. Sintaxe
const tmp = mkdtempSync(join(tmpdir(), 'ateky-'));
for (const f of js) {
  const copia = join(tmp, basename(f, '.js') + '.cjs');
  writeFileSync(copia, ler(f));
  try { execFileSync(process.execPath, ['--check', copia], { stdio: 'pipe' }); }
  catch (e) { add(erros, 'SINTAXE', f, String(e.stderr || e.message).split('\n').slice(0, 5).join(' | ')); }
}

// 1b. Sintaxe dos <script> dentro dos .html (ignora os com src= e os templates <?...?>)
for (const f of html) {
  const blocos = [...ler(f).matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
  if (!blocos.trim()) continue;
  const copia = join(tmp, basename(f, '.html') + '.html.cjs');
  writeFileSync(copia, blocos);
  try { execFileSync(process.execPath, ['--check', copia], { stdio: 'pipe' }); }
  catch (e) { add(erros, 'SINTAXE_HTML', f, String(e.stderr || e.message).split('\n').slice(0, 5).join(' | ')); }
}

// 2. Declarações globais
const declaradas = new Map(); // nome -> [arquivos]
const reDecl = /^(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/gm;
for (const f of js) {
  for (const m of ler(f).matchAll(reDecl)) {
    const nome = m[1] || m[2];
    if (!declaradas.has(nome)) declaradas.set(nome, []);
    declaradas.get(nome).push(f);
  }
}
for (const [nome, fs] of declaradas) if (fs.length > 1) add(erros, 'DUPLICADA', fs.join(', '), nome);

// 3. Chamadas inexistentes (somente prefixos do projeto)
const rePrefixo = /\b((?:orga?|dt2?|dx)[A-Z_][\w$]*)\s*\(/g;
for (const f of js) {
  const texto = ler(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const m of texto.matchAll(rePrefixo)) {
    if (!declaradas.has(m[1])) add(erros, 'NAO_DEFINIDA', f, m[1]);
  }
}

// 4. Chamadas do cliente (HTML)
const reCliente = [/google\.script\.run[\s\S]{0,200}?\.([A-Za-z_$][\w$]*)\s*\(/g, /\b(?:call|api)\(\s*'([A-Za-z_$][\w$]*)'/g];
const ignorar = new Set(['withSuccessHandler', 'withFailureHandler', 'withUserObject']);
for (const f of html) {
  const texto = ler(f);
  for (const re of reCliente) {
    for (const m of texto.matchAll(re)) {
      const nome = m[1];
      if (ignorar.has(nome)) continue;
      if (!declaradas.has(nome)) add(erros, 'CLIENTE_SEM_BACKEND', f, nome);
      else if (nome.endsWith('_')) add(erros, 'CLIENTE_CHAMA_PRIVADA', f, nome + ' (funções com _ não são chamáveis do navegador)');
    }
  }
}

// 5. Includes de HTML
const reInclude = /create(?:HtmlOutput|Template)FromFile\(\s*'([^']+)'\s*\)/g;
for (const f of [...js, ...html]) {
  for (const m of ler(f).matchAll(reInclude)) {
    if (!html.includes(m[1] + '.html')) add(erros, 'HTML_AUSENTE', f, m[1] + '.html');
  }
}

// Aviso: funções públicas (sem _) que nada chama — podem ser utilitários de editor ou código morto
const todoTexto = [...js, ...html].map(ler).join('\n');
for (const [nome, fs] of declaradas) {
  if (nome.endsWith('_') || nome === 'doGet' || /^[A-Z_]+$/.test(nome)) continue;
  const usos = todoTexto.split(nome).length - 1;
  if (usos <= 1) add(avisos, 'SEM_USO', fs[0], nome + ' (executar pelo editor ou remover)');
}

const unicos = l => [...new Map(l.map(x => [x.tipo + x.arquivo + x.detalhe, x])).values()];
const resultado = { erros: unicos(erros), avisos: unicos(avisos), arquivos: { js: js.length, html: html.length } };

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(resultado, null, 2));
} else {
  console.log(`Ateky — verificação de ${js.length} .js e ${html.length} .html em src/\n`);
  for (const e of resultado.erros) console.log(`ERRO  [${e.tipo}] ${e.arquivo}: ${e.detalhe}`);
  for (const a of resultado.avisos) console.log(`AVISO [${a.tipo}] ${a.arquivo}: ${a.detalhe}`);
  console.log(`\n${resultado.erros.length} erro(s), ${resultado.avisos.length} aviso(s).`);
}
process.exit(resultado.erros.length ? 1 : 0);
