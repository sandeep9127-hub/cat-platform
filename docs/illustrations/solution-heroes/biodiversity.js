// Solution fact-sheet hero: biodiversity. One small scene, no people, no words.

// --- helpers drawn in the same pencil-and-wash hand (forest line, CAT tints) ---
const _T = (r, t) => (typeof r === 'number' && isFinite(r)) ? r : (r && isFinite(r.t) ? r.t : t + 0.3);
function tree(x, y, t, s = 1, col = TINT.sage) {
  t = PEN([[x, y], [x - 2 * s, y - 40 * s], [x + 1 * s, y - 78 * s]], { w: 2.4 }, t, 0.06);
  PEN([[x, y - 46 * s], [x + 18 * s, y - 62 * s]], { w: 1.4 }, t, 0.03);
  const crown = ell(x, y - 112 * s, 52 * s, 44 * s, 0, 0, TAU, 40);
  t = PEN(close(crown), { w: 2.2 }, t, 0.1);
  BLOB(crown, col, { dx: 6 * s, dy: 5 * s, a: 0.95, sp: 6 }, t, 0.05);
  BLOB(ell(x + 16 * s, y - 100 * s, 26 * s, 20 * s, 0, 0, TAU, 24), CAT.tealTint, { dx: 4, dy: 3, a: 0.35, sp: 4 }, t + 0.03, 0.03);
  shadow(x, y + 4, 46 * s, t);
  return t + 0.05;
}
function goat(x, y, t, s = 1, col = '#EFE6D8', flip = false) {
  const f = flip ? -1 : 1, X = (d) => x + d * s * f, Y = (d) => y + d * s;
  const body = ell(x, Y(-42), 46 * s, 20 * s, 0, 0, TAU, 36);
  t = PEN(close(body), { w: 2.3 }, t, 0.08);
  for (const lx of [-30, -16, 18, 32]) t = PEN([[X(lx), Y(-26)], [X(lx + 2), Y(0)]], { w: 2.1 }, t, 0.02);
  t = PEN([[X(38), Y(-54)], [X(52), Y(-76)]], { w: 2.1 }, t, 0.02);
  const head = ell(X(60), Y(-80), 13 * s, 9 * s, f * 0.4, 0, TAU, 20);
  t = PEN(close(head), { w: 2.1 }, t, 0.04);
  t = PEN(bez([X(56), Y(-88)], [X(50), Y(-104)], [X(40), Y(-106)], [X(36), Y(-98)], 8), { w: 1.8 }, t, 0.03);
  t = PEN([[X(-44), Y(-50)], [X(-56), Y(-64)]], { w: 1.8 }, t, 0.02);
  BLOB(body, col, { dx: 4, dy: 4, a: 0.95, sp: 5 }, t, 0.04); BLOB(head, col, { dx: 2, dy: 2, a: 0.95, sp: 3 }, t, 0.02);
  BLOB(ell(x - 6 * s * f, Y(-46), 16 * s, 9 * s, 0, 0, TAU, 18), CAT.clayTint, { dx: 2, dy: 2, a: 0.8, sp: 3 }, t + 0.02, 0.02);
  shadow(x, y + 4, 52 * s, t);
  return t + 0.05;
}
function fish(x, y, t, s = 1, flip = false) {
  const f = flip ? -1 : 1;
  const body = ell(x, y, 34 * s, 13 * s, 0, 0, TAU, 30);
  t = PEN(close(body), { w: 2.0 }, t, 0.05);
  const tail = [[x - 32 * s * f, y], [x - 50 * s * f, y - 13 * s], [x - 50 * s * f, y + 13 * s]];
  t = PEN(close(tail), { w: 2.0 }, t, 0.03);
  PEN([[x + 20 * s * f, y - 3 * s], [x + 21 * s * f, y - 2 * s]], { w: 3.2 }, t, 0.01);
  BLOB(body, CAT.sky, { dx: 3, dy: 3, a: 0.95, sp: 3 }, t, 0.03); BLOB(tail, CAT.periwinkleLight, { dx: 2, dy: 2, a: 0.95, sp: 2 }, t, 0.02);
  return t + 0.03;
}
function waves(x0, x1, y, t) {
  for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 24; i++) { const x = x0 + (x1 - x0) * i / 24; pts.push([x, y + k * 22 + Math.sin(i * 0.9 + k) * 5]); } t = PEN(pts, { w: 1.4, layer: 'light' }, t, 0.06); }
  return t;
}

SCENE = { ids: [],
  build() {
    const k = Math.min(W / 1600, H / 700), X = x => x * W / 1600, Y = y => y * H / 700;
    let t = 0.1;
    t = tree(X(480), Y(550), t, 2.1 * k, CAT.tealPale);
    t = _T(atScale(X(820), Y(530), 4.0 * k, () => outcomeObj('crops', X(820), Y(530), t)), t);
    t = _T(atScale(X(1180), Y(545), 1.9 * k, () => seedBag(X(1180), Y(545), t)), t);
    return t + 0.5;
  } };
