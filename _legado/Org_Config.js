/** Ateky Organizacional TESTES — projeto Apps Script independente. */

/** Estrutura das abas da planilha-base (nome da aba -> colunas). */
const ORG_TABS = {
  Org_Usuarios: ['id', 'usuario', 'nome', 'perfil', 'setorId', 'subsetorId', 'cor', 'ativo', 'salt', 'senhaHash', 'trocarSenha', 'criadoEm', 'atualizadoEm'],
  Org_Setores: ['id', 'nome', 'ativo'],
  Org_Subsetores: ['id', 'setorId', 'nome', 'ativo'],
  Org_Vinculos: ['id', 'superiorId', 'subordinadoId', 'setorId', 'subsetorId'],
  Org_Permissoes: ['id', 'usuarioId', 'modulo', 'visualizar', 'criar', 'editar', 'excluir', 'administrar'],
  Org_Sessoes: ['tokenHash', 'usuarioId', 'expiraEm', 'revogada', 'criadaEm'],
  Org_Auditoria: ['data', 'usuarioId', 'acao', 'alvo', 'detalhes'],
  Org_Configuracoes: ['chave', 'valor']
};
