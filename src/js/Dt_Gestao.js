/**
 * ATEKY DETRAF 2.0 — GESTÃO OPERACIONAL
 * Complemento da base DT2 já instalada (abas Conciliacoes, Financeiro, Contestacoes, Pendencias).
 * Não altera a autenticação nem apaga registros.
 */
const DT_GESTAO_ABAS = {
  Conciliacoes: ['id', 'operadora_id', 'competencia', 'valor_enviado', 'valor_recebido', 'valor_acordado', 'diferenca', 'status', 'observacao', 'atualizado_em', 'usuario'],
  Financeiro: ['id', 'operadora_id', 'competencia', 'natureza', 'descricao', 'valor', 'vencimento', 'data_baixa', 'status', 'observacao', 'criado_em', 'usuario'],
  Contestacoes: ['id', 'operadora_id', 'competencia', 'motivo', 'valor_contestado', 'status', 'cdr_enviado', 'resposta_operadora', 'retificacao_confirmada', 'observacao', 'criado_em', 'atualizado_em', 'usuario'],
  Pendencias: ['id', 'operadora_id', 'competencia', 'origem', 'referencia_id', 'descricao', 'responsavel', 'prazo', 'status', 'resolucao', 'criado_em', 'atualizado_em', 'usuario']
};

function dtGestaoInstalar() {
  const ss = dt2Sheet_();
  Object.entries(DT_GESTAO_ABAS).forEach(([nome, cabecalhos]) => {
    let aba = ss.getSheetByName(nome);
    if (!aba) aba = ss.insertSheet(nome);
    if (aba.getLastRow() === 0) {
      aba.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
      aba.setFrozenRows(1);
    } else {
      const atuais = aba.getRange(1, 1, 1, cabecalhos.length).getValues()[0];
      if (atuais.join('|') !== cabecalhos.join('|')) throw new Error('Cabeçalhos divergentes: ' + nome);
    }
  });
  return 'Estrutura DETRAF instalada.';
}

function dtGestaoLinhas_(nome) {
  const aba = dt2Sheet_().getSheetByName(nome);
  if (!aba) throw new Error('Aba não instalada: ' + nome);
  const valores = aba.getDataRange().getValues();
  if (valores.length < 2) return [];
  const cabecalhos = valores[0];
  return valores.slice(1)
    .filter(linha => linha[0] !== '')
    .map(linha => Object.fromEntries(cabecalhos.map((coluna, i) => [coluna, linha[i]])));
}

function dtGestaoGravar_(nome, registro) {
  const aba = dt2Sheet_().getSheetByName(nome);
  const cabecalhos = DT_GESTAO_ABAS[nome];
  if (!aba || !cabecalhos) throw new Error('Tabela inválida.');
  aba.appendRow(cabecalhos.map(c => registro[c] ?? ''));
}

function dtGestaoNumero_(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) throw new Error('Valor financeiro inválido.');
  return Math.round(numero * 100) / 100;
}

function dtGestaoValidar_(dados) {
  if (!dados || typeof dados !== 'object') throw new Error('Dados obrigatórios.');
  const competencia = String(dados.competencia || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) throw new Error('Competência inválida.');
  const operadora = dt2Linhas_('Operadoras').find(o => o.id === dados.operadoraId && o.ativo === true);
  if (!operadora) throw new Error('Operadora inválida.');
  return { competencia, operadora };
}

/** Grava com lock + auditoria. */
function dtGestaoGravarComLog_(aba, registro, usuarioId, acao, detalhe) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    dtGestaoGravar_(aba, registro);
    dt2Log_(usuarioId, acao, registro.id, detalhe);
  } finally {
    lock.releaseLock();
  }
  return { id: registro.id };
}

function dtGestaoSalvarConciliacao(token, dados) {
  const usuario = orgaSession_(token, 'detraf.editar');
  const validado = dtGestaoValidar_(dados);
  const enviado = dtGestaoNumero_(dados.enviado);
  const recebido = dtGestaoNumero_(dados.recebido);
  const acordado = dtGestaoNumero_(dados.acordado);
  const registro = {
    id: Utilities.getUuid(),
    operadora_id: validado.operadora.id,
    competencia: validado.competencia,
    valor_enviado: enviado,
    valor_recebido: recebido,
    valor_acordado: acordado,
    diferenca: Math.round((enviado - recebido) * 100) / 100,
    status: 'EM_CONFERENCIA',
    observacao: String(dados.observacao || '').slice(0, 1000),
    atualizado_em: new Date().toISOString(),
    usuario: usuario.id
  };
  return dtGestaoGravarComLog_('Conciliacoes', registro, usuario.id, 'CRIAR_CONCILIACAO', registro.competencia);
}

function dtGestaoSalvarFinanceiro(token, dados) {
  const usuario = orgaSession_(token, 'detraf.editar');
  const validado = dtGestaoValidar_(dados);
  const natureza = String(dados.natureza || '');
  if (!['PAGAR', 'RECEBER'].includes(natureza)) throw new Error('Natureza inválida.');
  const registro = {
    id: Utilities.getUuid(),
    operadora_id: validado.operadora.id,
    competencia: validado.competencia,
    natureza,
    descricao: String(dados.descricao || '').slice(0, 300),
    valor: dtGestaoNumero_(dados.valor),
    vencimento: String(dados.vencimento || ''),
    data_baixa: '',
    status: 'PENDENTE',
    observacao: String(dados.observacao || '').slice(0, 1000),
    criado_em: new Date().toISOString(),
    usuario: usuario.id
  };
  return dtGestaoGravarComLog_('Financeiro', registro, usuario.id, 'CRIAR_FINANCEIRO', natureza);
}

function dtGestaoSalvarContestacao(token, dados) {
  const usuario = orgaSession_(token, 'detraf.editar');
  const validado = dtGestaoValidar_(dados);
  const agora = new Date().toISOString();
  const registro = {
    id: Utilities.getUuid(),
    operadora_id: validado.operadora.id,
    competencia: validado.competencia,
    motivo: String(dados.motivo || '').slice(0, 500),
    valor_contestado: dtGestaoNumero_(dados.valor),
    status: 'ABERTA',
    cdr_enviado: false,
    resposta_operadora: '',
    retificacao_confirmada: false,
    observacao: String(dados.observacao || '').slice(0, 1000),
    criado_em: agora,
    atualizado_em: agora,
    usuario: usuario.id
  };
  return dtGestaoGravarComLog_('Contestacoes', registro, usuario.id, 'CRIAR_CONTESTACAO', registro.motivo);
}

function dtGestaoSalvarPendencia(token, dados) {
  const usuario = orgaSession_(token, 'detraf.editar');
  const validado = dtGestaoValidar_(dados);
  const agora = new Date().toISOString();
  const registro = {
    id: Utilities.getUuid(),
    operadora_id: validado.operadora.id,
    competencia: validado.competencia,
    origem: String(dados.origem || 'MANUAL'),
    referencia_id: String(dados.referenciaId || ''),
    descricao: String(dados.descricao || '').slice(0, 1000),
    responsavel: String(dados.responsavel || ''),
    prazo: String(dados.prazo || ''),
    status: 'ABERTA',
    resolucao: '',
    criado_em: agora,
    atualizado_em: agora,
    usuario: usuario.id
  };
  return dtGestaoGravarComLog_('Pendencias', registro, usuario.id, 'CRIAR_PENDENCIA', registro.descricao);
}

function dtGestaoDashboard(token, filtros) {
  orgaSession_(token, 'detraf.ler');
  filtros = filtros || {};
  const selecionar = registros => registros.filter(r =>
    (!filtros.operadoraId || r.operadora_id === filtros.operadoraId) &&
    (!filtros.competencia || r.competencia === filtros.competencia));

  const financeiro = selecionar(dtGestaoLinhas_('Financeiro'));
  const conciliacoes = selecionar(dtGestaoLinhas_('Conciliacoes'));
  const contestacoes = selecionar(dtGestaoLinhas_('Contestacoes'));
  const pendencias = selecionar(dtGestaoLinhas_('Pendencias'));
  const soma = (lista, natureza) => lista.filter(r => r.natureza === natureza).reduce((total, r) => total + Number(r.valor || 0), 0);

  return {
    totalPagar: soma(financeiro, 'PAGAR'),
    totalReceber: soma(financeiro, 'RECEBER'),
    totalConciliacoes: conciliacoes.length,
    contestacoesAbertas: contestacoes.filter(r => !['ENCERRADA', 'RETIFICADA'].includes(r.status)).length,
    pendenciasAbertas: pendencias.filter(r => r.status !== 'RESOLVIDA').length,
    financeiro,
    conciliacoes,
    contestacoes,
    pendencias
  };
}
