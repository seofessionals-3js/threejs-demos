// The invented projects as small procedural models, built from the same data as their own pages. One merged geometry each, light baked into vertex colours,
// so a model costs one draw call and no lighting. Units are metres, y is up, the plot centre is the origin.
import * as THREE from 'three';

const V = {                                    // the one colour family of the projects
  body: [134, 82, 168], body2: [158, 110, 188], deep: [98, 58, 128], glass: [58, 36, 82], roof: [216, 202, 228],
  light: [238, 231, 244], plot: [228, 219, 236], green: [128, 176, 116], green2: [104, 156, 98], path: [206, 198, 214],
};
const L = new THREE.Vector3(-0.42, 0.74, 0.52).normalize();

class Builder {
  constructor() { this.p = []; this.c = []; this.i = []; this.top = 0; }
  quad(a, b, c, d, col, n) {
    const s = n.y > 0.9 ? 1 : 0.58 + 0.42 * Math.max(0, n.dot(L));
    const k = this.p.length / 3;
    for (const v of [a, b, c, d]) { this.p.push(v[0], v[1], v[2]); this.c.push(col[0] * s, col[1] * s, col[2] * s); if (v[1] > this.top) this.top = v[1]; }
    this.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
  }
  // a box standing on y, centred on x/z, turned by ry. top: colour of the lid (defaults to col)
  box(x, y, z, w, h, d, col, { ry = 0, top = null, lid = true } = {}) {
    const cs = Math.cos(ry), sn = Math.sin(ry), hw = w / 2, hd = d / 2;
    const P = (lx, ly, lz) => [x + lx * cs + lz * sn, y + ly, z - lx * sn + lz * cs];
    const N = (nx, nz) => new THREE.Vector3(nx * cs + nz * sn, 0, -nx * sn + nz * cs);
    this.quad(P(-hw, 0, hd), P(hw, 0, hd), P(hw, h, hd), P(-hw, h, hd), col, N(0, 1));
    this.quad(P(hw, 0, -hd), P(-hw, 0, -hd), P(-hw, h, -hd), P(hw, h, -hd), col, N(0, -1));
    this.quad(P(hw, 0, hd), P(hw, 0, -hd), P(hw, h, -hd), P(hw, h, hd), col, N(1, 0));
    this.quad(P(-hw, 0, -hd), P(-hw, 0, hd), P(-hw, h, hd), P(-hw, h, -hd), col, N(-1, 0));
    if (lid) this.quad(P(-hw, h, hd), P(hw, h, hd), P(hw, h, -hd), P(-hw, h, -hd), top || col, new THREE.Vector3(0, 1, 0));
  }
  // a gable roof over a w x d rectangle, ridge along x. end: colour of the two gable triangles (defaults to col)
  gable(x, y, z, w, h, d, col, ry = 0, end = null) {
    const cs = Math.cos(ry), sn = Math.sin(ry), hw = w / 2, hd = d / 2;
    const P = (lx, ly, lz) => [x + lx * cs + lz * sn, y + ly, z - lx * sn + lz * cs];
    const N = (nx, ny, nz) => new THREE.Vector3(nx * cs + nz * sn, ny, -nx * sn + nz * cs).normalize();
    this.quad(P(-hw, 0, hd), P(hw, 0, hd), P(hw, h, 0), P(-hw, h, 0), col, N(0, hd, h));
    this.quad(P(hw, 0, -hd), P(-hw, 0, -hd), P(-hw, h, 0), P(hw, h, 0), col, N(0, hd, -h));
    this.quad(P(hw, 0, hd), P(hw, 0, -hd), P(hw, h, 0), P(hw, h, 0), end || col, N(1, 0, 0));
    this.quad(P(-hw, 0, -hd), P(-hw, 0, hd), P(-hw, h, 0), P(-hw, h, 0), end || col, N(-1, 0, 0));
  }
  // one roof slope over a w x d rectangle: h0 high at z + d/2 * f, h1 high at the other edge. wall: colour of the upstands
  wedge(x, y, z, w, d, h0, h1, f, col, wall) {
    const hw = w / 2, zf = z + f * d / 2, zb = z - f * d / 2;
    const A = [x - hw, y + h0, zf], B = [x + hw, y + h0, zf], C = [x + hw, y + h1, zb], D = [x - hw, y + h1, zb];
    const a = [x - hw, y, zf], b = [x + hw, y, zf], c = [x + hw, y, zb], d2 = [x - hw, y, zb];
    this.quad(...(f > 0 ? [A, B, C, D] : [B, A, D, C]), col, new THREE.Vector3(0, 1, 0));
    this.quad(...(f > 0 ? [a, b, B, A] : [b, a, A, B]), wall, new THREE.Vector3(0, 0, f));
    this.quad(...(f > 0 ? [c, d2, D, C] : [d2, c, C, D]), wall, new THREE.Vector3(0, 0, -f));
    this.quad(...(f > 0 ? [b, c, C, B] : [c, b, B, C]), wall, new THREE.Vector3(1, 0, 0));
    this.quad(...(f > 0 ? [d2, a, A, D] : [a, d2, D, A]), wall, new THREE.Vector3(-1, 0, 0));
  }
  // a cylinder (or cone when r1 = 0) standing on y
  cyl(x, y, z, r0, r1, h, col, seg = 12, top = null) {
    for (let k = 0; k < seg; k++) {
      const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2, am = (a0 + a1) / 2;
      const A = (a, r, yy) => [x + Math.cos(a) * r, y + yy, z + Math.sin(a) * r];
      this.quad(A(a1, r0, 0), A(a0, r0, 0), A(a0, r1, h), A(a1, r1, h), col, new THREE.Vector3(Math.cos(am), (r0 - r1) / h * 0.6, Math.sin(am)).normalize());
      if (r1 > 0) this.quad(A(a0, r1, h), [x, y + h, z], [x, y + h, z], A(a1, r1, h), top || col, new THREE.Vector3(0, 1, 0));
    }
  }
  tree(x, z, s = 1, col = V.green2) { this.cyl(x, 0.3, z, 2.4 * s, 0, 6.2 * s, col, 6); }
  // a storey stack: a floor band and a recessed glass band per floor
  stack(x, y, z, w, d, floors, fh, col, { ry = 0, roof = V.roof, glass = V.glass, alt = null } = {}) {
    for (let f = 0; f < floors; f++) {
      const yy = y + f * fh, c = alt && f % 2 ? alt : col;
      this.box(x, yy, z, w, fh * 0.38, d, c, { ry, lid: false });
      this.box(x, yy + fh * 0.38, z, w - 0.9, fh * 0.62, d - 0.9, glass, { ry, lid: false });
    }
    this.box(x, y + floors * fh, z, w, 0.9, d, col, { ry, top: roof });
    return y + floors * fh + 0.9;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.p), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(this.c.map((v) => Math.max(0, Math.min(255, v)))), 3, true));
    g.setIndex(this.i);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

// ---- the projects as they are on their own pages (threejs-demo-7/haeuser): the same rows of houses, roughly.
// A house is 6 m wide and 12 m deep, two storeys, with the wall, the roof and the features of its project.
const rgb = (v, d) => { const n = typeof v === 'string' ? parseInt(v, 16) : (v ?? d); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const ZINC = [122, 133, 141], STONE = [205, 197, 181], LOT = { Frei: [150, 205, 160], Verkauft: [226, 160, 152] }, EDGE = { Frei: [58, 150, 92], Verkauft: [186, 68, 58] };

// one house. cx: its centre along the row, zf: its front, f: +1 when it faces +z
function house(b, cx, zf, f, st, v, i) {
  const o = { ...(st.base || {}), ...v };
  const wall = rgb(o.brick, 0xefebe2), roofC = rgb(o.roofColor, 0x7a858d), par = o.par || 6.7, roof = o.roof || 'pitch';
  const zc = zf - f * 5, side = i % 2 ? 1 : -1;               // the door, and what hangs over it, sits on alternating sides
  b.box(cx, 0, zc, 6, par, 10, wall, { lid: roof === 'none', top: STONE });
  b.box(cx, 0, zf - f * 11, 6, 3.3, 2, wall, { top: STONE });   // the kitchen runs out under a low roof to the garden
  b.box(cx + side * -1.0, 0.3, zf + f * 0.02, 2.2, 2.7, 0.3, [52, 48, 46], { lid: false });   // the porch
  if (roof === 'none') {
    b.box(cx, par, zc, 5.6, 0.25, 9.6, [226, 222, 212]);
    if (o.terrace) b.box(cx + 1.5 * -side, par, zf - f * 6, 2.5, 2.3, 3.1, wall, { top: STONE });
  } else if (roof === 'mono') {
    b.wedge(cx, par, zc, 6, 10.4, 1.8, 0.25, f, roofC, wall);
  } else {
    b.gable(cx, par, zc, 6, 2.5, 10.4, roofC);
    if (o.chimney !== false) b.box(cx + 1.9 * side, par + 1.4, zc, 0.8, 2.1, 0.8, wall);
    if (roof === 'front') b.gable(cx, par, zf - f * 1.75, 3.5, 2.3, 5.0, roofC, Math.PI / 2, wall);
    if (o.dormer) b.box(cx, par + 0.45, zf - f * 1.9, 3.0, 1.3, 2.4, ZINC, { top: roofC });
  }
  const first = o.first || 'bay';
  if (first === 'bay') b.box(cx + side * -1.0, 3.7, zf + f * 0.4, 2.8, 2.35, 0.8, ZINC);
  else if (first === 'frame') b.box(cx, 3.8, zf + f * 0.12, 4.5, 2.4, 0.3, STONE);
  else if (first === 'balcony') b.box(cx + side * -1.0, 3.7, zf + f * 0.55, 3.1, 0.16, 1.1, STONE);
}

// the site plan of a project: its rows on the plot, a lane between them, every lot in the colour of its state
function site(b, p) {
  const st = p.style || {}, vars = st.variants || [{}], G = st.group || 0, gap = st.gap || 0;
  const xOf = (i) => i * 6 + (G ? Math.floor(i / G) * gap : 0);
  const rows = p.rows, R = rows.length, len = Math.max(...rows.map((r) => xOf(r.houses.length - 1) + 6));
  const cols = R > 2 ? 2 : 1, lane = 13, colGap = 16, depth = 12 + 9;          // house and garden
  rows.forEach((row, r) => {
    const col = cols > 1 ? r % 2 : 0, band = cols > 1 ? Math.floor(r / 2) : r;
    const pair = Math.floor(band / 2), f = band % 2 ? -1 : 1;                    // two rows face each other across a lane
    const bands = Math.ceil(R / cols), blocks = Math.ceil(bands / 2);
    const x0 = (col - (cols - 1) / 2) * (len + colGap) - len / 2;
    const z0 = bands === 1 ? 4 : (pair - (blocks - 1) / 2) * (2 * depth + lane + 10) + (f > 0 ? -lane / 2 : lane / 2);
    const zf = bands === 1 ? z0 : z0;                                             // the front of the row
    b.box(x0 + len / 2, 0.3, zf + f * (bands === 1 ? 3.2 : lane / 2), len + 6, 0.06, bands === 1 ? 5 : lane - 1, V.path);   // the lane
    row.houses.forEach((h, i) => {
      const cx = x0 + xOf(i) + 3, w = G ? 6 + gap / 2 : 6, lx = G ? cx + (i % G === 0 ? -gap / 4 : gap / 4) : cx;
      b.box(lx, 0.3, zf - f * (depth / 2 - 1.5), w - 0.5, 0.08, depth + 3, LOT[h.status] || LOT.Verkauft);
      b.box(lx, 0.3, zf - f * (depth + 0.7), w - 0.5, 0.5, 0.5, EDGE[h.status] || EDGE.Verkauft);     // a low hedge at the end of the garden, in the colour of the state
      house(b, cx, zf, f, st, vars[i % vars.length], i);
      if ((i + r) % 3 === 0) b.tree(lx + 1.2, zf - f * (depth - 3), 0.55);
    });
    if (st.garage && G) for (let k = 1; k * G < row.houses.length; k++) {
      const gx = x0 + xOf(k * G) - gap / 2;
      b.box(gx, 0, zf - f * 3.6, gap - 0.3, 2.7, 6, rgb((st.base || {}).brick, 0xefebe2), { top: STONE });
    }
  });
}

// geometry of one project: the site plan on a pale plate that follows its outline
export function projectGeometry(p) {
  const b = new Builder();
  site(b, p);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let k = 0; k < b.p.length; k += 3) { x0 = Math.min(x0, b.p[k]); x1 = Math.max(x1, b.p[k]); z0 = Math.min(z0, b.p[k + 2]); z1 = Math.max(z1, b.p[k + 2]); }
  const top = b.top;
  b.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0 + 7, 0.22, z1 - z0 + 7, V.plot);
  b.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0 + 8.2, 0.12, z1 - z0 + 8.2, V.body2);      // a thin violet edge: this is a project
  const g = b.geometry();
  g.userData.top = top;
  return g;
}

export const projectMaterial = () => new THREE.MeshBasicMaterial({ vertexColors: true });
