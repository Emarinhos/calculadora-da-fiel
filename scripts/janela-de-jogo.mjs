// Código de saída 0 se há jogo ainda sem resultado cuja janela de acompanhamento está aberta agora; 1 se não.
// Usado pelo resultados.yml para decidir se continua conferindo de 5 em 5 minutos ou encerra a execução.
// AGORA_ISO serve para testar como se fosse outro horário.
import fs from 'node:fs';
import { emJanelaDeJogo } from '../src/lib/resultados-auto.js';

const estado = JSON.parse(fs.readFileSync(new URL('../public/estado.json', import.meta.url), 'utf8'));
const agora = process.env.AGORA_ISO ? new Date(process.env.AGORA_ISO) : new Date();
const aberta = emJanelaDeJogo(estado, agora.getTime());
console.log(aberta ? 'janela de jogo aberta' : 'sem jogo na janela');
process.exit(aberta ? 0 : 1);
