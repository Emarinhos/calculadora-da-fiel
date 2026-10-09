// Aplica resultados de jogos encerrados (e, opcionalmente, a posição de fim de rodada) em public/estado.json.
//
// Uso: node scripts/aplicar-resultados.mjs entrada.json [--simular]
//
// entrada.json:
// {
//   "hoje": "2026-10-12",
//   "resultados": [ { "rodada": 30, "mandante": "Palmeiras", "visitante": "Corinthians", "gm": 0, "gv": 1 }, ... ],
//   "tabelaFonte": [ { "clube": "Flamengo", "pts": 64, "j": 30, "gp": 59, "gc": 26 }, ... ],   // recomendado: confere as contas
//   "posicao": { "rodada": 30, "posicao": 14 },   // opcional: só quando TODOS os jogos da rodada terminaram
//   "agenda": [ { "rodada": 35, "mandante": "Corinthians", "visitante": "Botafogo", "data": "2026-11-18", "hora": "21:30", "tv": "Globo" } ]   // opcional: remarcações / TV definida
// }
//
// Nada é gravado se alguma conta não fechar, se a tabela calculada divergir da fonte
// ou se o estado resultante for inválido. Código de saída 0 = gravado; 1 = recusado.
import fs from 'node:fs';
import { aplicarResultados, atualizarAgenda, registrarPosicao, compararComFonte, posicaoCalculada, validarEstado } from '../src/lib/aplicar.js';

const [entradaArq] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!entradaArq) {
  console.error('uso: node scripts/aplicar-resultados.mjs entrada.json');
  process.exit(1);
}

const arquivo = new URL('../public/estado.json', import.meta.url);
const atual = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const entrada = JSON.parse(fs.readFileSync(entradaArq, 'utf8'));

function recusar(msg) {
  console.error('RECUSADO: ' + msg);
  process.exit(1);
}

let novo;
try {
  novo = aplicarResultados(atual, entrada.resultados || [], entrada.hoje);
  if (entrada.agenda) novo = atualizarAgenda(novo, entrada.agenda, entrada.hoje);
  if (entrada.posicao) {
    const { rodada, posicao } = entrada.posicao;
    const faltam = novo.liga.jogos.filter((g) => g.rodada === rodada);
    if (faltam.length) {
      recusar(`a rodada ${rodada} ainda não terminou (faltam ${faltam.length} jogo(s)); a posição só vale no fim da rodada`);
    }
    if (rodada <= atual.posicaoRodada) recusar(`a posição da rodada ${rodada} já foi registrada (última: ${atual.posicaoRodada})`);
    const calculada = posicaoCalculada(novo);
    if (calculada !== posicao) {
      recusar(`a posição informada (${posicao}º) difere da calculada pela tabela (${calculada}º); confira desempates`);
    }
    novo = registrarPosicao(novo, { rodada, posicao, hoje: entrada.hoje });
  }
} catch (e) {
  recusar(e.message);
}

if (entrada.tabelaFonte) {
  const div = compararComFonte(novo, entrada.tabelaFonte);
  if (div.length) recusar('a tabela calculada diverge da fonte:\n- ' + div.join('\n- '));
}

const { ok, erros } = validarEstado(novo);
if (!ok) recusar('estado resultante inválido:\n- ' + erros.join('\n- '));

fs.writeFileSync(arquivo, JSON.stringify(novo, null, 2) + '\n');
const travados = novo.jogos.filter((j) => j.resultado !== null).length;
console.log(`gravado: ${(entrada.resultados || []).length} resultado(s); Corinthians ${novo.pontos} pts em ${novo.jogosDisputados} jogos; ${travados} jogo(s) travado(s); posição ${novo.posicao}º após a rodada ${novo.posicaoRodada}.`);
