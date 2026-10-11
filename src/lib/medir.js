/**
 * Medição de uso (GoatCounter: contador sem cookies e sem dados pessoais; o script está em index.html).
 * Cada clique relevante vira um evento "evento/nome" no painel. Se o script não carregou (bloqueador de anúncios,
 * rede, localhost), a chamada não faz nada e o app segue normal.
 */
export function medir(nome, titulo) {
  try {
    window.goatcounter?.count?.({ path: `evento/${nome}`, title: titulo ?? nome, event: true });
  } catch {
    /* sem medição: tudo certo */
  }
}
