/** ORGA — autenticação e sessões.
 * Usa o núcleo de Orga_Core.gs.
 */

function orgaLogin(login, senha) {
  login = orgaValidateLogin_(login);
  if (typeof senha !== 'string' || senha.length > 128) throw Error('Credenciais invalidas.');
  const u = orgaRows_(ORGA.USER_SHEET).find(x => x.login === login);
  // Mesmo custo aproximado para usuario inexistente, sem revelar existencia.
  const salt = u ? String(u.salt) : '00000000000000000000000000000000';
  const digest = orgaPassHash_(senha, salt);
  if (!u || u.ativo !== true || digest !== String(u.senha_hash)) throw Error('Login ou senha invalidos.');
  const token = orgaSecret_(64);
  const now = new Date();
  const exp = new Date(now.getTime() + ORGA.SESSION_HOURS * 3600000);
  orgaTab_(ORGA.SESSION_SHEET).appendRow([Utilities.getUuid(), u.id, orgaHash_(token), now.toISOString(), exp.toISOString(), false]);
  orgaLog_(u.id, 'LOGIN', u.id, 'Sessao criada');
  return {
    token,
    usuario: { id: u.id, nome: u.nome, login: u.login, perfil: u.perfil, setor: u.setor },
    expiraEm: exp.toISOString()
  };
}

function orgaSession_(token, perm) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw Error('Sessao invalida.');
  const hash = orgaHash_(token);
  const s = orgaRows_(ORGA.SESSION_SHEET).find(x => x.token_hash === hash);
  if (!s || s.revogado === true || Date.parse(s.expira_em) <= Date.now()) throw Error('Sessao expirada. Entre novamente.');
  const u = orgaRows_(ORGA.USER_SHEET).find(x => x.id === s.usuario_id);
  if (!u || u.ativo !== true) throw Error('Usuario sem acesso.');
  if (perm && !orgaPermissions_(String(u.perfil)).includes(perm)) throw Error('Permissao insuficiente.');
  return u;
}

function orgaMeuPerfil(token) {
  const u = orgaSession_(token);
  return {
    id: u.id, nome: u.nome, login: u.login, email: u.email, setor: u.setor, perfil: u.perfil,
    permissoes: orgaPermissions_(String(u.perfil))
  };
}

function orgaSair(token) {
  const u = orgaSession_(token);
  const h = orgaHash_(token);
  const s = orgaRows_(ORGA.SESSION_SHEET).find(x => x.token_hash === h);
  orgaTab_(ORGA.SESSION_SHEET).getRange(s.row, 6).setValue(true); // coluna 6 = revogado
  orgaLog_(u.id, 'LOGOUT', u.id, 'Sessao revogada');
  return true;
}

function orgaRevogarSessoes_(id) {
  const sh = orgaTab_(ORGA.SESSION_SHEET);
  orgaRows_(ORGA.SESSION_SHEET)
    .filter(s => s.usuario_id === id && s.revogado !== true)
    .forEach(s => sh.getRange(s.row, 6).setValue(true));
}
