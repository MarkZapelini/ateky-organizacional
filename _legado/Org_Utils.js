/** Utilitários gerais: auditoria e geração de IDs. */

function orgLog_(uid, action, target, details) {
  orgAppend_('Org_Auditoria', {
    data: new Date().toISOString(),
    usuarioId: uid,
    acao: action,
    alvo: target,
    detalhes: String(details || '').slice(0, 300)
  });
}

function orgId_() {
  return Utilities.getUuid();
}
