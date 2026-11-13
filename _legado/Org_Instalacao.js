/** Instalação da base de testes (executar UMA vez pelo editor). */
function orgInstalarBaseTeste() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('ORG_DB_ID')) throw Error('Base já vinculada. Nenhuma planilha foi modificada.');

  const ss = SpreadsheetApp.create('ATEKY ORGANIZACIONAL — BASE TESTES');
  for (const [name, cols] of Object.entries(ORG_TABS)) {
    const s = ss.insertSheet(name);
    s.getRange(1, 1, 1, cols.length).setValues([cols]);
    s.setFrozenRows(1);
  }
  const inicial = ss.getSheetByName('Sheet1') || ss.getSheetByName('Página1');
  if (inicial) ss.deleteSheet(inicial);

  props.setProperties({
    ORG_DB_ID: ss.getId(),
    ORG_PEPPER: Utilities.getUuid() + Utilities.getUuid()
  });
  Logger.log('Base de testes: ' + ss.getUrl());
  return ss.getUrl();
}
