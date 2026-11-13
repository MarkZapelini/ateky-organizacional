# Ateky Organizacional — mapa do sistema

Web App em **Google Apps Script**. Login único (ORGA) + módulo DETRAF 2.0. Ambiente de TESTES.

## Linguagens
| Extensão | Linguagem | Onde roda |
|---|---|---|
| `.js` (em `src/`) | JavaScript (Apps Script, runtime V8). No editor do Google aparece como `.gs`; o `clasp` converte sozinho. | Servidor Google |
| `.html` | HTML + CSS + JavaScript de navegador (templates do `HtmlService`, `<?!= ?>`) | Navegador |
| `appsscript.json` | JSON, o manifesto do projeto | Configuração |
| `tools/*.mjs` | JavaScript Node.js (módulo ES) | Seu computador |
| `.md` | Markdown, a documentação e as skills | — |

## Estrutura
```
src/
  appsscript.json     manifesto
  js/   *.js          servidor (Apps Script)
  html/ *.html        telas e temas
tools/                verificador, testes, emulador local, túnel
```
No Apps Script a pasta faz parte do nome: os arquivos HTML são referenciados como `'html/Org_Index'`, `'html/Org_Tema_Global'` etc.

## Arquivos
**Entrada:** `js/Org_Main.js` (`doGet`) → `html/Org_Index.html` (inclui `html/Org_Tema_Global.html` e `html/Org_Detraf_Interface.html`).

| Arquivo | Função |
|---|---|
| `Orga_Core.js` | Configuração `ORGA`, base, hash, validações e permissões por perfil |
| `Orga_Auth.js` | Login, sessão, perfil, sair e revogar sessões |
| `Orga_Usuarios.js` | Cadastro, edição e senha de usuários |
| `Orga_Instalacao.js` | `orgaInstalarAuth`, primeiro administrador |
| `Org_Permissoes.js` | Ponte da tela de administração para o ORGA; setores ainda bloqueados |
| `Org_Ponte.js` | `orgLogin` / `orgMe` / `orgSair` (nomes antigos) |
| `Dt2_Base.js` | Configuração `DT2`, acesso à planilha DETRAF e auditoria |
| `Dt2_Instalacao.js` | `dt2Instalar` e diagnósticos |
| `Dt2_Autorizacao.js` | `dt2Autorizar_`, que usa a sessão ORGA |
| `Dt2_Operadoras.js` / `Dt2_Documentos.js` / `Dt2_Conferencia.js` / `Dt2_Compatibilidade.js` | API dt2 (versão anterior; a tela atual usa `dx*`) |
| `Dt_Gestao.js` | Abas de conciliações, financeiro, contestações e pendências; `dtGestaoInstalar` |
| `Dx_Nucleo.js` | **Backend da tela DETRAF**: `dxCarregar`, `dxSalvar*`, `dxEnviarDocumento` e histórico por campo |
| `Org_Detraf_Integracao.js` / `Org_Dt_Api.js` | APIs complementares (sem uso na tela atual) |
| `Org_Index.html` | Login, menu, administração |
| `Org_Detraf_Interface.html` | Tela DETRAF completa (`window.dtInicializar`) |
| `Org_Tema_Global.html` | Tema escuro global |
| `Org_Tema_Academy.html` | Tema alternativo (não incluído por padrão) |

`_legado/`: base antiga (`ORG_TABS`), sem uso. `_exemplos/`: trechos de referência, fora do projeto.

## Instalação (no editor do Apps Script, nesta ordem)
1. `orgaInstalarAuth()`
2. Propriedades de script: `ORGA_BOOTSTRAP_SECRET` (32+ caracteres), `ORGA_BOOT_LOGIN`, `ORGA_BOOT_NOME`, `ORGA_BOOT_EMAIL`, `ORGA_BOOT_SENHA` (12+) → `orgaBootstrapPeloEditor()`
3. `dt2Instalar()` → `dtGestaoInstalar()` → `dxInstalarComplementos()`
4. Implantar como App da Web.

## Comandos
| Comando | Faz |
|---|---|
| `npm run verificar` | Checagem estática (sintaxe, duplicadas, funções ausentes, includes) |
| `npm test` | 50 testes automáticos numa base temporária |
| `npm run local:instalar` / `npm run local` | Base e servidor locais em http://localhost:8080 |
| `tools/tunel-cloudflare.bat` | Publica o servidor local via Cloudflare (o usuário executa) |

## Regras
- Antes de entregar ou fazer commit: `npm run verificar` com 0 erros **e** `npm test` com 0 falhas.
- Skills: `ateky-analisar` (encaixar código novo), `ateky-testar` (rodar e interpretar testes), `ateky-erros` (diagnosticar e registrar a lição em `docs/ERROS_CONHECIDOS.md`), `auditor-projetos-tecnicos` (auditoria de projetos FTTH/telecom).
- Funções com `_` no final são privadas e não podem ser chamadas pelo `google.script.run`.
