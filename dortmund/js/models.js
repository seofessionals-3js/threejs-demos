// The invented projects as small procedural models. One merged geometry each, light baked into vertex colours,
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
  // a gable roof over a w x d rectangle, ridge along x
  gable(x, y, z, w, h, d, col, ry = 0) {
    const cs = Math.cos(ry), sn = Math.sin(ry), hw = w / 2, hd = d / 2;
    const P = (lx, ly, lz) => [x + lx * cs + lz * sn, y + ly, z - lx * sn + lz * cs];
    const N = (nx, ny, nz) => new THREE.Vector3(nx * cs + nz * sn, ny, -nx * sn + nz * cs).normalize();
    this.quad(P(-hw, 0, hd), P(hw, 0, hd), P(hw, h, 0), P(-hw, h, 0), col, N(0, hd, h));
    this.quad(P(hw, 0, -hd), P(-hw, 0, -hd), P(-hw, h, 0), P(hw, h, 0), col, N(0, hd, -h));
    this.quad(P(hw, 0, hd), P(hw, 0, -hd), P(hw, h, 0), P(hw, h, 0), col, N(1, 0, 0));
    this.quad(P(-hw, 0, -hd), P(-hw, 0, hd), P(-hw, h, 0), P(-hw, h, 0), col, N(-1, 0, 0));
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

const FORMS = {
  tower(b, f) {
    b.stack(0, 0, 0, 36, 30, 2, 3.6, V.deep, { roof: V.green });
    const top = b.stack(0, 7.2, 0, 22, 22, f - 2, 3.15, V.body, { alt: V.body2 });
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.box(sx * 11, 7.2, sz * 11, 1.8, top - 7.2 + 1.2, 1.8, V.body2);
    b.stack(0, top, 0, 15, 15, 2, 3.4, V.light, { glass: V.deep, roof: V.roof });
    b.box(0, top + 7.7, 0, 0.5, 9, 0.5, V.light);
    for (const [x, z] of [[-24, 20], [-24, -20], [24, 20], [26, -14], [0, 24]]) b.tree(x, z);
  },
  slab(b, f) {
    const top = b.stack(0, 0, 0, 64, 13, f, 3.1, V.body, { alt: V.body2 });
    b.box(-32.4, 0, 0, 1.4, top, 13.6, V.deep); b.box(32.4, 0, 0, 1.4, top, 13.6, V.deep);
    for (let k = 0; k < f - 1; k++) for (let m = -4; m <= 4; m++) if ((k + m) % 2 === 0) b.box(m * 6.6, 3.1 * (k + 1), 7.4, 5.2, 0.35, 1.9, V.light);
    b.box(-14, top, 0, 6, 3, 6, V.light); b.box(16, top, 0, 6, 3, 6, V.light);
    b.box(0, 0.3, 22, 60, 0.25, 14, V.green, {});
    for (let m = -3; m <= 3; m++) b.tree(m * 9, 24, 0.9);
  },
  terraces(b, f) {
    for (let k = 0; k < f; k++) {
      const d = 26 - k * 2.9, z = -13 + d / 2;                         // the back stays, the lake side steps
      b.box(0, k * 3.2, z, 54 - k * 1.2, 1.2, d, k % 2 ? V.body2 : V.body, { lid: false });
      b.box(0, k * 3.2 + 1.2, z, 53 - k * 1.2, 2.0, d - 0.9, V.glass, { lid: false });
      b.box(0, k * 3.2 + 3.2, z, 54 - k * 1.2, 0.01, d, V.roof, { top: V.roof });
      if (k < f - 1) { b.box(0, k * 3.2 + 3.2, z + d / 2 - 1.5, 52 - k * 1.2, 0.35, 2.6, V.green); b.box(0, k * 3.2 + 3.2, z + d / 2 - 0.15, 54 - k * 1.2, 1.0, 0.3, V.light); }
    }
    b.box(-20, f * 3.2, -8, 6, 2.6, 6, V.light); b.box(18, f * 3.2, -8, 6, 2.6, 6, V.light);
    for (let m = -3; m <= 3; m++) b.tree(m * 8.5, 22, 0.8);
  },
  courtyard(b, f) {
    const W = 48, D = 42, t = 11.5, fh = 3.15;
    b.stack(0, 0, -D / 2 + t / 2, W, t, f, fh, V.body, { alt: V.body2 });
    b.stack(0, 0, D / 2 - t / 2, W, t, f - 1, fh, V.body2, { alt: V.body });
    b.stack(-W / 2 + t / 2, 0, 0, t, D - 2 * t, f, fh, V.body);
    b.stack(W / 2 - t / 2, 0, 0, t, D - 2 * t, f - 1, fh, V.body2);
    b.box(0, 0.3, 0, W - 2 * t, 0.3, D - 2 * t, V.green);
    b.tree(-5, -3, 0.9); b.tree(6, 3, 0.8); b.tree(0, 6, 0.6);
    b.box(-W / 2 + t / 2, f * fh + 0.9, -D / 2 + t / 2, 6, 2.6, 6, V.light);
  },
  bars(b, f) {
    b.stack(-4, 0, -24, 56, 12.5, f, 3.1, V.body, { alt: V.body2 });
    b.stack(8, 0, 0, 46, 12.5, Math.max(2, f - 2), 3.1, V.body2, { alt: V.body });
    b.stack(-6, 0, 24, 56, 12.5, Math.max(2, f - 1), 3.1, V.body, { alt: V.body2 });
    b.box(-4, 0.3, -12, 50, 0.3, 10, V.green); b.box(0, 0.3, 12, 50, 0.3, 10, V.green);
    for (const [x, z] of [[-20, -12], [-6, -12], [10, -12], [-14, 12], [2, 12], [16, 12]]) b.tree(x, z, 0.85);
  },
  townhouses(b, f) {
    for (const row of [-1, 1]) for (let k = 0; k < 6; k++) {
      const x = (k - 2.5) * 7.4, z = row * 13, c = [V.body, V.body2, V.light][(k + (row > 0 ? 1 : 0)) % 3];
      b.box(x, 0, z, 7.0, f * 2.9, 10.5, c, { lid: false });
      b.box(x, 0.9, z + row * -5.3, 4.6, f * 2.9 - 2.2, 0.3, V.glass, { lid: false });
      b.gable(x, f * 2.9, z, 10.5, 3.4, 7.0, V.deep, Math.PI / 2);
      b.box(x, 0.3, z + row * 10.5, 6.2, 0.3, 9, V.green);
      if (k % 2 === 0) b.tree(x, z + row * 12, 0.6);
    }
    b.box(0, 0.3, 0, 46, 0.2, 5, V.path);
  },
  loft(b, f) {
    const h = f * 3.7;
    b.box(0, 0, 0, 56, h, 21, V.body, { top: V.roof });
    for (let m = -4; m <= 4; m++) { b.box(m * 6.1, 0, 10.6, 1.3, h, 0.5, V.body2, { lid: false }); b.box(m * 6.1, 0, -10.6, 1.3, h, 0.5, V.body2, { lid: false }); }
    for (let k = 0; k < f; k++) for (let m = -4; m < 4; m++) {
      b.box(m * 6.1 + 3.05, k * 3.7 + 0.9, 10.55, 4.5, 2.5, 0.25, V.glass, { lid: false });
      b.box(m * 6.1 + 3.05, k * 3.7 + 0.9, -10.55, 4.5, 2.5, 0.25, V.glass, { lid: false });
    }
    for (let m = -3; m <= 2; m++) b.gable(m * 8 + 4, h, 0, 20, 2.6, 8, V.deep, Math.PI / 2);
    b.cyl(-34, 0, -4, 6.2, 6.2, h + 5, V.light, 14, V.roof); b.cyl(-34, 0, 9, 6.2, 6.2, h + 5, V.light, 14, V.roof);
    b.box(22, h, 0, 9, 3.2, 9, V.light);
  },
};

// geometry of one project. plot: radius of the cleared site
export function projectGeometry(p) {
  const b = new Builder();
  const r = (p.clear || 55) * 0.96;
  b.cyl(0, 0, 0, r, r, 0.3, V.plot, 40, V.plot);
  (FORMS[p.form] || FORMS.slab)(b, p.floors || 6);
  const g = b.geometry();
  g.userData.top = b.top;
  return g;
}

export const projectMaterial = () => new THREE.MeshBasicMaterial({ vertexColors: true });
