import React from 'react';

const ROTULOS = {
  rebaixamento: ['Rebaixamento', 'Segurança'],
  sulamericana: ['Fora da zona', 'Sul-Americana'],
  libertadores: ['Fora da zona', 'Libertadores'],
};

/**
 * Régua de pontos do objetivo escolhido. A escala (lo..hi) é a mesma para todos os objetivos visíveis, então ao trocar de
 * objetivo só o corte se desloca. No rebaixamento a zona hachurada fica à esquerda do corte (perigo); nas vagas ela fica à
 * direita do corte (a zona da vaga). A parte da régua além do máximo possível aparece esmaecida (inalcançável).
 */
export default function Regua({ objetivo, corte, projecao, maxPossivel, lo, hi, abaixoDoCorte }) {
  const pos = (v) => Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100));
  const ehRebaixamento = objetivo === 'rebaixamento';
  const [rotuloEsq, rotuloDir] = ROTULOS[objetivo];
  const cutPos = pos(corte);
  const projPos = pos(projecao);
  const maxPos = pos(maxPossivel);
  // Só o rebaixamento fica vermelho quando a projeção está abaixo do corte; nas vagas "abaixo" é só distância
  const lacunaVermelha = ehRebaixamento && abaixoDoCorte;
  const hachura = ehRebaixamento
    ? 'repeating-linear-gradient(135deg, var(--ink) 0 1.5px, transparent 1.5px 6px)'
    : 'repeating-linear-gradient(45deg, var(--ink) 0 1.5px, transparent 1.5px 6px)';

  return (
    <div
      className="relative h-[110px] mt-3"
      role="img"
      aria-label={`Escala de pontos para ${ROTULOS[objetivo][1]}: projeção de ${projecao}, ${ehRebaixamento ? 'corte' : 'corte da vaga'} em ${corte}, máximo possível ${maxPossivel}`}
      data-testid="regua"
    >
      <span className="absolute left-0 top-0 text-caption text-ink-soft">{rotuloEsq}</span>
      <span className="absolute right-0 top-0 text-caption text-ink-soft">{rotuloDir}</span>
      <span
        className="absolute top-[14px] -translate-x-1/2 text-label text-risk-danger whitespace-nowrap transition-[left] duration-500"
        style={{ left: `${cutPos}%` }}
      >
        {ehRebaixamento ? 'Corte' : 'Vaga'} {corte}
      </span>

      {/* Base da régua e parte inalcançável (além do máximo possível) */}
      <div className="absolute inset-x-0 top-[38px] h-[24px] border-2 border-ink" />
      {maxPos < 100 && (
        <div className="absolute top-[40px] h-[20px] bg-ink/10" style={{ left: `${maxPos}%`, right: '2px' }} title={`Acima de ${maxPossivel} pts é impossível`} />
      )}

      {/* Zona hachurada: rebaixamento = esquerda do corte; vaga = direita do corte */}
      <div
        className="absolute top-[38px] h-[24px] border-2 border-ink transition-all duration-500"
        style={ehRebaixamento
          ? { left: 0, width: `${cutPos}%`, background: hachura }
          : { left: `${cutPos}%`, right: 0, background: hachura }}
      />

      {/* Lacuna entre a projeção e o corte */}
      <div
        className={`absolute top-[48px] h-[4px] shadow-[0_0_0_3px_var(--bg-canvas)] transition-all duration-500 ${lacunaVermelha ? 'bg-risk-danger' : 'bg-ink'}`}
        style={{ left: `${Math.min(projPos, cutPos)}%`, width: `${Math.abs(cutPos - projPos)}%` }}
      />

      {/* Linha do corte */}
      <div className="absolute top-[30px] h-[46px] w-1 -translate-x-1/2 bg-risk-danger transition-[left] duration-500" style={{ left: `${cutPos}%` }} />

      {/* Marcador da projeção */}
      <div className="absolute top-[62px] h-[8px] w-[3px] -translate-x-1/2 bg-ink transition-all duration-500" style={{ left: `${projPos}%` }} />
      <div
        className="absolute top-[70px] -translate-x-1/2 bg-ink text-canvas px-2 py-1 text-[22px] leading-none tabular-nums transition-all duration-500"
        style={{ left: `${projPos}%` }}
      >
        {projecao}
      </div>
    </div>
  );
}
