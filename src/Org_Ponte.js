/** Ponte temporaria para telas que usam os nomes antigos (orgLogin/orgMe/orgSair).
 * As demais funções da ponte (orgListarUsuarios, orgCadastrarUsuario, orgAdminRedefinirSenha,
 * orgDefinirAtivo, orgConcederPermissao) ficam SOMENTE em Org_Permissoes.gs, para não haver
 * declarações duplicadas (no Apps Script a última carregada vence sem aviso).
 */
function orgLogin(usuario, senha) {
  const r = orgaLogin(usuario, senha);
  return { token: r.token, usuario: { id: r.usuario.id, nome: r.usuario.nome, usuario: r.usuario.login, perfil: r.usuario.perfil } };
}

function orgMe(token) {
  const p = orgaMeuPerfil(token);
  return {
    usuario: { id: p.id, nome: p.nome, usuario: p.login, perfil: p.perfil },
    modulos: ['agenda', 'port', 'detraf'].filter(m => p.permissoes.indexOf(m + '.ler') !== -1)
  };
}

function orgSair(token) {
  return orgaSair(token);
}
