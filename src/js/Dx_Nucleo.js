/**
 * ATEKY ORGANIZACIONAL / DETRAF 2.0 - NUCLEO INTEGRADO (TESTES)
 * Um login: orgaSession_(). Nenhum novo doGet(), login ou planilha.
 * Opera na planilha DT2_SHEET_ID criada anteriormente.
 * É o backend usado pela tela Org_Detraf_Interface.html (funções dx*).
 */
const DX_CFG = Object.freeze({
  historico: 'DT2_HistoricoAlteracoes',
  competencias: 'DT2_Competencias',
  competCab: ['id', 'operadora_id', 'competencia', 'status', 'proxima_acao', 'prazo', 'responsavel', 'observacao', 'criado_em', 'atualizado_em', 'usuario'],
  histCab: ['id', 'data_hora', 'usuario_id', 'usuario_nome', 'usuario_login', 'entidade', 'registro_id', 'operadora_id', 'competencia', 'acao', 'campo', 'antes', 'depois', 'motivo'],
  opExtra: ['sigla', 'tipo', 'codigos', 'encontro_regra', 'observacoes', 'criado_em', 'atualizado_em'],
  contestExtra: ['tipo_retencao', 'vencimento', 'ultimo_contato', 'proximo_retorno']
});

/* ───────────── Acesso e utilitários ───────────── */

function dxAcesso_(token, acao) {
  const permissao = acao === 'admin' ? 'usuarios.gerir' : acao === 'editar' ? 'detraf.editar' : acao === 'importar' ? 'detraf.importar' : 'detraf.ler';
  const usuario = orgaSession_(token, permissao);
  if (acao === 'admin' && String(usuario.perfil) !== 'administrador') throw new Error('Apenas administradores podem alterar operadoras.');
  return usuario;
}

function dxAba_(nome) {
  const aba = dt2Sheet_().getSheetByName(nome);
  if (!aba) throw new Error('Aba ' + nome + ' não encontrada. Execute dxInstalarComplementos em TESTES.');
  return aba;
}

function dxCab_(nome) {
  const aba = dxAba_(nome);
  return aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
}

function dxLinhas_(nome) {
  const matriz = dxAba_(nome).getDataRange().getValues();
  if (matriz.length <= 1) return [];
  const cab = matriz[0];
  return matriz.slice(1)
    .map((valores, i) => ({ row: i + 2, ...Object.fromEntries(cab.map((campo, j) => [campo, valores[j]])) }))
    .filter(r => r[cab[0]] !== '' && r[cab[0]] !== null);
}

/** Evita injeção de fórmula na planilha (=, +, @ no início). */
function dxLimparCelula_(valor) {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string' && /^[\s]*[=+@\t\r]/.test(valor)) return "'" + valor;
  return valor;
}

function dxAnexar_(nome, dados) {
  const cab = dxCab_(nome);
  dxAba_(nome).appendRow(cab.map(k => dxLimparCelula_(dados[k])));
}

function dxAtualizar_(nome, indice, patch) {
  const sh = dxAba_(nome), cab = dxCab_(nome);
  const atual = sh.getRange(indice, 1, 1, cab.length).getValues()[0];
  const nova = cab.map((k, i) => Object.prototype.hasOwnProperty.call(patch, k) ? dxLimparCelula_(patch[k]) : atual[i]);
  sh.getRange(indice, 1, 1, cab.length).setValues([nova]);
}

function dxData_() { return new Date().toISOString(); }
function dxTexto_(v, limite) { return String(v === undefined || v === null ? '' : v).trim().slice(0, limite || 1000); }

function dxValor_(v) {
  if (v === '' || v === null || v === undefined) throw new Error('Informe um valor válido.');
  let n;
  if (typeof v === 'number') n = v;
  else {
    const s = String(v).trim().replace(/\s|R\$/g, '');
    n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  }
  if (!Number.isFinite(n) || n < 0 || n > 100000000000) throw new Error('Valor financeiro inválido.');
  return Math.round(n * 100) / 100;
}

function dxComp_(v) { const c = String(v || '').trim(); if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(c)) throw Error('Competência deve estar em AAAA-MM.'); return c; }
function dxDia_(v) { const s = dxTexto_(v, 10); if (s && !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s)) throw Error('Data inválida.'); return s; }
function dxFlag_(v) { return v === true || v === 'true' || v === 'TRUE'; }
function dxOp_(id) { const op = dxLinhas_('Operadoras').find(r => String(r.id) === String(id)); if (!op) throw Error('Operadora não encontrada.'); return op; }
function dxMotivo_(v) { return dxTexto_(v, 500); }

/** Registra no histórico cada campo alterado (antes/depois) e na auditoria. */
function dxLogMudanca_(usuario, entidade, registro, antes, depois, acao, motivo) {
  const campos = Object.keys(depois || {}).filter(c => !['atualizado_em', 'criado_em', 'usuario', 'id'].includes(c));
  const mudou = campos.filter(c => String(antes && antes[c] === undefined ? '' : antes?.[c] ?? '') !== String(depois[c] ?? ''));
  const cab = dxCab_(DX_CFG.historico), aba = dxAba_(DX_CFG.historico), agora = dxData_();
  if (!mudou.length && acao !== 'CRIAR') return;
  const linhas = (mudou.length ? mudou : ['(registro)']).map(c => {
    const opId = depois.operadora_id || depois.operadora || (entidade === 'Operadoras' ? registro.id : '') || antes?.operadora_id || '';
    const o = {
      id: Utilities.getUuid(), data_hora: agora, usuario_id: usuario.id, usuario_nome: usuario.nome, usuario_login: usuario.login,
      entidade, registro_id: registro.id, operadora_id: opId, competencia: depois.competencia || antes?.competencia || '', acao,
      campo: c,
      antes: c === '(registro)' ? '' : String(antes && antes[c] !== undefined ? antes[c] : '').slice(0, 1500),
      depois: c === '(registro)' ? 'Registro criado' : String(depois[c] ?? '').slice(0, 1500),
      motivo: dxMotivo_(motivo)
    };
    return cab.map(k => dxLimparCelula_(o[k]));
  });
  aba.getRange(aba.getLastRow() + 1, 1, linhas.length, cab.length).setValues(linhas);
  dt2Log_(usuario.id, acao + '_' + entidade, registro.id, dxTexto_(motivo, 200));
}

function dxNovaColuna_(aba, extras) {
  const existe = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  extras.filter(k => !existe.includes(k)).forEach(k => aba.getRange(1, aba.getLastColumn() + 1).setValue(k));
}

/* ───────────── Instalação ───────────── */

/** Apenas adiciona colunas e abas; não altera dados existentes ou planilhas antigas.
 * Pré-requisitos: dt2Instalar() e dtGestaoInstalar(). */
function dxInstalarComplementos() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('DT2_SHEET_ID') || !props.getProperty('DT2_FOLDER_ID')) throw Error('Base DETRAF 2.0 ainda não instalada.');
  const ss = dt2Sheet_();
  if (!/ATEKY DETRAF 2\.0 - TESTES/i.test(ss.getName())) throw Error('Instalação bloqueada: esta não é a planilha de testes esperada.');
  const obrig = ['Operadoras', 'Documentos', 'Valores', 'Auditoria', 'Conciliacoes', 'Financeiro', 'Contestacoes', 'Pendencias'];
  obrig.forEach(nome => { const aba = ss.getSheetByName(nome); if (!aba || aba.getLastRow() < 1) throw Error('Falta a aba de testes: ' + nome); });
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    dxNovaColuna_(ss.getSheetByName('Operadoras'), DX_CFG.opExtra);
    dxNovaColuna_(ss.getSheetByName('Contestacoes'), DX_CFG.contestExtra);
    [[DX_CFG.competencias, DX_CFG.competCab], [DX_CFG.historico, DX_CFG.histCab]].forEach(([nome, cols]) => {
      let sh = ss.getSheetByName(nome);
      if (!sh) sh = ss.insertSheet(nome);
      if (sh.getLastRow() === 0) { sh.getRange(1, 1, 1, cols.length).setValues([cols]); sh.setFrozenRows(1); }
      else if (sh.getRange(1, 1, 1, cols.length).getValues()[0].join('|') !== cols.join('|')) throw Error('Cabeçalhos incompatíveis em ' + nome);
    });
    return { ok: true, planilha: ss.getName(), abas: [...obrig, DX_CFG.competencias, DX_CFG.historico] };
  } finally {
    lock.releaseLock();
  }
}

/* ───────────── API chamada pela tela ───────────── */

function dxCarregar(token) {
  const u = dxAcesso_(token, 'ler');
  // Limites para evitar que a tela receba milhares de registros em uma única chamada.
  const take = (nome, limite) => {
    const all = dxLinhas_(nome);
    return {
      items: all.slice(-limite).reverse().map(({ row, ...r }) =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]))),
      total: all.length,
      limitado: all.length > limite
    };
  };
  const ops = take('Operadoras', 400), docs = take('Documentos', 250), comps = take(DX_CFG.competencias, 500),
    cons = take('Conciliacoes', 300), fin = take('Financeiro', 500), ct = take('Contestacoes', 300),
    pen = take('Pendencias', 400), his = take(DX_CFG.historico, 300), aud = take('Auditoria', 150);
  return {
    admin: String(u.perfil) === 'administrador',
    usuario: { id: u.id, nome: u.nome, perfil: u.perfil },
    operadoras: ops.items, documentos: docs.items, competencias: comps.items, conciliacoes: cons.items,
    financeiro: fin.items, contestacoes: ct.items, pendencias: pen.items, historico: his.items, auditoria: aud.items,
    limites: Object.fromEntries(Object.entries({ operadoras: ops, documentos: docs, competencias: comps, conciliacoes: cons, financeiro: fin, contestacoes: ct, pendencias: pen, historico: his })
      .map(([k, v]) => [k, { total: v.total, limitado: v.limitado }]))
  };
}

function dxSalvarOperadora(token, d) {
  const u = dxAcesso_(token, 'admin');
  if (!d || typeof d !== 'object') throw Error('Dados inválidos.');
  const id = dxTexto_(d.id, 70), nome = dxTexto_(d.nome, 140), sigla = dxTexto_(d.sigla, 30).toUpperCase();
  if (!nome || !sigla) throw Error('Informe nome e sigla da operadora.');
  const tipo = ['Parceira', 'Propria'].includes(d.tipo) ? d.tipo : 'Parceira';
  const regra = ['Obrigatorio', 'Opcional', 'Nao realizado'].includes(d.encontro_regra) ? d.encontro_regra : 'Opcional';
  const codigos = dxTexto_(d.codigos, 350).toUpperCase().replace(/\s*[,;]\s*/g, ', ');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const registros = dxLinhas_('Operadoras'), anterior = id ? registros.find(r => String(r.id) === id) : null;
    if (id && !anterior) throw Error('Operadora não encontrada.');
    if (registros.some(r => r.id !== id && (String(r.nome).toLowerCase() === nome.toLowerCase() || String(r.sigla || '').toLowerCase() === sigla.toLowerCase())))
      throw Error('Operadora ou sigla já cadastrada.');
    const agora = dxData_();
    const reg = {
      id: id || Utilities.getUuid(), nome, encontro_contas: regra !== 'Nao realizado', ativo: anterior ? dxFlag_(anterior.ativo) : true,
      sigla, tipo, codigos, encontro_regra: regra, observacoes: dxTexto_(d.observacoes, 1500),
      criado_em: anterior?.criado_em || agora, atualizado_em: agora
    };
    if (anterior) dxAtualizar_('Operadoras', anterior.row, reg); else dxAnexar_('Operadoras', reg);
    dxLogMudanca_(u, 'Operadoras', reg, anterior || {}, reg, anterior ? 'EDITAR' : 'CRIAR', dxMotivo_(d.motivo));
    return { id: reg.id };
  } finally {
    lock.releaseLock();
  }
}

function dxAtivarOperadora(token, id, ativo, motivo) {
  const u = dxAcesso_(token, 'admin'), lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const r = dxOp_(id), novo = { ...r, ativo: ativo === true, atualizado_em: dxData_() };
    dxAtualizar_('Operadoras', r.row, { ativo: novo.ativo, atualizado_em: novo.atualizado_em });
    dxLogMudanca_(u, 'Operadoras', r, r, novo, ativo ? 'REATIVAR' : 'DESATIVAR', motivo);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function dxSalvarRegistro(token, tipo, d) {
  const u = dxAcesso_(token, 'editar');
  if (!d || typeof d !== 'object') throw Error('Dados obrigatórios.');
  const mapa = { competencias: DX_CFG.competencias, conciliacoes: 'Conciliacoes', financeiro: 'Financeiro', contestacoes: 'Contestacoes', pendencias: 'Pendencias' };
  const aba = mapa[tipo];
  if (!aba) throw Error('Tipo de registro inválido.');
  const id = dxTexto_(d.id, 80), op = dxOp_(dxTexto_(d.operadora_id, 80)), comp = dxComp_(d.competencia);
  const agora = dxData_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const antigo = id ? dxLinhas_(aba).find(r => String(r.id) === id) : null;
    if (id && !antigo) throw Error('Registro não encontrado.');
    if (tipo === 'competencias' && !id && dxLinhas_(aba).some(r => r.operadora_id === op.id && r.competencia === comp))
      throw Error('Competência já cadastrada para esta operadora. Edite o registro existente.');
    const base = { id: id || Utilities.getUuid(), operadora_id: op.id, competencia: comp };
    let reg;

    if (tipo === 'competencias') {
      const status = dxTexto_(d.status, 30) || 'EM_CONFERENCIA';
      if (!['EM_CONFERENCIA', 'PENDENTE', 'AGUARDANDO_OPERADORA', 'CONCLUIDA'].includes(status)) throw Error('Situação inválida.');
      reg = { ...base, status, proxima_acao: dxTexto_(d.proxima_acao, 500), prazo: dxDia_(d.prazo), responsavel: dxTexto_(d.responsavel, 120),
        observacao: dxTexto_(d.observacao, 1500), criado_em: antigo?.criado_em || agora, atualizado_em: agora, usuario: u.id };

    } else if (tipo === 'conciliacoes') {
      const enviado = dxValor_(d.valor_enviado), recebido = dxValor_(d.valor_recebido), acordado = dxValor_(d.valor_acordado);
      const status = dxTexto_(d.status, 32) || 'EM_CONFERENCIA';
      if (!['EM_CONFERENCIA', 'DIVERGENTE', 'ACORDADO', 'CONCLUIDO'].includes(status)) throw Error('Status de conciliação inválido.');
      reg = { ...base, valor_enviado: enviado, valor_recebido: recebido, valor_acordado: acordado,
        diferenca: Math.round((enviado - recebido) * 100) / 100, status, observacao: dxTexto_(d.observacao, 2000), atualizado_em: agora, usuario: u.id };

    } else if (tipo === 'financeiro') {
      const natureza = dxTexto_(d.natureza, 10), status = dxTexto_(d.status, 20) || 'PENDENTE';
      if (!['PAGAR', 'RECEBER'].includes(natureza)) throw Error('Natureza inválida.');
      if (!['PENDENTE', 'BAIXADO', 'ESTORNADO'].includes(status)) throw Error('Status financeiro inválido.');
      const baixa = dxDia_(d.data_baixa);
      if (status === 'BAIXADO' && !baixa) throw Error('Informe a data da baixa.');
      if (status === 'ESTORNADO' && !dxTexto_(d.observacao, 2000)) throw Error('Informe o motivo do estorno.');
      reg = { ...base, natureza, descricao: dxTexto_(d.descricao, 400), valor: dxValor_(d.valor), vencimento: dxDia_(d.vencimento),
        data_baixa: status === 'BAIXADO' ? baixa : '', status, observacao: dxTexto_(d.observacao, 2000), criado_em: antigo?.criado_em || agora, usuario: u.id };

    } else if (tipo === 'contestacoes') {
      const status = dxTexto_(d.status, 40) || 'ABERTA';
      if (!['ABERTA', 'EM_ANALISE', 'AGUARDANDO_RETORNO', 'RETIFICADA', 'ENCERRADA'].includes(status)) throw Error('Status de contestação inválido.');
      const retencao = dxTexto_(d.tipo_retencao, 30) || 'SEM_RETENCAO';
      if (!['SEM_RETENCAO', 'COM_RETENCAO'].includes(retencao)) throw Error('Retenção inválida.');
      reg = { ...base, motivo: dxTexto_(d.motivo, 1000), valor_contestado: dxValor_(d.valor_contestado), status, cdr_enviado: dxFlag_(d.cdr_enviado),
        resposta_operadora: dxTexto_(d.resposta_operadora, 2000), retificacao_confirmada: dxFlag_(d.retificacao_confirmada), observacao: dxTexto_(d.observacao, 2000),
        criado_em: antigo?.criado_em || agora, atualizado_em: agora, usuario: u.id, tipo_retencao: retencao, vencimento: dxDia_(d.vencimento),
        ultimo_contato: dxDia_(d.ultimo_contato), proximo_retorno: dxDia_(d.proximo_retorno) };
      if (!reg.motivo) throw Error('Informe o motivo da contestação.');

    } else { // pendencias
      const status = dxTexto_(d.status, 25) || 'ABERTA';
      if (!['ABERTA', 'EM_ANDAMENTO', 'RESOLVIDA'].includes(status)) throw Error('Status de pendência inválido.');
      reg = { ...base, origem: dxTexto_(d.origem, 100) || 'MANUAL', referencia_id: dxTexto_(d.referencia_id, 80), descricao: dxTexto_(d.descricao, 2000),
        responsavel: dxTexto_(d.responsavel, 150), prazo: dxDia_(d.prazo), status, resolucao: dxTexto_(d.resolucao, 2000),
        criado_em: antigo?.criado_em || agora, atualizado_em: agora, usuario: u.id };
      if (!reg.descricao) throw Error('Informe a descrição da pendência.');
      if (status === 'RESOLVIDA' && !reg.resolucao) throw Error('Informe como a pendência foi resolvida.');
    }

    if (antigo) dxAtualizar_(aba, antigo.row, reg); else dxAnexar_(aba, reg);
    dxLogMudanca_(u, aba, reg, antigo || {}, reg, antigo ? 'EDITAR' : 'CRIAR', d.motivo_alteracao);
    return { id: reg.id };
  } finally {
    lock.releaseLock();
  }
}

function dxEnviarDocumento(token, dados) {
  const u = dxAcesso_(token, 'importar');
  if (!dados || typeof dados !== 'object') throw Error('Documento inválido.');
  const op = dxOp_(dados.operadora_id), comp = dxComp_(dados.competencia);
  if (op.ativo !== true) throw Error('Operadora inativa.');
  const tipo = dxTexto_(dados.tipo, 50);
  if (!DT2.tipos.includes(tipo)) throw Error('Tipo de documento inválido.');
  const original = dxTexto_(dados.nome, 180).replace(/[\\/]/g, '_');
  const ext = (original.split('.').pop() || '').toLowerCase();
  const mime = {
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pdf: 'application/pdf', csv: 'text/csv', xml: 'application/xml', txt: 'text/plain'
  };
  if (!mime[ext] || original.indexOf('.') < 1) throw Error('Formato não permitido. Use XLS, XLSX, CSV, TXT, PDF ou XML.');
  if (typeof dados.base64 !== 'string' || dados.base64.length > 12000000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(dados.base64)) throw Error('Conteúdo do arquivo inválido.');
  const bytes = Utilities.base64Decode(dados.base64);
  if (bytes.length < 1 || bytes.length > 8 * 1024 * 1024) throw Error('Arquivo vazio ou maior que 8 MB.');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let arquivo = null;
  try {
    if (dxLinhas_('Documentos').some(r => r.hash_sha256 === digest && r.operadora === op.id && r.competencia === comp && r.tipo === tipo))
      throw Error('Documento já cadastrado para esta operadora e competência.');
    const prop = PropertiesService.getScriptProperties().getProperty('DT2_FOLDER_ID');
    if (!prop) throw Error('Pasta DETRAF não configurada.');
    const limpa = s => String(s).replace(/[\\/<>:"|?*]/g, '_').slice(0, 80);
    // Estrutura: <raiz>/<sigla>/<ano>/<mês>/<tipo>
    let pasta = DriveApp.getFolderById(prop);
    for (const nome of [limpa(op.sigla || op.nome), comp.slice(0, 4), comp.slice(5), tipo]) pasta = dt2Pasta_(pasta, nome);
    const id = Utilities.getUuid(), nome = [comp, limpa(op.sigla || op.nome), tipo, id.slice(0, 8)].join('_') + '.' + ext;
    arquivo = pasta.createFile(Utilities.newBlob(bytes, mime[ext], nome));
    const doc = {
      id, operadora: op.id, competencia: comp, tipo, nome_original: original, nome_drive: nome, drive_id: arquivo.getId(), mime: mime[ext],
      hash_sha256: digest, status: 'AGUARDANDO_LEITURA', criado_em: dxData_(), usuario: u.id
    };
    dxAnexar_('Documentos', doc);
    // A falha da auditoria nao justifica excluir o arquivo ja registrado.
    try { dxLogMudanca_(u, 'Documentos', doc, {}, doc, 'CRIAR', 'Importação de documento original.'); }
    catch (logErr) { console.error('Falha na auditoria documental: ' + logErr.message); }
    arquivo = null; // registrado com sucesso: não enviar para a lixeira
    return { id, nome, status: doc.status };
  } catch (e) {
    if (arquivo) try { arquivo.setTrashed(true); } catch (ignorado) {}
    throw e;
  } finally {
    lock.releaseLock();
  }
}
