/** DETRAF v2 — configuração e acesso à planilha própria do módulo. */
const DT2 = Object.freeze({
  propSheet: 'DT2_SHEET_ID',
  propFolder: 'DT2_FOLDER_ID',
  tabs: {
    Operadoras: ['id', 'nome', 'encontro_contas', 'ativo'],
    Documentos: ['id', 'operadora', 'competencia', 'tipo', 'nome_original', 'nome_drive', 'drive_id', 'mime', 'hash_sha256', 'status', 'criado_em', 'usuario'],
    Valores: ['id', 'documento_id', 'data_referencia', 'natureza', 'valor', 'status'],
    Auditoria: ['id', 'data_hora', 'usuario', 'acao', 'referencia', 'detalhe']
  },
  tipos: ['DETRAF_RECEBIDO', 'DETRAF_ENVIADO', 'ENCONTRO_CONTAS', 'NF_RECEBIDA', 'NF_ENVIADA', 'CONTESTACAO', 'COMPROVANTE', 'OUTRO']
});

function dt2Props_() {
  return PropertiesService.getScriptProperties();
}

function dt2Sheet_() {
  const id = dt2Props_().getProperty(DT2.propSheet);
  if (!id) throw Error('Execute dt2Instalar() primeiro.');
  return SpreadsheetApp.openById(id);
}

function dt2Tab_(name) {
  const sh = dt2Sheet_().getSheetByName(name);
  if (!sh) throw Error('Aba ausente: ' + name);
  return sh;
}

function dt2Id_() {
  return Utilities.getUuid();
}

function dt2Agora_() {
  return new Date().toISOString();
}

/** Lê a aba como lista de objetos (ignora linhas vazias). */
function dt2Linhas_(name) {
  const a = dt2Tab_(name).getDataRange().getValues();
  const keys = a.shift();
  return a
    .filter(r => r.some(v => v !== ''))
    .map(r => Object.fromEntries(keys.map((k, i) => [k, r[i]])));
}

function dt2Log_(usuario, acao, referencia, detalhe) {
  dt2Tab_('Auditoria').appendRow([dt2Id_(), dt2Agora_(), usuario, acao, referencia, detalhe]);
}
