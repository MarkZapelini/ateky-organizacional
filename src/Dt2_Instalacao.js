/** DETRAF v2 — instalação (idempotente) e diagnóstico. Executar pelo editor. */

function dt2Instalar() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const p = dt2Props_();
    let ss, folder;
    const sid = p.getProperty(DT2.propSheet);
    const fid = p.getProperty(DT2.propFolder);

    if (sid) {
      ss = SpreadsheetApp.openById(sid);
    } else {
      ss = SpreadsheetApp.create('ATEKY DETRAF 2.0 - TESTES');
      p.setProperty(DT2.propSheet, ss.getId());
    }

    if (fid) {
      folder = DriveApp.getFolderById(fid);
    } else {
      folder = DriveApp.createFolder('ATEKY DETRAF 2.0 - TESTES');
      p.setProperty(DT2.propFolder, folder.getId());
    }

    Object.entries(DT2.tabs).forEach(([name, heads]) => {
      let sh = ss.getSheetByName(name);
      if (!sh) sh = ss.insertSheet(name);
      if (sh.getLastRow() === 0) {
        sh.getRange(1, 1, 1, heads.length).setValues([heads]);
        sh.setFrozenRows(1);
      } else if (sh.getRange(1, 1, 1, heads.length).getValues()[0].join('|') !== heads.join('|')) {
        throw Error('Cabeçalhos divergentes em ' + name);
      }
    });

    const first = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
    if (first && ss.getSheets().length > 1 && first.getLastRow() === 0) ss.deleteSheet(first);

    return { sheetUrl: ss.getUrl(), folderUrl: folder.getUrl(), status: 'Estrutura de testes disponível' };
  } finally {
    lock.releaseLock();
  }
}

function dt2StatusInstalacao() {
  return {
    sheetId: dt2Props_().getProperty(DT2.propSheet) || '',
    folderId: dt2Props_().getProperty(DT2.propFolder) || ''
  };
}

/** Diagnóstico: mostra no log se planilha e pasta estão configuradas. */
function verificarBaseDetraf() {
  const resultado = dt2StatusInstalacao();
  console.log('Planilha DETRAF: ' + (resultado.sheetId ? 'PREENCHIDO' : 'VAZIO'));
  console.log('Pasta DETRAF: ' + (resultado.folderId ? 'PREENCHIDO' : 'VAZIO'));
}

/** Diagnóstico: mostra no log URL e nome da planilha DETRAF. */
function abrirPlanilhaDetraf() {
  const id = dt2Props_().getProperty(DT2.propSheet);
  if (!id) throw new Error('Planilha DETRAF não configurada.');
  const planilha = SpreadsheetApp.openById(id);
  console.log('PLANILHA DETRAF: ' + planilha.getUrl());
  console.log('NOME: ' + planilha.getName());
}
