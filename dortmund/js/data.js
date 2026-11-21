// The map is shipped as gzip-packed binary files written by tools/build.py:
//   magic, header length, header JSON { meta, sec: { name: [dtype, byte offset, element count] } }, sections.
const TYPES = { int16: Int16Array, uint16: Uint16Array, uint32: Uint32Array, uint8: Uint8Array, float32: Float32Array };

export function parsePack(buf) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x4D54524F) throw new Error('not a map file');
  const hl = dv.getUint32(4, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
  const base = 8 + hl;
  return {
    meta: head.meta,
    has: (n) => n in head.sec,
    get: (n) => { const s = head.sec[n]; return s ? new TYPES[s[0]](buf, base + s[1], s[2]) : null; },
  };
}

async function gunzip(buf) {
  const u = new Uint8Array(buf, 0, 2);
  if (u[0] !== 0x1f || u[1] !== 0x8b) return buf;                    // the server already unpacked it
  if (typeof DecompressionStream === 'undefined') throw new Error('Dieser Browser kann die Kartendaten nicht entpacken.');
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}

// fetch with progress (0..1 of the packed size), then unpack and parse
export async function loadPack(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + ': ' + res.status);
  const total = +res.headers.get('content-length') || 0;
  let buf;
  if (res.body && total && onProgress) {
    const reader = res.body.getReader(), parts = [];
    let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); got += value.length; onProgress(Math.min(1, got / total)); }
    const all = new Uint8Array(got); let o = 0;
    for (const p of parts) { all.set(p, o); o += p.length; }
    buf = all.buffer;
  } else buf = await res.arrayBuffer();
  return parsePack(await gunzip(buf));
}
