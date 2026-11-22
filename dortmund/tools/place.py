#!/usr/bin/env python3
"""Nudge every invented project to a free plot near its intended place: clear of water, main roads and rails,
and standing on as few existing buildings as possible. Rewrites lon/lat in js/projects.json.

  python3 tools/place.py raw.pkl
"""
import sys, json, pickle, math, os
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union
from shapely.strtree import STRtree

D = pickle.load(open(sys.argv[1], 'rb')); M = D['meta']
PJ = os.path.join(os.path.dirname(__file__), '..', 'js', 'projects.json')
P = json.load(open(PJ))
water = [Polygon(r[0]).buffer(0) for r, _ in D['water'] if len(r[0]) > 3]
water += [LineString(l).buffer(8) for k, _, l in D['streams'] if len(l) > 1 and k != 'stream']
big = [LineString(l) for c, l in D['roads'] if c <= 4 and len(l) > 1]
small = [LineString(l) for c, l in D['roads'] if 5 <= c <= 6 and len(l) > 1]
rails = [LineString(l) for l in D['rails'] if len(l) > 1]
blds = [Polygon(r[0][0]) for r in D['buildings'] if len(r[0][0]) > 3]
T = {k: STRtree(v) for k, v in dict(water=water, big=big, small=small, rails=rails, blds=blds).items()}
G = dict(water=water, big=big, small=small, rails=rails, blds=blds)
def near(kind, pt, rad):
    return min((G[kind][i].distance(pt) for i in T[kind].query(pt.buffer(rad))), default=rad)

for q in P:
    x0, z0 = (q['lon'] - M['lon0']) * M['kx'], -(q['lat'] - M['lat0']) * M['kz']
    r = q['clear']; best = None
    if q.get('fixed'): print(q['id'], 'fixed by hand'); continue
    for dx in range(-300, 301, 20):
        for dz in range(-300, 301, 20):
            pt = Point(x0 + dx, z0 + dz)
            hard = min(near('water', pt, 300), near('big', pt, 300), near('rails', pt, 300))
            if hard < r * 1.08: continue
            disc = pt.buffer(r)
            lost = sum(blds[i].intersection(disc).area for i in T['blds'].query(disc))
            cost = lost / 400 + max(0, r * 0.9 - near('small', pt, 300)) * 0.35 + math.hypot(dx, dz) / 14
            if best is None or cost < best[0]: best = (cost, dx, dz, lost)
    if best is None: print(q['id'], 'NO FREE PLOT'); continue
    _, dx, dz, lost = best
    q['lon'] = round(M['lon0'] + (x0 + dx) / M['kx'], 5); q['lat'] = round(M['lat0'] - (z0 + dz) / M['kz'], 5)
    print(f"{q['id']:16s} moved {dx:5d} {dz:5d} m, buildings replaced {lost:6.0f} m²")
# every project is turned so that its rows run along the nearest street
roads = big + small; RT = STRtree(roads)
for q in P:
    pt = Point((q['lon'] - M['lon0']) * M['kx'], -(q['lat'] - M['lat0']) * M['kz'])
    cand = [roads[i] for i in RT.query(pt.buffer(400))]
    if not cand: q['rot'] = 0; continue
    l = min(cand, key=lambda g: g.distance(pt)); d = l.project(pt)
    a, b = l.interpolate(max(0, d - 4)), l.interpolate(min(l.length, d + 4))
    q['rot'] = round(math.degrees(math.atan2(-(b.y - a.y), b.x - a.x)), 1)
    print(f"{q['id']:20s} rows turned by {q['rot']:6.1f} degrees, street {l.distance(pt):4.0f} m away")
json.dump(P, open(PJ, 'w'), ensure_ascii=False, indent=1)
