/** DETRAF v2 — conferência de documentos por operadora/competência.
 * Usa DT2 e dt2Linhas_ (Dt2_Base.gs). Ainda falta: dt2Autorizar_.
 */
function dt2Conferencia(sessao, operadoraId, competencia) {
  dt2Autorizar_(sessao, 'detraf.ler');
  const op = dt2Linhas_('Operadoras').find(r => r.id === operadoraId);
  if (!op) throw Error('Operadora não encontrada.');
  const docs = dt2Linhas_('Documentos').filter(r => r.operadora === operadoraId && r.competencia === competencia);
  const required = DT2.tipos.filter(t =>
    !['CONTESTACAO', 'COMPROVANTE', 'OUTRO'].includes(t) &&
    !(t === 'ENCONTRO_CONTAS' && op.encontro_contas !== true)
  );
  return {
    operadora: op.nome,
    competencia,
    documentos: docs,
    checagem: required.map(tipo => ({ tipo, status: docs.some(d => d.tipo === tipo) ? 'ARQUIVADO' : 'PENDENTE' })),
    observacao: 'ARQUIVADO não significa valor validado.'
  };
}
