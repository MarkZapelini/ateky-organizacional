---
name: ateky-testar
description: Roda a bateria de testes automáticos do Ateky Organizacional (login, permissões, usuários, DETRAF, documentos, segurança) e interpreta o resultado. Use quando o usuário pedir para "testar", "ver se tem problema", "ver se está funcionando", depois de qualquer alteração em src/, e antes de commit/push.
---

# Ateky — testar o sistema

## Passos
1. **Verificação estática:** `node tools/verificar.mjs`. Precisa dar `0 erro(s)`.
2. **Testes automáticos:** `npm test` (ou `node tools/testar.mjs`).
   - Roda o código real de `src/js/` no emulador, numa **base temporária**. Não altera `.local/` nem o Google.
   - Cobre: instalação, bootstrap do admin, login e sessão, tokens forjados, funções privadas bloqueadas, cadastro/desativação/perfil de usuários, permissões por perfil, operadoras, financeiro, conciliações, competências, pendências, contestações, histórico campo a campo, uploads (duplicado, extensão proibida, base64 inválido, arquivo vazio, operadora inativa), conferência e logout.
3. **Se o servidor local estiver rodando** (`npm run local`), faça também um teste rápido pela HTTP: `GET /` deve devolver 200, sem `<?` no HTML e com `window.dtInicializar`.

## Interpretar falhas
Para cada `✖`:
- **Bug no código** (o comportamento está errado): corrija em `src/`, rode tudo de novo e registre a lição com a skill `ateky-erros`.
- **Teste desatualizado** (o comportamento mudou de propósito): ajuste o teste em `tools/testar.mjs` e explique por quê.
- Nunca altere um teste só para ele passar sem entender a causa.

## Ao criar uma função nova
Acrescente pelo menos um teste em `tools/testar.mjs` cobrindo o caminho feliz e uma recusa (permissão ou dado inválido).

## Relatório ao usuário
Quantos passaram e falharam, o que cada falha significa e o que foi corrigido.
