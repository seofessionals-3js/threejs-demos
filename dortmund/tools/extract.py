#!/usr/bin/env python3
"""Stage 1: cut Dortmund and its surroundings out of an OpenStreetMap extract.

  python3 tools/extract.py arnsberg.osm.pbf raw.pkl

Needs: pip install osmium. Data © OpenStreetMap contributors, ODbL.
"""
import sys, pickle, math, time
import osmium

W, S, E, N = 7.28, 51.40, 7.66, 51.61          # the map: about 26 x 23 km
LON0, LAT0 = 7.47, 51.505
KX, KZ = math.cos(math.radians(LAT0)) * 111320.0, 110574.0

GREEN = {('leisure', 'park'), ('leisure', 'garden'), ('leisure', 'golf_course'), ('leisure', 'nature_reserve'),
         ('landuse', 'grass'), ('landuse', 'meadow'), ('landuse', 'recreation_ground'), ('landuse', 'cemetery'),
         ('landuse', 'allotments'), ('landuse', 'village_green'), ('leisure', 'pitch'), ('natural', 'scrub'),
         ('natural', 'grassland'), ('natural', 'heath')}
WOOD = {('landuse', 'forest'), ('natural', 'wood')}
ROADS = {'motorway': 0, 'motorway_link': 0, 'trunk': 1, 'trunk_link': 1, 'primary': 2, 'primary_link': 2,
         'secondary': 3, 'secondary_link': 3, 'tertiary': 4, 'tertiary_link': 4, 'unclassified': 5, 'residential': 5,
         'living_street': 5, 'pedestrian': 6, 'service': 7}


def xz(loc):
    return ((loc.lon - LON0) * KX, -(loc.lat - LAT0) * KZ)


class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.buildings, self.water, self.green, self.wood = [], [], [], []
        self.roads, self.rails, self.streams, self.places, self.boundary = [], [], [], [], []
        self.n = 0

    def node(self, n):
        t = n.tags
        if 'place' in t and 'name' in t and W <= n.location.lon <= E and S <= n.location.lat <= N:
            self.places.append((t['name'], t['place'], t.get('population', ''), *xz(n.location)))

    def way(self, w):
        t = w.tags
        hw, rw, ww = t.get('highway'), t.get('railway'), t.get('waterway')
        if not (hw in ROADS or rw in ('rail', 'light_rail') or ww in ('river', 'canal', 'stream')):
            return
        try:
            pts = [(n.lon, n.lat) for n in w.nodes]
        except osmium.InvalidLocationError:
            return
        if len(pts) < 2 or not any(W <= p[0] <= E and S <= p[1] <= N for p in pts):
            return
        line = [((lo - LON0) * KX, -(la - LAT0) * KZ) for lo, la in pts]
        if hw in ROADS:
            if hw == 'service' and t.get('service') in ('parking_aisle', 'driveway', 'drive-through'):
                return
            if t.get('tunnel') in ('yes', 'building_passage') or t.get('area') == 'yes':
                return
            self.roads.append((ROADS[hw], line))
        elif rw:
            if t.get('tunnel') == 'yes' or t.get('service') in ('yard', 'siding', 'spur'):
                return
            self.rails.append(line)
        elif t.get('tunnel') not in ('yes', 'culvert'):
            self.streams.append((ww, t.get('name', ''), line))

    def area(self, a):
        t = a.tags
        kind = None
        if 'building' in t and t['building'] != 'no':
            kind = 'b'
        elif t.get('natural') == 'water' or t.get('waterway') in ('riverbank', 'dock') or t.get('landuse') in ('reservoir', 'basin'):
            kind = 'w'
        elif t.get('boundary') == 'administrative' and t.get('admin_level') == '6' and t.get('name') == 'Dortmund':
            kind = 'x'
        else:
            for k in ('leisure', 'landuse', 'natural'):
                v = t.get(k)
                if v and (k, v) in WOOD: kind = 'f'; break
                if v and (k, v) in GREEN: kind = 'g'; break
        if not kind:
            return
        polys = []
        try:
            for outer in a.outer_rings():
                o = [(n.lon, n.lat) for n in outer]
                if kind != 'x' and not any(W <= p[0] <= E and S <= p[1] <= N for p in o[:: max(1, len(o) // 8)]):
                    continue
                rings = [[((lo - LON0) * KX, -(la - LAT0) * KZ) for lo, la in o]]
                for inner in a.inner_rings(outer):
                    rings.append([xz(n) for n in inner])
                polys.append(rings)
        except osmium.InvalidLocationError:
            return
        if not polys:
            return
        if kind == 'b':
            for rings in polys:
                self.buildings.append((rings, t.get('building'), t.get('height', ''), t.get('building:levels', ''), t.get('roof:shape', ''), t.get('name', '')))
            self.n += 1
            if self.n % 100000 == 0: print(self.n, 'buildings', time.time() - T0, flush=True)
        elif kind == 'w': self.water += [(r, t.get('name', '')) for r in polys]
        elif kind == 'f': self.wood += polys
        elif kind == 'g': self.green += [(r, t.get('leisure') or t.get('landuse') or t.get('natural'), t.get('name', '')) for r in polys]
        else: self.boundary += polys


T0 = time.time()
h = H()
h.apply_file(sys.argv[1], locations=True, idx='flex_mem')
out = {k: getattr(h, k) for k in ('buildings', 'water', 'green', 'wood', 'roads', 'rails', 'streams', 'places', 'boundary')}
out['meta'] = dict(bbox=(W, S, E, N), lon0=LON0, lat0=LAT0, kx=KX, kz=KZ)
pickle.dump(out, open(sys.argv[2], 'wb'), protocol=4)
print({k: len(v) for k, v in out.items() if k != 'meta'}, 'in', round(time.time() - T0), 's')
