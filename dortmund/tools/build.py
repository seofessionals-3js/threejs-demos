#!/usr/bin/env python3
"""Stage 2: turn the raw cut (tools/extract.py) into the binary map the page loads.

  python3 tools/build.py raw.pkl data/

Writes data/base.bin.gz (everything the overview needs) and data/c_<cx>_<cz>.bin.gz (the full-detail buildings
and small streets of one 4 x 4 km chunk, loaded when the camera comes close).

Needs: pip install shapely numpy mapbox-earcut. Data © OpenStreetMap contributors, ODbL.
"""
import sys, os, json, gzip, math, pickle, struct, time, hashlib
import numpy as np
import mapbox_earcut as earcut
from shapely.geometry import Polygon, MultiPolygon, LineString, MultiLineString, box, Point
from shapely.ops import unary_union
from shapely import make_valid, set_precision
from shapely.strtree import STRtree

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
D = pickle.load(open(RAW, 'rb'))
M = D['meta']
W, S, E, N = M['bbox']
HX = (E - M['lon0']) * M['kx']            # half extents in metres
HZ = (N - M['lat0']) * M['kz']
BOX = box(-HX, -HZ, HX, HZ)
TILE, CH = 1024.0, 4                      # tile edge in metres, tiles per chunk edge
COLS, ROWS = math.ceil(2 * HX / TILE), math.ceil(2 * HZ / TILE)
CCOLS, CROWS = math.ceil(COLS / CH), math.ceil(ROWS / CH)
log = lambda *a: print(f'[{time.time() - T0:6.1f}s]', *a, flush=True)
log('map', round(2 * HX), 'x', round(2 * HZ), 'm, tiles', COLS, 'x', ROWS, 'chunks', CCOLS, 'x', CROWS)

# the invented projects: OSM buildings on their plots are cleared so the models of the page can stand there
PROJECTS = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'js', 'projects.json')))
def ll(lon, lat): return ((lon - M['lon0']) * M['kx'], -(lat - M['lat0']) * M['kz'])
CLEAR = [(Point(*ll(p['lon'], p['lat'])).buffer(p.get('clear', 55)), p['id']) for p in PROJECTS]
CLEAR_U = unary_union([c[0] for c in CLEAR])


# ---------------------------------------------------------------------------------------------- helpers
def poly(rings):
    try:
        p = Polygon(rings[0], rings[1:])
    except Exception:
        return None
    if not p.is_valid:
        p = make_valid(p)
    return p if not p.is_empty else None


def polys_of(g):
    if g is None or g.is_empty: return []
    if g.geom_type == 'Polygon': return [g]
    if g.geom_type in ('MultiPolygon', 'GeometryCollection'): return [p for q in g.geoms for p in polys_of(q)]
    return []


def lines_of(g):
    if g is None or g.is_empty: return []
    if g.geom_type == 'LineString': return [g]
    if g.geom_type in ('MultiLineString', 'GeometryCollection'): return [p for q in g.geoms for p in lines_of(q)]
    return []


def tri(polys, scale, ox=0.0, oz=0.0):
    """Triangulate polygons with holes. Returns int vertices (x, z) in 1/scale metres and uint32 indices."""
    V, I, base = [], [], 0
    for p in polys:
        if p.area < 1e-3: continue
        rings = [np.asarray(p.exterior.coords)[:-1]] + [np.asarray(r.coords)[:-1] for r in p.interiors]
        rings = [r for r in rings if len(r) >= 3]
        if not rings: continue
        v = np.concatenate(rings).astype(np.float64)
        ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
        idx = earcut.triangulate_float64(v, ends)
        if len(idx) == 0: continue
        V.append(v); I.append(idx.astype(np.uint32) + base); base += len(v)
    if not V: return np.zeros((0, 2), np.int16), np.zeros(0, np.uint32)
    v = np.concatenate(V)
    v = np.round((v - [ox, oz]) * scale)
    assert np.abs(v).max() < 32767, np.abs(v).max()
    return v.astype(np.int16), np.concatenate(I)


class Pack:
    """header JSON + typed sections, gzip. Read back by js/data.js."""
    def __init__(self): self.meta, self.secs = {}, []
    def add(self, name, arr):
        arr = np.ascontiguousarray(arr)
        self.secs.append((name, arr))
    def write(self, path):
        head, blobs, off = {}, [], 0
        for name, a in self.secs:
            b = a.tobytes()
            pad = (-len(b)) % 4
            head[name] = [a.dtype.name, off, a.size]
            blobs.append(b + b'\0' * pad); off += len(b) + pad
        h = json.dumps({'meta': self.meta, 'sec': head}, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
        h += b' ' * ((-len(h)) % 4)
        raw = struct.pack('<II', 0x4D54524F, len(h)) + h + b''.join(blobs)
        with gzip.GzipFile(path, 'wb', compresslevel=9, mtime=0) as f: f.write(raw)
        return len(raw), os.path.getsize(path)


def h01(x, z, salt=0):
    """Deterministic 0..1 from a position: the same building always gets the same variation."""
    return int(hashlib.md5(f'{round(x)}_{round(z)}_{salt}'.encode()).hexdigest()[:8], 16) / 0xffffffff


# ---------------------------------------------------------------------------------------------- water, green
def clean(polys, simp, min_area):
    u = unary_union([p for p in polys if p is not None])
    u = u.intersection(BOX).simplify(simp)
    if not u.is_valid: u = make_valid(u)
    return [p for p in polys_of(u) if p.area >= min_area]

SW = {'river': 9.0, 'canal': 16.0, 'stream': 2.2}
wpolys = [poly(r) for r, _ in D['water']]
wpolys += [LineString(l).buffer(SW[k], cap_style=2, join_style=1, resolution=2) for k, _, l in D['streams'] if len(l) >= 2]
water = clean(wpolys, 1.5, 150)
WATER_U = unary_union(water)
log('water polys', len(water))

wood = clean([poly(r) for r in D['wood']], 4.0, 1500)
green = clean([poly(r) for r, _, _ in D['green']], 2.5, 600)
log('wood', len(wood), 'green', len(green))

# ---------------------------------------------------------------------------------------------- roads
RW = [24, 17, 15, 12.5, 10.5, 7.0, 5.0, 4.0]      # drawn widths in metres per class (a little wider than built)
roads = [(c, LineString(l)) for c, l in D['roads'] if len(l) >= 2]
def road_poly(lines, w, simp=0.8):
    u = unary_union([l.buffer(w / 2, cap_style=1, join_style=1, resolution=2) for l in lines]).intersection(BOX).simplify(simp)
    return polys_of(u if u.is_valid else make_valid(u))
major = {}
for c in range(5):
    ls = [l for cc, l in roads if cc == c]
    major[c] = road_poly(ls, RW[c]) if ls else []
    log('road class', c, len(ls), 'ways ->', len(major[c]), 'polys')
minor_lines = []
for c, l in roads:
    if c in (5, 6):
        for g in lines_of(l.intersection(BOX).simplify(2.5)): minor_lines.append(g)
rail_lines = [g for l in D['rails'] if len(l) >= 2 for g in lines_of(LineString(l).intersection(BOX).simplify(3.0))]
log('minor lines', len(minor_lines), 'rail', len(rail_lines))


def seg_array(lines, scale=2.0):
    """Polylines -> pairs of points for GL lines, int16 in 1/scale metres."""
    out = []
    for l in lines:
        c = np.asarray(l.coords)
        if len(c) < 2: continue
        out.append(np.stack([c[:-1], c[1:]], 1).reshape(-1, 2))
    if not out: return np.zeros((0, 2), np.int16)
    return np.round(np.concatenate(out) * scale).astype(np.int16)


# ---------------------------------------------------------------------------------------------- buildings
DEF = {'house': 7.5, 'detached': 7.5, 'semidetached_house': 7.5, 'terrace': 8, 'residential': 9, 'bungalow': 4.5,
       'apartments': 15, 'dormitory': 14, 'hotel': 18, 'garage': 2.8, 'garages': 2.8, 'shed': 2.6, 'carport': 2.6,
       'hut': 2.6, 'roof': 3.5, 'greenhouse': 3, 'allotment_house': 3, 'industrial': 9, 'warehouse': 9,
       'retail': 7, 'commercial': 11, 'supermarket': 6.5, 'office': 17, 'church': 17, 'cathedral': 22, 'chapel': 9,
       'school': 11, 'university': 14, 'hospital': 16, 'public': 12, 'civic': 12, 'kindergarten': 6, 'train_station': 12,
       'stadium': 22, 'grandstand': 18, 'sports_hall': 10, 'parking': 12, 'service': 3, 'kiosk': 3, 'farm_auxiliary': 5,
       'barn': 6, 'farm': 7}
def num(s):
    try: return float(str(s).replace(',', '.').replace('m', '').strip())
    except Exception: return None

B = []            # (polygon, height)
skipped = 0
for rings, kind, hgt, lev, roof, name in D['buildings']:
    p = poly(rings)
    if p is None: continue
    for q in polys_of(p):
        if q.area < 9: continue
        c = q.representative_point()
        if not BOX.contains(c): continue
        if CLEAR_U.intersects(q): skipped += 1; continue
        h = num(hgt)
        if h is None:
            l = num(lev)
            if l is not None and 0 < l < 60: h = l * 3.1 + 1.6
        if h is None:
            a, r = q.area, math.hypot(c.x + 330, c.y + 1020)   # r: distance to the old town
            h = DEF.get(kind)
            if h is None:
                h = 2.8 if a < 38 else 6.5 if a < 110 else 9.5 if a < 500 else 11.5
                if r < 1700 and a >= 110: h += 7
                elif r < 3200 and a >= 110: h += 3
            elif kind in ('apartments', 'residential', 'commercial', 'retail') and r < 1700: h += 5
            h *= 0.82 + 0.36 * h01(c.x, c.y)
        B.append((q, float(min(max(h, 2.2), 215.0))))
log('buildings', len(B), 'cleared for projects', skipped)

# ---- far level: the buildings of a chunk merged into blocks, flat
tree = STRtree([b[0] for b in B])
def chunk_box(cx, cz): return box(-HX + cx * CH * TILE, -HZ + cz * CH * TILE, -HX + (cx + 1) * CH * TILE, -HZ + (cz + 1) * CH * TILE)
cent = np.array([[b[0].representative_point().x, b[0].representative_point().y] for b in B])
tix = np.floor((cent[:, 0] + HX) / TILE).astype(int).clip(0, COLS - 1)
tiz = np.floor((cent[:, 1] + HZ) / TILE).astype(int).clip(0, ROWS - 1)

base = Pack()
far_ranges, FV, FI, fbase = [], [], [], 0
for cz in range(CROWS):
    for cx in range(CCOLS):
        sel = np.nonzero((tix // CH == cx) & (tiz // CH == cz))[0]
        ps = [B[i][0].buffer(2.0, join_style=2) for i in sel if B[i][0].area >= 34]
        if not ps: far_ranges.append([cx, cz, 0, 0]); continue
        u = unary_union(ps).buffer(-1.5, join_style=2).simplify(2.4)      # neighbours closer than 4 m become one block
        ps = [p for p in polys_of(u if u.is_valid else make_valid(u)) if p.area >= 60]
        # courtyards smaller than a room are closed: fewer vertices, same picture from above
        ps = [Polygon(p.exterior, [r for r in p.interiors if Polygon(r).area > 220]) for p in ps]
        v, i = tri(ps, 2.0)
        far_ranges.append([cx, cz, sum(len(x) for x in FI), len(i)])
        FV.append(v); FI.append(i + fbase); fbase += len(v)
    log('far row', cz, 'verts', fbase)
base.add('far_pos', np.concatenate(FV)); base.add('far_idx', np.concatenate(FI))

flat_ranges = {}
for name, ps in (('water', water), ('wood', wood), ('green', green)):
    v, i = tri(ps, 2.0)
    # sort the triangles by the chunk their centre lies in, so the page can leave out what the camera does not see
    t = i.reshape(-1, 3); c = v[t].astype(np.float64).mean(1) / 2.0
    cid = (np.floor((c[:, 1] + HZ) / (CH * TILE)).clip(0, CROWS - 1) * CCOLS + np.floor((c[:, 0] + HX) / (CH * TILE)).clip(0, CCOLS - 1)).astype(int)
    order = np.argsort(cid, kind='stable'); t = t[order]; cid = cid[order]
    starts = np.searchsorted(cid, np.arange(CCOLS * CROWS + 1))
    flat_ranges[name] = [[int(starts[k]) * 3, int(starts[k + 1] - starts[k]) * 3] for k in range(CCOLS * CROWS) if starts[k + 1] > starts[k]]
    base.add(name + '_pos', v); base.add(name + '_idx', t.reshape(-1).astype(np.uint32)); log(name, len(v), 'verts', len(i) // 3, 'tris')
rv, ri, rr, rb = [], [], [], 0
for c in range(5):
    v, i = tri(major[c], 2.0); rr.append([sum(len(x) for x in ri), len(i)]); rv.append(v); ri.append(i + rb); rb += len(v)
base.add('road_pos', np.concatenate(rv)); base.add('road_idx', np.concatenate(ri))
log('major roads', rb, 'verts', sum(len(x) for x in ri) // 3, 'tris')
base.add('minor_seg', seg_array(minor_lines)); base.add('rail_seg', seg_array(rail_lines))
bl = [LineString(r[0]).simplify(12) for r in D['boundary']]
base.add('bound_seg', seg_array([g for l in bl for g in lines_of(l.intersection(BOX))]))

# ---- places: the names that lie on the map
want = {}
for name, kind, pop, x, z in D['places']:
    if kind in ('city', 'town', 'suburb', 'quarter', 'village', 'neighbourhood') and abs(x) < HX and abs(z) < HZ:
        want.setdefault(name, (kind, pop, round(x), round(z)))
base.meta = dict(hx=HX, hz=HZ, tile=TILE, ch=CH, cols=COLS, rows=ROWS, ccols=CCOLS, crows=CROWS, far=far_ranges, road=rr, flat=flat_ranges,
                 lon0=M['lon0'], lat0=M['lat0'], kx=M['kx'], kz=M['kz'], places=[[n, *v] for n, v in sorted(want.items())],
                 projects={p['id']: [round(v, 1) for v in ll(p['lon'], p['lat'])] for p in PROJECTS})
raw, gz = base.write(os.path.join(OUT, 'base.bin.gz')); log('base.bin.gz', raw, '->', gz)

# ---- near level: every building with its height, and the small streets as ribbons, per tile
small = [(c, l) for c, l in roads if c >= 5]
stree = STRtree([l for _, l in small])
total = 0
for cz in range(CROWS):
    for cx in range(CCOLS):
        pk = Pack(); tiles = []
        for tz in range(cz * CH, min(ROWS, (cz + 1) * CH)):
            for tx in range(cx * CH, min(COLS, (cx + 1) * CH)):
                ox, oz = -HX + (tx + 0.5) * TILE, -HZ + (tz + 0.5) * TILE
                sel = np.nonzero((tix == tx) & (tiz == tz))[0]
                rn, rl, co, hh, tn, ti = [], [], [], [], [], []
                for k in sel:
                    p, h = B[k]
                    p = p.simplify(0.25)
                    if p.geom_type != 'Polygon' or p.area < 9: continue
                    rings = [np.asarray(p.exterior.coords)[:-1]] + [np.asarray(r.coords)[:-1] for r in p.interiors if Polygon(r).area > 12]
                    rings = [r for r in rings if len(r) >= 3]
                    v = np.concatenate(rings)
                    if len(v) > 60000: continue
                    idx = earcut.triangulate_float64(v.astype(np.float64), np.cumsum([len(r) for r in rings]).astype(np.uint32))
                    if len(idx) < 3: continue
                    q = np.round((v - [ox, oz]) * 10)
                    if np.abs(q).max() > 32000: continue
                    rn.append(len(rings)); rl += [len(r) for r in rings]; co.append(q.astype(np.int16))
                    hh.append(round(h * 10)); tn.append(len(idx) // 3); ti.append(idx.astype(np.uint16))
                tb = box(ox - TILE / 2, oz - TILE / 2, ox + TILE / 2, oz + TILE / 2)
                near = [small[i] for i in stree.query(tb)]
                rp = []
                for cls in (5, 6, 7):
                    ls = [l for c, l in near if c == cls]
                    if ls:
                        u = unary_union([l.buffer(RW[cls] / 2, cap_style=1, join_style=1, resolution=2) for l in ls]).intersection(tb).simplify(0.6)
                        rp += polys_of(u if u.is_valid else make_valid(u))
                sv, si = tri(rp, 10.0, ox, oz)
                if not rn and not len(si): continue
                key = f'{tx}_{tz}'
                tiles.append([tx, tz, len(rn)])
                if rn:
                    pk.add(key + '_rn', np.array(rn, np.uint8)); pk.add(key + '_rl', np.array(rl, np.uint16))
                    pk.add(key + '_co', np.concatenate(co)); pk.add(key + '_h', np.array(hh, np.uint16))
                    pk.add(key + '_tn', np.array(tn, np.uint16)); pk.add(key + '_ti', np.concatenate(ti))
                if len(si):
                    pk.add(key + '_sp', sv); pk.add(key + '_si', si.astype(np.uint32))
        pk.meta = dict(cx=cx, cz=cz, tiles=tiles)
        raw, gz = pk.write(os.path.join(OUT, f'c_{cx}_{cz}.bin.gz')); total += gz
    log('chunk row', cz, 'total', total)
log('done. chunks', total, 'bytes')
