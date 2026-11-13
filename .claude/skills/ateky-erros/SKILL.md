---
name: ateky-erros
description: Diagnostica erros do Ateky Organizacional (mensagens do Apps Script, do navegador ou do verificador) e registra a lição em docs/ERROS_CONHECIDOS.md para não repetir. Use quando o usuário colar um erro, disser que "deu erro", "não funciona", "quebrou", ou quando o verificador falhar.
---

# Ateky — diagnosticar e aprender com erros

## 1. Consultar o que já se sabe
Leia `docs/ERROS_CONHECIDOS.md`. Se o erro já está lá, aplique a solução registrada e incremente "Ocorrências".

## 2. Diagnosticar
- Rode `node tools/verificar.mjs --json` e cruze com o erro.
- Mensagens comuns do Apps Script e onde olhar:
  | Mensagem | Causa provável |
  |---|---|
  | `Execute orgaInstalarAuth() primeiro.` / `dt2Instalar()` | Instalação não executada pelo editor (ver ordem no CLAUDE.md) |
  | `Aba ausente: X` / `Aba X não encontrada` | Instalador do módulo não rodou (`dtGestaoInstalar`, `dxInstalarComplementos`) |
  | `Cabeçalhos divergentes` | Planilha editada à mão ou colunas mudaram no código |
  | `Permissao insuficiente.` | Permissão pedida não existe em `ORGA.PERMS`/`orgaPermissions_` |
  | `Sessao invalida/expirada` | Token ausente, de outra base, ou sessão revogada |
  | `X is not defined` / `X is not a function` | Função não enviada ainda ou nome diferente → `NAO_DEFINIDA` no verificador |
  | `No HTML file named X` | Arquivo HTML ausente ou nome errado no `createHtmlOutputFromFile` |
  | Erro em `google.script.run` no console | Função privada (`_`) ou inexistente no backend |
- Leia o código envolvido de ponta a ponta (tela → backend → planilha) antes de corrigir.

## 3. Corrigir
Faça a menor correção que resolve a causa, rode o verificador de novo (0 erros).

## 4. Registrar a lição
Acrescente em `docs/ERROS_CONHECIDOS.md`, no formato:

```
### EK-<número> — <título curto>
- Data: AAAA-MM-DD · Ocorrências: 1
- Sintoma: <mensagem ou comportamento>
- Causa: <raiz>
- Solução: <o que foi feito>
- Regra para o futuro: <como evitar; vira checagem para a skill ateky-analisar>
```

Se a regra puder ser checada automaticamente, adicione a checagem em `tools/verificar.mjs` também.
