function calc(pts, corte, inc) {
  const r = 100 / (1 + Math.exp(inc * (pts - corte)));
  return Math.max(0.5, Math.min(99.5, r)).toFixed(2) + '%';
}

console.log('| Pontos | Corte 43 (Inc 0.35) | Corte 43 (Inc 0.50) | Corte 45 (Inc 0.35) | Corte 45 (Inc 0.50) |');
console.log('| :---: | :---: | :---: | :---: | :---: |');
for (let p = 35; p <= 55; p++) {
  console.log('| ' + p + ' | ' + calc(p, 43, 0.35) + ' | ' + calc(p, 43, 0.50) + ' | ' + calc(p, 45, 0.35) + ' | ' + calc(p, 45, 0.50) + ' |');
}
