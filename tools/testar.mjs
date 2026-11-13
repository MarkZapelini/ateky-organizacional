#!/usr/bin/env node
/**
 * Testes automáticos do Ateky Organizacional.
 * Roda o código real de src/js no emulador, numa base TEMPORÁRIA (não toca em .local/).
 * Uso: node tools/testar.mjs   (ou npm test)   — código de saída 1 se algum teste falhar.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import * as await_fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const base = mkdtempSync(join(tmpdir(), 'ateky-teste-'));
process.env.ATEKY_LOCAL_DIR = base;
const { chamar, scriptProps, paginaInicial, RAIZ } = await import('./local/emulador.mjs');

let ok = 0, falhas = [];
const grupo = t => console.log('\n■ ' + t);
function teste(nome, fn) {
  try { fn(); ok++; console.log('  ✔ ' + nome); }
  catch (e) { falhas.push({ nome, erro: e.message }); console.log('  ✖ ' + nome + '\n      → ' + e.message); }
}
const verdade = (cond, m) => { if (!cond) throw new Error(m || 'condição falsa'); };
const igual = (a, b, m) => { if (a !== b) throw new Error((m ? m + ': ' : '') + `esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`); };
function falha(fn, trecho) {
  try { fn(); } catch (e) { if (trecho && !String(e.message).includes(trecho)) throw new Error(`erro diferente do esperado: "${e.message}" (esperava conter "${trecho}")`); return; }
  throw new Error('deveria ter falhado' + (trecho ? ` com "${trecho}"` : ''));
}
const api = (n, ...a) => chamar(n, a);
const SENHA_ADMIN = 'Admin-Teste-1234';

try {
  grupo('Estrutura e instalação');
  teste('verificador estático sem erros', () => {
    try { execFileSync(process.execPath, [join(RAIZ, 'tools', 'verificar.mjs')], { stdio: 'pipe' }); }
    catch (e) { throw new Error(String(e.stdout).split('\n').filter(l => l.startsWith('ERRO')).join(' | ')); }
  });
  teste('build gera dist/ só com .js/.html aceitos pelo Apps Script', () => {
    execFileSync(process.execPath, [join(RAIZ, 'tools', 'build.mjs')], { stdio: 'pipe' });
    const { readdirSync, readFileSync: rf } = await_fs;
    const todos = ['js', 'html', 'css'].flatMap(p => readdirSync(join(RAIZ, 'dist', p)).map(f => p + '/' + f));
    const invalidos = todos.filter(f => !/\.(js|html)$/.test(f));
    verdade(!invalidos.length, 'extensões não aceitas: ' + invalidos.join(', '));
    verdade(rf(join(RAIZ, 'dist', 'css', 'Org_Tema_Global.html'), 'utf8').startsWith('<style data-css="Org_Tema_Global">'), 'CSS não embrulhado');
  });
  teste('orgaInstalarAuth', () => verdade(api('orgaInstalarAuth').url));
  teste('orgaInstalarAuth é idempotente', () => verdade(api('orgaInstalarAuth').url));
  teste('bootstrap recusa segredo errado', () => {
    scriptProps.setProperty('ORGA_BOOTSTRAP_SECRET', 'x'.repeat(40));
    falha(() => api('orgaCriarPrimeiroAdmin', 'admin', 'Admin', '', SENHA_ADMIN, 'errado'), 'Segredo');
  });
  teste('bootstrap cria primeiro admin e apaga propriedades', () => {
    scriptProps.setProperties({ ORGA_BOOT_LOGIN: 'admin', ORGA_BOOT_NOME: 'Admin Teste', ORGA_BOOT_EMAIL: 'a@b.co', ORGA_BOOT_SENHA: SENHA_ADMIN });
    igual(api('orgaBootstrapPeloEditor').login, 'admin');
    igual(scriptProps.getProperty('ORGA_BOOT_SENHA'), null, 'senha de bootstrap');
    igual(scriptProps.getProperty('ORGA_BOOTSTRAP_SECRET'), null, 'segredo');
  });
  teste('dt2Instalar → dtGestaoInstalar → dxInstalarComplementos', () => {
    verdade(api('dt2Instalar').sheetUrl); api('dtGestaoInstalar'); igual(api('dxInstalarComplementos').ok, true);
  });
  teste('página inicial monta com tema e DETRAF', () => {
    const h = paginaInicial();
    for (const c of ['Org_Base', 'Org_Tema_Global', 'Org_Detraf']) verdade(h.includes('data-css="' + c + '"'), 'CSS ausente: ' + c);
    verdade(h.includes('--org-pink'), 'conteúdo do tema não carregou');
    verdade(h.includes('window.dtInicializar'), 'DETRAF ausente');
    verdade(!h.includes('<?'), 'template não processado');
  });

  grupo('Login e sessão');
  let T;
  teste('login do admin', () => { const r = api('orgaLogin', 'admin', SENHA_ADMIN); T = r.token; igual(r.usuario.perfil, 'administrador'); verdade(/^[a-f0-9]{64}$/.test(T), 'formato do token'); });
  teste('login aceita maiúsculas/espaços no usuário', () => verdade(api('orgaLogin', '  ADMIN ', SENHA_ADMIN).token));
  teste('senha errada é recusada', () => falha(() => api('orgaLogin', 'admin', 'errada-errada'), 'invalidos'));
  teste('usuário inexistente dá a mesma mensagem', () => falha(() => api('orgaLogin', 'fantasma', SENHA_ADMIN), 'invalidos'));
  teste('token forjado é recusado', () => falha(() => api('orgaMeuPerfil', 'f'.repeat(64)), 'expirada'));
  teste('token mal formado é recusado', () => falha(() => api('orgaMeuPerfil', 'abc'), 'invalida'));
  teste('perfil retorna permissões', () => verdade(api('orgaMeuPerfil', T).permissoes.includes('usuarios.gerir')));
  teste('funções privadas (_) bloqueadas', () => falha(() => api('orgaRows_', 'Org_Usuarios'), 'privada'));

  grupo('Usuários e permissões');
  let maria, TM;
  teste('admin cadastra colaboradora', () => { maria = api('orgCadastrarUsuario', T, { usuario: 'maria.silva', nome: 'Maria Silva', senha: 'Senha-Maria-123', perfil: 'colaborador' }); igual(maria.login, 'maria.silva'); });
  teste('login duplicado recusado', () => falha(() => api('orgCadastrarUsuario', T, { usuario: 'maria.silva', nome: 'X', senha: 'Senha-Maria-123', perfil: 'colaborador' }), 'ja cadastrado'));
  teste('senha curta recusada', () => falha(() => api('orgCadastrarUsuario', T, { usuario: 'joao', nome: 'João', senha: 'curta', perfil: 'colaborador' }), '12'));
  teste('perfil "coordenacao" vira "coordenador"', () => {
    api('orgCadastrarUsuario', T, { usuario: 'carla', nome: 'Carla', senha: 'Senha-Carla-123', perfil: 'coordenacao' });
    igual(api('orgListarUsuarios', T).find(u => u.usuario === 'carla').perfil, 'coordenador');
  });
  teste('colaboradora entra', () => { TM = api('orgaLogin', 'maria.silva', 'Senha-Maria-123').token; verdade(TM); });
  teste('colaboradora NÃO lista usuários', () => falha(() => api('orgListarUsuarios', TM), 'Permissao'));
  teste('colaboradora NÃO cria operadora', () => falha(() => api('dxSalvarOperadora', TM, { nome: 'X', sigla: 'X' }), 'Permissao'));
  teste('admin não redefine a própria senha', () => falha(() => api('orgAdminRedefinirSenha', T, api('orgaMeuPerfil', T).id, 'Nova-Senha-12345'), 'outro administrador'));
  teste('admin não remove o próprio acesso', () => falha(() => api('orgaAtualizarUsuario', T, api('orgaMeuPerfil', T).id, { perfil: 'colaborador' }), 'proprio'));
  teste('redefinir senha revoga sessões da usuária', () => {
    api('orgAdminRedefinirSenha', T, maria.id, 'Nova-Senha-Maria1');
    falha(() => api('orgaMeuPerfil', TM), 'expirada');
    TM = api('orgaLogin', 'maria.silva', 'Nova-Senha-Maria1').token;
  });
  teste('desativar bloqueia login', () => {
    api('orgDefinirAtivo', T, maria.id, false);
    falha(() => api('orgaLogin', 'maria.silva', 'Nova-Senha-Maria1'), 'invalidos');
    api('orgDefinirAtivo', T, maria.id, true);
    TM = api('orgaLogin', 'maria.silva', 'Nova-Senha-Maria1').token;
  });
  teste('trocar perfil para supervisor', () => { api('orgaAtualizarUsuario', T, maria.id, { perfil: 'supervisor' }); igual(api('orgListarUsuarios', T).find(u => u.id === maria.id).perfil, 'supervisor'); TM = api('orgaLogin', 'maria.silva', 'Nova-Senha-Maria1').token; });
  teste('permissão individual informa que não é suportada', () => falha(() => api('orgConcederPermissao', T, maria.id, 'agenda', {}), 'Permissões individuais'));

  grupo('DETRAF — operadoras e registros');
  let OP;
  teste('admin cria operadora', () => { OP = api('dxSalvarOperadora', T, { nome: 'Operadora Alfa', sigla: 'alf', tipo: 'Parceira', encontro_regra: 'Obrigatorio', codigos: 'a1 ; b2', motivo: 'teste' }).id; verdade(OP); });
  teste('sigla normalizada e códigos formatados', () => { const o = api('dxCarregar', T).operadoras.find(x => x.id === OP); igual(o.sigla, 'ALF'); igual(o.codigos, 'A1, B2'); });
  teste('operadora/sigla duplicada recusada', () => falha(() => api('dxSalvarOperadora', T, { nome: 'Outra', sigla: 'ALF' }), 'já cadastrada'));
  teste('injeção de fórmula na planilha é neutralizada', () => {
    const id = api('dxSalvarOperadora', T, { nome: '=HYPERLINK("x")', sigla: 'INJ' }).id;
    verdade(String(api('dxCarregar', T).operadoras.find(x => x.id === id).nome).startsWith("'="));
  });
  let FIN;
  teste('financeiro aceita "1.234,56"', () => { FIN = api('dxSalvarRegistro', TM, 'financeiro', { operadora_id: OP, competencia: '2026-10', natureza: 'PAGAR', valor: '1.234,56', status: 'PENDENTE' }).id; igual(api('dxCarregar', T).financeiro.find(f => f.id === FIN).valor, 1234.56); });
  teste('competência inválida recusada', () => falha(() => api('dxSalvarRegistro', TM, 'financeiro', { operadora_id: OP, competencia: '2026-13', natureza: 'PAGAR', valor: 1 }), 'AAAA-MM'));
  teste('valor negativo recusado', () => falha(() => api('dxSalvarRegistro', TM, 'financeiro', { operadora_id: OP, competencia: '2026-10', natureza: 'PAGAR', valor: -5 }), 'inválido'));
  teste('baixa exige data', () => falha(() => api('dxSalvarRegistro', TM, 'financeiro', { id: FIN, operadora_id: OP, competencia: '2026-10', natureza: 'PAGAR', valor: 1, status: 'BAIXADO' }), 'data da baixa'));
  teste('edição registra histórico campo a campo', () => {
    api('dxSalvarRegistro', TM, 'financeiro', { id: FIN, operadora_id: OP, competencia: '2026-10', natureza: 'PAGAR', valor: '2000', status: 'PENDENTE', motivo_alteracao: 'reajuste' });
    const h = api('dxCarregar', T).historico.find(x => x.registro_id === FIN && x.campo === 'valor' && x.acao === 'EDITAR');
    verdade(h, 'histórico ausente'); igual(String(h.antes), '1234.56'); igual(String(h.depois), '2000'); igual(h.motivo, 'reajuste');
  });
  teste('conciliação calcula diferença', () => { const id = api('dxSalvarRegistro', TM, 'conciliacoes', { operadora_id: OP, competencia: '2026-10', valor_enviado: '100', valor_recebido: '80,50', valor_acordado: '90' }).id; igual(api('dxCarregar', T).conciliacoes.find(c => c.id === id).diferenca, 19.5); });
  teste('competência duplicada por operadora recusada', () => {
    api('dxSalvarRegistro', TM, 'competencias', { operadora_id: OP, competencia: '2026-09' });
    falha(() => api('dxSalvarRegistro', TM, 'competencias', { operadora_id: OP, competencia: '2026-09' }), 'já cadastrada');
  });
  teste('pendência resolvida exige resolução', () => falha(() => api('dxSalvarRegistro', TM, 'pendencias', { operadora_id: OP, competencia: '2026-10', descricao: 'x', status: 'RESOLVIDA' }), 'resolvida'));
  teste('contestação exige motivo', () => falha(() => api('dxSalvarRegistro', TM, 'contestacoes', { operadora_id: OP, competencia: '2026-10', valor_contestado: 1 }), 'motivo'));
  teste('dashboard de gestão soma corretamente', () => { const d = api('dtGestaoDashboard', T, { operadoraId: OP }); igual(d.totalPagar, 2000); igual(typeof d.totalConciliacoes, 'number'); });

  grupo('DETRAF — documentos');
  const b64 = s => Buffer.from(s).toString('base64');
  teste('upload de CSV', () => igual(api('dxEnviarDocumento', TM, { operadora_id: OP, competencia: '2026-10', tipo: 'DETRAF_RECEBIDO', nome: 'det.csv', base64: b64('a;b\n1;2') }).status, 'AGUARDANDO_LEITURA'));
  teste('mesmo arquivo duplicado recusado', () => falha(() => api('dxEnviarDocumento', TM, { operadora_id: OP, competencia: '2026-10', tipo: 'DETRAF_RECEBIDO', nome: 'det2.csv', base64: b64('a;b\n1;2') }), 'já cadastrado'));
  teste('extensão proibida recusada (.exe)', () => falha(() => api('dxEnviarDocumento', TM, { operadora_id: OP, competencia: '2026-10', tipo: 'OUTRO', nome: 'virus.exe', base64: b64('x') }), 'Formato'));
  teste('base64 inválido recusado', () => falha(() => api('dxEnviarDocumento', TM, { operadora_id: OP, competencia: '2026-10', tipo: 'OUTRO', nome: 'a.csv', base64: '<<script>>' }), 'inválido'));
  teste('arquivo vazio recusado', () => falha(() => api('dxEnviarDocumento', TM, { operadora_id: OP, competencia: '2026-10', tipo: 'OUTRO', nome: 'a.csv', base64: '' }), 'vazio'));
  teste('operadora inativa não recebe upload', () => {
    api('dxAtivarOperadora', T, OP, false, 'teste');
    falha(() => api('dxEnviarDocumento', TM, { operadora_id: OP, competencia: '2026-11', tipo: 'OUTRO', nome: 'z.csv', base64: b64('z') }), 'inativa');
    api('dxAtivarOperadora', T, OP, true, 'teste');
  });
  teste('conferência marca DETRAF_RECEBIDO como ARQUIVADO', () => {
    const c = api('dt2Conferencia', T, OP, '2026-10');
    igual(c.checagem.find(x => x.tipo === 'DETRAF_RECEBIDO').status, 'ARQUIVADO');
    igual(c.checagem.find(x => x.tipo === 'NF_RECEBIDA').status, 'PENDENTE');
  });

  grupo('Encerramento');
  teste('sair invalida a sessão', () => { api('orgaSair', T); falha(() => api('orgaMeuPerfil', T), 'expirada'); });
} finally {
  rmSync(base, { recursive: true, force: true });
}

console.log(`\n${falhas.length ? '✖' : '✔'} ${ok} passaram, ${falhas.length} falharam.`);
if (falhas.length) { console.log('\nFalhas:'); falhas.forEach(f => console.log(' - ' + f.nome + ': ' + f.erro)); }
process.exit(falhas.length ? 1 : 0);
