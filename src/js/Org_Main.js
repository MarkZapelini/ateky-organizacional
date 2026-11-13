/** Ponto de entrada do Web App. */
function doGet() {
  const template = HtmlService.createTemplateFromFile('html/Org_Index');
  return template.evaluate()
    .setTitle('Ateky Organizacional — Testes');
}
