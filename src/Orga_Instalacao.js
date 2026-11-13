/** ORGA — instalação da base de autenticação e criação do primeiro administrador.
 * Execute uma vez em COPIA DE TESTES do Organizacional. Nao altera a Academy.
 */
function orgaInstalarAuth() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty(ORGA.DB_PROP);
  let db;
  if (id) {
    db = SpreadsheetApp.openById(id);
  } else {
    db = SpreadsheetApp.create('ATEKY ORGANIZACIONAL - Usuarios e Sessoes (TESTES)');
    props.setProperty(ORGA.DB_PROP, db.getId());
  }

  const tabs = {
    [ORGA.USER_SHEET]: ['id', 'nome', 'login', 'email', 'setor', 'perfil', 'ativo', 'salt', 'senha_hash', 'senha_alterada_em', 'criado_em', 'atualizado_em'],
    [ORGA.SESSION_SHEET]: ['id', 'usuario_id', 'token_hash', 'criado_em', 'expira_em', 'revogado'],
    [ORGA.AUDIT_SHEET]: ['id', 'data_hora', 'autor', 'acao', 'alvo', 'detalhe']
  };
  Object.entries(tabs).forEach(([name, cols]) => {
    let sh = db.getSheetByName(name);
    if (!sh) sh = db.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, cols.length).setValues([cols]);
      sh.setFrozenRows(1);
    } else if (sh.getRange(1, 1, 1, cols.length).getValues()[0].join('|') !== cols.join('|')) {
      throw Error('Cabecalho divergente: ' + name);
    }
  });

  const first = db.getSheetByName('Página1') || db.getSheetByName('Sheet1');
  if (first && db.getSheets().length > 1 && first.getLastRow() === 0) db.deleteSheet(first);
  return { url: db.getUrl(), status: 'Base de autenticacao instalada' };
}

/**
 * Crie no editor uma propriedade de script ORGA_BOOTSTRAP_SECRET com valor
 * aleatorio de 32+ caracteres. Nunca coloque a senha no codigo-fonte.
 */
function orgaCriarPrimeiroAdmin(login, nome, email, senha, segredo) {
  const p = PropertiesService.getScriptProperties();
  const expected = p.getProperty(ORGA.BOOT_PROP);
  if (!expected || expected.length < 32 || segredo !== expected) throw Error('Segredo inicial ausente ou incorreto.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (orgaRows_(ORGA.USER_SHEET).length) throw Error('Ja existem usuarios; bootstrap indisponivel.');
    orgaValidatePassword_(senha);
    login = orgaValidateLogin_(login);
    const now = new Date().toISOString(), salt = orgaSecret_(32), id = Utilities.getUuid();
    orgaTab_(ORGA.USER_SHEET).appendRow([id, String(nome).trim(), login, String(email || '').trim(), 'Telefonia', 'administrador', true, salt, orgaPassHash_(senha, salt), now, now, now]);
    p.deleteProperty(ORGA.BOOT_PROP);
    orgaLog_(id, 'PRIMEIRO_ADMIN', id, 'Bootstrap');
    return { id, login };
  } finally {
    lock.releaseLock();
  }
}

/** Execute via editor apos preencher as propriedades de script:
 * ORGA_BOOTSTRAP_SECRET (32+ chars), ORGA_BOOT_LOGIN, ORGA_BOOT_NOME,
 * ORGA_BOOT_EMAIL, ORGA_BOOT_SENHA (12+ chars).
 * As propriedades ORGA_BOOT_* são removidas no finally, mesmo se der erro.
 */
function orgaBootstrapPeloEditor() {
  const p = PropertiesService.getScriptProperties();
  const keys = ['ORGA_BOOT_LOGIN', 'ORGA_BOOT_NOME', 'ORGA_BOOT_EMAIL', 'ORGA_BOOT_SENHA'];
  const vals = keys.map(k => p.getProperty(k));
  if (vals.some(v => !v)) throw Error('Preencha as 4 propriedades ORGA_BOOT_* antes.');
  try {
    const r = orgaCriarPrimeiroAdmin(vals[0], vals[1], vals[2], vals[3], p.getProperty(ORGA.BOOT_PROP));
    Logger.log('Administrador inicial criado: ' + r.login);
    return r;
  } finally {
    keys.forEach(k => p.deleteProperty(k));
  }
}
