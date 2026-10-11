// Recalcula o risco de rebaixamento de TODOS os clubes e grava em `liga.risco` de public/estado.json.
//
//   node scripts/calcular-riscos.mjs [--forcar]
//
// Só grava se o resultado mudou (a simulação é determinística, então tabela igual = números iguais e nenhum commit
// à toa). Roda no workflow a cada 2 horas e dentro de scripts/aplicar-resultados.mjs, sempre que a tabela muda.
import fs from 'node:fs';
import { validarEstado } from '../src/lib/estado.js';
import { calcularRiscos, riscoVigente } from '../src/lib/liga.js';

const arquivo = new URL('../public/estado.json', import.meta.url);
const estado = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const forcar = process.argv.includes('--forcar');

if (!forcar && riscoVigente(estado)) {
  console.log('riscos: já estão em dia para a tabela atual.');
} else {
  const novo = { ...estado, liga: { ...estado.liga, risco: calcularRiscos(estado) } };
  const { ok, erros } = validarEstado(novo);
  if (!ok) {
    console.error('NÃO gravei: estado ficaria inválido:\n- ' + erros.join('\n- '));
    process.exit(1);
  }
  fs.writeFileSync(arquivo, JSON.stringify(novo, null, 2) + '\n');
  const c = novo.liga.risco.clubes;
  console.log(`riscos: ${Object.keys(c).length} clubes gravados (Corinthians ${c.Corinthians}%).`);
}
