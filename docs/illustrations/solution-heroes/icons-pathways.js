// Candidate icon set: the eight CAT pathway drawings in a row, handwritten names beside (below) them.
SCENE = { ids: [],
  build() {
    const names = ['landscape', 'nutrition', 'markets', 'policy', 'resources', 'technology', 'voice', 'research'];
    const k = Math.min(W / 1920, H / 560);
    let t = 0.1;
    for (let i = 0; i < 8; i++) {
      const x = (i + 0.5) * W / 8, y = H * 0.5;
      t = iconAt(i, x, y, t, 0.92 * k);
      t = W_(names[i], x, H * 0.86, 40 * k, t, { center: true, f: 'CM' });
    }
    return t + 0.5;
  } };
