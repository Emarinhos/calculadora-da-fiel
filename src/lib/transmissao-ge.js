/**
 * Lê a transmissão (horário, TV, streaming) de um jogo na matéria "onde assistir" do ge.globo.
 * Funções puras: quem busca a página é scripts/confirmar-transmissao.mjs.
 */

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Como o ge costuma escrever o nome do clube no título (além do nome da tabela). */
const APELIDOS = {
  'Atlético Mineiro': ['atletico-mg', 'atletico mineiro'],
  'Athletico Paranaense': ['athletico-pr', 'athletico paranaense'],
  'Red Bull Bragantino': ['bragantino'],
};
const nomesDoClube = (clube) => [semAcento(clube), ...(APELIDOS[clube] ?? [])];
const cita = (texto, clube) => nomesDoClube(clube).some((n) => semAcento(texto).includes(n));

/**
 * Entre os itens do RSS ({ titulo, url }), acha a matéria "onde assistir" deste jogo:
 * o título cita os dois clubes e "onde assistir", e a URL é de um dia próximo ao do jogo.
 */
export function acharMateria(itens, { mandante, visitante, data }) {
  return itens.find((i) => {
    const t = semAcento(i.titulo);
    const diaNaUrl = i.url.match(/\/noticia\/(\d{4})\/(\d{2})\/(\d{2})\//);
    const dia = diaNaUrl ? `${diaNaUrl[1]}-${diaNaUrl[2]}-${diaNaUrl[3]}` : null;
    return t.includes('onde assistir') && cita(i.titulo, mandante) && cita(i.titulo, visitante) && dia !== null && Math.abs(Date.parse(dia) - Date.parse(data)) <= 2 * 86400000;
  });
}

// Emissoras e plataformas conhecidas: [como aparece no texto, nome gravado, tipo]
const CANAIS = [
  [/tv globo|\bglobo\b/i, 'Globo', 'tv'],
  [/sportv/i, 'SporTV', 'tv'],
  [/premiere/i, 'Premiere', 'tv'],
  [/\bband\b/i, 'Band', 'tv'],
  [/\bsbt\b/i, 'SBT', 'tv'],
  [/record/i, 'Record', 'tv'],
  [/espn/i, 'ESPN', 'tv'],
  [/ge tv/i, 'ge tv', 'streaming'],
  [/globoplay/i, 'Globoplay', 'streaming'],
  [/prime video|amazon/i, 'Prime Video', 'streaming'],
  [/caz[eé]\s?tv/i, 'CazéTV', 'streaming'],
  [/disney\+/i, 'Disney+', 'streaming'],
];

const listar = (nomes) => (nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0] ?? null);

/**
 * Texto da matéria (já sem tags) → { hora: 'HH:MM'|null, tv: string|null, streaming: string|null }.
 * Só vale a frase que fala de transmissão ao vivo; sem ela não devolve TV nenhuma.
 */
export function extrairTransmissao(texto) {
  const limpo = texto.replace(/\s+/g, ' ');
  const h = limpo.match(/(?:^|\s)às\s+(\d{1,2})h(\d{2})?/i) ?? limpo.match(/\b(\d{1,2})h(\d{2})?\s*\(de Brasília\)/i);
  const hora = h ? `${h[1].padStart(2, '0')}:${h[2] ?? '00'}` : null;

  const frase = limpo.split(/(?<=[.!?])\s+/).find((f) => /transmit(e|em)\b/i.test(f) && /ao vivo/i.test(f));
  const tv = [];
  const streaming = [];
  if (frase) {
    // Só o trecho até "transmitem", que é onde as emissoras vêm listadas
    const trecho = frase.slice(0, frase.search(/transmit(e|em)\b/i) + 10);
    for (const [re, nome, tipo] of CANAIS) if (re.test(trecho)) (tipo === 'tv' ? tv : streaming).push(nome);
  }
  return { hora, tv: listar(tv), streaming: listar(streaming) };
}
