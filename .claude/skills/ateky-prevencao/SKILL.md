---
name: ateky-prevencao
description: Checklist obrigatório para NÃO repetir erros já cometidos no Ateky Organizacional. Use ANTES de qualquer alteração em src/, tools/ ou na estrutura de pastas (mover, renomear, separar, converter arquivos, mudar extensões), antes de commit/push e antes de ações externas (túnel, deploy, GitHub). Também quando o usuário disser "não quero que aconteça de novo", "evite esse erro" ou "previna".
---

# Ateky — prevenção de erros conhecidos

Fonte das regras: `docs/ERROS_CONHECIDOS.md` (EK-001 em diante). Leia o arquivo inteiro; esta skill é o resumo operacional.

## 1. Antes de mexer (pré-voo)
- [ ] **Estrutura e extensões (EK-006):** cada linguagem com sua extensão real em `src/` → `js/*.js`, `html/*.html`, `css/*.css`. Nunca extensão dupla (`.css.html`, `.js.html`). Limitação da plataforma se resolve em `tools/build.mjs`.
- [ ] **Dependências do que vai mudar (EK-007, EK-011):** `Grep` pelo nome do arquivo, ids, classes e marcadores em `src/` **e** `tools/` (testes, emulador, build e verificador dependem deles).
- [ ] **Duplicidade (EK-001):** `Grep "function nome"` em `src/js/` antes de criar função.
- [ ] **Permissões (EK-002):** toda string passada a `orgaSession_`/`dt2Autorizar_`/`dxAcesso_` precisa existir em `ORGA.PERMS`.
- [ ] **Git (EK-009):** arquivo rastreado? (`git ls-files --error-unmatch <arq>`). Se não, `mv` comum.

## 2. Durante
- [ ] **Edição de código = ferramenta Edit (EK-008).** `sed` só para trocas triviais e sempre conferir com Grep depois.
- [ ] **Nada de chave repetida em objeto (EK-003)** e **limpeza de compensação só antes do ponto de confirmação (EK-004).**
- [ ] **HTML incluído no painel DETRAF expõe `window.dtInicializar` (EK-005).**
- [ ] **Nova pasta/linguagem em `src/` (EK-015):** atualizar no mesmo passo `tools/verificar.mjs`, `tools/build.mjs`, `tools/local/emulador.mjs` e `CLAUDE.md`.
- [ ] **Teste de mensagem (EK-013):** copiar o texto do `throw` da função que está de fato em `src/js`.

## 3. Depois (obrigatório, nesta ordem)
1. `npm run verificar` → **0 erro(s)**.
2. `npm test` → **0 falharam** (inclui build e montagem da página).
3. `npm run build` → `dist/` só com `.js`/`.html`.
4. Mudou `src/js`, caminho ou pasta? **Reiniciar o servidor local (EK-010)**: parar o processo da porta 8080 e rodar `npm run local`; depois `GET /` → 200, sem `<?`, com `window.dtInicializar` e `data-css="Org_Tema_Global"`.
5. Atualizar `CLAUDE.md` se a estrutura mudou.

## 4. Commit / ações externas
- [ ] **Identidade Git (EK-012):** `git config user.name` e `user.email` preenchidos; se vazio, usar `gh api user` + e-mail `noreply`. Nunca inventar autor.
- [ ] `.local/` e `dist/` fora do commit; nenhum segredo/senha nos arquivos.
- [ ] **Ação bloqueada pelo modo automático (EK-014):** não repetir nem contornar; preparar script/comando para o usuário e explicar como liberar.

## 5. Quando um erro novo acontecer
Use a skill `ateky-erros` para registrar `EK-<próximo número>` e **acrescente aqui** a regra correspondente na seção certa. Se der para automatizar, adicione a checagem em `tools/verificar.mjs` ou um teste em `tools/testar.mjs`.
