/** Acesso à planilha-base (camada de dados). */

function orgDb_() {
  const id = PropertiesService.getScriptProperties().getProperty('ORG_DB_ID');
  if (!id) throw Error('Execute orgInstalarBaseTeste primeiro.');
  return SpreadsheetApp.openById(id);
}

function orgSheet_(name) {
  return orgDb_().getSheetByName(name);
}

/** Lê todas as linhas da aba como objetos { row, ...colunas }, ignorando linhas vazias. */
function orgRows_(name) {
  const a = orgSheet_(name).getDataRange().getValues();
  const h = a.shift();
  return a
    .map((r, i) => ({ row: i + 2, ...Object.fromEntries(h.map((k, j) => [k, r[j]])) }))
    .filter(r => h.some(k => r[k] !== ''));
}

/** Acrescenta uma linha a partir de um objeto, seguindo a ordem do cabeçalho. */
function orgAppend_(name, obj) {
  const s = orgSheet_(name);
  const h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  s.appendRow(h.map(k => obj[k] ?? ''));
}

/** Atualiza colunas específicas de uma linha. */
function orgPatch_(name, row, patch) {
  const s = orgSheet_(name);
  const h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
  for (const [k, v] of Object.entries(patch)) {
    const i = h.indexOf(k);
    if (i >= 0) s.getRange(row, i + 1).setValue(v);
  }
}
