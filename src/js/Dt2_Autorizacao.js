/** DETRAF v2 — autorização.
 * Uma única sessão: DETRAF usa a sessão já validada pelo Organizacional (ORGA).
 * O servidor nunca confia apenas na presença de um token.
 * Mantenha UMA ÚNICA declaração de dt2Autorizar_ e de orgDetrafAutorizarSessao_ no projeto.
 */
function dt2Autorizar_(sessao, acao) {
  return orgDetrafAutorizarSessao_(sessao, acao);
}

/** Adaptador: valida sessão + permissão no ORGA e devolve o id do usuário (identidade auditável). */
function orgDetrafAutorizarSessao_(token, permissao) {
  const u = orgaSession_(token, permissao);
  return u.id;
}

function orgDetrafModuloDisponivel(sessao) {
  orgDetrafAutorizarSessao_(sessao, 'detraf.ler');
  return { id: 'detraf', titulo: 'DETRAF 2.0', html: 'html/Org_Detraf_Interface' };
}
