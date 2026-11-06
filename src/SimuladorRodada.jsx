import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { CLUBE } from './lib/estado';
import { medir } from './lib/medir';
import {
  chaveDoJogo, placarCompleto, rodadasRestantes, previsaoDoJogo, simularComPalpites,
  lerPalpites, salvarPalpites, clubesNaBriga, jogosQueImportam, INICIO_DA_BRIGA,
} from './lib/palpites';

const SIGLA = {
  Flamengo: 'FLA', Palmeiras: 'PAL', Fluminense: 'FLU', 'Athletico Paranaense': 'CAP', Cruzeiro: 'CRU', Bahia: 'BAH',
  'Atlético Mineiro': 'CAM', Santos: 'SAN', Coritiba: 'CFC', 'Red Bull Bragantino': 'RBB', 'São Paulo': 'SAO',
  Vitória: 'VIT', Botafogo: 'BOT', Vasco: 'VAS', Mirassol: 'MIR', Corinthians: 'COR', Internacional: 'INT',
  Grêmio: 'GRE', Remo: 'REM', Chapecoense: 'CHA',
};
const CURTO = { 'Athletico Paranaense': 'Athletico-PR', 'Atlético Mineiro': 'Atlético-MG', 'Red Bull Bragantino': 'Bragantino' };
const sigla = (c) => SIGLA[c] || c.slice(0, 3).toUpperCase();
const curto = (c) => CURTO[c] || c;

const CORTE_Z4 = 16; // último fora da zona de rebaixamento

const fmtChance = (r) => (r < 0.1 ? '<1%' : r >= 99.95 ? '100%' : `${r < 10 ? r.toFixed(1).replace('.', ',') : Math.round(r)}%`);
const pct = (x) => Math.round(x * 100);
const soDigitos = (s) => { const d = String(s).replace(/\D/g, '').slice(0, 2); return d === '' ? null : Number(d); };

function Seta({ direita = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d={direita ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7'} />
    </svg>
  );
}

/**
 * Simulador da briga contra o Z4: mostra só os jogos com pelo menos um time do 11º para baixo na tabela real de agora.
 * O usuário dá os placares, a parte de baixo da tabela é recalculada na hora e o risco de rebaixamento de cada clube sai
 * da mesma simulação do painel. Os outros jogos da liga continuam no cálculo, sorteados pelo modelo.
 */
export default function SimuladorRodada({ estado }) {
  const { tabela, jogos } = estado.liga;
  const briga = useMemo(() => clubesNaBriga(tabela, jogos), [tabela, jogos]);
  const visiveis = useMemo(() => jogosQueImportam(jogos, briga), [jogos, briga]);
  const rodadas = useMemo(() => rodadasRestantes(visiveis), [visiveis]);
  const [palpites, setPalpites] = useState(() => lerPalpites());
  const [rodada, setRodada] = useState(() => rodadas.find((r) => r > (estado.posicaoRodada ?? 0)) ?? rodadas[0]);

  useEffect(() => { salvarPalpites(palpites); }, [palpites]);
  // Se a rodada escolhida acabou (resultados aplicados), cai para a primeira que ainda tem jogos
  const rodadaAtual = rodadas.includes(rodada) ? rodada : rodadas[0];
  const iRodada = rodadas.indexOf(rodadaAtual);

  // Só os palpites dos jogos mostrados contam: um palpite antigo de um jogo que saiu da lista não mexe na tabela
  const palpitesValidos = useMemo(() => {
    const v = {};
    for (const g of visiveis) { const k = chaveDoJogo(g); if (palpites[k]) v[k] = palpites[k]; }
    return v;
  }, [visiveis, palpites]);
  // A simulação roda com o valor "adiado": digitar continua fluido enquanto as chances se atualizam
  const palpitesAdiados = useDeferredValue(palpitesValidos);
  const sim = useMemo(() => simularComPalpites({ tabela, jogos, palpites: palpitesAdiados }), [tabela, jogos, palpitesAdiados]);
  const atualizando = palpitesAdiados !== palpitesValidos;

  const previsoes = useMemo(() => new Map(visiveis.map((g) => [chaveDoJogo(g), previsaoDoJogo(tabela, g)])), [tabela, visiveis]);
  const jogosDaRodada = visiveis.filter((g) => g.rodada === rodadaAtual);
  const feitosNa = (r) => visiveis.filter((g) => g.rodada === r && placarCompleto(palpites[chaveDoJogo(g)])).length;
  const totalFeitos = visiveis.filter((g) => placarCompleto(palpites[chaveDoJogo(g)])).length;

  // Quem volta e encontra palpites guardados de outra visita (uma vez ao abrir)
  useEffect(() => {
    if (Object.keys(lerPalpites()).length > 0) medir('simulador-palpites-salvos', 'Simulador: voltou com palpites salvos');
  }, []);
  // Quem preenche todos os jogos da briga (uma vez a cada vez que completa)
  const tudoFeito = visiveis.length > 0 && totalFeitos === visiveis.length;
  useEffect(() => {
    if (tudoFeito) medir('simulador-completo', 'Simulador: preencheu todos os jogos');
  }, [tudoFeito]);

  const mudar = (g, lado, valor) => {
    const k = chaveDoJogo(g);
    const p = { gm: null, gv: null, ...palpites[k], [lado]: soDigitos(valor) };
    // Conta quando o placar fica completo (não a cada dígito)
    if (!placarCompleto(palpites[k]) && placarCompleto(p)) {
      const eu = g.mandante === CLUBE || g.visitante === CLUBE;
      medir(eu ? 'simulador-palpite-corinthians' : 'simulador-palpite', eu ? 'Simulador: palpite em jogo do Corinthians' : 'Simulador: palpite em outro jogo');
    }
    setPalpites((atual) => {
      const novo = { ...atual };
      if (p.gm === null && p.gv === null) delete novo[k]; else novo[k] = p;
      return novo;
    });
  };
  const irPara = (r) => { if (r !== rodadaAtual) medir('simulador-rodada', 'Simulador: trocou de rodada'); setRodada(r); };
  const preencher = () => {
    medir('simulador-preencher', 'Simulador: preencher o mais provável');
    setPalpites((atual) => {
      const novo = { ...atual };
      for (const g of jogosDaRodada) {
        const k = chaveDoJogo(g);
        if (!placarCompleto(novo[k])) novo[k] = { ...previsoes.get(k).placar };
      }
      return novo;
    });
  };
  const limparRodada = () => {
    medir('simulador-limpar-rodada', 'Simulador: limpar rodada');
    setPalpites((atual) => {
      const novo = { ...atual };
      for (const g of jogosDaRodada) delete novo[chaveDoJogo(g)];
      return novo;
    });
  };
  const limparTudo = () => { medir('simulador-limpar-tudo', 'Simulador: limpar tudo'); setPalpites({}); };

  const cor = sim.linhas.find((l) => l.clube === CLUBE);
  const riscoCor = cor ? cor.chances.rebaixamento : 0;
  const adiada = rodadaAtual <= (estado.posicaoRodada ?? 0);
  const linhasDaBriga = sim.linhas.filter((l) => l.pos >= INICIO_DA_BRIGA);

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 mt-6 lg:mt-8 pb-12 flex flex-col gap-6" data-testid="simulador">

      {/* Resumo do Corinthians com os palpites */}
      {cor && (
        <div className="flex flex-wrap border-[3px] border-ink" aria-live="polite">
          <div className="flex-[1_1_200px] bg-ink text-canvas px-5 py-4 flex flex-col gap-1.5">
            <span className="text-caption opacity-80">Corinthians com seus palpites</span>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[56px] leading-[0.9] tabular-nums">{cor.pos}º</span>
              <span className="text-label opacity-85">
                {cor.variacao === 0 ? 'igual à tabela real' : `${cor.variacao > 0 ? '▲' : '▼'} ${Math.abs(cor.variacao)} (real: ${cor.pos + cor.variacao}º)`}
              </span>
            </div>
            <span className="text-label">{cor.pts} pontos · {cor.j} jogos</span>
          </div>
          <div className="flex-[1_1_200px] px-5 py-4 flex flex-col gap-1.5 border-l border-ink/30">
            <span className="text-caption text-ink-soft">Risco de rebaixamento</span>
            <span className={`text-[56px] leading-[0.9] tabular-nums ${riscoCor >= 20 ? 'text-risk-danger' : ''} ${atualizando ? 'opacity-50' : ''}`}>{fmtChance(riscoCor)}</span>
            <span className="text-label text-ink-soft">Terminar entre os 4 últimos</span>
          </div>
          <div className="flex-[1_1_200px] px-5 py-4 flex flex-col gap-1.5 border-l border-ink/30">
            <span className="text-caption text-ink-soft">Palpites feitos</span>
            <span className="text-[56px] leading-[0.9] tabular-nums">{totalFeitos}<span className="text-[22px] text-ink-soft"> / {visiveis.length}</span></span>
            <span className="text-label text-ink-soft">Jogos da briga contra o Z4</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-8 items-start">

        {/* Jogos da rodada */}
        <section aria-label="Jogos da rodada" className="flex-[1_1_440px] min-w-0 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 border-b-[3px] border-ink pb-2">
            <button
              onClick={() => irPara(rodadas[iRodada - 1])}
              disabled={iRodada <= 0}
              aria-label="Rodada anterior"
              className="w-11 h-11 border-2 border-ink flex items-center justify-center disabled:opacity-30 hover:bg-ink/10"
            >
              <Seta />
            </button>
            <div className="text-center">
              <h2 className="text-[26px] leading-none">{rodadaAtual}ª rodada</h2>
              <p className="text-caption text-ink-soft">
                {adiada ? (jogosDaRodada.length === 1 ? 'Jogo adiado' : 'Jogos adiados') : `${jogosDaRodada.length} ${jogosDaRodada.length === 1 ? 'jogo que importa' : 'jogos que importam'}`}
              </p>
            </div>
            <button
              onClick={() => irPara(rodadas[iRodada + 1])}
              disabled={iRodada >= rodadas.length - 1}
              aria-label="Próxima rodada"
              className="w-11 h-11 border-2 border-ink flex items-center justify-center disabled:opacity-30 hover:bg-ink/10"
            >
              <Seta direita />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Escolher rodada">
            {rodadas.map((r) => {
              const ativa = r === rodadaAtual;
              const total = visiveis.filter((g) => g.rodada === r).length;
              return (
                <button
                  key={r}
                  onClick={() => irPara(r)}
                  aria-pressed={ativa}
                  aria-label={`${r}ª rodada, ${feitosNa(r)} de ${total} palpites`}
                  className={`min-h-[44px] min-w-[52px] px-2 py-1 border-2 border-ink flex flex-col items-center justify-center leading-tight ${ativa ? 'bg-ink text-canvas' : 'hover:bg-ink/10'}`}
                >
                  <span className="text-[16px]">{r}ª</span>
                  <span className="text-[11px] tracking-[0.06em] opacity-80 tabular-nums">{feitosNa(r)}/{total}</span>
                </button>
              );
            })}
          </div>

          <ul className="flex flex-col">
            {jogosDaRodada.map((g) => {
              const k = chaveDoJogo(g);
              const p = palpites[k] ?? { gm: null, gv: null };
              const prev = previsoes.get(k);
              const eu = g.mandante === CLUBE || g.visitante === CLUBE;
              const completo = placarCompleto(p);
              const meio = !completo && (p.gm !== null || p.gv !== null);
              const legenda = completo
                ? `Seu palpite: ${p.gm > p.gv ? `vitória ${sigla(g.mandante)}` : p.gm < p.gv ? `vitória ${sigla(g.visitante)}` : 'empate'}`
                : meio
                  ? 'Falta o outro placar'
                  : `${sigla(g.mandante)} ${pct(prev.casa)}% · Emp ${pct(prev.empate)}% · ${sigla(g.visitante)} ${pct(prev.fora)}%`;
              const campo = `w-12 h-12 text-center text-[24px] tabular-nums bg-canvas text-ink border-2 ${meio ? 'border-risk-danger' : 'border-ink'} placeholder:text-ink/30 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-risk-danger focus-visible:outline-offset-2`;
              return (
                <li key={k} className={`px-2 pt-2.5 pb-2 border-b border-ink/30 flex flex-col gap-1.5 ${eu ? 'bg-ink text-canvas' : ''}`}>
                  <div className="flex items-center justify-center gap-2">
                    <span className="hidden sm:block flex-1 min-w-0 text-right text-[17px] truncate">{curto(g.mandante)}</span>
                    <span className="w-11 text-center text-label" aria-hidden="true">{sigla(g.mandante)}</span>
                    <input
                      type="text" inputMode="numeric" maxLength={2} placeholder="–"
                      aria-label={`Gols ${curto(g.mandante)} contra ${curto(g.visitante)}`}
                      value={p.gm ?? ''} onChange={(e) => mudar(g, 'gm', e.target.value)} onFocus={(e) => e.target.select()}
                      className={campo}
                    />
                    <span aria-hidden="true" className="opacity-70">×</span>
                    <input
                      type="text" inputMode="numeric" maxLength={2} placeholder="–"
                      aria-label={`Gols ${curto(g.visitante)} contra ${curto(g.mandante)}`}
                      value={p.gv ?? ''} onChange={(e) => mudar(g, 'gv', e.target.value)} onFocus={(e) => e.target.select()}
                      className={campo}
                    />
                    <span className="w-11 text-center text-label" aria-hidden="true">{sigla(g.visitante)}</span>
                    <span className="hidden sm:block flex-1 min-w-0 text-left text-[17px] truncate">{curto(g.visitante)}</span>
                  </div>
                  {/* Chance de cada resultado pelo modelo; vira o status do palpite quando preenchido */}
                  <div className="flex items-center gap-2 w-full max-w-[360px] mx-auto">
                    <div aria-hidden="true" className="flex-1 flex h-1.5 gap-0.5">
                      <span className={eu ? 'bg-canvas' : 'bg-ink'} style={{ width: `${pct(prev.casa)}%` }} />
                      <span className={`${eu ? 'bg-canvas' : 'bg-ink'} opacity-35`} style={{ width: `${pct(prev.empate)}%` }} />
                      <span className={`${eu ? 'bg-canvas' : 'bg-ink'} opacity-70`} style={{ width: `${pct(prev.fora)}%` }} />
                    </div>
                    <span className={`text-[12px] tracking-[0.06em] whitespace-nowrap ${meio ? (eu ? '' : 'text-risk-danger') : eu ? 'opacity-80' : 'text-ink-soft'}`}>{legenda}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button onClick={preencher} className="flex-[1_1_200px] min-h-[48px] border-2 border-ink bg-ink text-canvas text-body tracking-[0.08em]">Preencher o mais provável</button>
            <button onClick={limparRodada} className="flex-[1_1_120px] min-h-[48px] border-2 border-ink text-body tracking-[0.08em] hover:bg-ink/10">Limpar rodada</button>
            <button onClick={limparTudo} disabled={Object.keys(palpites).length === 0} className="flex-[1_1_120px] min-h-[48px] border-2 border-risk-danger text-risk-danger text-body tracking-[0.08em] hover:bg-risk-danger/10 disabled:opacity-35 disabled:cursor-not-allowed">Limpar tudo</button>
          </div>
        </section>

        {/* Parte de baixo da tabela, com os palpites */}
        <section aria-label="Briga contra o Z4" className="flex-[1_1_460px] min-w-0 flex flex-col gap-2.5">
          <h2 className="text-h2 tracking-[0.12em] border-b-[3px] border-ink pb-2">Briga contra o Z4 · {INICIO_DA_BRIGA}º ao 20º</h2>
          <div className="overflow-x-auto">
            <table className="w-full tabular-nums">
              <thead>
                <tr className="text-caption text-ink-soft text-right border-b-2 border-ink">
                  <th scope="col" className="w-10 py-1.5 pl-2 pr-1 font-normal text-left">#</th>
                  <th scope="col" className="w-8 py-1.5 font-normal text-left"><span className="sr-only">Variação</span></th>
                  <th scope="col" className="py-1.5 font-normal text-left">Clube</th>
                  <th scope="col" className="w-9 py-1.5 font-normal">P</th>
                  <th scope="col" className="w-8 py-1.5 font-normal">J</th>
                  <th scope="col" className="hidden sm:table-cell w-8 py-1.5 font-normal">V</th>
                  <th scope="col" className="w-10 py-1.5 font-normal">SG</th>
                  <th scope="col" className="hidden sm:table-cell w-9 py-1.5 font-normal">GP</th>
                  <th scope="col" className="w-[92px] py-1.5 pr-2 font-normal">Risco Z4</th>
                </tr>
              </thead>
              <tbody className={atualizando ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
                {linhasDaBriga.map((l) => {
                  const eu = l.clube === CLUBE;
                  const risco = l.chances.rebaixamento;
                  return (
                    <tr
                      key={l.clube}
                      aria-current={eu ? 'true' : undefined}
                      className={`${eu ? 'bg-ink text-canvas' : ''} ${l.pos === CORTE_Z4 ? 'border-b-[3px] border-risk-danger' : 'border-b border-ink/30'}`}
                    >
                      <td className={`py-1.5 pl-2 pr-1 text-[17px] text-left ${l.pos > CORTE_Z4 ? 'border-l-4 border-risk-danger' : ''}`}>{l.pos}º</td>
                      <td className={`py-1.5 text-[12px] text-left ${!eu && l.variacao < 0 ? 'text-risk-danger' : !eu ? 'text-ink-soft' : ''}`}>
                        {l.variacao !== 0 && <span aria-label={`${l.variacao > 0 ? 'subiu' : 'caiu'} ${Math.abs(l.variacao)}`}>{l.variacao > 0 ? '▲' : '▼'}{Math.abs(l.variacao)}</span>}
                      </td>
                      <td className="py-1.5 text-left text-[17px] whitespace-nowrap">{curto(l.clube)}</td>
                      <td className="py-1.5 text-right text-[17px]">{l.pts}</td>
                      <td className="py-1.5 text-right text-[15px]">{l.j}</td>
                      <td className="hidden sm:table-cell py-1.5 text-right text-[15px]">{l.v}</td>
                      <td className="py-1.5 text-right text-[15px]">{l.saldo > 0 ? `+${l.saldo}` : l.saldo}</td>
                      <td className="hidden sm:table-cell py-1.5 text-right text-[15px]">{l.gp}</td>
                      <td className="py-1.5 pr-2 text-right">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          {risco >= 1 && (
                            <span
                              aria-hidden="true"
                              className={`inline-block h-[7px] ${eu ? 'bg-canvas' : 'bg-risk-danger'}`}
                              style={{ width: `${Math.max(1, Math.round(risco * 0.28))}px` }}
                            />
                          )}
                          <span className="text-[16px] leading-none w-[44px] text-right">{fmtChance(risco)}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
