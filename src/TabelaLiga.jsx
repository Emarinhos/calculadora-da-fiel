import React from 'react';

const fmtRisco = (r) => (r === null ? '—' : r < 0.1 ? '<1%' : r >= 99.95 ? '100%' : `${r < 10 ? r.toFixed(1).replace('.', ',') : Math.round(r)}%`);

/**
 * Tabela do Brasileirão com o risco de rebaixamento de cada clube (mesma simulação do risco do Corinthians,
 * gravada no estado a cada atualização) e a etiqueta do jogo que o Corinthians ainda faz contra o clube.
 * `linhas` vem de linhasDaTabela (src/lib/liga.js).
 */
export default function TabelaLiga({ linhas, rodada, vigente }) {
  return (
    <div data-testid="tabela-liga">
      <h2 className="text-label tracking-[0.2em] pb-2 mb-1 border-b-[3px] border-ink">Tabela · Brasileirão</h2>
      <table className="w-full tabular-nums">
        <thead>
          <tr className="text-caption text-ink-soft text-right border-b-2 border-ink">
            <th scope="col" className="w-9 py-1.5 pr-1 font-normal text-left pl-2">#</th>
            <th scope="col" className="py-1.5 font-normal text-left">Clube</th>
            <th scope="col" className="w-9 py-1.5 font-normal">Pts</th>
            <th scope="col" className="hidden sm:table-cell w-8 py-1.5 font-normal">J</th>
            <th scope="col" className="hidden sm:table-cell w-9 py-1.5 font-normal">SG</th>
            <th scope="col" className="w-[84px] py-1.5 pr-2 font-normal" title="Chance de terminar entre os 4 últimos">Risco</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr
              key={l.clube}
              aria-current={l.eu ? 'true' : undefined}
              className={`${l.eu ? 'bg-ink text-canvas' : ''} ${l.pos === 16 ? 'border-b-[3px] border-risk-danger' : 'border-b border-ink/30'}`}
            >
              <td className={`py-1.5 pr-1 pl-2 text-[17px] text-left ${l.zona ? 'border-l-4 border-risk-danger' : ''}`}>{l.pos}º</td>
              <td className="py-1.5 text-left min-w-0">
                <div className="text-[17px] leading-tight">{l.clube}</div>
                {l.duelo && (
                  <div className="mt-0.5 inline-block border-[1.5px] border-ink px-1 text-[11px] leading-[1.3] tracking-[0.08em]">
                    Jogo R{l.duelo.rodada} · {l.duelo.casa ? 'casa' : 'fora'}
                  </div>
                )}
              </td>
              <td className="py-1.5 text-right text-[17px]">{l.pts}</td>
              <td className="hidden sm:table-cell py-1.5 text-right text-[15px]">{l.j}</td>
              <td className="hidden sm:table-cell py-1.5 text-right text-[15px]">{l.saldo > 0 ? `+${l.saldo}` : l.saldo}</td>
              <td className="py-1.5 pr-2 text-right">
                <span className="inline-flex items-center justify-end gap-1.5">
                  {l.risco !== null && l.risco >= 1 && (
                    <span
                      aria-hidden="true"
                      className={`inline-block h-[7px] ${l.eu ? 'bg-canvas' : 'bg-risk-danger'}`}
                      style={{ width: `${Math.max(1, Math.round(l.risco * 0.28))}px` }}
                    />
                  )}
                  <span className="text-[17px] leading-none w-[44px] text-right">{fmtRisco(l.risco)}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hidden lg:block mt-2 text-caption text-ink-soft">
        Risco: chance de terminar entre os 4 últimos, pela mesma simulação do campeonato usada no risco do Corinthians, recalculada a cada
        rodada{rodada ? ` (tabela após a rodada ${rodada})` : ''}. A linha vermelha é o corte do 16º; a etiqueta mostra o jogo que o
        Corinthians ainda faz contra o clube.
      </p>
      <p className="lg:hidden mt-2 text-caption text-ink-soft">
        Etiqueta = jogo do Corinthians contra o clube.{!vigente && ' Risco em atualização.'}
      </p>
    </div>
  );
}
