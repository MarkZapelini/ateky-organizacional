/** ATEKY ORGANIZACIONAL — compatibilidade com autenticação ORGA.
 * Substitui integralmente o conteúdo antigo de Org_Permissoes.gs.
 * Não cria outra base. Operações da estrutura antiga permanecem bloqueadas.
 */
const ORG_MODULOS = ['agenda', 'port', 'detraf'];

function orgAdmin_(token) {
  const u = orgaSession_(token, 'usuarios.gerir');
  if (String(u.perfil) !== 'administrador') throw Error('Acesso administrativo não autorizado.');
  return u;
}

function orgPublico_(u) {
  return {
    id: String(u.id),
    usuario: String(u.login),
    nome: String(u.nome),
    perfil: String(u.perfil),
    setor: String(u.setor || 'Telefonia'),
    cor: '#2476D3'
  };
}

function orgModulos_(u) {
  return ORG_MODULOS.filter(m => orgaPermissions_(String(u.perfil)).includes(m + '.ler'));
}

function orgExigirModulo_(token, modulo, acao) {
  if (!ORG_MODULOS.includes(modulo)) throw Error('Módulo inválido.');
  const mapa = { visualizar: 'ler', criar: 'editar', editar: 'editar', excluir: 'editar', administrar: 'administrar' };
  return orgaSession_(token, modulo + '.' + (mapa[acao] || 'ler'));
}

function orgListarUsuarios(token) {
  return orgaListarUsuarios(token).map(u => ({
    id: u.id, usuario: u.login, nome: u.nome, perfil: u.perfil, setor: u.setor, ativo: u.ativo
  }));
}

function orgCadastrarUsuario(token, data) {
  const d = Object.assign({}, data, {
    login: data.usuario || data.login,
    setor: data.setor || 'Telefonia',
    perfil: data.perfil === 'coordenacao' ? 'coordenador' : data.perfil
  });
  return orgaCriarUsuario(token, d);
}

function orgDefinirAtivo(token, id, ativo) {
  return orgaAtualizarUsuario(token, id, { ativo: Boolean(ativo) });
}

function orgAdminRedefinirSenha(token, id, novaSenha) {
  const admin = orgAdmin_(token);
  if (String(admin.id) === String(id)) throw Error('Use outro administrador para redefinir sua própria senha.');
  return orgaRedefinirSenha(token, id, novaSenha);
}

function orgConcederPermissao(token, id, modulo, acoes) {
  orgAdmin_(token);
  throw Error('Permissões individuais ainda não migradas. Nenhuma alteração realizada.');
}

function orgListarEstrutura(token) {
  orgAdmin_(token);
  return { setores: [], subsetores: [], aviso: 'Estrutura hierárquica ainda não migrada para a base ORGA.' };
}

function orgCriarSetor(token, nome) {
  orgAdmin_(token);
  throw Error('Cadastro de setores ainda não migrado. Nenhuma alteração realizada.');
}

function orgCriarSubsetor(token, setorId, nome) {
  orgAdmin_(token);
  throw Error('Cadastro de subsetores ainda não migrado. Nenhuma alteração realizada.');
}
