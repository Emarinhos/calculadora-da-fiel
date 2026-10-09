// Copia public/estado.json para src/lib/estado-embutido.json (fallback embutido no build).
// Roda sozinho antes de dev, build e test (ver "pre*" no package.json), então as duas cópias
// nunca ficam diferentes. A fonte da verdade é sempre public/estado.json.
import fs from 'node:fs';

const origem = new URL('../public/estado.json', import.meta.url);
const destino = new URL('../src/lib/estado-embutido.json', import.meta.url);
fs.copyFileSync(origem, destino);
