// Valida public/estado.json. Use antes de gravar/commitar qualquer atualização automática.
// Saída: código 0 se válido; 1 com a lista de erros se não.
import fs from 'node:fs';
import { validarEstado } from '../src/lib/estado.js';

const arquivo = new URL('../public/estado.json', import.meta.url);
let dados;
try {
  dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
} catch (e) {
  console.error('ERRO: não consegui ler public/estado.json:', e.message);
  process.exit(1);
}
const { ok, erros } = validarEstado(dados);
if (!ok) {
  console.error('estado.json INVÁLIDO:\n- ' + erros.join('\n- '));
  process.exit(1);
}
const travados = dados.jogos.filter((j) => j.resultado !== null).length;
console.log(`estado.json válido: ${dados.pontos} pts em ${dados.jogosDisputados} jogos, ${dados.posicao}º após a rodada ${dados.posicaoRodada}, ${travados} jogo(s) travado(s), atualizado em ${dados.atualizadoEm}.`);
