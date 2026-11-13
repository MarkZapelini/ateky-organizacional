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

### EK-006 — Extensão dupla para contornar a plataforma (.css.html)
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: arquivos `Org_Base.css.html` na pasta `css/`; o usuário apontou como errado.
- Causa: a limitação do Apps Script (só aceita .gs/.html) foi resolvida renomeando o código-fonte.
- Solução: CSS puro em `src/css/*.css`; `npm run build` gera `dist/css/*.html` com `<style>`.
- Regra para o futuro: **cada linguagem com sua extensão real no `src/`**. Adaptações exigidas pela plataforma ficam no build (`tools/build.mjs`), nunca nos nomes do código-fonte.

### EK-007 — Marcador perdido ao converter arquivo
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: teste "página inicial monta com tema" falhou (`tema ausente`).
- Causa: o teste procurava `id="org-tema-global-v2"`, que estava na tag `<style>` removida na conversão para `.css`.
- Solução: build/emulador marcam `<style data-css="Nome">`; teste confere cada CSS e o conteúdo.
- Regra para o futuro: antes de transformar/renomear um arquivo, `Grep` por ids, classes, nomes e marcadores dele em `src/` **e em `tools/`** (testes também dependem deles).

### EK-008 — sed com aspas/barras falhou em silêncio
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: comando `sed` "rodou", mas o arquivo não mudou.
- Causa: escapes de `'`, `"`, `/` e `\n` dentro de código JS não bateram com o texto.
- Solução: usar a ferramenta Edit com o trecho exato.
- Regra para o futuro: **edição de código = Edit**, não sed. Se usar sed, conferir em seguida com Grep/diff que a mudança aconteceu.

### EK-009 — git mv em arquivo não rastreado
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: `fatal: not under version control` e os passos seguintes do laço falharam.
- Causa: arquivos criados depois do último commit ainda não estavam no Git.
- Solução: `mv` comum para os não rastreados.
- Regra para o futuro: em laços de renomeação, checar `git ls-files --error-unmatch` ou usar `mv` + `git add -A`; nunca encadear passos que dependem de um `git mv` sem `&&`/verificação.

### EK-010 — Servidor local com código antigo
- Data: 2026-11-12 · Ocorrências: 2
- Sintoma: página servida sem as mudanças de caminho/pasta.
- Causa: o emulador carrega `src/js` uma única vez na inicialização.
- Solução: parar o processo da porta 8080 e rodar `npm run local` de novo.
- Regra para o futuro: depois de mudar `src/js`, caminhos ou a estrutura de pastas, **reiniciar o servidor** antes de testar pela HTTP. (HTML/CSS são relidos a cada pedido.)

### EK-011 — Mover arquivos muda o nome no Apps Script
- Data: 2026-11-12 · Ocorrências: 2
- Sintoma: risco de "No HTML file named X" ao abrir o Web App.
- Causa: no Apps Script a pasta faz parte do nome (`html/Org_Index`, `css/Org_Base`).
- Solução: atualizar todos os `createHtmlOutputFromFile`/`createTemplateFromFile` e o `html:` do `orgDetrafModuloDisponivel`.
- Regra para o futuro: após mover/renomear, rodar `npm run verificar` (acusa `ARQUIVO_AUSENTE`) e `npm test`.

### EK-012 — Commit sem identidade do Git
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: `Author identity unknown`; o primeiro commit saiu com nome/e-mail improvisados.
- Causa: Git sem `user.name`/`user.email` neste computador.
- Solução: identidade local do repositório pela conta do GitHub com e-mail `noreply`.
- Regra para o futuro: antes do primeiro commit, `git config user.name`/`user.email`; se vazio, usar `gh api user` e o e-mail `ID+login@users.noreply.github.com`. Nunca inventar autor.

### EK-013 — Teste esperando texto que o código não produz
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: teste falhou com "erro diferente do esperado".
- Causa: a mensagem esperada foi tirada de uma versão duplicada (removida) da função.
- Solução: teste ajustado para a mensagem real de `Org_Permissoes.js`.
- Regra para o futuro: ao escrever teste de mensagem, copiar o texto do `throw` da função que **realmente** está em `src/js`.

### EK-014 — Ação externa bloqueada pelo modo automático
- Data: 2026-11-12 · Ocorrências: 2
- Sintoma: túnel Cloudflare negado ("External Ingress Tunnel").
- Causa: expor a máquina à internet exige permissão explícita do usuário nas configurações.
- Solução: criado `tools/tunel-cloudflare.bat` para o usuário executar.
- Regra para o futuro: não repetir a mesma ação bloqueada nem contorná-la; preparar o comando/script e explicar como o usuário libera.

### EK-015 — JavaScript dentro do HTML sem checagem
- Data: 2026-11-12 · Ocorrências: 1
- Sintoma: erro de sintaxe no `<script>` da tela só apareceria no navegador.
- Causa: o verificador só checava arquivos `.js`.
- Solução: verificador extrai os `<script>` de `src/html` e roda `node --check` (`SINTAXE_HTML`).
- Regra para o futuro: toda nova linguagem/pasta em `src/` precisa entrar no verificador e no build no mesmo commit.
