/** DETRAF — API complementar. Não substitui as funções dt2 e dtGestao existentes. */

function orgDtPainelDados(token, filtro) {
  orgaSession_(token, 'detraf.ler');
  filtro = filtro || {};
  const operadoras = dt2ListarOperadoras(token);
  const docs = dt2ListarDocumentos(token, { operadoraId: filtro.operadoraId || '', competencia: filtro.competencia || '' });
  const d = dtGestaoDashboard(token, filtro);
  const audit = dt2Linhas_('Auditoria').slice(-100).reverse()
    .map(x => ({ data: x.data_hora, acao: x.acao, referencia: x.referencia, usuario: x.usuario }));
  return {
    operadoras,
    documentos: docs.map(x => ({ id: x.id, operadora: x.operadora, competencia: x.competencia, tipo: x.tipo, nome: x.nome_original, status: x.status, data: x.criado_em })),
    dashboard: d,
    auditoria: audit
  };
}

function orgDtCriarOperadora(token, nome, encontro) {
  return orgDetrafCriarOperadora(token, nome, encontro);
}

function orgDtSalvar(token, tipo, dados) {
  if (tipo === 'conciliacao') return dtGestaoSalvarConciliacao(token, dados);
  if (tipo === 'financeiro') return dtGestaoSalvarFinanceiro(token, dados);
  if (tipo === 'contestacao') return dtGestaoSalvarContestacao(token, dados);
  if (tipo === 'pendencia') return dtGestaoSalvarPendencia(token, dados);
  throw Error('Operação desconhecida.');
}
