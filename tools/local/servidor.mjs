/** Servidor local: serve o doGet() e atende google.script.run via /api/<função>. */
import http from 'node:http';
import { chamar, paginaInicial } from './emulador.mjs';

const PORTA = Number(process.env.PORT || 8080);

// Substitui google.script.run por chamadas HTTP ao servidor local.
const SHIM = `<script>
(function(){
  function mk(h){return new Proxy({}, {get:function(_,p){
    if(p==='withSuccessHandler')return function(f){return mk(Object.assign({},h,{ok:f}));};
    if(p==='withFailureHandler')return function(f){return mk(Object.assign({},h,{fail:f}));};
    if(p==='withUserObject')return function(){return mk(h);};
    return function(){var args=[].slice.call(arguments);
      fetch('/api/'+encodeURIComponent(p),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(args)})
      .then(function(r){return r.json();})
      .then(function(j){if(j.ok){h.ok&&h.ok(j.result);}else{var e=new Error(j.error);console.error('[Apps Script local]',p,j.error);h.fail&&h.fail(e);}})
      .catch(function(e){h.fail&&h.fail(e);});};
  }});}
  window.google={script:{run:mk({})}};
})();
</script>`;

const servidor = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
      const html = paginaInicial().replace(/<head>/i, '<head>' + SHIM);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    const m = req.url.match(/^\/api\/([A-Za-z_$][\w$]*)$/);
    if (req.method === 'POST' && m) {
      let corpo = '';
      for await (const pedaco of req) { corpo += pedaco; if (corpo.length > 20e6) throw new Error('Requisição muito grande.'); }
      const args = corpo ? JSON.parse(corpo) : [];
      let resposta;
      try { resposta = { ok: true, result: chamar(m[1], args) }; }
      catch (e) { resposta = { ok: false, error: e.message || String(e) }; console.log(`✖ ${m[1]}: ${resposta.error}`); }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(resposta));
    }
    res.writeHead(404); res.end('Não encontrado');
  } catch (e) {
    console.error(e);
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Erro: ' + e.message);
  }
});
servidor.listen(PORTA, '127.0.0.1', () => console.log(`Ateky local rodando em http://localhost:${PORTA}`));
