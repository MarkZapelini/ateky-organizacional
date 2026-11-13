/**
 * Emulador local dos serviços do Google Apps Script usados pelo Ateky.
 * Dados ficam em .local/ (planilhas = JSON, Drive = pasta de arquivos).
 * NÃO é o Google real: serve para testar telas e regras localmente.
 */
import vm from 'node:vm';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(RAIZ, 'src');
const LOCAL = join(RAIZ, '.local');
const DB = join(LOCAL, 'planilhas');
const DRIVE = join(LOCAL, 'drive');
const PROPS = join(LOCAL, 'propriedades.json');
[LOCAL, DB, DRIVE].forEach(d => mkdirSync(d, { recursive: true }));

const lerJson = (f, padrao) => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : padrao;
const gravarJson = (f, v) => writeFileSync(f, JSON.stringify(v, null, 1));

/* ───── PropertiesService ───── */
let props = lerJson(PROPS, {});
const scriptProps = {
  getProperty: k => (k in props ? props[k] : null),
  setProperty(k, v) { props[k] = String(v); gravarJson(PROPS, props); return this; },
  setProperties(o) { Object.assign(props, Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)]))); gravarJson(PROPS, props); return this; },
  deleteProperty(k) { delete props[k]; gravarJson(PROPS, props); return this; },
  getProperties: () => ({ ...props })
};

/* ───── SpreadsheetApp ───── */
const planilhas = new Map(); // id -> {id,name,sheets:[{name,rows,frozen}]}
for (const f of readdirSync(DB)) if (f.endsWith('.json')) { const p = lerJson(join(DB, f)); planilhas.set(p.id, p); }
export function salvarTudo() { for (const p of planilhas.values()) gravarJson(join(DB, p.id + '.json'), p); }

const vazio = v => v === '' || v === null || v === undefined;
function wrapSheet(sh) {
  const lastRow = () => { for (let i = sh.rows.length - 1; i >= 0; i--) if ((sh.rows[i] || []).some(v => !vazio(v))) return i + 1; return 0; };
  const lastCol = () => Math.max(0, ...sh.rows.map(r => { for (let j = (r || []).length - 1; j >= 0; j--) if (!vazio(r[j])) return j + 1; return 0; }));
  const range = (r, c, nr = 1, nc = 1) => ({
    getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = (sh.rows[r - 1 + i] || [])[c - 1 + j]; return vazio(v) ? '' : v; })),
    setValues(m) { m.forEach((linha, i) => linha.forEach((v, j) => { const ri = r - 1 + i; sh.rows[ri] = sh.rows[ri] || []; sh.rows[ri][c - 1 + j] = v instanceof Date || (v && v.toISOString) ? v.toISOString() : v; })); return this; },
    setValue(v) { return this.setValues([[v]]); }
  });
  return {
    getName: () => sh.name,
    getLastRow: lastRow,
    getLastColumn: lastCol,
    getRange: range,
    getDataRange: () => range(1, 1, Math.max(1, lastRow()), Math.max(1, lastCol())),
    appendRow(vals) { sh.rows[lastRow()] = vals.map(v => (v && v.toISOString ? v.toISOString() : v)); return this; },
    setFrozenRows(n) { sh.frozen = n; return this; }
  };
}
function wrapSs(p) {
  return {
    getId: () => p.id,
    getName: () => p.name,
    getUrl: () => 'file:///' + join(DB, p.id + '.json').replace(/\\/g, '/'),
    getSheets: () => p.sheets.map(wrapSheet),
    getSheetByName: n => { const s = p.sheets.find(x => x.name === n); return s ? wrapSheet(s) : null; },
    insertSheet(n) { const s = { name: n, rows: [], frozen: 0 }; p.sheets.push(s); return wrapSheet(s); },
    deleteSheet(w) { p.sheets = p.sheets.filter(s => s.name !== w.getName()); }
  };
}
const SpreadsheetApp = {
  create(name) { const p = { id: 'ss_' + crypto.randomUUID().replace(/-/g, ''), name, sheets: [{ name: 'Sheet1', rows: [], frozen: 0 }] }; planilhas.set(p.id, p); salvarTudo(); return wrapSs(p); },
  openById(id) { const p = planilhas.get(id); if (!p) throw new Error('Planilha não encontrada: ' + id); return wrapSs(p); }
};

/* ───── DriveApp ───── */
function wrapFolder(path) {
  return {
    getId: () => 'fld:' + path,
    getUrl: () => 'file:///' + join(DRIVE, path).replace(/\\/g, '/'),
    getFoldersByName(n) { const alvo = join(DRIVE, path, n); let dado = existsSync(alvo); return { hasNext: () => dado, next: () => { dado = false; return wrapFolder(join(path, n)); } }; },
    createFolder(n) { mkdirSync(join(DRIVE, path, n), { recursive: true }); return wrapFolder(join(path, n)); },
    createFile(blob) {
      const f = join(DRIVE, path, blob.getName()); writeFileSync(f, blob._buf);
      return { getId: () => 'arquivo_local_' + crypto.randomUUID().replace(/-/g, ''), getUrl: () => 'file:///' + f.replace(/\\/g, '/'), setTrashed() {} };
    }
  };
}
const DriveApp = {
  createFolder(n) { mkdirSync(join(DRIVE, n), { recursive: true }); return wrapFolder(n); },
  getFolderById(id) { const p = String(id).replace(/^fld:/, ''); if (!existsSync(join(DRIVE, p))) throw new Error('Pasta não encontrada: ' + id); return wrapFolder(p); }
};

/* ───── Utilities ───── */
const assinado = buf => Array.from(buf, b => (b > 127 ? b - 256 : b));
const Utilities = {
  DigestAlgorithm: { SHA_256: 'sha256' },
  Charset: { UTF_8: 'utf8' },
  getUuid: () => crypto.randomUUID(),
  computeDigest: (alg, valor) => assinado(crypto.createHash(alg).update(typeof valor === 'string' ? Buffer.from(valor, 'utf8') : Buffer.from(Array.from(valor, b => b & 255))).digest()),
  base64Decode: s => assinado(Buffer.from(s, 'base64')),
  newBlob: (bytes, mime, nome) => ({ _buf: Buffer.from(Array.from(bytes, b => b & 255)), getName: () => nome, getContentType: () => mime })
};

/* ───── HtmlService ───── */
let ctx;
const lerHtml = n => { const f = join(SRC, n + '.html'); if (!existsSync(f)) throw new Error('No HTML file named ' + n); return readFileSync(f, 'utf8'); };
const saida = conteudo => ({ getContent: () => conteudo, setTitle() { return this; }, setXFrameOptionsMode() { return this; }, addMetaTag() { return this; } });
const HtmlService = {
  createHtmlOutputFromFile: n => saida(lerHtml(n)),
  createTemplateFromFile: n => ({
    evaluate: () => saida(lerHtml(n)
      .replace(/<\?!=([\s\S]*?)\?>/g, (_, expr) => String(vm.runInContext(expr.trim().replace(/;\s*$/, ''), ctx)))
      .replace(/<\?=([\s\S]*?)\?>/g, (_, expr) => String(vm.runInContext(expr.trim().replace(/;\s*$/, ''), ctx)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))))
  }),
  XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
};

/* ───── Contexto com o código de src/ ───── */
ctx = vm.createContext({
  console, PropertiesService: { getScriptProperties: () => scriptProps },
  SpreadsheetApp, DriveApp, Utilities, HtmlService,
  LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
  Logger: { log: (...a) => console.log('[Logger]', ...a) }
});
for (const f of readdirSync(SRC).filter(f => f.endsWith('.js')).sort()) {
  vm.runInContext(readFileSync(join(SRC, f), 'utf8'), ctx, { filename: f });
}

/** Executa uma função global do projeto, como o google.script.run faria. */
export function chamar(nome, args = [], { permitirPrivada = false } = {}) {
  if (!permitirPrivada && nome.endsWith('_')) throw new Error('Função privada não pode ser chamada pelo navegador: ' + nome);
  const fn = ctx[nome];
  if (typeof fn !== 'function') throw new Error('Script function not found: ' + nome);
  try { return JSON.parse(JSON.stringify(fn(...args) ?? null)); }
  finally { salvarTudo(); }
}
/** HTML da página inicial, como o doGet() entregaria. */
export function paginaInicial() {
  return ctx.doGet().getContent();
}
export { scriptProps };
