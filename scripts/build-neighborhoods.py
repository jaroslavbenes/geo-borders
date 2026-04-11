"""
Merge ZSJ polygons into neighborhood boundaries and write neighborhoods.geojson.
Run from the project root: python3 scripts/build-neighborhoods.py
"""
import json, sys
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

# ---------------------------------------------------------------------------
# Neighborhood definitions: neighborhood name → list of ZSJ NAZEV values
# Empty lists = single ZSJ with the same name as the neighborhood
# ---------------------------------------------------------------------------
NEIGHBORHOODS = [
    ("Plzeň – centrum", [
        "Plzeň-historické jádro",
        "Centrum-jih",
        "Centrum-jihozápad",
        "Centrum-západ",
        "Centrum-východ",
        "U Spartaku",
        "Hamburk",
        "Hlavní nádraží",
        "Pivovary",
        "Autobusové nádraží",
    ]),
    ("Roudná", [
        "Roudná",
        "Záhorsko",
        "Zadní Roudná",
    ]),
    ("Petrohrad", [
        "Petrohrad",
        "Lobezská-průmyslový obvod",
    ]),
    ("Doudlevce", [
        "U zimního stadionu",
        "Doudlevce",
        "Doudlevce-průmyslový obvod",
    ]),
    ("Bory", [
        "Bezovka",
        "Proti Belánce",
        "Bory-u nemocnice",
        "Nemocnice",
        "Zelený trojúhelník",
        "Nad Bezovkou",
        "Staré Bory",
        "Sídliště Bory",
        "České údolí",
    ]),
    ("Hlavní závod", [
        "Hlavní závod",
    ]),
    ("Borská pole, Zátiší a Nová Hospoda", [
        "Borská pole",
        "Borské polesí",
        "Zátiší",
        "Domažlická-průmyslový obvod",
        "Nová Hospoda",
    ]),
    ("Skvrňany", [
        "Přední Skvrňany",
        "U Mže",
        "Zadní Skvrňany",
        "Slovanské údolí",
        "Křimice-Na Brůdku",
        "Na Stráních",
    ]),
    ("Park kultury", [
        "Park kultury",
    ]),
    ("Vinice a Košutka", [
        "Vinice-jih",
        "Vinice-sever",
        "Sylván",
        "U cizineckého domu",
        "Stará Košutka",
        "Průmyslová zóna Košutka",
        "Sídliště Košutka",
    ]),
    ("Lochotín", [
        "Nemocnice Lochotín",
        "Starý Lochotín",
        "Sídliště Lochotín-jih",
        "Sídliště Lochotín-sever",
        "Pod Mikulkou",
        "Zavadilka-sever",
        "Zavadilka-jih",
    ]),
    ("Bílá Hora", [
        "Bílá Hora",
        "Beranovka",
    ]),
    ("Bolevec", [
        "Bolevec",
        "Bolevecké rybníky",
        "Orlík",
    ]),
    ("Bukovec, Újezd a Červený Hrádek", [
        "Bukovec",
        "Bukovec-průmyslový obvod",
        "Zadní Újezd",
        "Přední Újezd",
        "Zábělá",
        "Červený Hrádek",
        "V Hájku",
    ]),
    ("Doubravka", [
        "Doubravka",
        "Doubravka-průmyslový obvod",
        "Malá Doubravka",
        "Sídliště Doubravka",
        "Zábělská",
        "U Svatého Jiří",
        "Chlum",
        "Ústřední hřbitov",
        "U Panského dvora",
        "Jateční",
        "Obchodní centrum Rokycanská",
        "Na Švabinách",
        "Letná",
        "Nad Týncem",
    ]),
    ("Lobzy", [
        "Lobzy",
        "Pod Švabinami",
        "Vyšehrad",
        "Vyšehrad-Na vyhlídce",
    ]),
    ("Slovany", [
        "Papírna",
        "Nad papírnou",
        "U Jiráskova náměstí",
        "Slovany-u stadionů",
        "Sídliště Slovany-sever",
        "Petřín-západ",
        "Petřín-východ",
        "Slovany-průmyslový obvod",
        "Za Homolkou",
        "Homolka",
        "Pod Homolkou",
        "Květná",
        "Staré Slovany",
        "Staré Slovany-západ",
        "Bručná-sever",
        "Hradiště",
        "Sídliště Slovany",
        "Čechurov-sever",
    ]),
    ("Božkov", [
        "Božkov-průmyslový obvod",
        "Božkov",
    ]),
    ("Koterov", [
        "Koterov",
    ]),
    ("Černice", [
        "Čechurov-jih",
        "Bručná-jih",
        "Černice",
    ]),
    ("Radobyčice", [
        "Radobyčice",
        "Podhájí",
    ]),
    ("Výsluní", [
        "Výsluní",
        "Malá Homolka",
        "U Doudleveckého hřbitova",
    ]),
    ("Litice, Valcha a Lhota", [
        "Litice-u řeky",
        "Litická přehrada",
        "Litice",
        "Valcha",
        "Valcha-Pod lesem",
        "Lhota",
    ]),
    ("Křimice", [
        "Křimice",
        "Křimice-východ",
    ]),
    ("Radčice, Malesice a Dolní Vlkýš", [
        "Radčice",
        "Radčice-Pod Kyjovem",
        "Malesice",
        "Dolní Vlkýš",
    ]),
]

# ---------------------------------------------------------------------------

with open("public/data/zsj.geojson") as f:
    zsj = json.load(f)

# Build lookup: name → shapely geometry
by_name = {}
for feat in zsj["features"]:
    name = feat["properties"]["NAZEV"]
    by_name[name] = shape(feat["geometry"])

assigned = set()
features = []
warnings = []

for hood_name, zsj_names in NEIGHBORHOODS:
    polys = []
    for zname in zsj_names:
        if zname not in by_name:
            warnings.append(f"  NOT FOUND: '{zname}' (neighborhood: {hood_name})")
            continue
        if zname in assigned:
            warnings.append(f"  DUPLICATE:  '{zname}' already assigned (skipped for {hood_name})")
            continue
        polys.append(by_name[zname])
        assigned.add(zname)

    if not polys:
        warnings.append(f"  EMPTY:      '{hood_name}' has no ZSJs")
        continue

    merged = unary_union(polys)
    features.append({
        "type": "Feature",
        "properties": {"NAZEV": hood_name, "zsj_count": len(polys)},
        "geometry": mapping(merged),
    })
    print(f"  {hood_name}: merged {len(polys)} ZSJ(s)")

unassigned = set(by_name) - assigned
if unassigned:
    warnings.append(f"\nUnassigned ZSJs ({len(unassigned)}):")
    for n in sorted(unassigned):
        warnings.append(f"  - {n}")

if warnings:
    print("\nWarnings:")
    for w in warnings:
        print(w)

out = {"type": "FeatureCollection", "features": features}
with open("public/data/neighborhoods.geojson", "w") as f:
    json.dump(out, f, ensure_ascii=False)

print(f"\nWrote {len(features)} neighborhoods to public/data/neighborhoods.geojson")
