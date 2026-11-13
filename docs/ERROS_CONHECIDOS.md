# Erros conhecidos — Ateky Organizacional

Base de lições aprendidas. Consultada pelas skills `ateky-analisar` e `ateky-erros`.

### EK-001 — Funções declaradas duas vezes
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: comportamento muda conforme a ordem dos arquivos; sem mensagem de erro.
- Causa: a ponte (`orgListarUsuarios`, `orgCadastrarUsuario`, `orgAdminRedefinirSenha`…) veio em dois blocos diferentes.
- Solução: mantida apenas em `Org_Permissoes.js`; `Org_Ponte.js` ficou só com `orgLogin/orgMe/orgSair`.
- Regra para o futuro: o verificador acusa `DUPLICADA`. Nunca deixar duas declarações.

### EK-002 — Permissão inexistente bloqueia função
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: `Permissao insuficiente.` até para administrador.
- Causa: `dt2CadastrarOperadora` pede `detraf.admin`, que não existe em `ORGA.PERMS`.
- Solução: pendente. A tela usa `dxSalvarOperadora` (exige `usuarios.gerir` + perfil administrador), então não afeta o uso atual.
- Regra para o futuro: toda string passada a `orgaSession_`/`dt2Autorizar_` precisa estar em `ORGA.PERMS`.

### EK-003 — Chave duplicada em objeto de retorno
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: `dtGestaoDashboard().conciliacoes` vinha como lista, nunca como contagem.
- Causa: o objeto tinha `conciliacoes` duas vezes (número e array); a segunda sobrescreve.
- Solução: contagem renomeada para `totalConciliacoes`.
- Regra para o futuro: não reutilizar o mesmo nome de chave num literal de objeto.

### EK-004 — Arquivo do Drive ia para a lixeira mesmo com sucesso
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: risco de documento registrado na planilha com arquivo na lixeira.
- Causa: em `dxEnviarDocumento`, um erro após o registro (ex.: liberar o lock) cairia no `catch` que apaga o arquivo.
- Solução: `arquivo = null` logo após registrar com sucesso.
- Regra para o futuro: limpeza de compensação só deve valer antes do ponto de confirmação.

### EK-005 — Placeholder do DETRAF sem dtInicializar
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: `dtInicializar is not defined` ao clicar em DETRAF.
- Causa: `Org_Index.html` chama `dtInicializar(token)`, mas a primeira versão da interface não tinha essa função.
- Solução: a interface completa define `window.dtInicializar`; o placeholder foi para `_exemplos/`.
- Regra para o futuro: todo HTML incluído em `#detrafPainel` precisa expor `window.dtInicializar` retornando uma Promise.
