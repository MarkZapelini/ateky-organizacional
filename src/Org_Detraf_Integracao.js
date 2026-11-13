/**
 * ATEKY ORGANIZACIONAL — DETRAF 2.0
 * Integração com a autenticação ORGA — ambiente de testes.
 */

function orgDetrafResumo(token, filtros) {
  orgaSession_(token, 'detraf.ler');
  const status = dt2StatusInstalacao();
  if (!status.sheetId || !status.folderId) {
    return { instalado: false, operadoras: [], documentos: [], total: 0, pendentes: 0 };
  }
  const operadoras = dt2ListarOperadoras(token);
  const documentos = dt2ListarDocumentos(token, filtros || {});
  return {
    instalado: true,
    operadoras,
    documentos: documentos.map(d => ({
      id: d.id, operadora: d.operadora, competencia: d.competencia, tipo: d.tipo,
      nome: d.nome_original, status: d.status, criadoEm: d.criado_em
    })),
    total: documentos.length,
    pendentes: documentos.filter(d => d.status === 'AGUARDANDO_LEITURA').length
  };
}

function orgDetrafCriarOperadora(token, nome, encontro) {
  const usuario = orgaSession_(token, 'usuarios.gerir');
  nome = String(nome || '').trim();
  if (!nome || nome.length > 120) throw new Error('Nome de operadora inválido.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const existentes = dt2Linhas_('Operadoras');
    if (existentes.some(op => String(op.nome).toLowerCase() === nome.toLowerCase())) throw new Error('Operadora já cadastrada.');
    const id = Utilities.getUuid();
    dt2Tab_('Operadoras').appendRow([id, nome, Boolean(encontro), true]);
    dt2Log_(usuario.id, 'CRIAR_OPERADORA', id, nome);
    return { id, nome };
  } finally {
    lock.releaseLock();
  }
}

function orgDetrafUsuarios(token) { return orgaListarUsuarios(token); }
function orgDetrafCadastrarUsuario(token, dados) { return orgaCriarUsuario(token, dados); }
function orgDetrafAtualizarUsuario(token, id, dados) { return orgaAtualizarUsuario(token, id, dados); }
function orgDetrafRedefinirSenha(token, id, senha) { return orgaRedefinirSenha(token, id, senha); }
