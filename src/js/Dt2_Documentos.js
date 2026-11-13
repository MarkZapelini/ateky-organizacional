/** DETRAF v2 — importação e listagem de documentos (arquivos no Drive).
 * Usa Dt2_Base.gs. Ainda falta: dt2Autorizar_.
 */

/** Retorna a subpasta `nome` dentro de `pai`, criando se não existir. */
function dt2Pasta_(pai, nome) {
  const it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

function dt2SalvarDocumento(sessao, dados) {
  const usuario = dt2Autorizar_(sessao, 'detraf.importar');

  const op = dt2Linhas_('Operadoras').find(x => x.id === dados.operadoraId && x.ativo === true);
  if (!op) throw Error('Operadora inválida.');

  const comp = String(dados.competencia || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(comp)) throw Error('Competência inválida: AAAA-MM.');
  if (!DT2.tipos.includes(dados.tipo)) throw Error('Tipo documental inválido.');
  if (dados.tipo === 'ENCONTRO_CONTAS' && op.encontro_contas !== true) throw Error('Operadora sem encontro de contas.');

  const original = String(dados.nome || '').replace(/[\\\/]/g, '_').slice(0, 180);
  const ext = (original.split('.').pop() || '').toLowerCase();
  const mimes = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    pdf: 'application/pdf',
    csv: 'text/csv',
    xml: 'application/xml'
  };
  if (!mimes[ext]) throw Error('Formato não permitido.');

  const base64 = String(dados.base64 || '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw Error('Conteúdo inválido.');
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > 8 * 1024 * 1024) throw Error('Limite inicial: 8 MB por arquivo.');

  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const duplicado = dt2Linhas_('Documentos').some(r =>
      r.hash_sha256 === hash && r.operadora === op.id && r.competencia === comp && r.tipo === dados.tipo);
    if (duplicado) throw Error('Arquivo já importado nesta operadora/competência/tipo.');

    // Estrutura: <raiz>/<operadora>/<ano>/<mês>
    const folder = DriveApp.getFolderById(dt2Props_().getProperty(DT2.propFolder));
    const target = dt2Pasta_(dt2Pasta_(dt2Pasta_(folder, op.nome), comp.slice(0, 4)), comp.slice(5));

    const id = dt2Id_();
    const newName = [op.nome, comp, dados.tipo, id.slice(0, 8)].join('_') + '.' + ext;
    const f = target.createFile(Utilities.newBlob(bytes, mimes[ext], newName));

    dt2Tab_('Documentos').appendRow([id, op.id, comp, dados.tipo, original, newName, f.getId(), mimes[ext], hash, 'AGUARDANDO_LEITURA', dt2Agora_(), usuario]);
    dt2Log_(usuario, 'IMPORTAR_DOCUMENTO', id, newName);
    return { id, arquivo: newName, status: 'AGUARDANDO_LEITURA' };
  } finally {
    lock.releaseLock();
  }
}

function dt2ListarDocumentos(sessao, filtro) {
  dt2Autorizar_(sessao, 'detraf.ler');
  filtro = filtro || {};
  return dt2Linhas_('Documentos').filter(r =>
    (!filtro.operadoraId || r.operadora === filtro.operadoraId) &&
    (!filtro.competencia || r.competencia === filtro.competencia));
}
