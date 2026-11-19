"""
Perk tree sample: builds `Perk Tree Sample.xlsx` (the editable source) and `perk-tree-sample.html` (a playable
preview made from the workbook).

  python build.py           first run: writes the workbook from the defaults below, then the HTML from the workbook
  python build.py           later runs: keeps your edited workbook and rebuilds the HTML from it
  python build.py --fresh   overwrites the workbook with the defaults (your edits are lost)

Nothing here touches the app's code. It is a design sample to agree the tree before it is built for real.
"""
import json
import re
import math
import sys
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
XLSX = HERE / "Perk Tree Sample.xlsx"
HTML = HERE / "perk-tree-sample.html"
TEMPLATE = HERE / "template.html"

# ---------------------------------------------------------------------------------------------------------------
# Defaults: six regions around the Station core, 30 nodes each. Every region has the same shape:
#
#                        Keystone
#             link  /       |       \  link
#     Left cluster          k2          Right cluster       (each cluster is a diamond: in, left, right, Notable)
#          |                k1                |
#      Notable A        Notable M         Notable B
#          a2               m2                b2
#          a1               m1                b1
#            \_____________ fork _____________/
#                            s2
#                            s1   -- Crosswalk --  next region's s1
#                       Station Core
#
# Neighbouring regions are joined twice more: an inner Bridge (Notable B to the next Notable A) and an outer Bridge
# (the right cluster's notable to the next region's left cluster notable), so there is always more than one way to a place.
# ---------------------------------------------------------------------------------------------------------------

from tree_content import EXISTING_HOOKS, GATE, OUTER, REGIONS, RING, SEASON_KEYS, SPECIALS, STAT_INFO, earned_by  # noqa: E402

# The layout was drawn for 60-degree wedges. With more classes each wedge is narrower: angles shrink by AF and
# radii grow by S, so distances between nodes stay the same.
WEDGE = 360 / len(REGIONS)
AF = WEDGE / 60
S = 1 / AF

# Radii (layout units; the HTML scales to fit) and angle offsets in degrees.
R = {"cls": 100, "s1": 150, "s2": 215, "fork": 290, "gate": 250, "arm1": 365, "arm2": 440, "not": 510, "k1": 610, "k2": 700,
     "cluster": 650, "link": 775, "key": 840, "bridge_in": 540, "bridge_out": 770}
# The inner section is spread this much further out than first drawn: eight classes meet at Station Core, and at 1.0
# their first rings, names and keystone effects crowd each other. Node sizes do not change, only distances.
SPREAD = 1.4
R = {k: v * S * SPREAD for k, v in R.items()}
ARM = 20 * AF       # each arm leans this far off the spoke
GATE_LEAN = 12 * AF  # the Season Key spur leans this far off the spoke, inside the arms
SPECIAL_LEAN = 11 * AF         # the two special-node spurs sit this far off the spoke, between an arm and the middle path
SPECIAL_R = (480 * S, 480 * S)  # their radii: level with the arm notables they hang from
CLUSTER = 21 * AF   # each cluster's centre leans this far off the spoke
DIAMOND = 62   # half the width of a cluster diamond


def polar(deg, r):
    a = math.radians(deg)
    return round(r * math.cos(a), 1), round(r * math.sin(a), 1)


# The inner ring between neighbouring classes' first nodes. Off: classes meet only at the Bridges further out.
CROSSWALK = False


def default_tree():
    nodes, edges = [], []

    def add(node_id, region, kind, name, stat, value, effect, deg, r, cost=1, branch="", step=0):
        x, y = polar(deg, r) if r else (0.0, 0.0)
        nodes.append({
            "id": node_id, "region": region, "branch": branch, "step": step, "type": kind, "name": name, "effect": effect,
            "stat": stat, "value": value, "cost": cost, "x": x, "y": y,
            "hook": "Exists" if stat in EXISTING_HOOKS or kind == "start" else "New work", "stat2": "", "value2": 0,
        })

    def link(a, b):
        edges.append((a, b))

    add("core", "core", "start", "Station Core", "", 0, "Where every path starts. Free.", 0, 0, cost=0, branch="Start", step=0)
    for i, reg in enumerate(REGIONS):
        t = -90 + WEDGE * i
        rid, (sk, sv, st) = reg["id"], reg["small"]
        p = f"{rid}-"
        nxt = REGIONS[(i + 1) % len(REGIONS)]
        small = lambda nid, name, deg, r, branch, step: add(p + nid, rid, "small", name, sk, sv, st, deg, r, branch=branch, step=step)

        # Class node: the class's icon, free. Taking it picks this class as a starting class; the spoke grows from it.
        add(p + "class", rid, "class", reg["name"], "", 0, f"Choose {reg['name']} ({reg['focus']}) as one of your starting classes. Free.",
            t, R["cls"], cost=0, branch="Class", step=0)

        # Spoke.
        small("s1", f"{reg['name']} I", t, R["s1"], "Spoke", 1)
        small("s2", f"{reg['name']} II", t, R["s2"], "Spoke", 2)
        small("fork", f"{reg['name']} III", t, R["fork"], "Spoke (fork)", 3)
        link("core", p + "class"); link(p + "class", p + "s1"); link(p + "s1", p + "s2"); link(p + "s2", p + "fork")

        # Season Key: one per class, on a spur off the fork. Any one opens Season Pass levels 46 to 60.
        gname, gstat, gval, geff = GATE
        kname, kstat, kval, keff = SEASON_KEYS.get(rid, (gname, "", 0, ""))
        add(p + "gate", rid, "gate", kname, gstat, gval,
            # The class's own extra goes on its own line as the Key's passive.
            f"{GATE_SHORT}{chr(10) + 'Passive: ' + keff if keff else ''}", t - GATE_LEAN, R["gate"], branch="Season Key spur", step=4)
        nodes[-1].update(stat2=kstat, value2=kval)
        link(p + "fork", p + "gate")

        # Three paths out of the fork: left arm, middle path, right arm, each ending in a notable.
        for tag, lean, key, side in (("a", -ARM, "notA", "Left arm"), ("m", 0, "notM", "Middle path"), ("b", ARM, "notB", "Right arm")):
            small(tag + "1", f"{reg['name']} path", t + lean, R["arm1"], side, 4)
            small(tag + "2", f"{reg['name']} path", t + lean, R["arm2"], side, 5)
            name, nk, nv, ne = reg[key]
            add(p + "not" + tag.upper(), rid, "notable", name, nk, nv, ne, t + lean, R["not"], branch=side, step=6)
            link(p + "fork", p + tag + "1"); link(p + tag + "1", p + tag + "2"); link(p + tag + "2", p + "not" + tag.upper())

        # Middle path carries on to the keystone.
        small("k1", f"{reg['name']} approach", t, R["k1"], "Middle path to keystone", 7)
        small("k2", f"{reg['name']} approach", t, R["k2"], "Middle path to keystone", 8)
        kn, kk, kv, ke = reg["key"]
        add(p + "key", rid, "keystone", kn, kk, kv, ke, t, R["key"], branch="Keystone", step=10)
        link(p + "notM", p + "k1"); link(p + "k1", p + "k2"); link(p + "k2", p + "key")

        # A diamond cluster past each outer notable: in, left, right, then its own notable; a link on to the keystone.
        for tag, side, key, label in (("a", -1, "notC", "Left cluster"), ("b", 1, "notD", "Right cluster")):
            c = t + side * CLUSTER
            spread = math.degrees(DIAMOND / R["cluster"])
            small(f"c{tag}in", f"{reg['name']} cluster", c, R["cluster"] - DIAMOND, label, 7)
            small(f"c{tag}l", f"{reg['name']} cluster", c - spread, R["cluster"], label, 8)
            small(f"c{tag}r", f"{reg['name']} cluster", c + spread, R["cluster"], label, 8)
            name, nk, nv, ne = reg[key]
            add(p + "not" + key[-1], rid, "notable", name, nk, nv, ne, c, R["cluster"] + DIAMOND, branch=label, step=9)
            small(f"link{tag}", f"{reg['name']} approach", t + side * CLUSTER * 0.5, R["link"], f"{label} to keystone", 10)
            arm_notable = p + "not" + tag.upper()
            link(arm_notable, p + f"c{tag}in")
            link(p + f"c{tag}in", p + f"c{tag}l"); link(p + f"c{tag}in", p + f"c{tag}r")
            link(p + f"c{tag}l", p + "not" + key[-1]); link(p + f"c{tag}r", p + "not" + key[-1])
            link(p + "not" + key[-1], p + f"link{tag}"); link(p + f"link{tag}", p + "key")

        # Crosswalk: inner ring nodes between this region's s1 and the next one's. Off by default, so a class cannot
        # step sideways into its neighbour next to Station Core; classes meet only at the Bridges further out.
        if CROSSWALK:
            for tag, off in (("ring", 20 * AF), ("ring2", 40 * AF)):
                add(p + tag, "ring", "ring", "Crosswalk", RING[0], RING[1], RING[2], t + off, R["s1"] + 14,
                    branch=f"Crosswalk {reg['name']} to {nxt['name']}", step=1)
            link(p + "s1", p + "ring"); link(p + "ring", p + "ring2"); link(p + "ring2", f"{nxt['id']}-s1")

        # Inner bridge: Notable B to the next region's Notable A. Outer bridge: right cluster to the next left cluster.
        nk2, nv2, nt2 = nxt["small"]
        add(p + "bi1", rid, "bridge", "Bridge", sk, sv, st, t + 26 * AF, R["bridge_in"], branch=f"Inner bridge to {nxt['name']}", step=6)
        add(p + "bi2", nxt["id"], "bridge", "Bridge", nk2, nv2, nt2, t + 34 * AF, R["bridge_in"], branch=f"Inner bridge from {reg['name']}", step=6)
        link(p + "notB", p + "bi1"); link(p + "bi1", p + "bi2"); link(p + "bi2", f"{nxt['id']}-notA")
        add(p + "bo1", rid, "bridge", "Bridge", sk, sv, st, t + 27 * AF, R["bridge_out"], branch=f"Outer bridge to {nxt['name']}", step=8)
        add(p + "bo2", nxt["id"], "bridge", "Bridge", nk2, nv2, nt2, t + 33 * AF, R["bridge_out"], branch=f"Outer bridge from {reg['name']}", step=8)
        link(p + "notD", p + "bo1"); link(p + "bo1", p + "bo2"); link(p + "bo2", f"{nxt['id']}-notC")
    add_outer_band(nodes, edges, add, link)
    for band in BAND_TIERS:
        before = len(nodes)
        add_outer_band(nodes, edges, add, link, band)
        for n in nodes[before:]:
            n["branch"] = f"{n['branch']} (band {band})"
            n["step"] += (band - 1) * 8
            if n["type"] in ("notable", "keystone"):
                n["notes"] = f"Placeholder: band {band} copy of a band 1 node, rewrite with its own effect before shipping"
    add_more_specials(nodes, edges, add, link)
    add_passives(nodes)
    fill_notable_v_passives(nodes)
    for n in nodes:
        n["earned_by"] = earned_by(n["type"], n["stat"])
    mix_small_nodes(nodes)
    number_small_nodes(nodes)
    # Bigger nodes cost more: small 1, notable 2, keystone 3 (Station Core is free).
    for n in nodes:
        n["cost"] = NODE_COST.get(n["type"], n["cost"])
    return nodes, edges


MIX_SHARE = 0.20  # exactly 1 small node in 5 in each class belongs to a neighbouring class (80% own colour, 20% other)


def mix_small_nodes(nodes, seed=7):
    """Sprinkles neighbouring-class small nodes into each class's paths, so a path is mostly one colour with the odd
    different one: exactly MIX_SHARE of every class's small nodes (rounded), picked at random. Fixed seed, so every
    rebuild gives the same tree."""
    import random
    rng = random.Random(seed)
    order = [r["id"] for r in REGIONS]
    small = {r["id"]: r["small"] for r in REGIONS}
    # A class's first node (the one Station Core links to) always keeps its class: it decides your starting class.
    by_class = {rid: [n for n in nodes if n["type"] == "small" and n["region"] == rid and n["id"] != f"{rid}-s1"] for rid in order}
    for rid, own in by_class.items():
        for n in rng.sample(own, round(len(own) * MIX_SHARE)):
            k = order.index(rid)
            guest = order[(k + rng.choice((-1, 1))) % len(order)]
            stat, value, effect = small[guest]
            n.update(region=guest, stat=stat, value=value, effect=effect, earned_by=earned_by("small", stat),
                     hook="Exists" if stat in EXISTING_HOOKS else "New work", notes=f"Guest node from {guest} inside this path")


# Short path names for node labels (the full path stays in the branch column).
SHORT = {
    "Left arm": "Dawn", "Right arm": "Dusk", "Middle path": "Spine",
    "Middle path to keystone": "Vault", "Left cluster": "Grove", "Right cluster": "Forge",
    "Left cluster to keystone": "Ascent", "Right cluster to keystone": "Climb",
    "Outer feeder": "Conduit", "Wheel link": "Tether", "Outer path": "Frontier", "Grand keystone approach": "Summit",
    "Outer wheel 1": "Halo", "Outer wheel 2": "Orbit", "Outer wheel 3": "Eclipse", "Outer wheel 4": "Nova",
}

# Squares (Season Keys and Specials) cost no points; a player holds at most SQUARE_LIMIT of them (Points sheet, B17).
NODE_COST = {"start": 0, "class": 0, "small": 1, "bridge": 1, "ring": 1, "notable": 2, "gate": 0, "special": 0, "pentagon": 0, "keystone": 3}
SQUARE_LIMIT = 8
PENTAGON_LIMIT = 3  # pentagons: free, five per class, a player holds this many in all
# The one-Key rule is shown by the tooltip's status line ("Season Key 0/1"), so the effect stays one line.
GATE_SHORT = "Opens Season Pass levels 46 to 60."

# Where each class's 11 Specials hang, one per branch and spread over all five bands so squares sit far apart.
# A wheel's Special hangs off one of the wheel's six ring nodes, outside the wheel.
SPECIAL_SOURCES = [("notA", "left arm"), ("notB", "right arm"), ("notM", "middle path"), ("notC", "left cluster"),
                   ("notD", "right cluster"), ("w2not", "outer wheel"), ("b2-w3not", "band 2 wheel"),
                   ("b3-w1not", "band 3 wheel"), ("b3-w4not", "band 3 wheel"), ("b4-w2not", "band 4 wheel"),
                   ("b5-w3not", "band 5 wheel")]
# Each class's 5 Pentagons: one beside each grand keystone (bands 1 to 5).
PENTAGON_SOURCES = [("gkey", "band 1"), ("b2-gkey", "band 2"), ("b3-gkey", "band 3"), ("b4-gkey", "band 4"), ("b5-gkey", "band 5")]
SPUR = (130, 150, 175)  # spur lengths tried for a square or pentagon (x S)


def _seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def add_passives(nodes):
    """The extra Passive line on every keystone and pentagon (tree_content.KEYSTONE_PASSIVES, PENTAGON_PASSIVES)."""
    from tree_content import KEYSTONE_PASSIVES, PENTAGON_PASSIVES
    for n in nodes:
        rid = n["region"]
        if n["type"] == "keystone" and rid in KEYSTONE_PASSIVES:
            inner, grand, base = KEYSTONE_PASSIVES[rid]
            if n["id"] == f"{rid}-key":
                n["passive"] = inner
            else:
                m = re.match(rf"{rid}-(?:b(\d)-)?gkey$", n["id"])
                if m:
                    n["passive"] = grand.format(n=base * int(m.group(1) or 1))
        elif n["type"] == "pentagon" and rid in PENTAGON_PASSIVES:
            k = int(n["id"].rsplit("pg", 1)[1])
            n["passive"] = PENTAGON_PASSIVES[rid][k - 1]


def fill_notable_v_passives(nodes):
    """Gives every band V notable its Passive line (tree_content.NOTABLE_V_PASSIVES) unless the workbook already has one,
    so edits made in the workbook are kept and a workbook saved before this existed still gets them."""
    from tree_content import NOTABLE_V_PASSIVES
    for n in nodes:
        if n["type"] == "notable" and n["name"].endswith(" V") and not n.get("passive"):
            text = NOTABLE_V_PASSIVES.get(n["region"], {}).get(n["name"][:-2])
            if text:
                n["passive"] = text



def apply_tradeoffs(nodes):
    """Gives the notables in tree_content.TRADEOFFS a downside: a negative second effect, and a stronger first one.
    Idempotent and non-destructive, like the Passive lines: a notable that already has a second effect (edited in the
    workbook) is left alone, so a saved workbook keeps its edits and one saved before this existed still gets them."""
    from tree_content import BAND_SCALE, STAT_INFO, TRADEOFFS
    for n in nodes:
        if n["type"] != "notable" or n.get("stat2"):
            continue
        band = band_of(n)
        base = n["name"][: -len(ROMAN[band - 1]) - 1] if band > 1 else n["name"]
        spec = TRADEOFFS.get(n["region"], {}).get(base)
        if not spec:
            continue
        stat2, minus, boost = spec
        label, unit = STAT_INFO[stat2][0], STAT_INFO[stat2][1]
        cost = max(1, round(minus * BAND_SCALE[band]))
        if boost:
            old = int(n["value"])
            new = max(old + 1, round(old * boost)) if old else old
            if new != old:
                text, hits = re.subn(r"(?<![\d.,])" + re.escape(f"{old:,}") + r"(?![\d])", f"{new:,}", n["effect"], count=1)
                if hits:
                    n["effect"], n["value"] = text, new
        n["effect"] = f"{n['effect']}, −{cost}{unit} {label}"
        n["stat2"], n["value2"] = stat2, -cost


def add_more_specials(nodes, edges, add, link):
    """Places every class's Specials and Pentagons on short spurs. Each goes where it has the most room: the spot round
    its source node farthest from every other node, link and square, so nothing overlaps and squares spread out."""
    from tree_content import PENTAGONS
    pos = {n["id"]: (n["x"], n["y"]) for n in nodes}
    segs = [(pos[a], pos[b]) for a, b in edges]
    shapes = [pos[n["id"]] for n in nodes if n["type"] == "gate"]
    for reg in REGIONS:
        rid, p = reg["id"], f"{reg['id']}-"
        jobs = [("special", f"sp{k}", e, SPECIAL_SOURCES[k - 1]) for k, e in enumerate(SPECIALS.get(rid, [])[:len(SPECIAL_SOURCES)], start=1)]
        jobs += [("pentagon", f"pg{k}", e, PENTAGON_SOURCES[k - 1]) for k, e in enumerate(PENTAGONS.get(rid, [])[:5], start=1)]
        for kind, nid, (sname, sstat, sval, seff), (src_tag, side) in jobs:
            wheel = re.search(r"w\dnot$", src_tag) is not None
            # The last band's pentagon sits inside the rim, not out past its V keystone where nothing else is.
            inward = kind == "pentagon" and src_tag == PENTAGON_SOURCES[-1][0]
            sources = [p + f"{src_tag[:-3]}n{j}" for j in range(6)] if wheel else [p + src_tag]
            centre = pos[p + src_tag]
            best, best_score, src = None, -1e9, sources[0]
            for cand_src in sources:
                sx, sy = pos[cand_src]
                near = [xy for i, xy in pos.items() if i != cand_src and math.hypot(xy[0] - sx, xy[1] - sy) < 480 * S]
                near_segs = [sg for sg in segs if _seg_dist(sx, sy, *sg[0], *sg[1]) < 480 * S]
                for d in SPUR:
                    d *= S
                    for step in range(36):
                        a = math.radians(step * 10)
                        x, y = sx + d * math.cos(a), sy + d * math.sin(a)
                        if wheel and math.hypot(x - centre[0], y - centre[1]) < math.hypot(sx - centre[0], sy - centre[1]) + 45 * S:
                            continue  # must sit outside the wheel
                        if inward and math.hypot(x, y) > math.hypot(sx, sy) - 40 * S:
                            continue  # must sit inside the rim
                        clear_nodes = min((math.hypot(x - nx, y - ny) for nx, ny in near), default=1e9)
                        clear_links = min((_seg_dist(x, y, *sg[0], *sg[1]) for sg in near_segs), default=1e9)
                        clear_spur = min((_seg_dist(nx, ny, sx, sy, x, y) for nx, ny in near), default=1e9)
                        clear_shape = min((math.hypot(x - qx, y - qy) for qx, qy in shapes), default=1e9)
                        score = min(clear_nodes, clear_links * 1.4, clear_spur * 1.6, clear_shape * 0.45) - 0.03 * d
                        if score > best_score:
                            best, best_score, src = (x, y), score, cand_src
            sx, sy = pos[src]
            x, y = best
            deg, rad = math.degrees(math.atan2(y, x)), math.hypot(x, y)
            label = "Pentagon spur" if kind == "pentagon" else "Special spur"
            add(p + nid, rid, kind, sname, sstat, sval, seff, deg, rad, branch=f"{label} ({side})", step=9)
            link(src, p + nid)
            pos[p + nid] = (nodes[-1]["x"], nodes[-1]["y"])
            segs.append(((sx, sy), pos[p + nid]))
            shapes.append(pos[p + nid])

# What each class is about, for the Classes sheet: (focus, what pays it out).
CLASS_FOCUS = {
    "payroll": ("Income from play itself: more per counted hour, long sessions, night, morning and weekend play.", "Play time"),
    "pass": ("Keeps paying after the Season Pass: bonus levels past 60 that pay Income and Tickets, and a richer Free row (more Income, milestone Tickets, a bigger level 60).", "Play time"),
    "sessions": ("Each game session: rewards for your first game of the day, long or late sessions, and playing on several days a week.", "Sessions"),
    "streaks": ("Days in a row you play: streak bonuses, Tickets at 7, 14 and 30 days, freezes and second chances.", "Sessions (days played)"),
    "loot": ("Draw currency from play: Tickets and fragments every few hours, random items, and better repeats.", "Play time (a few need a draw)"),
    "quests": ("Quests that track themselves while you play, Auto-Claim, and bigger quest pay-outs.", "Quests (claiming), some Play time"),
    "background": ("The app quietly running beside the game: hours open, nights left on, game mode, dark theme.", "Background"),
    "rig": ("How your PC behaves while you play: cool GPU, low ping and jitter, steady frames, mains power.", "Background (PC readings)"),
}

ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"]


# Small nodes are named by what they give, not where they sit: every node with the same effect shares one name.
SMALL_NAME = {
    "playCreditPct": "Wages",
    "passXpPct": "Study",
    "sessionCredits": "Shift Pay",
    "fragmentPlayPct": "Scraps",
    "questCreditPct": "Bounty",
    "allCreditPct": "Bonus",
    "streakActiveCreditPct": "Streak",
    "rigCreditPct": "Tuned",
}


def number_small_nodes(nodes):
    """Names small, bridge and crosswalk nodes after their effect. In outer band 2 and beyond the same effect steps
    up (3% -> 4% -> 5%...) and the name gets the matching numeral (Wages II, III...). Same value, same name."""
    for n in nodes:
        if n["type"] not in ("small", "bridge", "ring"):
            continue
        m = re.search(r"\(band (\d)\)$", n["branch"])
        band = int(m.group(1)) if m else 1
        base = SMALL_NAME.get(n["stat"], n["name"])
        if band > 1:
            old = n["value"]
            new = old + (band - 1) * max(1, round(old / 3))
            n["effect"] = re.sub(r"(?<![\d.])" + re.escape(f"{old:g}") + r"(?![\d])", f"{new:g}", n["effect"], count=1)
            n["value"] = new
            base = f"{base} {ROMAN[band - 1]}"
        n["name"] = base


# ---------------------------------------------------------------------------------------------------------------
# Outer band: beyond each region's inner keystone. Four hexagon wheels (six small nodes round a notable), fed from
# the inner cluster notables and the inner keystone, linked wheel to wheel; two outer notable paths; a grand keystone
# on the rim; and a third bridge to the next region.
# ---------------------------------------------------------------------------------------------------------------

RO_BASE = {"feed1": 925, "feed2": 995, "wheel": 1135, "wheel_r": 88, "out1": 1300, "out2": 1375, "outnot": 1460,
      "gk_a": 1325, "gk_b": 1420, "gk": 1525, "cross": 1510, "bridge": 1260}
RO_BASE = {k: (v if k == "wheel_r" else v * S * SPREAD) for k, v in RO_BASE.items()}
WHEEL_ANGLES = tuple(a * AF for a in (-21, -7, 7, 21))


BAND_GAP = 720 * S * SPREAD            # how much further out each extra band sits
BRIDGE_SPACING = 100           # bands 2+: one bridge node about this often along the gap between two classes
# Five bands in all: the last grand keystone of each class is its "V".
BAND_TIERS = {2: ("Veteran", 1.5), 3: ("Elite", 2.0), 4: ("Master", 2.5), 5: ("Legend", 3.0)}


def tiered(entry, band):
    """A band-2+ copy of a band-1 notable or keystone: tier word on the name, value scaled in the text too."""
    name, stat, value, effect = entry
    word, scale = BAND_TIERS[band]
    new = value if stat.startswith("key") else max(value + band - 1, round(value * scale))
    if not stat.startswith("key"):
        effect = re.sub(r"(?<![\d.])" + re.escape(f"{value:,}") + r"(?![\d])", f"{new:,}", effect, count=1)
        if effect == entry[3]:
            # Text with no number in it ("gives a Regular Ticket", "Once a month"): say the stronger amount.
            effect, hits = re.subn(r"\ba (Regular|Special) Ticket\b", rf"{new} \1 Tickets", effect, count=1)
            if not hits:
                effect, hits = re.subn(r"^Once a month, a missed day does not", f"Up to {new} times a month, a missed day does not", effect)
            if not hits:
                effect = f"{effect} ({new}×)"
    return f"{name} {ROMAN[band - 1]}", stat, new, effect


def add_outer_band(nodes, edges, add, link, band=1):
    pos = {n["id"]: (n["x"], n["y"]) for n in nodes}
    off = (band - 1) * BAND_GAP
    RO = {k: (v + off if k != "wheel_r" else v) for k, v in RO_BASE.items()}

    def near(ids, target):
        tx, ty = target
        return min(ids, key=lambda i: (pos[i][0] - tx) ** 2 + (pos[i][1] - ty) ** 2)

    for i, reg in enumerate(REGIONS):
        t = -90 + WEDGE * i
        rid, (sk, sv, st) = reg["id"], reg["small"]
        base = f"{rid}-"
        p = base if band == 1 else f"{rid}-b{band}-"
        prev = base if band <= 2 else f"{rid}-b{band - 1}-"
        nxt = REGIONS[(i + 1) % len(REGIONS)]
        o = OUTER[rid] if band == 1 else {
            "wheels": [tiered(e, band) for e in OUTER[rid]["wheels"]],
            "outer": [tiered(e, band) for e in OUTER[rid]["outer"]],
            "grand": tiered(OUTER[rid]["grand"], band),
        }
        # Band 1 grows from the inner section; each later band from the band before it.
        src_l, src_r, src_k = (("notC", "notD", "key") if band == 1 else ("olnot", "ornot", "gkey"))

        def small(nid, deg, r, branch, step, name=f"{reg['name']} outer"):
            add(p + nid, rid, "small", name, sk, sv, st, deg, r, branch=branch, step=step)
            pos[p + nid] = polar(deg, r)

        # Four hexagon wheels: six small nodes round a notable. Node 0 points back toward the middle.
        wheels = []
        for w, off in enumerate(WHEEL_ANGLES, start=1):
            c_deg = t + off
            cx, cy = polar(c_deg, RO["wheel"])
            inward = math.atan2(-cy, -cx)
            ring = []
            for k in range(6):
                a = inward + math.radians(60 * k)
                x, y = round(cx + RO["wheel_r"] * math.cos(a), 1), round(cy + RO["wheel_r"] * math.sin(a), 1)
                nid = p + f"w{w}n{k}"
                nodes.append({"id": nid, "region": rid, "branch": f"Outer wheel {w}", "step": 12, "type": "small",
                              "name": f"{reg['name']} wheel", "effect": st, "stat": sk, "value": sv, "cost": 1, "x": x, "y": y,
                              "hook": "Exists" if sk in EXISTING_HOOKS else "New work"})
                pos[nid] = (x, y)
                ring.append(nid)
            for k in range(6):
                link(ring[k], ring[(k + 1) % 6])
            name, nk, nv, ne = o["wheels"][w - 1]
            add(p + f"w{w}not", rid, "notable", name, nk, nv, ne, c_deg, RO["wheel"], branch=f"Outer wheel {w}", step=13)
            pos[p + f"w{w}not"] = (cx, cy)
            link(ring[0], p + f"w{w}not"); link(ring[3], p + f"w{w}not")
            wheels.append(ring)

        # Feeders: inner cluster notables to the side wheels; the inner keystone to the two middle wheels.
        for tag, src, wheel in (("fl", src_l, 0), ("fr", src_r, 3)):
            deg = t + WHEEL_ANGLES[wheel]
            small(f"{tag}1", deg, RO["feed1"], "Outer feeder", 11)
            small(f"{tag}2", deg, RO["feed2"], "Outer feeder", 11)
            link((base if band == 1 else prev) + src, p + f"{tag}1"); link(p + f"{tag}1", p + f"{tag}2"); link(p + f"{tag}2", wheels[wheel][0])
        small("fk1", t, RO["feed1"], "Outer feeder", 11)
        small("fk2", t, RO["feed2"], "Outer feeder", 11)
        link((base if band == 1 else prev) + src_k, p + "fk1"); link(p + "fk1", p + "fk2")
        link(p + "fk2", wheels[1][0]); link(p + "fk2", wheels[2][0])

        # Wheel to wheel: one small node between facing sides.
        for w in range(3):
            a_id = near(wheels[w], polar(t + WHEEL_ANGLES[w + 1], RO["wheel"]))
            b_id = near(wheels[w + 1], polar(t + WHEEL_ANGLES[w], RO["wheel"]))
            mx, my = (pos[a_id][0] + pos[b_id][0]) / 2, (pos[a_id][1] + pos[b_id][1]) / 2
            nid = p + f"wl{w + 1}"
            nodes.append({"id": nid, "region": rid, "branch": "Wheel link", "step": 12, "type": "small",
                          "name": f"{reg['name']} outer", "effect": st, "stat": sk, "value": sv, "cost": 1,
                          "x": round(mx, 1), "y": round(my, 1), "hook": "Exists" if sk in EXISTING_HOOKS else "New work"})
            pos[nid] = (mx, my)
            link(a_id, nid); link(nid, b_id)

        # Two outer notable paths, out from the side wheels.
        for tag, wheel, (name, nk, nv, ne) in (("ol", 0, o["outer"][0]), ("or", 3, o["outer"][1])):
            deg = t + WHEEL_ANGLES[wheel]
            small(f"{tag}1", deg, RO["out1"], "Outer path", 14)
            small(f"{tag}2", deg, RO["out2"], "Outer path", 14)
            add(p + f"{tag}not", rid, "notable", name, nk, nv, ne, deg, RO["outnot"], branch="Outer path", step=15)
            pos[p + f"{tag}not"] = polar(deg, RO["outnot"])
            link(wheels[wheel][3], p + f"{tag}1"); link(p + f"{tag}1", p + f"{tag}2"); link(p + f"{tag}2", p + f"{tag}not")

        # Grand keystone on the rim: two approaches from the middle wheels, and a cross link from each outer notable.
        gname, gk, gv, ge = o["grand"]
        add(p + "gkey", rid, "keystone", gname, gk, gv, ge, t, RO["gk"], branch="Grand keystone", step=17)
        pos[p + "gkey"] = polar(t, RO["gk"])
        for tag, wheel, lean in (("ga", 1, -1), ("gb", 2, 1)):
            small(f"{tag}1", t + lean * 4.5 * AF, RO["gk_a"], "Grand keystone approach", 15)
            small(f"{tag}2", t + lean * 2.5 * AF, RO["gk_b"], "Grand keystone approach", 16)
            link(wheels[wheel][3], p + f"{tag}1"); link(p + f"{tag}1", p + f"{tag}2"); link(p + f"{tag}2", p + "gkey")
        for tag, src, lean in (("xl", "olnot", -1), ("xr", "ornot", 1)):
            small(tag, t + lean * 10.5 * AF, RO["cross"], "Grand keystone approach", 16)
            link(p + src, p + tag); link(p + tag, p + "gkey")

        # Third bridge: this region's last wheel to the next region's first wheel, outside the wheels. Band 1 has two
        # nodes; further out the gap is wider, so those bands get a row of nodes (placed once every wheel exists).
        nk2, nv2, nt2 = nxt["small"]
        if band == 1:
            add(p + "bw1", rid, "bridge", "Bridge", sk, sv, st, t + 27.5 * AF, RO["bridge"], branch=f"Wheel bridge to {nxt['name']}", step=14)
            add(p + "bw2", nxt["id"], "bridge", "Bridge", nk2, nv2, nt2, t + 32.5 * AF, RO["bridge"], branch=f"Wheel bridge from {reg['name']}", step=14)
        pos[p + "bw1"] = polar(t + 27.5 * AF, RO["bridge"]); pos[p + "bw2"] = polar(t + 32.5 * AF, RO["bridge"])

    # Bridges join after every wheel exists.
    for i, reg in enumerate(REGIONS):
        nxt = REGIONS[(i + 1) % len(REGIONS)]
        p = f"{reg['id']}-" if band == 1 else f"{reg['id']}-b{band}-"
        q = f"{nxt['id']}-" if band == 1 else f"{nxt['id']}-b{band}-"
        t = -90 + WEDGE * i
        here = [p + f"w4n{k}" for k in range(6)]
        there = [q + f"w1n{k}" for k in range(6)]
        if band == 1:
            link(near(here, pos[p + "bw1"]), p + "bw1"); link(p + "bw1", p + "bw2"); link(p + "bw2", near(there, pos[p + "bw2"]))
            continue
        # Bands 2+: nodes about BRIDGE_SPACING apart along the same route (last wheel, the two bridge spots, first wheel
        # of the next class). The first half belong to this class, the rest to the next.
        start, end = near(here, pos[p + "bw1"]), near(there, pos[p + "bw2"])
        route = [pos[start], pos[p + "bw1"], pos[p + "bw2"], pos[end]]
        legs = [math.dist(route[k], route[k + 1]) for k in range(3)]
        total = sum(legs)
        count = max(2, round(total / BRIDGE_SPACING) - 1)
        prev_id = start
        for k in range(1, count + 1):
            d, leg = total * k / (count + 1), 0
            while d > legs[leg]:
                d -= legs[leg]; leg += 1
            (ax, ay), (bx, by) = route[leg], route[leg + 1]
            x, y = ax + (bx - ax) * d / legs[leg], ay + (by - ay) * d / legs[leg]
            mine = k <= (count + 1) // 2
            owner = reg if mine else nxt
            ok, ov, ot = owner["small"]
            nid = p + f"bw{k}"
            add(nid, owner["id"], "bridge", "Bridge", ok, ov, ot, math.degrees(math.atan2(y, x)), math.hypot(x, y),
                branch=f"Wheel bridge {'to' if mine else 'from'} {(nxt if mine else reg)['name']}", step=14)
            pos[nid] = (x, y)
            link(prev_id, nid)
            prev_id = nid
        link(prev_id, end)


# ---------------------------------------------------------------------------------------------------------------
# Workbook
# ---------------------------------------------------------------------------------------------------------------

FONT = "Arial"
HEAD_FILL = PatternFill("solid", fgColor="1F2430")
INPUT_FILL = PatternFill("solid", fgColor="FFF6D5")
THIN = Side(style="thin", color="D0D4DC")
# stat2 and value2 (a second effect, used by the Season Keys) come last so the other columns keep their letters.
NODE_COLS = ["id", "region", "branch", "step", "type", "name", "effect", "stat", "value", "cost", "hook", "earned_by", "x", "y", "notes", "stat2", "value2", "passive"]
NODE_WIDTH = [16, 11, 26, 6, 10, 18, 64, 24, 8, 7, 11, 13, 8, 8, 30]
TYPES = ["start", "class", "small", "notable", "gate", "special", "pentagon", "keystone", "ring", "bridge"]


def style_header(ws, row, ncols):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.font = Font(name=FONT, bold=True, color="FFFFFF")
        cell.fill = HEAD_FILL
        cell.alignment = Alignment(vertical="center")
    ws.freeze_panes = f"A{row + 1}"


GENERATED = {"Read me", "Classes", "Nodes", "Edges", "Points", "Summary", "Start Reach"}


def cheapest(nodes, edges, open_regions, target):
    """Fewest Perk Points from Station Core to `target` when only `open_regions` have their core link open."""
    import heapq
    by = {n["id"]: n for n in nodes}
    core = next(n["id"] for n in nodes if n["type"] == "start")
    adj = {n["id"]: set() for n in nodes}
    for a, b in edges:
        if core in (a, b):
            other = b if a == core else a
            if by[other]["region"] not in open_regions:
                continue
        adj[a].add(b)
        adj[b].add(a)
    dist, heap = {core: 0}, [(0, core)]
    while heap:
        d, cur = heapq.heappop(heap)
        if cur == target:
            return d
        if d > dist.get(cur, 1e9):
            continue
        for nb in adj[cur]:
            nd = d + by[nb]["cost"]
            if nd < dist.get(nb, 1e9):
                dist[nb] = nd
                heapq.heappush(heap, (nd, nb))
    return None


def write_start_reach(wb, nodes, edges):
    """How far each choice of starting regions is from what matters: the nearest Season Key and the keystones.
    Worked out by this script (shortest paths), so these are values, not formulas: rebuild after changing the tree."""
    ws = wb.create_sheet("Start Reach")
    ids = [r["id"] for r in REGIONS]
    names = {r["id"]: (f"{r['name']} ({r['focus']})" if r.get("focus") else r["name"]) for r in REGIONS}
    keys = [n["id"] for n in nodes if n["type"] == "gate"]

    def to_key(open_regions):
        found = [c for c in (cheapest(nodes, edges, open_regions, k) for k in keys) if c is not None]
        return min(found) if found else None
    # The region's own inner keystone and its first grand keystone (outer bands repeat grand keystones further out).
    ids_all = {n["id"] for n in nodes}
    inner = {rid: f"{rid}-key" for rid in ids if f"{rid}-key" in ids_all}
    grand = {rid: f"{rid}-gkey" for rid in ids if f"{rid}-gkey" in ids_all}

    ws["A1"] = "Start Reach: Perk Points from Station Core, by starting region"
    ws["A1"].font = Font(name=FONT, bold=True, size=13)
    ws["A2"] = "Worked out by build.py from the Nodes and Edges sheets (cheapest path). Values, not formulas: run build.py again after editing the tree."
    ws["A2"].font = Font(name=FONT, italic=True, color="666666")

    head = ["starting region", "to a Season Key", "to its own keystone", "to its own grand keystone"]
    for ci, h in enumerate(head, start=1):
        c = ws.cell(row=4, column=ci, value=h)
        c.font = Font(name=FONT, bold=True, color="FFFFFF")
        c.fill = HEAD_FILL
    for ri, rid in enumerate(ids, start=5):
        row = [names[rid], to_key({rid}),
               cheapest(nodes, edges, {rid}, inner.get(rid)), cheapest(nodes, edges, {rid}, grand.get(rid))]
        for ci, v in enumerate(row, start=1):
            ws.cell(row=ri, column=ci, value=v).font = Font(name=FONT)

    top = 5 + len(ids) + 2
    ws.cell(row=top - 1, column=1, value="Every pair of starting regions: Perk Points to the nearest Season Key").font = Font(name=FONT, bold=True)
    for ci, h in enumerate(["first start", "second start", "to a Season Key"], start=1):
        c = ws.cell(row=top, column=ci, value=h)
        c.font = Font(name=FONT, bold=True, color="FFFFFF")
        c.fill = HEAD_FILL
    r = top + 1
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            for ci, v in enumerate([names[a], names[b], to_key({a, b})], start=1):
                ws.cell(row=r, column=ci, value=v).font = Font(name=FONT)
            r += 1
    for col, w in zip("ABCD", (22, 20, 22, 26)):
        ws.column_dimensions[col].width = w


def keep_extra_sheets(wb, path):
    """Copies any sheet this script does not make (values, formulas, styles, widths) from the workbook being replaced."""
    if not Path(path).exists():
        return
    from copy import copy
    old = load_workbook(path)
    for name in old.sheetnames:
        if name in GENERATED:
            continue
        src = old[name]
        dst = wb.create_sheet(name, index=wb.sheetnames.index("Points"))
        for row in src.iter_rows():
            for c in row:
                if c.value is None and not c.has_style:
                    continue
                d = dst.cell(row=c.row, column=c.column, value=c.value)
                if c.has_style:
                    d.font, d.fill, d.border = copy(c.font), copy(c.fill), copy(c.border)
                    d.number_format, d.alignment = c.number_format, copy(c.alignment)
        for k, dim in src.column_dimensions.items():
            dst.column_dimensions[k].width = dim.width
        dst.freeze_panes = src.freeze_panes
        print("Kept the", name, "sheet")


def write_workbook(nodes, edges, path=XLSX):
    # Listed region by region, then step by step out from the middle.
    order = {r: i for i, r in enumerate(["core"] + [x["id"] for x in REGIONS] + ["ring"])}
    nodes = sorted(nodes, key=lambda n: (order.get(n["region"], 99), n["step"], n["branch"]))
    wb = Workbook()

    # ---- Read me ----
    ws = wb.active
    ws.title = "Read me"
    lines = [
        ("Perk Tree Sample", True),
        ("A branching perk tree for Command Station, drafted here before it is built into the app.", False),
        ("", False),
        ("Design rule", True),
        ("Command Station mostly sits in the background while you game. So the tree rewards gaming time, not clicking around the app.", False),
        ("Most nodes pay out from counted play time, finished sessions and days played, or the app simply running beside the game.", False),
        ("Only a few need you to act in the app (claiming a quest, making a draw). The 'earned_by' column and the Summary sheet show the split.", False),
        ("", False),
        ("How the tree works", True),
        ("1. You start on Station Core in the middle. It is free.", False),
        ("2. You can take any node that touches a node you already have. Several paths lead to the same place.", False),
        ("3. Small nodes give small bonuses. Notables (named, larger) give bigger ones. Keystones (outer rim) change a rule and come with a cost.", False),
        ("4. Neighbouring classes are not joined next to Station Core: you cannot step sideways from one class's first node into the next. They meet only at three Bridges further out, so changing class costs a real walk.", False),
        ("5. Past each inner keystone is an outer band: four hexagon wheels (six small nodes round a notable), two outer notable paths, and a grand keystone on the rim.", False),
        ("6. Perk Points come from rank-ups and Season Pass levels, up to a cap (see the Points sheet). One free full reset per month.", False),
        ("7. Starting regions: Station Core links to every region, but each player opens only 2 of those links (Points sheet, B16). There is no menu: your first 2 paths out of Station Core become your starting regions, and then the core's other links close. Every other region is reached by walking out to the Bridges, paying for each node on the way. Giving back a start's first node frees that start; the monthly free reset frees both. The Start Reach sheet shows what each choice costs to reach a Season Key and the keystones.", False),
        ("8. Squares (diamonds) cost no points, but a player holds at most 8 of them (Points sheet, B17). Every class has 12: its Season Key and 11 Specials, each on its own branch, spread over all five bands. Pentagons are the class's 5 unique nodes, one beside each grand keystone; they cost no points, and a player holds 3 in all (B18). A Season Key uses a slot. Each class's Key opens Season Pass levels 46 to 60 and adds a small extra of its own (stat2 and value2 on the Nodes sheet); a second Key opens nothing more, but its extra counts.", False),
        ("9. In the app there are no ranks: Perk Points come only from the start and Season Pass levels. The rank row on the Points sheet only feeds the Try-it numbers here.", False),
        ("", False),
        ("How to edit", True),
        ("This workbook is tables and lists only. The branching picture is in perk-tree-sample.html.", False),
        ("Nodes sheet: change name, effect, stat, value, cost, x, y, notes, or the second effect (stat2, value2). Cells you are meant to edit are on a pale yellow fill.", False),
        ("Edges sheet: each row joins two node ids. Add or delete rows to change the paths.", False),
        ("Points sheet: change the yellow inputs to see how many points a player would have.", False),
        ("Summary sheet: counts update by themselves (formulas).", False),
        ("Then run:  python build.py   in this folder to rebuild perk-tree-sample.html from this workbook.", False),
        ("", False),
        ("Columns on the Nodes sheet", True),
        ("branch / step: where the node sits (Spoke, Left arm, Right arm, the way to the Keystone, Bridge, Crosswalk) and how many steps out from the middle. Rows are listed region by region, step by step.", False),
        ("type: start, small, notable, keystone, ring or bridge.", False),
        ("stat / value: what the node adds. Nodes with the same stat add up (see the totals in the HTML sample).", False),
        ("earned_by: Play time, Sessions, Background or Always pay out while you game; Quests and Draws need you to act; Rule change is a keystone.", False),
        ("hook: Exists means the app can already apply this effect; New work means it needs building first.", False),
        ("x / y: position in layout units. The middle is 0,0; up is negative y.", False),
        ("", False),
        ("Regions", True),
        ("Each region is a class you can start in: Tycoon (Payroll: Income from play), Climber (Season Pass), Sentinel (Sessions: sessions and days played), Devotee (Streaks), Prospector (Loot: Tickets, fragments and items from play), Mercenary (Quests), Phantom (Background: the app running beside the game) and Gearhead (Rig: the PC itself).", False),
        ("", False),
        ("Colours", True),
        ("Region colours avoid gold and yellow, following the decision to retire them. Station uses bright silver.", False),
    ]
    for i, (text, bold) in enumerate(lines, start=1):
        c = ws.cell(row=i, column=1, value=text)
        c.font = Font(name=FONT, bold=bold, size=14 if i == 1 else 11)
    ws.column_dimensions["A"].width = 120

    # ---- Classes: what each of the 8 is about ----
    ws = wb.create_sheet("Classes")
    head = ["class", "colour", "focus", "pays out from", "small node", "keystones", "nodes", "notables", "nodes paid while gaming"]
    ws.append(head)
    style_header(ws, 1, len(head))
    small_label = {n["stat"]: n["effect"] for n in nodes if n["type"] == "small"}
    for r, reg in enumerate(REGIONS, start=2):
        info = CLASS_FOCUS[reg["id"]]
        keys = [n["name"] for n in nodes if n["region"] == reg["id"] and n["type"] == "keystone" and "(band" not in n["branch"]]
        ws.append([reg["name"], reg["color"], info[0], info[1], f"{SMALL_NAME.get(reg['small'][0], '')}: {reg['small'][2]}", ", ".join(keys)])
        ws.cell(row=r, column=7, value=f'=COUNTIF(Nodes!$B:$B,"{reg["id"]}")')
        ws.cell(row=r, column=8, value=f'=COUNTIFS(Nodes!$B:$B,"{reg["id"]}",Nodes!$E:$E,"notable")')
        ws.cell(row=r, column=9, value=f'=IF(G{r}=0,0,(COUNTIFS(Nodes!$B:$B,"{reg["id"]}",Nodes!$L:$L,"<>Quests")-COUNTIFS(Nodes!$B:$B,"{reg["id"]}",Nodes!$L:$L,"Draws"))/G{r})')
        ws.cell(row=r, column=9).number_format = "0%"
        ws.cell(row=r, column=2).fill = PatternFill("solid", fgColor=reg["color"].lstrip("#").upper())
        for c in range(1, len(head) + 1):
            cell = ws.cell(row=r, column=c)
            cell.font = Font(name=FONT, bold=c == 1)
            cell.alignment = Alignment(wrap_text=True, vertical="top")
    for i, w in enumerate([13, 10, 58, 30, 52, 30, 8, 9, 14], start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    note = len(REGIONS) + 3
    ws.cell(row=note, column=1, value="Every class pays out mostly while you game. Neighbouring classes sit side by side on the tree and are joined by Bridges further out.").font = Font(name=FONT, italic=True, color="666666")

    # ---- Nodes ----
    ws = wb.create_sheet("Nodes")
    ws.append(NODE_COLS)
    style_header(ws, 1, len(NODE_COLS))
    for n in nodes:
        ws.append([n.get(k, "") for k in NODE_COLS])
    for i, w in enumerate(NODE_WIDTH, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    editable = {"name", "effect", "stat", "value", "cost", "x", "y", "notes", "stat2", "value2", "passive"}
    for r in range(2, len(nodes) + 2):
        for ci, key in enumerate(NODE_COLS, start=1):
            cell = ws.cell(row=r, column=ci)
            cell.font = Font(name=FONT)
            cell.border = Border(bottom=THIN)
            if key in editable:
                cell.fill = INPUT_FILL
            if key == "effect":
                cell.alignment = Alignment(wrap_text=True, vertical="top")
    dv = DataValidation(type="list", formula1='"' + ",".join(TYPES) + '"', allow_blank=False)
    ws.add_data_validation(dv)
    dv.add(f"E2:E{len(nodes) + 200}")
    ws["J1"].comment = Comment("Perk Points to take this node: small, bridge and crosswalk 1, notable 2, keystone 3. Station Core is free.", "Sample")
    ws["C1"].comment = Comment("Where the node sits in its region: the Spoke from the middle, the Left or Right arm, the way to the Keystone, or a Bridge or Crosswalk to the next region.", "Sample")
    ws["D1"].comment = Comment("Steps out from Station Core along that branch (1 is next to the middle).", "Sample")
    ws["L1"].comment = Comment("What earns this node's reward: Play time, Sessions, Background or Always pay out while you game; Quests and Draws need you to act in the app; Rule change is a keystone.", "Sample")
    ws["K1"].comment = Comment("Exists: the app already has a place to apply this effect. New work: needs building first.", "Sample")
    ws.auto_filter.ref = f"A1:{get_column_letter(len(NODE_COLS))}{len(nodes) + 1}"

    # ---- Edges ----
    ws = wb.create_sheet("Edges")
    ws.append(["from", "to", "from ok", "to ok"])
    style_header(ws, 1, 4)
    for i, (a, b) in enumerate(edges, start=2):
        ws.append([a, b])
        # Flags a typo: the id must exist on the Nodes sheet.
        ws.cell(row=i, column=3, value=f'=IF(COUNTIF(Nodes!$A:$A,A{i})>0,"ok","missing")')
        ws.cell(row=i, column=4, value=f'=IF(COUNTIF(Nodes!$A:$A,B{i})>0,"ok","missing")')
        for c in range(1, 5):
            ws.cell(row=i, column=c).font = Font(name=FONT)
        ws.cell(row=i, column=1).fill = INPUT_FILL
        ws.cell(row=i, column=2).fill = INPUT_FILL
    for col, w in zip("ABCD", (16, 16, 10, 10)):
        ws.column_dimensions[col].width = w

    # ---- Points ----
    ws = wb.create_sheet("Points")
    ws["A1"] = "Perk Points"
    ws["A1"].font = Font(name=FONT, bold=True, size=13)
    rows = [
        ("Starting points", 2, "Every player starts with these."),
        ("Points per rank-up", 3, "Recruit to Regular, Veteran and Night: 3 rank-ups in all."),
        ("Points per Season Pass level", 1, "Lifetime Pass levels, across every season."),
        ("Points cap", 150, "The most points anyone can hold: under a third of the tree, so choices matter."),
        ("", None, ""),
        ("Try it: player's rank (1 to 4)", 2, "1 Recruit, 2 Regular, 3 Veteran, 4 Night."),
        ("Try it: lifetime Pass levels", 60, "For example two full seasons."),
    ]
    for i, (label, val, note) in enumerate(rows, start=3):
        ws.cell(row=i, column=1, value=label).font = Font(name=FONT)
        if val is not None:
            c = ws.cell(row=i, column=2, value=val)
            c.font = Font(name=FONT, color="0000FF")
            c.fill = INPUT_FILL
        ws.cell(row=i, column=3, value=note).font = Font(name=FONT, italic=True, color="666666")
    ws["A11"] = "Points this player has"
    ws["A11"].font = Font(name=FONT, bold=True)
    ws["B11"] = "=MIN(B6,B3+B4*MAX(0,B8-1)+B5*B9)"
    ws["B11"].font = Font(name=FONT, bold=True)
    ws["C11"] = "Starting + rank-ups + Pass levels, never above the cap."
    ws["C11"].font = Font(name=FONT, italic=True, color="666666")
    ws["A12"] = "Nodes in the tree (excluding Station Core)"
    ws["A12"].font = Font(name=FONT)
    ws["B12"] = '=COUNTA(Nodes!A:A)-1-COUNTIF(Nodes!E:E,"start")'
    ws["B12"].font = Font(name=FONT)
    ws["A13"] = "Share of the tree this player can take"
    ws["A13"].font = Font(name=FONT)
    ws["B13"] = "=IF(B12=0,0,B11/B12)"
    ws["B13"].number_format = "0.0%"
    ws["B13"].font = Font(name=FONT)
    ws["A14"] = "Points to fill the whole tree"
    ws["A14"].font = Font(name=FONT)
    ws["B14"] = "=SUM(Nodes!J:J)"
    ws["B14"].font = Font(name=FONT)
    ws["A16"] = "Starting regions a player opens"
    ws["A16"].font = Font(name=FONT)
    ws["B16"] = 2
    ws["B16"].font = Font(name=FONT, color="0000FF")
    ws["B16"].fill = INPUT_FILL
    ws["C16"] = "Station Core links to every region, but a player opens only this many of those links. Other regions are reached over the Bridges further out."
    ws["C16"].font = Font(name=FONT, italic=True, color="666666")
    ws["A17"] = "Square nodes a player can hold"
    ws["A17"].font = Font(name=FONT)
    ws["B17"] = SQUARE_LIMIT
    ws["B17"].font = Font(name=FONT, color="0000FF")
    ws["B17"].fill = INPUT_FILL
    ws["C17"] = "Squares (Season Keys and Specials) cost no points, but a player holds at most this many. A Season Key uses a slot."
    ws["C17"].font = Font(name=FONT, italic=True, color="666666")
    ws["A18"] = "Pentagon nodes a player can hold"
    ws["A18"].font = Font(name=FONT)
    ws["B18"] = PENTAGON_LIMIT
    ws["B18"].font = Font(name=FONT, color="0000FF")
    ws["B18"].fill = INPUT_FILL
    ws["C18"] = "Pentagons (five unique nodes per class, one beside each grand keystone) cost no points, but a player holds at most this many."
    ws["C18"].font = Font(name=FONT, italic=True, color="666666")
    ws.column_dimensions["A"].width = 42
    ws.column_dimensions["B"].width = 12
    ws.column_dimensions["C"].width = 60

    # ---- Summary ----
    ws = wb.create_sheet("Summary")
    head = ["region", "small", "notable", "keystone", "bridge", "all nodes", "effects that exist", "effects needing work"]
    ws.append(head)
    style_header(ws, 1, len(head))
    for i, reg in enumerate([r["id"] for r in REGIONS] + ["ring"], start=2):
        ws.cell(row=i, column=1, value=reg)
        for ci, kind in enumerate(["small", "notable", "keystone", "bridge"], start=2):
            ws.cell(row=i, column=ci, value=f'=COUNTIFS(Nodes!$B:$B,$A{i},Nodes!$E:$E,"{kind}")')
        ws.cell(row=i, column=6, value=f"=COUNTIF(Nodes!$B:$B,$A{i})")
        ws.cell(row=i, column=7, value=f'=COUNTIFS(Nodes!$B:$B,$A{i},Nodes!$K:$K,"Exists")')
        ws.cell(row=i, column=8, value=f'=COUNTIFS(Nodes!$B:$B,$A{i},Nodes!$K:$K,"New work")')
    last = 2 + len(REGIONS)
    tot = last + 1
    ws.cell(row=tot, column=1, value="Total")
    for c in range(2, 9):
        col = get_column_letter(c)
        ws.cell(row=tot, column=c, value=f"=SUM({col}2:{col}{last})")
    for row in ws.iter_rows(min_row=2, max_row=tot):
        for cell in row:
            cell.font = Font(name=FONT, bold=cell.row == tot)
    for i, w in enumerate([22, 8, 9, 10, 8, 10, 18, 20], start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # What earns each node: the tree should mostly pay out while you game, with no clicks needed.
    top = tot + 3
    ws.cell(row=top - 1, column=1, value="What earns each node").font = Font(name=FONT, bold=True)
    for ci, h in enumerate(["earned by", "nodes", "share", "needs you in the app?"], start=1):
        c = ws.cell(row=top, column=ci, value=h)
        c.font = Font(name=FONT, bold=True, color="FFFFFF")
        c.fill = HEAD_FILL
    kinds = [("Play time", "No"), ("Sessions", "No"), ("Background", "No"), ("Always", "No"),
             ("Quests", "Yes: claim a quest"), ("Draws", "Yes: make a draw"), ("Rule change", "No (keystone)")]
    for k, (name, needs) in enumerate(kinds, start=top + 1):
        ws.cell(row=k, column=1, value=name).font = Font(name=FONT)
        ws.cell(row=k, column=2, value=f'=COUNTIF(Nodes!$L:$L,A{k})').font = Font(name=FONT)
        c = ws.cell(row=k, column=3, value=f"=IF($F${tot}=0,0,B{k}/$F${tot})")
        c.font = Font(name=FONT)
        c.number_format = "0.0%"
        ws.cell(row=k, column=4, value=needs).font = Font(name=FONT)
    end = top + len(kinds)
    ws.cell(row=end + 1, column=1, value="Paid out while you game").font = Font(name=FONT, bold=True)
    c = ws.cell(row=end + 1, column=2, value=f"=SUM(B{top + 1}:B{top + 4})+B{top + 7}")
    c.font = Font(name=FONT, bold=True)
    c = ws.cell(row=end + 1, column=3, value=f"=IF($F${tot}=0,0,B{end + 1}/$F${tot})")
    c.font = Font(name=FONT, bold=True)
    c.number_format = "0.0%"
    ws.cell(row=end + 1, column=4, value="Play time, Sessions, Background, Always and keystones.").font = Font(name=FONT, italic=True, color="666666")

    write_start_reach(wb, nodes, edges)
    keep_extra_sheets(wb, path)
    wb.save(path)


def read_workbook(path=XLSX):
    wb = load_workbook(path, data_only=False)
    ws = wb["Nodes"]
    head = [c.value for c in ws[1]]
    nodes = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or row[0] in (None, ""):
            continue
        n = dict(zip(head, row))
        n["id"] = str(n["id"]).strip()
        n["value"] = float(n["value"] or 0)
        n["cost"] = int(n["cost"] or 0)
        n["x"] = float(n["x"] or 0)
        n["y"] = float(n["y"] or 0)
        n["step"] = int(n.get("step") or 0)
        for k in ("region", "branch", "type", "name", "effect", "stat", "hook", "earned_by", "notes", "stat2"):
            n[k] = "" if n.get(k) is None else str(n[k])
        n["value2"] = float(n.get("value2") or 0)
        nodes.append(n)
    ids = {n["id"] for n in nodes}
    edges, bad = [], []
    for row in wb["Edges"].iter_rows(min_row=2, values_only=True):
        if not row or not row[0] or not row[1]:
            continue
        a, b = str(row[0]).strip(), str(row[1]).strip()
        (edges if a in ids and b in ids else bad).append((a, b))
    if bad:
        print("Edges with an unknown node id (left out of the HTML):", bad)
    ps = wb["Points"]
    points = {"start": ps["B3"].value, "perRank": ps["B4"].value, "perPassLevel": ps["B5"].value, "cap": ps["B6"].value,
              "starts": int(ps["B16"].value or 2), "squares": int(ps["B17"].value or SQUARE_LIMIT),
              "pentagons": int(ps["B18"].value or PENTAGON_LIMIT)}
    return nodes, edges, points


def write_html(nodes, edges, points, stat_info=None):
    regions = [{"id": r["id"], "name": r["name"], "focus": r.get("focus", ""), "color": r["color"]} for r in REGIONS]
    if any(n["region"] == "ring" for n in nodes):
        regions.append({"id": "ring", "name": "Crosswalk", "color": "#b8c0cc"})
    regions.append({"id": "core", "name": "Station Core", "color": "#f0893a"})
    levels = player_level_data(nodes) if LEVEL_PAGE.exists() else None
    data = {"levels": levels, "nodes": nodes, "edges": edges, "regions": regions, "points": points, "statLabels": {k: [v[0], v[1]] for k, v in (stat_info or STAT_INFO).items()}}
    icons, tones = icon_parts()
    html = TEMPLATE.read_text(encoding="utf-8").replace("<!--__ICONS__-->", icons).replace("/*__TONES__*/", tones)
    html = html.replace("/*__DATA__*/null", json.dumps(data, ensure_ascii=False))
    HTML.write_text(html, encoding="utf-8")


APP_CONTENT = HERE.parent.parent / "app" / "src" / "content"
CURVE_PAGE = HERE / "level-curve.html"

# ---- Player level pacing: the decided design (2026-11-18) -----------------------------------------------------------
# These are the rules. The numbers (XP per level, max level) are worked out from the tree every build, so adding or
# removing nodes keeps the same timing: the reference player always finishes one full class in one month.
PACING = {
    "counted": "App running time, no daily cap",
    "ref_hours_per_week": 56,          # the reference player: the app runs 8 h a day, 7 days a week
    "first_class_weeks": 52.18 / 12,   # ...and finishes one full class in 1 month
    "quick_levels": 10,                # the first levels are quick, so the first session shows progress
    "quick_minutes": 30,               # ...30 counted minutes each
    "xp_per_minute": 30,
    "points_per_level": 8.55,          # the average: the tree a player can take is paid by level 250 (see reach_cost)
    "start_points": 4,
    "max_level": 300,                  # the level cap (2026-11-18); the tree must be paid for by then (checked in pacing())
}
# Other players the timing table reports on (counted hours a week).
PACING_PLAYERS = [("8 h a day, every day (reference)", 56), ("Average PC player", 9.7), ("Lightest player", 4), ("App never closed", 168)]


def band_of(node):
    """Band 1 to 6 of a node: its explicit band if it has one (the redesigned IV to VI nodes), else its tier word
    (band 1 has none): "Grinder III" is band 3."""
    if node.get("band"):
        return node["band"]
    for i in range(4, 0, -1):
        if node["name"].endswith(" " + ROMAN[i]):
            return i + 1
    return 1


def reach_cost(nodes):
    """Points a player can ever take: every class up to band III, plus bands IV and V in the 2 classes they start in.
    The dearest 2 classes are used, so any pair of starting classes is covered."""
    low = sum(n["cost"] for n in nodes if n["region"] != "core" and band_of(n) <= 3)
    top = {}
    for n in nodes:
        if n["region"] != "core" and 4 <= band_of(n) <= 5:
            top[n["region"]] = top.get(n["region"], 0) + n["cost"]
    return low + sum(sorted(top.values(), reverse=True)[:2])


def pacing(nodes, edges):
    """XP per level and max level for the decided timing, from this tree's real costs (the costs the app charges)."""
    P = PACING
    ppl, start, q, qh = P["points_per_level"], P["start_points"], P["quick_levels"], P["quick_minutes"] / 60
    level_for = lambda pts: 1 + math.ceil(max(0, pts - start) / ppl)
    ids = [r["id"] for r in REGIONS]
    # A full class: every node built in it (its id starts with the class id), at the app's costs. The dearest class
    # sets the pace, so no class takes longer than the month.
    class_cost = max(sum(n["cost"] for n in nodes if n["id"].startswith(rid + "-")) for rid in ids)
    tree_cost = sum(n["cost"] for n in nodes)
    by = {n["id"]: n for n in nodes}
    outer = max((n for n in nodes if n["type"] == "keystone" and n["region"] == ids[0]), key=lambda n: math.hypot(n["x"], n["y"]))
    top_cost = cheapest(nodes, edges, {ids[0]}, outer["id"])
    class_level = level_for(class_cost)
    flat_levels = class_level - 1 - q
    hours = P["ref_hours_per_week"] * P["first_class_weeks"]
    flat_xp = round((hours - q * qh) / flat_levels * 60 * P["xp_per_minute"] / 50) * 50
    flat_h = flat_xp / P["xp_per_minute"] / 60
    reach = reach_cost(nodes)
    tree_level = level_for(reach)             # the level where everything a player can take is paid for
    max_level = P["max_level"]
    assert tree_level <= max_level, f"the tree needs level {tree_level}, past the level cap {max_level}"
    to_level = lambda L: min(L - 1, q) * qh + max(0, L - 1 - q) * flat_h
    return {
        "classCost": class_cost, "treeCost": tree_cost, "reachCost": reach, "topCost": top_cost, "topName": by[outer["id"]]["name"],
        "classLevel": class_level, "treeLevel": tree_level, "maxLevel": max_level,
        "flatXp": flat_xp, "flatHours": round(flat_h, 2), "quickXp": round(qh * 60 * P["xp_per_minute"]),
        "hours": {"firstClass": round(to_level(class_level), 1), "secondClass": round(to_level(level_for(2 * class_cost)), 1),
                  "tree": round(to_level(tree_level), 1)},
    }


def describe_pacing(pc):
    def cal(h, wk):
        w = h / wk
        return f"{w * 7:.0f} days" if w < 1 else f"{w:.1f} weeks" if w < 9 else f"{w / 4.345:.1f} months" if w / 4.345 < 18 else f"{w / 52.18:.1f} years"
    lines = [f"Pacing: {PACING['counted']}; first class in 1 month at {PACING['ref_hours_per_week']} h a week.",
             f"  Tree costs {pc['treeCost']:,} ({pc['reachCost']:,} of it can be taken: all classes to band III, bands IV and V in 2), one full class {pc['classCost']:,}, top of a class ({pc['topName']}) {pc['topCost']}.",
             f"  {PACING['quick_levels']} quick levels of {PACING['quick_minutes']} min ({pc['quickXp']:,} XP), then {pc['flatXp']:,} XP ({pc['flatHours']} h) a level; "
             f"{PACING['points_per_level']} points a level from {PACING['start_points']}; max level {pc['maxLevel']} (the tree completes at {pc['treeLevel']})."]
    for name, wk in PACING_PLAYERS:
        hs = pc["hours"]
        lines.append(f"  {name} ({wk:g} h/wk): first class {cal(hs['firstClass'], wk)}, second {cal(hs['secondClass'], wk)}, whole tree {cal(hs['tree'], wk)}")
    return "\n".join(lines)


def write_curve_page(pc):
    """Puts the decided pacing into level-curve.html (between its PACING markers), so the page always shows the real tree."""
    if not CURVE_PAGE.exists():
        return
    text = CURVE_PAGE.read_text(encoding="utf-8")
    a, b = "/*__PACING__*/", "/*__PACING_END__*/"
    i, j = text.find(a), text.find(b)
    if i < 0 or j < i:
        print(CURVE_PAGE.name, "has no PACING markers, so its tree numbers were not updated")
        return
    data = {"rules": PACING, **pc}
    block = (f"{a}\n// Written by build.py from the tree: do not edit by hand. Change the tree or PACING in build.py and rebuild.\n"
             f"const PACING = {json.dumps(data)};\n{b}")
    CURVE_PAGE.write_text(text[:i] + block + text[j + len(b):], encoding="utf-8")


# Each class node shows one icon for its class.
CLASS_ICON = {r: f"class-{r}" for r in ("payroll", "pass", "sessions", "streaks", "loot", "quests", "background", "rig")}


def node_icon(n, stat_icon):
    """The icon a node shows: the same choice the simulator's iconFor() makes."""
    if n["type"] == "start":
        return "core"
    if n["type"] == "class":
        return CLASS_ICON.get(n["region"], "core")
    if n["type"] == "keystone":
        return "keystone"
    if n["stat"] in stat_icon:
        return stat_icon[n["stat"]]
    for pattern, icon in [(r"ticket", "ticket"), (r"fragment", "disk"), (r"passxp|passcap", "xp"), (r"quest", "check"),
                          (r"streak", "streak"), (r"hour", "clock-coin")]:
        if re.search(pattern, n["stat"] or "", re.I):
            return icon
    return "coin"


def write_app(nodes, edges, points, stat_info=None):
    """The tree for the app: app/src/content/perkTreeData.ts (nodes, links, classes, point rules) and perkIcons.ts
    (the icon drawings). Both are generated; edit the workbook and run this again."""
    if not APP_CONTENT.exists():
        print("No app folder beside the design folder, so the app's tree was not written")
        return
    template = TEMPLATE.read_text(encoding="utf-8")
    block = re.search(r"const STAT_ICON = \{(.*?)\n\};", template, re.S)
    stat_icon = dict(re.findall(r'(\w+): "([\w-]+)"', block.group(1))) if block else {}
    # Later additions (Object.assign(STAT_ICON, {...})) win, as they do in the simulator.
    for extra in re.findall(r"Object\.assign\(STAT_ICON, \{(.*?)\n\}\);", template, re.S):
        stat_icon.update(re.findall(r'(\w+): "([\w-]+)"', extra))

    def num(v):
        v = float(v or 0)
        return int(v) if v.is_integer() else round(v, 2)

    regions = [{"id": r["id"], "name": r["name"], "focus": r.get("focus", ""), "color": r["color"]} for r in REGIONS]
    regions.append({"id": "core", "name": "Station Core", "focus": "", "color": "#f0893a"})
    rows = []
    for n in nodes:
        rows.append(json.dumps({
            "id": n["id"], "region": n["region"], "type": n["type"], "name": n["name"], "effect": n["effect"],
            "stat": n["stat"] or "", "value": num(n["value"]), "cost": int(n["cost"] or 0),
            "x": round(float(n["x"]), 1), "y": round(float(n["y"]), 1), "earnedBy": n["earned_by"] or "",
            "icon": node_icon(n, stat_icon),
            **({"stat2": n["stat2"], "value2": num(n["value2"])} if n.get("stat2") else {}),
            # Keystones, pentagons and band V notables carry a passive; the app shows it in the hover tip and the side panel.
            **({"passive": n["passive"]} if n.get("passive") else {}),
        }, ensure_ascii=False))
    labels = {k: [v[0], v[1]] for k, v in (stat_info or STAT_INFO).items()}
    # The app has no ranks (the Points sheet's per-rank row only feeds this simulator), so it gets no per-rank points.
    pts = {k: int(points[k]) for k in ("start", "perPassLevel", "cap", "starts", "squares", "pentagons")}
    pc = pacing(nodes, edges)
    # The nodes go in typed chunks: one array literal of ~3,000 mixed objects is more than TypeScript will type (TS2590).
    parts = [rows[i:i + 800] for i in range(0, len(rows), 800)]
    ts = "\n".join([
        "// Generated by design/perk-tree-sample/build.py from the perk tree workbook. Do not edit by hand:",
        "// change the workbook (or tree_content.py) and run `python build.py` in that folder.",
        'import type { PerkNode, PerkTreeData } from "../state/perks.ts";',
        "",
        *[line for k, part in enumerate(parts) for line in ([f"const NODES_{k}: PerkNode[] = ["] + [f"  {r}," for r in part] + ["];", ""])],
        "export const PERK_TREE: PerkTreeData = {",
        f"  points: {json.dumps(pts)},",
        "  // Player level pacing (decided 2026-11-18): worked out from this tree by build.py. See PACING there.",
        f"  pacing: {json.dumps({'rules': PACING, **pc})},",
        "  regions: [",
        *[f"    {json.dumps(r, ensure_ascii=False)}," for r in regions],
        "  ],",
        f"  statLabels: {json.dumps(labels, ensure_ascii=False)},",
        f"  nodes: [{', '.join(f'...NODES_{k}' for k in range(len(parts)))}],",
        "  edges: [",
        *[f"    {json.dumps([a, b])}," for a, b in edges],
        "  ],",
        "};",
        "",
    ])
    (APP_CONTENT / "perkTreeData.ts").write_text(ts, encoding="utf-8", newline="\n")
    icons, _ = icon_parts()
    symbols = re.sub(r"<!--.*?-->", "", icons, flags=re.S)
    symbols = re.sub(r">\s+<", "><", symbols).strip()
    # Prefixed so the drawings' ids and tone classes cannot meet anything else in the app.
    symbols = symbols.replace('id="i-', 'id="pki-')
    symbols = re.sub(r'class="([^"]+)"', lambda m: 'class="' + " ".join("pki-" + c for c in m.group(1).split()) + '"', symbols)
    (APP_CONTENT / "perkIcons.ts").write_text(
        "// Generated by design/perk-tree-sample/build.py from perk-node-icons.html. Do not edit by hand.\n"
        "// The perk node drawings, as <symbol id=\"pki-…\"> elements for an inline <defs>; tone classes are pki-ta and so on.\n"
        f"export const PERK_ICON_SYMBOLS = {json.dumps(symbols, ensure_ascii=False)};\n",
        encoding="utf-8", newline="\n")
    print(f"Wrote the app's tree: {len(nodes)} nodes, {len(edges)} edges")


ICON_SHEET = HERE / "perk-node-icons.html"


def icon_parts():
    """The node icon drawings and their tone classes, copied from the icon sheet so the tree and the sheet cannot
    drift apart. Without the sheet (or its markers) the tree is built with no icons."""
    if not ICON_SHEET.exists():
        print(ICON_SHEET.name, "is missing, so the tree has no node icons")
        return "", ""
    text = ICON_SHEET.read_text(encoding="utf-8")

    def between(start, end):
        i, j = text.find(start), text.find(end)
        return text[i + len(start):j] if 0 <= i < j else ""

    icons, tones = between("<!-- icons:start -->", "<!-- icons:end -->"), between("/* tones:start */", "/* tones:end */")
    if not icons or not tones:
        print(ICON_SHEET.name, "has lost its icons or tones markers, so the tree has no node icons")
        return "", ""
    return icons, tones


# ---------------------------------------------------------------------------------------------------------------
# Player levels (decided 2026-11-18). The numbers live in player-level-xp.html (its DEF, MAPLE, BANDS and DEF_BANDS);
# this reads them, fits the earn the same way the page does, and writes app/src/content/playerLevelData.ts.
# ---------------------------------------------------------------------------------------------------------------

LEVEL_PAGE = HERE / "player-level-xp.html"


def level_page_values():
    text = LEVEL_PAGE.read_text(encoding="utf-8")
    deff = {k: float(v) for k, v in re.findall(r"(\w+):(-?[\d.]+)", re.search(r"const DEF = \{(.*?)\};", text, re.S).group(1))}
    maple = [int(x) for x in re.search(r'const MAPLE = "([^"]+)"', text).group(1).split(",")]
    bands = json.loads(re.search(r"const BANDS = (\[\[.*?\]\]);", text, re.S).group(1))
    point_bands = [[int(a), int(b), float(c)] for a, b, c in re.findall(r"(\d+)-(\d+):([\d.]+)", re.search(r'const DEF_BANDS = "([^"]+)"', text).group(1))]
    return deff, maple, bands, point_bands


def player_level_data(nodes):
    """Level table: XP needed per level, XP earned per counted hour at that level, Perk Points by level, and the counted
    hours to reach each level. Used by the app's data file and by the tree simulator's time estimate."""
    # Levels after 250 pay 1 point each until the dearest band VI path is paid; the page's DEF_BANDS is kept in step.
    paths = {}
    for n in nodes:
        if n.get("band") == 6:
            paths[(n["region"], n["branch"])] = paths.get((n["region"], n["branch"]), 0) + n["cost"]
    last = 250 + max(paths.values(), default=0)
    text = LEVEL_PAGE.read_text(encoding="utf-8")
    fixed = re.sub(r'(const DEF_BANDS = "[^"]*?241-250:4).*?"', rf'\g<1>, 251-{last}:1, {last + 1}-300:0"', text)
    if fixed != text:
        LEVEL_PAGE.write_text(fixed, encoding="utf-8", newline="")
    d, maple, bands, point_bands = level_page_values()
    max_level, start = int(d["maxLevel"]), d["startPts"]
    need = [m * ((1 - d["cutPct"] / 100) if L >= d["cutFrom"] else 1) for L, m in enumerate(maple, start=1)][: max_level - 1]
    per_level = {L: 0.0 for L in range(1, max_level + 1)}
    for a, b, pts in point_bands:
        for L in range(a, b + 1):
            per_level[L] = pts
    points = [start]
    for L in range(2, max_level + 1):
        points.append(points[-1] + per_level[L])
    reach = reach_cost(nodes)
    target_level = next(i + 1 for i, p in enumerate(points) if p >= reach)   # the level that pays for everything reachable

    def rate(L):
        return (d["earnLow"] if L < 200 else [r for s, r in bands if s <= L][-1]) * 1e8

    def eff(L, n, boost):
        base = max(rate(L) * boost, n * d["minPct"] * 0.06)
        return min(base, n * d["maxPct"] * 0.06) if d["maxPct"] > 0 else base

    def hours(boost, upto):
        return sum(need[i] / eff(i + 1, need[i], boost) for i in range(upto - 1))

    goal = d["fitMonths"] * 30.44 / 7 * 56          # counted hours the reference player (56 h a week) needs for target_level
    lo, hi = 1e-9, 1e9
    for _ in range(200):
        mid = math.sqrt(lo * hi)
        lo, hi = (mid, hi) if hours(mid, target_level) > goal else (lo, mid)
    boost = hi
    per_hour = [eff(i + 1, need[i], boost) for i in range(len(need))]
    cum = [0.0]
    for i in range(len(need)):
        cum.append(cum[-1] + need[i] / per_hour[i])
    data = {
        "points": points, "cumHours": [round(h, 2) for h in cum], "boost": boost,
        "maxLevel": max_level, "targetLevel": target_level, "startPoints": start, "reachCost": reach,
        "lastPointLevel": max(L for L, pts in per_level.items() if pts > 0),
        "pointBands": point_bands, "need": [round(n) for n in need], "perHour": [round(x, 4) for x in per_hour],
        "rules": {"source": "MapleStory level table (Namu Wiki, KMS), cut from level " + str(int(d["cutFrom"])), "cutFrom": d["cutFrom"], "cutPct": d["cutPct"],
                  "floorPct10min": d["minPct"], "ceilingPct10min": d["maxPct"], "fitMonths": d["fitMonths"], "fitHoursPerWeek": 56},
    }
    return data


def write_player_levels(nodes):
    """Level table for the app (app/src/content/playerLevelData.ts)."""
    if not APP_CONTENT.exists() or not LEVEL_PAGE.exists():
        print("No app folder or level page, so the player level table was not written")
        return
    data = player_level_data(nodes)
    app = {k: v for k, v in data.items() if k not in ("points", "cumHours", "boost")}
    ts = "\n".join([
        "// Generated by design/perk-tree-sample/build.py from player-level-xp.html. Do not edit by hand:",
        "// change the numbers on that page (its DEF, MAPLE, BANDS and DEF_BANDS) and run `python build.py` in that folder.",
        "// need[L-1] is the XP to go from level L to L+1; perHour[L-1] is the XP earned per counted hour while at level L.",
        "export const PLAYER_LEVELS = " + json.dumps(app) + " as const;",
        "",
    ])
    (APP_CONTENT / "playerLevelData.ts").write_text(ts, encoding="utf-8", newline="\n")
    print(f"Wrote the player level table: max level {data['maxLevel']}, everything reachable paid at level {data['targetLevel']} "
          f"({data['cumHours'][data['targetLevel'] - 1]:.0f} counted hours, boost {data['boost']:.4f}); level 100 at {data['cumHours'][99]:.0f} h")


SIDE = HERE / "Perk Tree Sample (new).xlsx"


def main():
    source = XLSX
    if "--fresh" in sys.argv or not XLSX.exists():
        try:
            write_workbook(*default_tree())
            print("Wrote", XLSX.name)
        except PermissionError:
            # The workbook is open in Excel: save beside it instead of failing. Close Excel and run again to replace it.
            write_workbook(*default_tree(), path=SIDE)
            source = SIDE
            print(f"{XLSX.name} is open in Excel, so the new workbook was saved as {SIDE.name}")
    elif SIDE.exists() and SIDE.stat().st_mtime > XLSX.stat().st_mtime:
        source = SIDE
    nodes, edges, points = read_workbook(source)
    fill_notable_v_passives(nodes)
    apply_tradeoffs(nodes)
    # The redesigned bands IV to VI go everywhere: the simulator, the app's tree data and the reference pages. Band VI is not
    # counted in reach_cost (level 250 still pays bands I to V); the level table pays for the dearest path from level 251 on.
    from new_bands import apply_new_bands
    from reference_pages import write_reference_pages
    from tree_content import STAT_INFO
    new_nodes, new_edges, new_stats = apply_new_bands(nodes, edges, REGIONS, STAT_INFO, BAND_GAP)
    write_html(new_nodes, new_edges, points, new_stats)
    print(f"Wrote {HTML.name}: {len(new_nodes)} nodes, {len(new_edges)} edges")
    write_app(new_nodes, new_edges, points, new_stats)
    pc = pacing(new_nodes, new_edges)
    write_curve_page(pc)
    write_reference_pages(new_nodes, new_edges, REGIONS, new_stats)
    write_player_levels(new_nodes)
    print(describe_pacing(pc))


if __name__ == "__main__":
    main()
