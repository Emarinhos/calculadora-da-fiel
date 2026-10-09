import React, { useState, useMemo, useEffect } from 'react';
import { calculateRisk, pontosProjetados, distanciaCorte, riskLevel, riscoBaseline } from './lib/risk';
import { resultadoDoCenario, formaRecente, N_CONFRONTOS, JANELA_ANOS } from './lib/cenarios';
import { FONTE_H2H, ATUALIZADO_EM } from './lib/h2h';
import { ESTADO_EMBUTIDO, carregarEstado, jogosDoApp, contextoDe } from './lib/estado';

// Escala da "linha do corte": do pior (todas derrotas) ao melhor (todas vitórias) cenário
const SCALE_MIN = 30;
const SCALE_MAX = 60;
const pos = (v) => Math.min(100, Math.max(0, ((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100));

// Recarrega public/estado.json a cada 30 min e ao voltar para a aba
const INTERVALO_RECARGA_MS = 30 * 60 * 1000;

const brData = (iso) => iso.split('-').reverse().join('/');

function Arrow({ className = '' }) {
  return (
    <svg width="30" height="18" viewBox="0 0 30 18" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true" className={className}>
      <path d="M1 9h26M20 2l8 7-8 7" />
    </svg>
  );
}

function Cadeado({ className = '' }) {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
      <rect x="1.5" y="7" width="11" height="8" />
      <path d="M4 7V4.5a3 3 0 0 1 6 0V7" />
    </svg>
  );
}

export default function App() {
  // Estado real da temporada (public/estado.json), atualizado automaticamente
  const [estado, setEstado] = useState(ESTADO_EMBUTIDO);
  const [avisoEstado, setAvisoEstado] = useState(null);
  // Marcações do usuário só valem para jogos ainda abertos
  const [marks, setMarks] = useState({});

  useEffect(() => {
    let vivo = true;
    const carregar = async () => {
      const { estado: novo, origem, aviso } = await carregarEstado({ url: `${import.meta.env.BASE_URL}estado.json` });
      if (!vivo) return;
      setEstado(novo);
      setAvisoEstado(origem === 'embutido' ? aviso : null);
    };
    carregar();
    const timer = setInterval(carregar, INTERVALO_RECARGA_MS);
    const aoVoltar = () => { if (document.visibilityState === 'visible') carregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      vivo = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);

  const ctx = useMemo(() => contextoDe(estado), [estado]);

  // Jogos encerrados vêm travados do estado; os abertos recebem a marcação do usuário
  const games = useMemo(
    () => jogosDoApp(estado).map((g) => (g.locked ? g : { ...g, result: marks[g.id] ?? null })),
    [estado, marks]
  );
  // O modelo só enxerga jogos abertos: os encerrados já estão nos pontos do estado
  const abertos = useMemo(() => games.filter((g) => !g.locked), [games]);

  const calculatedRisk = useMemo(() => calculateRisk(abertos, ctx), [abertos, ctx]);
  const currentDistancia = useMemo(() => distanciaCorte(abertos, ctx), [abertos, ctx]);
  const projPoints = useMemo(() => Math.round(pontosProjetados(abertos, ctx)), [abertos, ctx]);
  const baseline = useMemo(() => riscoBaseline(abertos, ctx), [abertos, ctx]);

  // Estado e animação de 400ms do percentual com suporte a prefers-reduced-motion
  const [displayedRisk, setDisplayedRisk] = useState(calculatedRisk);
  const [displayedProjPoints, setDisplayedProjPoints] = useState(projPoints);

  useEffect(() => {
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayedRisk(calculatedRisk);
      return;
    }

    const startVal = displayedRisk;
    const endVal = calculatedRisk;
    if (Math.abs(startVal - endVal) < 0.01) return;

    const duration = 400;
    const startTime = performance.now();
    let frameId;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayedRisk(startVal + (endVal - startVal) * ease);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setDisplayedRisk(endVal);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [calculatedRisk]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayedProjPoints(projPoints);
    }, 150);
    return () => clearTimeout(timer);
  }, [projPoints]);

  const handleResultChange = (id, result) => {
    const jogo = games.find((g) => g.id === id);
    if (!jogo || jogo.locked) return; // resultado real é fixo
    setMarks((prev) => ({ ...prev, [id]: prev[id] === result ? null : result }));
  };

  const applyStressTest = (type) => {
    if (type === 'reset') {
      setMarks({});
      return;
    }
    // Cenários vêm do histórico recente de confrontos com cada adversário (lib/cenarios.js)
    setMarks(Object.fromEntries(abertos.map((g) => [g.id, resultadoDoCenario(g.opponent, type)])));
  };

  const formaPorJogo = useMemo(
    () => Object.fromEntries(games.map((g) => [g.id, formaRecente(g.opponent)])),
    [games]
  );
  const dataFonte = brData(ATUALIZADO_EM);

  // Delta em relação ao baseline
  const delta = useMemo(() => {
    const diff = calculatedRisk - baseline;
    if (Math.abs(diff) < 0.05) return null;
    const formatted = Math.abs(diff).toFixed(1).replace('.', ',');
    if (diff < 0) {
      return {
        text: `▼ ${formatted} pp`,
        type: 'safe',
        className: 'text-ink border-ink',
      };
    }
    return {
      text: `▲ ${formatted} pp`,
      type: 'danger',
      className: 'bg-risk-danger text-canvas border-risk-danger',
    };
  }, [calculatedRisk, baseline]);

  // Faixa de risco atual
  const currentLevel = useMemo(() => riskLevel(displayedRisk), [displayedRisk]);

  // Jogos restantes sem marcação
  const remainingGames = useMemo(() => abertos.filter((g) => g.result === null).length, [abertos]);

  // Com o modelo logístico, risco mínimo é ~0.7% no cenário otimista (abaixo de 1.0%)
  const isSaved = calculatedRisk <= 1.0;

  // Identidade preto e creme: vermelho do brasão só na zona de perigo (> 60)
  const isDanger = displayedRisk > 60;
  const riskText = isDanger ? 'text-risk-danger' : 'text-ink';

  const cutBelow = currentDistancia.situacao === 'abaixo';

  // Assinatura: as listras da camisa engrossam com o risco (mais preto = mais perigo)
  const clampedRisk = Math.min(100, Math.max(0, displayedRisk));
  const stripeInk = `${(1 + (12 * clampedRisk) / 100).toFixed(2)}px`;

  const projPos = pos(displayedProjPoints);
  const cutPos = pos(estado.corte);
  const gapParts = currentDistancia.label.split(/(\d+)/);

  return (
    <div className="min-h-screen text-ink font-sans selection:bg-ink/20">

      {/* Faixa listrada: a espessura das listras pretas segue o risco */}
      <header>
        <div className="stripes h-[72px] md:h-[92px] relative" style={{ '--ink-w': stripeInk }}>
          <div className="max-w-6xl mx-auto px-4 md:px-8 h-full relative">
            <div className="absolute left-4 md:left-8 bottom-0 bg-ink text-canvas px-3.5 pt-2 pb-1.5 text-[22px] tracking-wider leading-none">
              Corinthians · {estado.posicao}º
            </div>
            <div className="absolute right-4 md:right-8 top-2 bg-canvas text-ink border-2 border-ink px-2 py-1 text-caption leading-none">
              Listras = risco
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between border-b-[3px] border-ink">
          <h1 className="text-h2 tracking-wider">Calculadora da Fiel</h1>
          <button
            onClick={() => applyStressTest('reset')}
            className="min-h-[44px] px-4 border-2 border-ink text-label hover:bg-ink hover:text-canvas transition-colors"
          >
            Resetar
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 mt-6 lg:mt-8 flex flex-col lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:items-start pb-28 lg:pb-8">

        {/* Matches Section (Left column on Desktop) */}
        <section className="order-2 lg:order-1 pt-6 lg:pt-0">
          <h2 className="text-label tracking-[0.2em] pb-2 mb-3 border-b-[3px] border-ink">
            Confrontos · {abertos.length} {abertos.length === 1 ? 'restante' : 'restantes'}
          </h2>

          <div className="flex flex-col gap-2.5">
            {games.map((game) => (
              <div key={game.id} className={`ticket flex items-stretch border-2 border-ink ${game.locked ? 'bg-ink/[0.06]' : ''}`}>
                {/* Canhoto do ingresso */}
                <div className="w-[60px] flex-shrink-0 bg-ink text-canvas flex flex-col items-center justify-center gap-1.5 py-2 border-r-2 border-dashed border-canvas/60">
                  <span className="text-[26px] leading-none [writing-mode:vertical-rl] rotate-180">R{game.rodada}</span>
                  <span className="text-caption leading-none">{game.home ? 'Casa' : 'Fora'}</span>
                </div>

                <div className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <span className="text-[24px] tracking-wider truncate leading-none">{game.opponent}</span>
                    {game.locked ? (
                      <span className="flex items-center gap-1.5 text-caption text-ink-soft leading-none">
                        <Cadeado />
                        Encerrado {game.placar.gc}×{game.placar.ga}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {/* Forma recente contra este adversário, do mais novo ao mais antigo */}
                        <div
                          className="flex gap-[2px]"
                          role="img"
                          aria-label={formaPorJogo[game.id].length
                            ? `Últimos confrontos, do mais recente ao mais antigo: ${formaPorJogo[game.id].join(', ')}`
                            : 'Sem confrontos recentes'}
                        >
                          {formaPorJogo[game.id].map((r, i) => (
                            <span
                              key={i}
                              aria-hidden="true"
                              className={`w-[17px] h-[17px] flex items-center justify-center text-[13px] leading-none border border-ink ${
                                r === 'V' ? 'bg-ink text-canvas' : r === 'D' ? 'bg-risk-danger border-risk-danger text-canvas' : 'bg-transparent text-ink'
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0" role="group" aria-label={`Resultado contra ${game.opponent}`}>
                    {[
                      { key: 'V', label: 'Vitória' },
                      { key: 'E', label: 'Empate' },
                      { key: 'D', label: 'Derrota' },
                    ].map(({ key, label }) => {
                      const on = game.result === key;
                      const base = 'w-11 h-11 border-2 text-[22px] transition-all duration-150';
                      if (game.locked) {
                        return (
                          <button
                            key={key}
                            disabled
                            aria-pressed={on}
                            aria-label={`${label} contra ${game.opponent}${on ? ' (resultado real, fixo)' : ''}`}
                            className={`${base} cursor-not-allowed ${on ? 'bg-ink text-canvas border-ink' : 'bg-transparent text-ink/30 border-ink/25'}`}
                          >
                            {key}
                          </button>
                        );
                      }
                      return (
                        <button
                          key={key}
                          onClick={() => handleResultChange(game.id, key)}
                          aria-pressed={on}
                          aria-label={`${label} contra ${game.opponent}`}
                          className={`${base} border-ink ${on ? 'bg-ink text-canvas -rotate-6 scale-105' : 'bg-transparent text-ink hover:bg-ink/10'}`}
                        >
                          {key}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dashboard Section (Right column on Desktop, top on mobile) */}
        <section className="order-1 lg:order-2 lg:sticky lg:top-6 flex flex-col gap-4">

          {/* Main Risk Display */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <span className="text-label tracking-[0.2em]">Risco de rebaixamento</span>
              <div className="flex items-center gap-2">
                {delta && (
                  <span className={`text-label px-2 py-1 border-2 transition-colors duration-300 ${delta.className}`}>
                    {delta.text}
                  </span>
                )}
                {isSaved ? (
                  <span className="text-label px-2 py-1 bg-ink text-canvas">Série A</span>
                ) : (
                  <span className="text-label px-2 py-1 border-2 border-ink text-ink-soft">Ao vivo</span>
                )}
              </div>
            </div>

            {/* Percentual com aria-live="polite" */}
            <div aria-live="polite" aria-atomic="true" className="flex items-start mt-2">
              <span className={`text-display tabular-nums transition-colors duration-500 ${riskText}`}>
                {displayedRisk.toFixed(1).replace('.', ',')}
              </span>
              <span className={`text-[66px] mt-2 ml-0.5 leading-none transition-colors duration-500 ${riskText}`}>%</span>
            </div>

            {/* Carimbo da faixa de risco */}
            <div
              className={`self-end -mt-4 mr-1 -rotate-[5deg] border-[3px] px-3 py-1 text-[22px] tracking-wider leading-none bg-canvas transition-colors duration-500 ${isDanger ? 'border-risk-danger text-risk-danger' : 'border-ink text-ink'}`}
              style={{ outline: '1px solid currentColor', outlineOffset: '2px' }}
            >
              {currentLevel.label}
            </div>
          </div>

          {/* Contador de pontos: 32 pts → N projetados */}
          <div className="bg-ink text-canvas px-4 py-3 flex items-center gap-2 leading-none whitespace-nowrap">
            <span className="text-[44px] text-canvas/70 tabular-nums">{estado.pontos}</span>
            <span className="text-label text-canvas/70">pts</span>
            <Arrow className="mx-1.5 flex-shrink-0" />
            <span className="text-[72px] tabular-nums transition-all duration-300">{displayedProjPoints}</span>
            <span className="text-label">projetados</span>
          </div>

          {/* A lacuna até o corte, desenhada */}
          <div>
            <p className="text-[34px] leading-[1.05]">
              {gapParts.map((part, i) =>
                /^\d+$/.test(part)
                  ? <span key={i} className={`text-[56px] leading-none ${cutBelow ? 'text-risk-danger' : 'text-ink'}`}>{part}</span>
                  : part
              )}
            </p>

            <div
              className="relative h-[100px] mt-3"
              role="img"
              aria-label={`Escala de pontos: projeção de ${displayedProjPoints}, corte em ${estado.corte}`}
            >
              <span className="absolute left-0 top-0 text-caption text-ink-soft">Rebaixamento</span>
              <span className="absolute right-0 top-0 text-caption text-ink-soft">Segurança</span>
              <span className="absolute top-0 -translate-x-1/2 text-label text-risk-danger whitespace-nowrap" style={{ left: `${cutPos}%` }}>
                Corte {estado.corte}
              </span>

              {/* Zona de rebaixamento (hachurada) e zona segura */}
              <div
                className="absolute left-0 top-[26px] h-[24px] border-2 border-ink"
                style={{ width: `${cutPos}%`, background: 'repeating-linear-gradient(135deg, var(--ink) 0 1.5px, transparent 1.5px 6px)' }}
              />
              <div className="absolute top-[26px] h-[24px] border-2 border-l-0 border-ink" style={{ left: `${cutPos}%`, right: 0 }} />

              {/* Lacuna entre a projeção e o corte */}
              <div
                className={`absolute top-[36px] h-[4px] shadow-[0_0_0_3px_var(--bg-canvas)] transition-all duration-500 ${cutBelow ? 'bg-risk-danger' : 'bg-ink'}`}
                style={{ left: `${Math.min(projPos, cutPos)}%`, width: `${Math.abs(cutPos - projPos)}%` }}
              />

              {/* Linha do corte */}
              <div className="absolute top-[18px] h-[46px] w-1 -translate-x-1/2 bg-risk-danger" style={{ left: `${cutPos}%` }} />

              {/* Marcador da projeção */}
              <div className="absolute top-[50px] h-[8px] w-[3px] -translate-x-1/2 bg-ink transition-all duration-500" style={{ left: `${projPos}%` }} />
              <div
                className="absolute top-[58px] -translate-x-1/2 bg-ink text-canvas px-2 py-1 text-[22px] leading-none tabular-nums transition-all duration-500"
                style={{ left: `${projPos}%` }}
              >
                {displayedProjPoints}
              </div>
            </div>
          </div>

          <div className="text-caption text-ink-soft">
            {estado.posicao}º lugar após a rodada {estado.posicaoRodada} · {remainingGames} {remainingGames === 1 ? 'jogo restante' : 'jogos restantes'} · corte estimado em {estado.corte} pts
          </div>

          {/* Controls (Stress Test) */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => applyStressTest('optimistic')}
              disabled={abertos.length === 0}
              aria-label="Cenário otimista: melhor resultado do histórico recente em cada jogo"
              className="min-h-[56px] bg-ink text-canvas border-2 border-ink text-[17px] tracking-[0.14em] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cenário otimista
            </button>
            <button
              onClick={() => applyStressTest('pessimistic')}
              disabled={abertos.length === 0}
              aria-label="Cenário pessimista: pior resultado do histórico recente em cada jogo"
              className="min-h-[56px] bg-transparent text-ink border-2 border-ink text-[17px] tracking-[0.14em] hover:bg-ink hover:text-canvas transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cenário pessimista
            </button>
          </div>
          <p className="text-caption text-ink-soft -mt-1">
            Cenários pelo melhor e o pior resultado dos últimos {N_CONFRONTOS} confrontos com cada rival (até {JANELA_ANOS} anos). Fonte: {FONTE_H2H}, {dataFonte}.
          </p>
          <p className="text-caption text-ink-soft -mt-2" data-testid="estado-info">
            Tabela e resultados atualizados em {brData(estado.atualizadoEm)} ({estado.fonte}).
            {avisoEstado && ' Usando dados embutidos: não consegui ler o arquivo de estado.'}
          </p>
        </section>

      </main>

      {/* Mobile Sticky Footer: mantém o risco visível enquanto se rola pelos jogos */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-canvas border-t-[3px] border-ink px-4 flex items-center justify-between h-[72px]">
        <div className="flex flex-col justify-center">
          <div className="text-label leading-tight">
            {estado.pontos} pts → <span className="tabular-nums">{displayedProjPoints} proj</span>
            <span className="text-ink-soft"> · </span>
            <span className={cutBelow ? 'text-risk-danger' : 'text-ink'}>{currentDistancia.label}</span>
          </div>
          <div aria-live="polite" aria-atomic="true" className="flex items-baseline gap-0.5 mt-0.5">
            <span className={`text-[32px] tabular-nums leading-none ${riskText}`}>{displayedRisk.toFixed(1).replace('.', ',')}</span>
            <span className={`text-[18px] leading-none ${riskText}`}>%</span>
          </div>
        </div>

        <div className="min-w-[60px] flex items-center justify-end">
          {delta && (
            <span className={`text-label px-1.5 py-0.5 border-2 text-center whitespace-nowrap ${delta.className}`}>
              {delta.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
