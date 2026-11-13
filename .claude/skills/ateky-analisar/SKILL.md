---
name: ateky-analisar
description: Lê, interpreta e valida o código do Ateky Organizacional (Google Apps Script em src/). Use quando o usuário colar código novo para encaixar no sistema, pedir para "verificar", "analisar", "conferir" ou "ver se funciona", ou antes de entregar qualquer alteração em src/.
---

# Ateky — analisar e encaixar código

Projeto: Google Apps Script (JavaScript V8 + HTML/CSS) em `src/`. Mapa de arquivos e linguagens em `CLAUDE.md`. Servidor em `src/js/`, telas em `src/html/`.

## Passos

1. **Ler a base de erros primeiro**: abra `docs/ERROS_CONHECIDOS.md` e aplique cada regra ao que vai fazer.
2. **Classificar o código recebido** pelo prefixo e conteúdo:
   | Prefixo / conteúdo | Módulo | Arquivo destino |
   |---|---|---|
   | `orga*` (sessão, hash, usuários) | Autenticação ORGA | `Orga_*.js` |
   | `org*` (sem "a") | Ponte/compatibilidade da tela | `Org_*.js` |
   | `dt2*`, `DT2` | DETRAF base (planilha/Drive) | `Dt2_*.js` |
   | `dtGestao*` | DETRAF gestão operacional | `Dt_Gestao.js` |
   | `dx*`, `DX_CFG` | Núcleo usado pela tela DETRAF | `Dx_Nucleo.js` |
   | `<style>` puro | Tema | `src/html/Org_Tema_*.html` |
   | `<div>`/`<script>` de tela | Interface | `src/html/Org_*.html` |
   | "exemplo", "não copie" | Referência | `_exemplos/` |
3. **Antes de criar arquivo**, procure se a função já existe (`Grep "function nome"` em `src/js/`). Se existir: o código novo diz "substitui"? Substitua. Senão, pergunte ou mantenha a versão mais segura e diga qual.
4. **Formatar** legível (indentação de 2 espaços), sem mudar comportamento. Correções de bug: faça e liste no resumo.
5. **Rodar o verificador e os testes**: `node tools/verificar.mjs` (0 erros) e `npm test` (0 falhas).
   - `DUPLICADA` → remova uma das declarações (Apps Script usa a última sem avisar).
   - `NAO_DEFINIDA` / `CLIENTE_SEM_BACKEND` → falta código: liste para o usuário o que ainda precisa ser enviado.
   - `CLIENTE_CHAMA_PRIVADA` → função com `_` não é chamável pelo `google.script.run`; crie um wrapper público.
   - `HTML_AUSENTE` → arquivo incluído pelo `HtmlService` não existe; o Web App quebra ao abrir.
6. **Atualizar `CLAUDE.md`** se arquivos foram criados, renomeados ou movidos.
7. Se algo deu errado no caminho, siga a skill `ateky-erros` para registrar a lição.

## Resumo ao usuário
Tabela arquivo → conteúdo, correções feitas, resultado do verificador e o que ainda falta.
