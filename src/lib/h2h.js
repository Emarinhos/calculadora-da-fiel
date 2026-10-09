/**
 * Confrontos diretos recentes do Corinthians (futebol masculino profissional) contra
 * os 9 adversários restantes.
 *
 * Fonte: ogol.com.br, páginas de confronto de cada par, consultadas em 09/10/2026.
 * Datas seguem a lista de jogos do ogol (algumas fichas indicam o dia seguinte).
 * Placar sempre do ponto de vista do Corinthians: gc = gols do Corinthians, ga = gols do adversário.
 * Decisões por pênaltis valem pelo placar dos 90 minutos.
 *
 * Os confrontos mais antigos ficam registrados, mas a regra de cenário (cenarios.js)
 * só usa a janela recente.
 *
 * Para atualizar: acrescente os novos jogos no topo da lista do adversário e ajuste ATUALIZADO_EM.
 */
export const FONTE_H2H = 'ogol.com.br';
export const ATUALIZADO_EM = '2026-10-09';

// [data, competição, jogou em casa?, gols Corinthians, gols adversário]
const j = (data, comp, casa, gc, ga) => ({ data, comp, casa, gc, ga });

export const H2H = {
  'Palmeiras': [
    j('2026-04-12', 'Brasileirão 2026 R11', true, 0, 0),
    j('2026-02-08', 'Paulista 2026', true, 0, 1),
    j('2025-08-31', 'Brasileirão 2025 R22', true, 1, 1),
    j('2025-08-06', 'Copa do Brasil 2025 (oitavas)', false, 2, 0),
    j('2025-07-30', 'Copa do Brasil 2025 (oitavas)', true, 1, 0),
    j('2025-04-12', 'Brasileirão 2025 R3', false, 0, 2),
    j('2025-03-27', 'Paulista 2025', true, 0, 0),
    j('2025-03-16', 'Paulista 2025', false, 1, 0),
  ],
  'Vitória': [
    j('2026-04-18', 'Brasileirão 2026 R12', false, 0, 0),
    j('2025-10-25', 'Brasileirão 2025 R30', false, 1, 0),
    j('2025-06-01', 'Brasileirão 2025 R11', true, 0, 0),
    j('2024-11-09', 'Brasileirão 2024 R33', false, 2, 1),
    j('2024-07-04', 'Brasileirão 2024 R14', true, 3, 2),
    j('2018-10-21', 'Brasileirão 2018 R30', false, 2, 2),
    j('2018-06-09', 'Brasileirão 2018 R11', true, 0, 0),
    j('2018-05-10', 'Copa do Brasil 2018 (oitavas)', true, 3, 1),
  ],
  'Vasco': [
    j('2026-04-26', 'Brasileirão 2026 R13', true, 1, 0),
    j('2025-12-21', 'Copa do Brasil 2025', false, 2, 1),
    j('2025-12-17', 'Copa do Brasil 2025', true, 0, 0),
    j('2025-08-24', 'Brasileirão 2025 R21', false, 3, 2),
    j('2025-04-05', 'Brasileirão 2025 R2', true, 3, 0),
    j('2024-11-24', 'Brasileirão 2024 R35', true, 3, 1),
    j('2024-07-10', 'Brasileirão 2024 R16', false, 0, 2),
    j('2023-11-28', 'Brasileirão 2023 R36', false, 4, 2),
  ],
  'Mirassol': [
    j('2026-05-03', 'Brasileirão 2026 R14', false, 1, 2),
    j('2025-10-04', 'Brasileirão 2025 R27', true, 3, 0),
    j('2025-05-10', 'Brasileirão 2025 R8', false, 1, 2),
    j('2025-03-02', 'Paulista 2025 (quartas)', true, 2, 0),
    j('2023-02-19', 'Paulista 2023', true, 3, 0),
    j('2022-02-10', 'Paulista 2022', true, 2, 1),
    j('2021-03-23', 'Paulista 2021', false, 1, 0),
    j('2020-08-02', 'Paulista 2020 (semi)', true, 1, 0),
  ],
  'São Paulo': [
    j('2026-05-10', 'Brasileirão 2026 R15', true, 3, 2),
    j('2026-01-18', 'Paulista 2026', true, 1, 1),
    j('2025-11-20', 'Brasileirão 2025 R34', true, 3, 1),
    j('2025-07-19', 'Brasileirão 2025 R15', false, 0, 2),
    j('2025-01-26', 'Paulista 2025', false, 1, 3),
    j('2024-09-29', 'Brasileirão 2024 R28', false, 1, 3),
    j('2024-06-16', 'Brasileirão 2024 R9', true, 2, 2),
    j('2024-01-30', 'Paulista 2024', true, 1, 2),
  ],
  'Botafogo': [
    j('2026-05-17', 'Brasileirão 2026 R16', false, 1, 3),
    j('2025-11-30', 'Brasileirão 2025 R36', true, 2, 2),
    j('2025-07-26', 'Brasileirão 2025 R17', false, 1, 1),
    j('2024-09-14', 'Brasileirão 2024 R26', false, 1, 2),
    j('2024-06-01', 'Brasileirão 2024 R7', true, 0, 1),
    j('2023-09-22', 'Brasileirão 2023 R24', true, 1, 0),
    j('2023-05-11', 'Brasileirão 2023 R5', false, 0, 3),
    j('2022-07-30', 'Brasileirão 2022 R20', true, 1, 0),
  ],
  'Atlético-MG': [
    j('2026-05-24', 'Brasileirão 2026 R17', true, 1, 0),
    j('2025-10-18', 'Brasileirão 2025 R29', true, 1, 0),
    j('2025-05-24', 'Brasileirão 2025 R10', false, 0, 0),
    j('2024-07-28', 'Brasileirão 2024 R20', false, 1, 2),
    j('2024-04-14', 'Brasileirão 2024 R1', true, 0, 0),
    j('2023-11-09', 'Brasileirão 2023 R33', true, 1, 1),
    j('2023-07-08', 'Brasileirão 2023 R14', false, 1, 0),
    j('2023-05-31', 'Copa do Brasil 2023 (oitavas)', true, 2, 0),
  ],
  'Grêmio': [
    j('2026-05-30', 'Brasileirão 2026 R18', false, 3, 1),
    j('2025-11-02', 'Brasileirão 2025 R31', true, 2, 0),
    j('2025-06-12', 'Brasileirão 2025 R12', false, 1, 1),
    j('2024-12-08', 'Brasileirão 2024 R38', false, 3, 0),
    j('2024-08-07', 'Copa do Brasil 2024 (oitavas, pênaltis)', false, 0, 0),
    j('2024-07-31', 'Copa do Brasil 2024 (oitavas)', true, 0, 0),
    j('2024-07-25', 'Brasileirão 2024 R19', true, 2, 2),
    j('2023-11-12', 'Brasileirão 2023 R34', false, 1, 0),
  ],
  'Remo': [
    j('2026-07-23', 'Brasileirão 2026 R19', true, 3, 0),
    j('2023-04-26', 'Copa do Brasil 2023 (pênaltis)', true, 2, 0),
    j('2023-04-12', 'Copa do Brasil 2023', false, 0, 2),
    j('1996-04-09', 'Copa do Brasil 1996 (oitavas)', false, 1, 1),
    j('1996-04-05', 'Copa do Brasil 1996 (oitavas)', true, 0, 0),
  ],
};
