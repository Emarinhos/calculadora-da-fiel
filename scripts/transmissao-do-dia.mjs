// Diz quais jogos do Corinthians têm a transmissão (horário, TV, streaming) para consultar HOJE.
// Regra: exatamente um dia antes do jogo (reforço no dia do jogo se a consulta não confirmou).
//
// Uso: node scripts/transmissao-do-dia.mjs [AAAA-MM-DD]     (padrão: data local de hoje)
// Saída: JSON com { hoje, consultar: [{rodada, mandante, visitante, data, motivo}] }
import fs from 'node:fs';
import { transmissaoAConsultar } from '../src/lib/agenda.js';

const estado = JSON.parse(fs.readFileSync(new URL('../public/estado.json', import.meta.url), 'utf8'));
const agora = new Date();
const localHoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
const hoje = process.argv[2] || localHoje;

console.log(JSON.stringify({ hoje, consultar: transmissaoAConsultar(estado, hoje) }, null, 2));
