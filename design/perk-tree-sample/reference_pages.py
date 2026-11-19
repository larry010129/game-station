"""
Two standalone reference pages for the perk tree, written by build.py from the same data as the simulator and the app:

  perk-stats.html    every stat explained: what it is, its kind, its values by band, who carries it, whether the app applies it.
  perk-classes.html  every class on its own: its small circle, notables, keystones, Season Key, Specials and Pentagons.

Open them straight in a browser. They are generated: change the tree (workbook or tree_content.py), run `python build.py`.
"""
import heapq
import html
import re
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP_PERKS = HERE.parent.parent / "app" / "src" / "state" / "perks.ts"
ROMAN = ["I", "II", "III", "IV", "V", "VI"]
esc = html.escape

# Conditional words: a stat whose label has one of these only applies while that holds (same list as the simulator).
CONDITIONAL = re.compile(
    r"\b(while|over|before|after|under|during|when|if|session|sessions|weekend|weekday|fridays|night|morning|midnight|in a row|"
    r"dark theme|mains|minimi[sz]ed|first|second|back-to-back|comeback|alert|jitter|ping|frame|safe limits|game mode|once the app)\b",
    re.I,
)
THEMES = [
    ("Income", lambda l: "income" in l.lower() and "pass xp" not in l.lower()),
    ("Season Pass XP", lambda l: "pass" in l.lower()),
    ("Tickets", lambda l: "ticket" in l.lower()),
    ("Fragments", lambda l: "fragment" in l.lower()),
    ("Streaks", lambda l: bool(re.search(r"streak|freeze", l, re.I))),
]

CSS = """
:root { --bg:#f6f7f9; --panel:#fff; --ink:#1b2230; --muted:#5d6778; --line:#dde2ea; --accent:#3b7dd8; --neg:#d6455d; --pos:#1f8f5b; --chip:#eef1f6; }
@media (prefers-color-scheme: dark) { :root { --bg:#0f1319; --panel:#171c24; --ink:#e6ebf3; --muted:#96a0b1; --line:#262e3a; --accent:#7fb2ff; --neg:#ff7a8e; --pos:#59d69d; --chip:#202734; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.5 system-ui,"Segoe UI",sans-serif; }
main { max-width:1100px; margin:0 auto; padding:28px 16px 64px; }
h1 { font-size:24px; margin:0 0 4px; } h2 { font-size:18px; margin:32px 0 10px; } h3 { font-size:14px; margin:18px 0 6px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
.sub { color:var(--muted); margin:0 0 20px; max-width:70ch; }
.cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
.card { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:14px 16px; }
.card b { display:block; margin-bottom:4px; } .card p { margin:0; color:var(--muted); }
table { width:100%; border-collapse:collapse; background:var(--panel); border:1px solid var(--line); border-radius:10px; overflow:hidden; font-variant-numeric:tabular-nums; }
th, td { text-align:left; padding:7px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
th { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); background:var(--chip); }
tr:last-child td { border-bottom:0; }
td.num, th.num { text-align:right; white-space:nowrap; }
small, .muted { color:var(--muted); } small { font-size:12px; }
code { font:12px ui-monospace,monospace; background:var(--chip); padding:1px 5px; border-radius:4px; }
.chip { display:inline-block; background:var(--chip); border-radius:999px; padding:1px 9px; margin:1px 3px 1px 0; font-size:12px; white-space:nowrap; }
.chip i { display:inline-block; width:8px; height:8px; border-radius:50%; margin-right:5px; }
.neg { color:var(--neg); } .pos { color:var(--pos); }
.tag { display:inline-block; font-size:11px; border-radius:4px; padding:0 6px; border:1px solid var(--line); }
.tag.live { color:var(--pos); border-color:var(--pos); } .tag.cond { color:var(--accent); border-color:var(--accent); } .tag.rule { color:var(--muted); }
input[type=search] { width:100%; max-width:420px; padding:8px 10px; border:1px solid var(--line); border-radius:8px; background:var(--panel); color:var(--ink); font:inherit; }
nav.toc { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0 4px; } nav.toc a { text-decoration:none; color:var(--ink); }
section.class { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:4px 18px 18px; margin:18px 0; }
section.class h2::before { content:""; display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--rc); margin-right:8px; vertical-align:middle; }
section.class h2 { margin:14px 0 2px; } .meta { color:var(--muted); margin:0 0 6px; }
.pills { display:flex; flex-wrap:wrap; gap:8px; margin:8px 0 4px; } .pill { background:var(--chip); border-radius:8px; padding:6px 10px; font-size:12px; } .pill b { display:block; font-size:16px; }
.scroll { overflow-x:auto; }
.sketchrow { display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap; } .sketchrow .scroll { flex:1; min-width:320px; }
.sketch { color:var(--ink); flex:none; background:var(--chip); border-radius:10px; } .sketch .small { fill:var(--muted); } .sketch .notable { fill:var(--accent); } .sketch .keystone { fill:var(--neg); } .sketch.whole .small, .sketch.whole .bridge { fill:var(--muted); } .sketch.whole .notable, .sketch.whole .class { fill:var(--accent); } .sketch.whole .keystone, .sketch.whole .gate { fill:var(--neg); } .sketch.whole .special, .sketch.whole .pentagon { fill:var(--pos); }
.sketch .base { fill:none; stroke:var(--muted); stroke-width:1.5; }
"""


# ---- shared helpers ---------------------------------------------------------------------------------------------------

def band_of(node):
    if node.get("band"):
        return node["band"]
    for i in range(4, 0, -1):
        if node["name"].endswith(" " + ROMAN[i]):
            return i + 1
    return 1


def live_stats():
    """The stats the app applies today, read from app/src/state/perks.ts (LIVE_STATS)."""
    if not APP_PERKS.exists():
        return set()
    m = re.search(r"LIVE_STATS[^=]*=\s*new Set\(\[(.*?)\]\)", APP_PERKS.read_text(encoding="utf-8"), re.S)
    return set(re.findall(r'"(\w+)"', m.group(1))) if m else set()


def num(v):
    v = float(v)
    return f"{int(v):,}" if v == int(v) else f"{v:,.1f}"


def signed(v, unit):
    """+150%, −15%, +1,500, +2 (units other than % and none are on/off marks)."""
    v = float(v)
    s = "+" if v > 0 else "−" if v < 0 else ""
    return f"{s}{num(abs(v))}{'%' if unit == '%' else ''}"


def is_mark(unit):
    return bool(unit) and unit != "%" and not re.fullmatch(r"[\x20-\x7e]*", unit)


def kind_of(key, label, unit):
    if key.startswith(("key", "pent")) or is_mark(unit):
        return "Rule"
    return "Conditional" if CONDITIONAL.search(label) else "Active"


def theme_of(label):
    return next((name for name, test in THEMES if test(label)), "Other")


def shell(title, intro, body, script=""):
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f"<title>{esc(title)}</title><style>{CSS}</style></head><body><main><h1>{esc(title)}</h1><p class=\"sub\">{intro}</p>{body}</main>"
            f"{('<script>' + script + '</script>') if script else ''}</body></html>")


# ---- stats page ---------------------------------------------------------------------------------------------------------

def stats_page(nodes, regions, stat_info):
    live = live_stats()
    color = {r["id"]: r["color"] for r in regions}
    name = {r["id"]: r["name"] for r in regions}
    gains, downs = defaultdict(list), defaultdict(list)
    for n in nodes:
        if n["stat"]:
            gains[n["stat"]].append(n)
        if n.get("stat2"):
            (downs if float(n.get("value2") or 0) < 0 else gains)[n["stat2"]].append(n)
    keys = sorted(set(gains) | set(downs))

    def info(k):
        label, unit, earned = stat_info.get(k, (k, "", ""))
        return label, unit, earned

    groups = defaultdict(list)
    for k in keys:
        label, unit, _ = info(k)
        kind = kind_of(k, label, unit)
        groups[("Rules and unlocks" if kind == "Rule" else theme_of(label), kind)].append(k)

    explain = """
<h2>How stats work</h2>
<div class="cards">
  <div class="card"><b>Active</b><p>Always on and added up. They sit under the header for what they boost (Income, Season Pass XP, Tickets, Fragments, Streaks).</p></div>
  <div class="card"><b>Conditional</b><p>Only apply while a condition holds, like "sessions over 2 hours" or "while GPU load stays under 90%". Listed one by one; never added into the totals above.</p></div>
  <div class="card"><b>Rules</b><p>On/off effects: Season Keys, Specials, Pentagons and the grand keystones. They change how something works instead of adding a number.</p></div>
  <div class="card"><b>Percent and flat</b><p>Percent stats add up with each other, flat stats with each other, and the two stay apart: <code>+397% +35</code>. A negative total shows in red.</p></div>
  <div class="card"><b>Trade-offs</b><p>A notable can give a stronger bonus and take a smaller one away on another theme. The downside is smaller than the gain, never on the same theme, and never makes a total drop below base. It only counts while its gain is in force.</p></div>
  <div class="card"><b>Bands I to V</b><p>The outer notables come in five bands. Each band is a stronger copy of the one before: about ×1.5, ×2, ×2.5, ×3 of band I, with its downside growing the same way.</p></div>
  <div class="card"><b>In the app</b><p>"Live" means the app applies it today. The rest can be taken (they are the way through the tree) but do nothing yet.</p></div>
</div>"""

    parts = []
    for (theme, kind), ks in sorted(groups.items(), key=lambda kv: ([t for t, _ in THEMES] + ["Other", "Rules and unlocks"]).index(kv[0][0]) * 3 + ["Active", "Conditional", "Rule"].index(kv[0][1])):
        rows = []
        for k in sorted(ks, key=lambda x: info(x)[0].lower()):
            label, unit, earned = info(k)
            gs, ds = gains.get(k, []), downs.get(k, [])
            vals = sorted(float(n["value"] if n["stat"] == k else n["value2"]) for n in gs) if gs else []
            span = "on / off" if kind == "Rule" else (f"{signed(vals[0], unit)} to {signed(vals[-1], unit)}" if vals and vals[0] != vals[-1] else (signed(vals[0], unit) if vals else ""))
            regs = sorted({n["region"] for n in gs + ds})
            chips = "".join(f'<span class="chip"><i style="background:{color.get(r, "#888")}"></i>{esc(name.get(r, r))}</span>' for r in regs)
            down = f'<span class="neg">{len(ds)} downside{"s" if len(ds) != 1 else ""}</span>' if ds else ""
            app = '<span class="tag live">live</span>' if k in live else '<span class="tag">not yet</span>'
            tag = {"Conditional": '<span class="tag cond">conditional</span>', "Rule": '<span class="tag rule">rule</span>'}.get(kind, "")
            rows.append(f'<tr data-q="{esc((label + " " + k + " " + theme).lower())}"><td>{esc(label)} {tag}<br><small><code>{esc(k)}</code></small></td>'
                        f'<td class="num">{esc(span)}</td><td>{len(gs)} node{"s" if len(gs) != 1 else ""} {down}<br>{chips}</td><td>{esc(earned)}</td><td>{app}</td></tr>')
        parts.append(f'<h3>{esc(theme)} · {esc(kind.lower())} <small>({len(ks)})</small></h3><div class="scroll"><table><thead><tr><th>Stat</th><th class="num">Values (band I to V)</th>'
                     f'<th>Carried by</th><th>Earned by</th><th>App</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>')

    body = (explain + f'<h2>All {len(keys)} stats</h2><p><input type="search" id="q" placeholder="Filter: name, key or theme" autocomplete="off"></p>' + "".join(parts))
    script = ("document.getElementById('q').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();"
              "document.querySelectorAll('tbody tr').forEach(r=>{r.style.display=!q||r.dataset.q.includes(q)?'':'none'})});")
    return shell("Perk stats, explained", "Every stat on the perk tree: what it is, which kind, how strong it gets, who carries it, and whether the app applies it yet. "
                 "Generated from the tree data; do not edit by hand.", body, script)


# ---- classes page -------------------------------------------------------------------------------------------------------

def class_sketch(rid, nodes, edges):
    """The whole class to scale, its axis pointing up: every node in its wedge, faint links, notables and keystones bigger."""
    import math
    centre = {n["region"]: math.atan2(n["y"], n["x"]) for n in nodes if n["type"] == "class"}
    if rid not in centre:
        return ""
    def wedge(n):
        a = math.atan2(n["y"], n["x"])
        return min(centre, key=lambda c: abs((a - centre[c] + math.pi) % (2 * math.pi) - math.pi))
    ux, uy = math.cos(centre[rid]), math.sin(centre[rid])
    vx, vy = -uy, ux
    pts = {n["id"]: (n["x"] * vx + n["y"] * vy, n["x"] * ux + n["y"] * uy, n["type"]) for n in nodes
           if n["region"] != "core" and (n["x"] or n["y"]) and wedge(n) == rid}
    lat = max(abs(p[0]) for p in pts.values())
    rad = max(p[1] for p in pts.values())
    scale = min(118 / lat, 330 / rad)
    X = lambda l: 130 + l * scale
    Y = lambda r: 345 - r * scale
    lines = "".join(f'<line x1="{X(pts[a][0]):.1f}" y1="{Y(pts[a][1]):.1f}" x2="{X(pts[b][0]):.1f}" y2="{Y(pts[b][1]):.1f}"/>' for a, b in edges if a in pts and b in pts)
    size = {"notable": 2.6, "keystone": 3.6, "gate": 2.6, "special": 2.2, "pentagon": 2.2, "class": 3.2}
    dots = "".join(f'<circle cx="{X(x):.1f}" cy="{Y(y):.1f}" r="{size.get(t, 1.1)}" class="{t}"/>' for x, y, t in pts.values())
    return (f'<svg class="sketch whole" viewBox="0 0 260 360" width="230" role="img" aria-label="The whole class to scale">'
            f'<g stroke="currentColor" stroke-opacity=".22" stroke-width=".6" fill="none">{lines}</g>{dots}</svg>')


def path_sketch(rid, mine, edges):
    """A small drawing of the class's band VI path to scale, with the band V keystone at the bottom."""
    import math
    by = {n["id"]: n for n in mine}
    g = by.get(f"{rid}-b5-gkey")
    six = [n for n in mine if band_of(n) == 6]
    if not g or not six:
        return ""
    r5 = math.hypot(g["x"], g["y"])
    ux, uy = g["x"] / r5, g["y"] / r5
    vx, vy = -uy, ux
    def frame(n):
        dx, dy = n["x"] - g["x"], n["y"] - g["y"]
        return dx * vx + dy * vy, dx * ux + dy * uy
    pts = {n["id"]: frame(n) for n in six + [g]}
    lat = max(abs(p[0]) for p in pts.values()) or 1
    rad = max(p[1] for p in pts.values()) or 1
    scale = min(150 / lat, 200 / rad)
    X = lambda l: 90 + l * scale
    Y = lambda r: 215 - r * scale
    ids = set(pts)
    lines = "".join(f'<line x1="{X(pts[a][0]):.1f}" y1="{Y(pts[a][1]):.1f}" x2="{X(pts[b][0]):.1f}" y2="{Y(pts[b][1]):.1f}"/>' for a, b in edges if a in ids and b in ids)
    dots = "".join(f'<circle cx="{X(pts[n["id"]][0]):.1f}" cy="{Y(pts[n["id"]][1]):.1f}" r="{ {"small": 3, "notable": 5.5, "keystone": 8}[n["type"]] }" class="{n["type"]}"/>' for n in six)
    base = f'<circle cx="{X(0):.1f}" cy="{Y(0):.1f}" r="6" class="base"/>'
    return f'<svg class="sketch" viewBox="0 0 180 230" width="150" role="img" aria-label="Band VI path shape"><g stroke="currentColor" stroke-opacity=".35" fill="none">{lines}</g>{base}{dots}</svg>'


def upper_bands(rid, mine, edges=()):
    """Bands IV, V and VI of a class, from the real nodes: unique notables (IV, V) and the one-class area past the V keystone (VI)."""
    def cell(text):
        text = text.replace(chr(10), " · ")
        if ", −" in text:
            a, b = text.split(", −", 1)
            return f'{esc(a)}<br><span class="neg">−{esc(b)}</span>'
        return esc(text)

    def rows(band, kinds):
        return "".join(f'<tr><td>{ROMAN[band - 1]}</td><td>{esc(n["name"])}{" <span class=\"tag rule\">keystone</span>" if n["type"] == "keystone" else ""}</td>'
                       f'<td>{cell(n["effect"])}{("<br><small>Passive: " + esc(n["passive"]) + "</small>") if n.get("passive") else ""}</td><td class="num">{n["cost"]}</td></tr>'
                       for n in mine if band_of(n) == band and n["type"] in kinds)

    body = rows(4, ("notable",)) + rows(5, ("notable",)) + rows(6, ("notable", "keystone"))
    if not body:
        return ""
    try:
        from new_bands import SHAPES
        shape = f'<p><b>Band VI path shape: {esc(SHAPES[rid][0])}</b> <span class="muted">({esc(SHAPES[rid][1])})</span></p>'
    except (ImportError, KeyError):
        shape = ""
    return ('<h3>Bands IV, V and VI</h3><p class="muted">Bands IV and V: unique notables, only for a class you started in. '
            'Band VI: three branches past the band V keystone, each with its own mid notable, all ending on one keystone. You can take one branch in one class.</p>'
            f'{shape}<div class="sketchrow">{path_sketch(rid, mine, edges)}<div class="scroll"><table><thead><tr><th>Band</th><th>Name</th><th>Effect</th><th class="num">Cost</th></tr></thead><tbody>{body}</tbody></table></div></div>')


def classes_page(nodes, edges, regions, stat_info):
    by = {n["id"]: n for n in nodes}
    adj = defaultdict(list)
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    start = next((i for i, n in by.items() if n["type"] == "start"), None)
    dist = {start: 0}
    pq = [(0, start)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v in adj[u]:
            nd = d + by[v]["cost"]
            if nd < dist.get(v, 1e18):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))

    def effect_cell(n):
        eff = n["effect"].replace("\n", " · ")
        if ", −" in eff:
            a, b = eff.split(", −", 1)
            return f'{esc(a)}<br><span class="neg">−{esc(b)}</span>'
        return esc(eff)

    toc = "".join(f'<a class="chip" href="#{r["id"]}"><i style="background:{r["color"]}"></i>{esc(r["name"])}</a>' for r in regions)
    out = [f'<nav class="toc">{toc}</nav>',
           '<div class="cards"><div class="card"><b>Starting classes</b><p>Your first 2 paths out of Station Core become your starting classes. Bands IV and V open only in those two.</p></div>'
           '<div class="card"><b>Costs</b><p>Small circle 1 point, notable 2, grand keystone 3. Squares and pentagons are free but limited by slots. Path cost is the cheapest way to reach a keystone.</p></div>'
           '<div class="card"><b>Band VI</b><p>Past the band V keystone: three branches (2 small, 1 mid notable, 2 small) that all end on one keystone. Every class has one, but you can take only ONE branch in only ONE class: the first band VI node closes the other branches and the other classes, and the monthly reset frees the choice.</p></div>'
           '<div class="card"><b>Bands</b><p>Each class has five bands. Band I notables sit near the core; the outer ones repeat as bands II and III, stronger each time. Bands IV and V are unique to the class, and band VI is the one-class summit.</p></div></div>']
    for r in regions:
        rid = r["id"]
        mine = [n for n in nodes if n["region"] == rid]
        cost_total = sum(n["cost"] for n in mine)
        small = next((n for n in mine if n["type"] == "small"), None)
        notables = [n for n in mine if n["type"] == "notable"]
        base = [n for n in notables if band_of(n) == 1]
        keys = sorted((n for n in mine if n["type"] == "keystone"), key=lambda n: (band_of(n), n["id"]))
        gate = next((n for n in mine if n["type"] == "gate"), None)
        specials = [n for n in mine if n["type"] == "special"]
        pents = [n for n in mine if n["type"] == "pentagon"]
        trades = [n for n in notables if float(n.get("value2") or 0) < 0]
        used = defaultdict(int)
        for n in mine:
            for s in (n["stat"], n.get("stat2")):
                if s and not s.startswith(("key", "pent")):
                    used[s] += 1
        stat_chips = "".join(f'<span class="chip">{esc(stat_info.get(s, (s,))[0])} <small>×{c}</small></span>' for s, c in sorted(used.items(), key=lambda kv: -kv[1]))

        def v_notable(n):
            top = next((m for m in notables if m["name"] == f'{n["name"]} III'), None)
            return f'<tr><td>{esc(n["name"])}</td><td>{effect_cell(n)}</td><td>{effect_cell(top) if top else "<small>band I only</small>"}</td></tr>'

        key_rows = "".join(f'<tr><td>{esc(n["name"])}</td><td>{ROMAN[band_of(n) - 1]}</td><td>{esc(n["effect"].replace(chr(10), " · "))}'
                           f'{("<br><small>Passive: " + esc(n["passive"]) + "</small>") if n.get("passive") else ""}</td><td class="num">{int(dist.get(n["id"], 0))}</td></tr>' for n in keys)
        sq_rows = lambda lst: "".join(f'<tr><td>{esc(n["name"])}</td><td>{esc(n["effect"].replace(chr(10), " · "))}'
                                      f'{("<br><small>Passive: " + esc(n["passive"]) + "</small>") if n.get("passive") else ""}</td></tr>' for n in lst)
        gate_txt = (f'{esc(gate["name"])}: {esc(gate["effect"].replace(chr(10), " · "))}' if gate else "")
        out.append(
            f'<section class="class" id="{rid}" style="--rc:{r["color"]}"><h2>{esc(r["name"])}</h2><p class="meta">{esc(r["focus"])}</p>'
            f'<div class="pills"><div class="pill"><b>{cost_total}</b>points in the class</div><div class="pill"><b>{len(base)}</b>band I notables</div>'
            f'<div class="pill"><b>{len(notables)}</b>notables in all</div><div class="pill"><b>{len(trades)}</b>with a downside</div>'
            f'<div class="pill"><b>{len(specials)}</b>specials</div><div class="pill"><b>{len(pents)}</b>pentagons</div></div>'
            f'{("<p><b>Small circles:</b> " + esc(small["effect"]) + "</p>") if small else ""}'
            f'<h3>Whole class</h3><div class="sketchrow">{class_sketch(rid, nodes, edges)}</div>'
            f'<h3>Notables, bands I to III</h3><div class="scroll"><table><thead><tr><th>Name</th><th>Band I</th><th>Band III</th></tr></thead><tbody>{"".join(v_notable(n) for n in base)}</tbody></table></div>'
            f'<h3>Keystones</h3><div class="scroll"><table><thead><tr><th>Name</th><th>Band</th><th>What it does</th><th class="num">Path cost</th></tr></thead><tbody>{key_rows}</tbody></table></div>'
            f'{upper_bands(rid, mine, edges)}'
            f'<h3>Season Key</h3><p>{gate_txt}</p>'
            f'<h3>Specials</h3><div class="scroll"><table><tbody>{sq_rows(specials)}</tbody></table></div>'
            f'<h3>Pentagons</h3><div class="scroll"><table><tbody>{sq_rows(pents)}</tbody></table></div>'
            f'<h3>Stats this class uses</h3><p>{stat_chips}</p></section>')
    return shell("Perk classes", "The eight classes around Station Core, one by one: what each is about and what is in it. Generated from the tree data; do not edit by hand.", "".join(out))


def write_reference_pages(nodes, edges, regions, stat_info):
    (HERE / "perk-stats.html").write_text(stats_page(nodes, regions, stat_info), encoding="utf-8", newline="\n")
    (HERE / "perk-classes.html").write_text(classes_page(nodes, edges, regions, stat_info), encoding="utf-8", newline="\n")
    print("Wrote perk-stats.html and perk-classes.html")
