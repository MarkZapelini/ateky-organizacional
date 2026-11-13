/** ORGA — gestão de usuários (somente perfil com 'usuarios.gerir'). */

function orgaListarUsuarios(token) {
  orgaSession_(token, 'usuarios.gerir');
  return orgaRows_(ORGA.USER_SHEET).map(u => ({
    id: u.id, nome: u.nome, login: u.login, email: u.email, setor: u.setor, perfil: u.perfil, ativo: u.ativo
  }));
}

function orgaCriarUsuario(token, d) {
  const admin = orgaSession_(token, 'usuarios.gerir');
  const login = orgaValidateLogin_(d.login);
  orgaValidatePassword_(d.senha);
  const nome = String(d.nome || '').trim();
  const email = String(d.email || '').trim();
  const setor = String(d.setor || 'Telefonia').trim();
  const perfil = String(d.perfil || 'colaborador');
  if (!nome || nome.length > 150 || !setor || setor.length > 100 || !ORGA.ROLES.includes(perfil)) throw Error('Dados de usuario invalidos.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Email invalido.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (orgaRows_(ORGA.USER_SHEET).some(x => x.login === login)) throw Error('Login ja cadastrado.');
    const id = Utilities.getUuid(), salt = orgaSecret_(32), now = new Date().toISOString();
    orgaTab_(ORGA.USER_SHEET).appendRow([id, nome, login, email, setor, perfil, true, salt, orgaPassHash_(d.senha, salt), now, now, now]);
    orgaLog_(admin.id, 'CRIAR_USUARIO', id, login);
    return { id, login };
  } finally {
    lock.releaseLock();
  }
}

function orgaRedefinirSenha(token, id, novaSenha) {
  const admin = orgaSession_(token, 'usuarios.gerir');
  orgaValidatePassword_(novaSenha);
  const u = orgaRows_(ORGA.USER_SHEET).find(x => x.id === id);
  if (!u) throw Error('Usuario nao encontrado.');
  const salt = orgaSecret_(32), sh = orgaTab_(ORGA.USER_SHEET), now = new Date().toISOString();
  // Colunas 8..11: salt, senha_hash, senha_alterada_em, criado_em
  sh.getRange(u.row, 8, 1, 4).setValues([[salt, orgaPassHash_(novaSenha, salt), now, u.criado_em]]);
  sh.getRange(u.row, 12).setValue(now); // atualizado_em
  orgaRevogarSessoes_(id);
  orgaLog_(admin.id, 'REDEFINIR_SENHA', id, 'Sessoes revogadas');
  return true;
}

function orgaAtualizarUsuario(token, id, changes) {
  const admin = orgaSession_(token, 'usuarios.gerir');
  const u = orgaRows_(ORGA.USER_SHEET).find(x => x.id === id);
  if (!u) throw Error('Usuario nao encontrado.');
  const nome = changes.nome === undefined ? String(u.nome) : String(changes.nome).trim();
  const email = changes.email === undefined ? String(u.email) : String(changes.email).trim();
  const setor = changes.setor === undefined ? String(u.setor) : String(changes.setor).trim();
  const perfil = changes.perfil === undefined ? String(u.perfil) : String(changes.perfil);
  const ativo = changes.ativo === undefined ? u.ativo === true : changes.ativo === true;
  if (!nome || nome.length > 150 || !setor || setor.length > 100 || !ORGA.ROLES.includes(perfil) ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw Error('Dados invalidos.');
  if (u.id === admin.id && (!ativo || perfil !== 'administrador')) throw Error('Nao pode retirar seu proprio acesso administrativo.');

  const sh = orgaTab_(ORGA.USER_SHEET);
  sh.getRange(u.row, 2).setValue(nome);
  sh.getRange(u.row, 4, 1, 4).setValues([[email, setor, perfil, ativo]]); // email, setor, perfil, ativo
  sh.getRange(u.row, 12).setValue(new Date().toISOString());
  if (!ativo || perfil !== u.perfil || setor !== u.setor) orgaRevogarSessoes_(id);
  orgaLog_(admin.id, 'ATUALIZAR_USUARIO', id, 'Perfil/setor/ativo alterados quando aplicavel');
  return true;
}
