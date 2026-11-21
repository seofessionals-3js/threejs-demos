// Builds the full-detail geometry of one map tile off the main thread: every building with its height
// (roof from the stored triangles, walls from the outlines, light baked into vertex colours) and the small streets.
import { loadPack } from './data.js';

const chunks = new Map();                       // 'cx_cz' -> Promise<pack>
const chunk = (base, cx, cz) => {
  const k = cx + '_' + cz;
  if (!chunks.has(k)) chunks.set(k, loadPack(`${base}c_${cx}_${cz}.bin.gz`).catch((e) => { chunks.delete(k); throw e; }));
  return chunks.get(k);
};

// light from the south-west, a little from above: south and west walls are lighter
const LX = -0.55, LZ = 0.83;
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

function buildTile(pack, key, low) {
  const out = {};
  const rn = pack.get(key + '_rn');
  if (rn) {
    const rl = pack.get(key + '_rl'), co = pack.get(key + '_co'), hh = pack.get(key + '_h'), tn = pack.get(key + '_tn'), ti = pack.get(key + '_ti');
    const nB = rn.length;
    let nV = 0, nT = 0;
    for (let i = 0; i < rl.length; i++) nV += rl[i];
    for (let i = 0; i < nB; i++) nT += tn[i];
    const pos = new Float32Array((nV * 5) * 3), col = new Uint8Array((nV * 5) * 3), idx = new Uint32Array(nT * 3 + nV * 6);
    let v = 0, ix = 0, ring = 0, c = 0, t = 0;
    for (let b = 0; b < nB; b++) {
      const h = hh[b] / 10, rings = rn[b];
      let nv = 0;
      for (let r = 0; r < rings; r++) nv += rl[ring + r];
      const x0 = co[c] / 10, z0 = co[c + 1] / 10;
      // phones leave out sheds and garages
      let skip = false;
      if (low && h < 3.3) {
        let a = 1e9, bb = -1e9, cc = 1e9, d = -1e9;
        for (let k = 0; k < nv; k++) { const x = co[c + k * 2], z = co[c + k * 2 + 1]; if (x < a) a = x; if (x > bb) bb = x; if (z < cc) cc = z; if (z > d) d = z; }
        skip = (bb - a) * (d - cc) < 4800;      // under 48 square metres of bounding box (units are 0.1 m)
      }
      if (skip) { c += nv * 2; ring += rings; t += tn[b] * 3; continue; }
      // roof: a grey that varies a little from house to house, taller houses a touch lighter
      const g = 172 + (hash(Math.round(x0 * 7), Math.round(z0 * 7)) - 0.5) * 22 + Math.min(14, h * 0.35);
      const roof0 = v;
      for (let k = 0; k < nv; k++) {
        pos[v * 3] = co[c + k * 2] / 10; pos[v * 3 + 1] = h; pos[v * 3 + 2] = co[c + k * 2 + 1] / 10;
        col[v * 3] = g; col[v * 3 + 1] = g; col[v * 3 + 2] = g + 1; v++;
      }
      for (let k = 0; k < tn[b]; k++) {
        const a = ti[t + k * 3], bq = ti[t + k * 3 + 1], d = ti[t + k * 3 + 2];
        const ax = co[c + a * 2], az = co[c + a * 2 + 1];
        const cr = (co[c + bq * 2] - ax) * (co[c + d * 2 + 1] - az) - (co[c + bq * 2 + 1] - az) * (co[c + d * 2] - ax);
        idx[ix++] = roof0 + a;
        if (cr > 0) { idx[ix++] = roof0 + d; idx[ix++] = roof0 + bq; } else { idx[ix++] = roof0 + bq; idx[ix++] = roof0 + d; }
      }
      t += tn[b] * 3;
      // walls
      let rc = c;
      for (let r = 0; r < rings; r++) {
        const n = rl[ring + r];
        let area = 0;
        for (let k = 0; k < n; k++) { const j = (k + 1) % n; area += co[rc + k * 2] * co[rc + j * 2 + 1] - co[rc + j * 2] * co[rc + k * 2 + 1]; }
        const s = (area > 0 ? 1 : -1) * (r === 0 ? 1 : -1);
        for (let k = 0; k < n; k++) {
          const j = (k + 1) % n;
          let ax = co[rc + k * 2] / 10, az = co[rc + k * 2 + 1] / 10, bx = co[rc + j * 2] / 10, bz = co[rc + j * 2 + 1] / 10;
          const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz) || 1;
          const nx = s * dz / len, nz = -s * dx / len;
          if (s > 0) { const tx = ax, tz = az; ax = bx; az = bz; bx = tx; bz = tz; }
          const sh = 0.60 + 0.26 * Math.max(0, nx * LX + nz * LZ) + 0.06 * (nz > 0 ? nz : 0);
          const top = g * sh, bot = top * 0.74;
          const q = v;
          pos[v * 3] = ax; pos[v * 3 + 1] = 0; pos[v * 3 + 2] = az; col[v * 3] = bot; col[v * 3 + 1] = bot; col[v * 3 + 2] = bot + 2; v++;
          pos[v * 3] = bx; pos[v * 3 + 1] = 0; pos[v * 3 + 2] = bz; col[v * 3] = bot; col[v * 3 + 1] = bot; col[v * 3 + 2] = bot + 2; v++;
          pos[v * 3] = bx; pos[v * 3 + 1] = h; pos[v * 3 + 2] = bz; col[v * 3] = top; col[v * 3 + 1] = top; col[v * 3 + 2] = top + 2; v++;
          pos[v * 3] = ax; pos[v * 3 + 1] = h; pos[v * 3 + 2] = az; col[v * 3] = top; col[v * 3 + 1] = top; col[v * 3 + 2] = top + 2; v++;
          idx[ix++] = q; idx[ix++] = q + 1; idx[ix++] = q + 2; idx[ix++] = q; idx[ix++] = q + 2; idx[ix++] = q + 3;
        }
        rc += n * 2;
      }
      c += nv * 2; ring += rings;
    }
    out.pos = pos.slice(0, v * 3); out.col = col.slice(0, v * 3); out.idx = idx.slice(0, ix);
  }
  const sp = pack.get(key + '_sp');
  if (sp) {
    const si = pack.get(key + '_si'), p = new Float32Array(sp.length / 2 * 3);
    for (let k = 0, n = sp.length / 2; k < n; k++) { p[k * 3] = sp[k * 2] / 10; p[k * 3 + 1] = 0; p[k * 3 + 2] = sp[k * 2 + 1] / 10; }
    out.spos = p; out.sidx = new Uint32Array(si);
  }
  return out;
}

self.onmessage = async (e) => {
  const { id, base, cx, cz, tx, tz, low } = e.data;
  try {
    const pack = await chunk(base, cx, cz);
    const o = buildTile(pack, tx + '_' + tz, low);
    const tr = [];
    for (const k of ['pos', 'col', 'idx', 'spos', 'sidx']) if (o[k]) tr.push(o[k].buffer);
    self.postMessage({ id, tx, tz, ...o }, tr);
  } catch (err) { self.postMessage({ id, tx, tz, error: String(err) }); }
};
