/** ATEKY ORGANIZACIONAL - autenticacao propria (projeto separado da Academy).
 * Núcleo: configuração, acesso à base ORGA, hash, validações e permissões por perfil.
 */
const ORGA = Object.freeze({
  DB_PROP: 'ORGA_DB_ID',
  BOOT_PROP: 'ORGA_BOOTSTRAP_SECRET',
  USER_SHEET: 'Org_Usuarios',
  SESSION_SHEET: 'Org_Sessoes',
  AUDIT_SHEET: 'Org_Auditoria',
  ROLES: ['administrador', 'colaborador', 'supervisor', 'coordenador'],
  PERMS: ['detraf.ler', 'detraf.editar', 'detraf.importar', 'port.ler', 'port.editar', 'agenda.ler', 'agenda.editar', 'agenda.compartilhar', 'usuarios.gerir'],
  SESSION_HOURS: 8,
  HASH_ROUNDS: 12000
});

function orgaDb_() {
  const id = PropertiesService.getScriptProperties().getProperty(ORGA.DB_PROP);
  if (!id) throw Error('Execute orgaInstalarAuth() primeiro.');
  return SpreadsheetApp.openById(id);
}

function orgaTab_(name) {
  const s = orgaDb_().getSheetByName(name);
  if (!s) throw Error('Aba ausente: ' + name);
  return s;
}

/** Lê a aba como objetos { row, ...colunas }; ignora linhas com a 1ª coluna vazia. */
function orgaRows_(name) {
  const a = orgaTab_(name).getDataRange().getValues();
  if (a.length < 2) return [];
  const h = a[0];
  return a.slice(1)
    .map((r, i) => ({ row: i + 2, ...Object.fromEntries(h.map((k, j) => [k, r[j]])) }))
    .filter(r => r[h[0]] !== '' && r[h[0]] !== null);
}

function orgaHash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}

function orgaSecret_(length) {
  let s = '';
  while (s.length < length) s += Utilities.getUuid().replace(/-/g, '');
  return s.slice(0, length);
}

function orgaPassHash_(password, salt) {
  let value = salt + ':' + password;
  for (let i = 0; i < ORGA.HASH_ROUNDS; i++) value = orgaHash_(value + ':' + salt);
  return value;
}

function orgaLog_(actor, action, target, detail) {
  orgaTab_(ORGA.AUDIT_SHEET).appendRow([Utilities.getUuid(), new Date().toISOString(), actor, action, target, detail || '']);
}

function orgaValidatePassword_(s) {
  if (typeof s !== 'string' || s.length < 12 || s.length > 128) throw Error('Senha deve ter entre 12 e 128 caracteres.');
}

function orgaValidateLogin_(s) {
  s = String(s || '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9._-]{2,59}$/.test(s)) throw Error('Login deve ter 3 a 60 caracteres, letras, numeros, ponto, traco ou sublinhado.');
  return s;
}

function orgaPermissions_(role) {
  if (role === 'administrador') return ORGA.PERMS.slice();
  const p = ['detraf.ler', 'detraf.editar', 'detraf.importar', 'port.ler', 'port.editar', 'agenda.ler', 'agenda.editar'];
  if (['supervisor', 'coordenador'].includes(role)) p.push('agenda.compartilhar');
  return p;
}
