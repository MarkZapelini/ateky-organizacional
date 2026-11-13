/** Instala a base local (equivale a rodar os instaladores no editor do Apps Script). */
import crypto from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chamar, scriptProps, RAIZ } from './emulador.mjs';

const passo = (nome, ...a) => { const r = chamar(nome, a); console.log('✔', nome, r ? JSON.stringify(r) : ''); return r; };

passo('orgaInstalarAuth');

let usuarios = [];
try { usuarios = chamar('orgaRows_', ['Org_Usuarios'], { permitirPrivada: true }); } catch {}
if (!usuarios.length) {
  const senha = 'Ateky-' + crypto.randomBytes(6).toString('hex');
  scriptProps.setProperties({
    ORGA_BOOTSTRAP_SECRET: crypto.randomBytes(24).toString('hex'),
    ORGA_BOOT_LOGIN: 'admin', ORGA_BOOT_NOME: 'Administrador Local',
    ORGA_BOOT_EMAIL: 'admin@local.test', ORGA_BOOT_SENHA: senha
  });
  passo('orgaBootstrapPeloEditor');
  writeFileSync(join(RAIZ, '.local', 'CREDENCIAIS_LOCAIS.txt'), `Login: admin\nSenha: ${senha}\n(Somente ambiente local de testes)\n`);
  console.log(`\nAdministrador local criado → login: admin  senha: ${senha}`);
  console.log('(também salvo em .local/CREDENCIAIS_LOCAIS.txt)\n');
} else {
  console.log('• Usuários já existem; bootstrap ignorado.');
}

passo('dt2Instalar');
passo('dtGestaoInstalar');
passo('dxInstalarComplementos');
console.log('\nBase local pronta. Rode: npm run local');
