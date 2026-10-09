import { H2H } from './h2h.js';

/** Quantos confrontos recentes entram na regra, e quão antigos podem ser. */
export const N_CONFRONTOS = 5;
export const JANELA_ANOS = 5;

/** Resultado de um confronto do ponto de vista do Corinthians (placar dos 90 minutos). */
export function resultadoDe(jogo) {
  if (jogo.gc > jogo.ga) return 'V';
  if (jogo.gc < jogo.ga) return 'D';
  return 'E';
}

/**
 * Últimos confrontos (mais recente primeiro) com o adversário, limitados à janela de anos.
 * `hoje` é parâmetro para os testes não dependerem do relógio.
 */
export function confrontosRecentes(adversario, { n = N_CONFRONTOS, anos = JANELA_ANOS, hoje = new Date() } = {}) {
  const lista = H2H[adversario] || [];
  const limite = new Date(hoje);
  limite.setFullYear(limite.getFullYear() - anos);
  const corte = limite.toISOString().slice(0, 10);
  return lista
    .filter((jogo) => jogo.data >= corte)
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .slice(0, n);
}

/**
 * Resultado do cenário para um jogo, a partir do histórico recente:
 *  - otimista: V se o Corinthians venceu ao menos um dos confrontos recentes, senão E;
 *  - pessimista: D se perdeu ao menos um, senão E.
 * Sem histórico na janela retorna null (o jogo fica sem marcação e o modelo usa o aproveitamento atual).
 */
export function resultadoDoCenario(adversario, tipo, opcoes) {
  const resultados = confrontosRecentes(adversario, opcoes).map(resultadoDe);
  if (resultados.length === 0) return null;
  if (tipo === 'optimistic') return resultados.includes('V') ? 'V' : 'E';
  return resultados.includes('D') ? 'D' : 'E';
}

/** Os resultados recentes em ordem do mais novo para o mais antigo, ex.: ['E', 'D', 'E', 'V', 'V']. */
export function formaRecente(adversario, opcoes) {
  return confrontosRecentes(adversario, opcoes).map(resultadoDe);
}
