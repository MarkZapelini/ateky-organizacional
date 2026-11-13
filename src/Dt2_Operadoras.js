/** DETRAF v2 — cadastro e listagem de operadoras. */

function dt2CadastrarOperadora(sessao, nome, encontro) {
  const u = dt2Autorizar_(sessao, 'detraf.admin');
  nome = String(nome || '').trim();
  if (!nome || nome.length > 120) throw Error('Nome inválido.');
  const rows = dt2Linhas_('Operadoras');
  if (rows.some(r => String(r.nome).toLowerCase() === nome.toLowerCase())) throw Error('Operadora já cadastrada.');
  const id = dt2Id_();
  dt2Tab_('Operadoras').appendRow([id, nome, Boolean(encontro), true]);
  dt2Log_(u, 'CRIAR_OPERADORA', id, nome);
  return { id, nome };
}

function dt2ListarOperadoras(sessao) {
  dt2Autorizar_(sessao, 'detraf.ler');
  return dt2Linhas_('Operadoras').filter(r => r.ativo === true);
}
