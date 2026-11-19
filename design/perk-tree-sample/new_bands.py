"""
The redesigned outer bands (decided 2026-11-18), applied on top of the tree that build.py reads:

- Bands IV and V: the six outer notables of every class (four wheel notables and two outer-path notables) are replaced by
  unique ones from proposed_bands.py: own name, no tier suffix, a stat that appears nowhere in bands I to III.
- Band VI: every class gets three paths past its band V grand keystone (8 nodes each along the figure's lines: an opening notable, 5 small, 1 mid notable,
  then its own band VI keystone; same cost, different shape), drawn as a constellation. A player can take only ONE path, and band VI in only ONE class; the simulator
  and the app enforce it.

Nothing here touches the workbook. The app's tree data is still written from the tree before this step, until the point
engine knows the band VI rule.
"""
import copy
import math
import re

from proposed_bands import BAND_SIX_FIRST, BAND_SIX_SMALL, PROPOSED

SLOTS = ["w1not", "w2not", "w3not", "w4not", "olnot", "ornot"]       # the six outer notables of a band, in design order
EARNED = {"payroll": "Play time", "pass": "Play time", "sessions": "Sessions", "streaks": "Sessions",
          "loot": "Play time", "quests": "Quests", "background": "Background", "rig": "Background"}
NODE_COST = {"small": 1, "notable": 2, "keystone": 3}


def camel(name):
    return "".join(w.capitalize() for w in re.findall(r"[A-Za-z0-9]+", name))


def num(text):
    return float(text.replace(",", ""))


def parse(effect, label_to_key):
    """Splits "gain, −N% what" into the gain text, its number and unit, and the downside (stat, -N) if there is one."""
    minus = None
    m = re.search(r", −(\d+(?:\.\d+)?)% (.+)$", effect)
    if m:
        minus = (label_to_key[m.group(2)], -num(m.group(1)))
        gain = effect[: m.start()]
    else:
        gain = effect
    plus = re.search(r"\+(\d[\d,]*(?:\.\d+)?)", gain) or re.search(r"(\d[\d,]*(?:\.\d+)?)", gain)
    unit = "%" if re.search(r"\+\d[\d,]*(?:\.\d+)?%", gain) else ""
    return gain, (num(plus.group(1)) if plus else 1.0), unit, minus


# ---- Band VI: each class draws a constellation from class-zodiac-variants.html ----------------------------------------
# Three paths run along the figure's lines, each 8 nodes (an opening notable with a passive, 5 small, one mid notable, then that path's own band VI keystone,
# each with its own rule): the same cost, a different shape. Picked at random (2026-11-18) from the figures that fit best (most of their stars used,
# no crossing links) and written down so a rebuild does not reshuffle them. Points come from constellations.band_six_paths().
BAND_SIX_FIGURES = {"payroll": "Eridanus", "pass": "Orion", "sessions": "Triangulum", "streaks": "Taurus",
                    "loot": "Ursa Major", "quests": "Libra", "background": "Gemini", "rig": "Cassiopeia"}


def _band_six_shapes():
    from constellations import FIGURES, band_six_paths
    figures = {f[0]: f for f in FIGURES}
    return {rid: (name, figures[name][1], band_six_paths(figures[name])[1]) for rid, name in BAND_SIX_FIGURES.items()}


SHAPES = _band_six_shapes()


MIN_GAP = 60        # build fails if two nodes end up closer than this, or two links cross (unbent tree: 87)


def link_over_node(nodes, edges, clearance=40):
    """Links that pass within `clearance` of a node they do not join (the line would run through its circle)."""
    from constellations import seg_dist
    by = {n["id"]: (n["x"], n["y"]) for n in nodes}
    cell, grid = 400, {}
    for n in nodes:
        grid.setdefault((int(n["x"] // cell), int(n["y"] // cell)), []).append(n["id"])
    hits = []
    for a, b in edges:
        p, q = by[a], by[b]
        for gx in range(int(min(p[0], q[0]) // cell) - 1, int(max(p[0], q[0]) // cell) + 2):
            for gy in range(int(min(p[1], q[1]) // cell) - 1, int(max(p[1], q[1]) // cell) + 2):
                hits += [(a, b, i) for i in grid.get((gx, gy), []) if i not in (a, b) and seg_dist(by[i], p, q) < clearance]
    return hits


def check_layout(nodes, edges, min_gap=MIN_GAP):
    """(closest pair distance, number of crossing links). Grid buckets keep it fast on ~3,000 nodes."""
    pts = [(n["x"], n["y"]) for n in nodes]
    cell, grid = min_gap, {}
    for i, (x, y) in enumerate(pts):
        grid.setdefault((int(x // cell), int(y // cell)), []).append(i)
    closest = math.inf
    for (cx, cy), ids in grid.items():
        near = [j for dx in (-1, 0, 1) for dy in (-1, 0, 1) for j in grid.get((cx + dx, cy + dy), [])]
        for i in ids:
            for j in near:
                if j > i:
                    closest = min(closest, math.dist(pts[i], pts[j]))
    by = {n["id"]: (n["x"], n["y"]) for n in nodes}
    segs = [(by[a], by[b], a, b) for a, b in edges]
    side = lambda p, q, r: (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    cell, grid, crossings = 600, {}, set()
    for i, (p, q, _, _) in enumerate(segs):
        for gx in range(int(min(p[0], q[0]) // cell), int(max(p[0], q[0]) // cell) + 1):
            for gy in range(int(min(p[1], q[1]) // cell), int(max(p[1], q[1]) // cell) + 1):
                grid.setdefault((gx, gy), []).append(i)
    for ids in grid.values():
        for k, i in enumerate(ids):
            p1, p2, a, b = segs[i]
            for j in ids[k + 1:]:
                p3, p4, c, d = segs[j]
                if len({a, b, c, d}) == 4 and side(p1, p2, p3) * side(p1, p2, p4) < 0 and side(p3, p4, p1) * side(p3, p4, p2) < 0:
                    crossings.add((min(i, j), max(i, j)))
    return closest, len(crossings)


def apply_new_bands(nodes, edges, regions, stat_info, gap):
    """Returns new copies of nodes and edges with bands IV to VI redesigned, and the stat table with the new stats added."""
    nodes, edges, stat_info = copy.deepcopy(nodes), list(edges), dict(stat_info)
    by_id = {n["id"]: n for n in nodes}
    label_to_key = {v[0]: k for k, v in stat_info.items()}
    for reg in regions:
        rid = reg["id"]
        design = PROPOSED.get(rid)
        if not design:
            continue
        # Bands IV and V: replace the six outer notables.
        for band, tag in ((4, "IV"), (5, "V")):
            for slot, (name, effect) in zip(SLOTS, design[tag]):
                n = by_id[f"{rid}-b{band}-{slot}"]
                gain, value, unit, minus = parse(effect, label_to_key)
                key = "u" + camel(name)
                stat_info[key] = (gain, unit, EARNED[rid])
                n.update(name=name, effect=effect, stat=key, value=value, stat2=minus[0] if minus else "", value2=minus[1] if minus else 0,
                         hook="New work", passive="", notes="", band=band, earned_by=EARNED[rid])
        # Band VI: three branches past the band V grand keystone, each 2 small, 1 mid notable, 2 small, and all three
        # end on one band VI keystone. A player can take one branch only (and band VI in one class only).
        g = by_id[f"{rid}-b5-gkey"]
        r5 = math.hypot(g["x"], g["y"])
        ux, uy = g["x"] / r5, g["y"] / r5
        vx, vy = -uy, ux

        def at(radial, lateral):
            return round(g["x"] + radial * gap * ux + lateral * gap * vx, 1), round(g["y"] + radial * gap * uy + lateral * gap * vy, 1)

        def new(suffix, kind, name, effect, stat, value, stat2, value2, pos, step, branch, passive=""):
            x, y = pos
            nodes.append({"id": f"{rid}-b6-{suffix}", "region": rid, "branch": branch, "step": step, "type": kind, "name": name,
                          "effect": effect, "stat": stat, "value": value, "cost": NODE_COST[kind], "x": x, "y": y, "hook": "New work",
                          "stat2": stat2, "value2": value2, "earned_by": EARNED[rid], "band": 6, **({"passive": passive} if passive else {})})

        # Three paths along the class's constellation (SHAPES above), each 8 nodes along its lines: small nodes numbered from 1,
        # one mid notable "m", and its own keystone "k", shown as "VI●name".
        _, _, paths = SHAPES[rid]
        mids, keys = design["VI"][:3], design["VI"][3:6]
        for letter, path, (name, effect, _kind, passive), (kname, keffect, _k, _p), (sname, skey, sval), first in zip(
                "abc", paths, mids, keys, BAND_SIX_SMALL[rid], BAND_SIX_FIRST[rid]):
            slabel, sunit, _ = stat_info[skey]
            seffect = f"+{sval:g}{sunit if sunit == '%' else ''} {slabel}"
            branch = f"Band VI path: {name} to VI●{kname}"
            ids, count = [], 0
            for step, ((rad, lat), kind) in enumerate(path, 18):
                pos = at(rad, lat)
                if step == 18:                                  # every path opens on a notable with a passive
                    fname, feffect, fpassive = first
                    gain, value, unit, _ = parse(feffect, label_to_key)
                    stat_info["u" + camel(fname)] = (gain, unit, EARNED[rid])
                    count += 1
                    suffix = f"{letter}{count}"
                    new(suffix, "notable", fname, feffect, "u" + camel(fname), value, "", 0, pos, step, branch, fpassive)
                elif kind == "mid":
                    gain, value, unit, minus = parse(effect, label_to_key)
                    stat = "u" + camel(name)
                    stat_info[stat] = (gain, unit, EARNED[rid])
                    suffix = f"{letter}m"
                    new(suffix, "notable", name, effect, stat, value, minus[0] if minus else "", minus[1] if minus else 0, pos, step, branch, passive)
                elif kind == "key":
                    suffix = f"{letter}k"
                    new(suffix, "keystone", f"VI●{kname}", keffect, "key" + camel(kname), 1, "", 0, pos, step, branch)
                else:
                    count += 1
                    suffix = f"{letter}{count}"
                    new(suffix, "small", sname, seffect, skey, sval, "", 0, pos, step, branch)
                ids.append(f"{rid}-b6-{suffix}")
            edges.append((f"{rid}-b5-gkey", ids[0]))
            edges.extend(zip(ids, ids[1:]))
    closest, crossings = check_layout(nodes, edges)
    over = link_over_node(nodes, edges)
    if closest < MIN_GAP or crossings or over:
        raise SystemExit(f"Tree layout broken: closest nodes {closest:.0f} apart (need {MIN_GAP}), {crossings} crossing links, "
                         f"{len(over)} links over a node {over[:5]}")
    return nodes, edges, stat_info
