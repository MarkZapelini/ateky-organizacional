/** DETRAF v2 — formatos aceitos e status de extração.
 * Leitura automática não liberada até homologação dos modelos reais.
 * Não gravar valores a partir de XLS, XLSX ou PDF sem parser validado.
 */
function dt2Compatibilidade(sessao) {
  dt2Autorizar_(sessao, 'detraf.ler');
  return [
    { ext: 'xlsx', armazenar: true, extrair: false, motivo: 'Requer leitor/conversão e mapeamento por operadora.' },
    { ext: 'xls', armazenar: true, extrair: false, motivo: 'Formato legado, pode exigir conversão específica.' },
    { ext: 'pdf', armazenar: true, extrair: false, motivo: 'PDF textual ou imagem exige leitores diferentes.' },
    { ext: 'csv', armazenar: true, extrair: false, motivo: 'Delimitadores e colunas precisam ser validados.' },
    { ext: 'xml', armazenar: true, extrair: false, motivo: 'Esquema fiscal precisa ser validado.' }
  ];
}
