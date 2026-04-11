"""
Convert GeoJSON layers to a single KML file with one Folder per layer.
Run from the project root: python3 scripts/build-kml.py
"""
import json
from xml.sax.saxutils import escape

LAYERS = [
    ("Čtvrtě",             "public/data/neighborhoods.geojson", "NAZEV"),
    ("ZSJ",                "public/data/zsj.geojson",           "NAZEV"),
    ("Katastrální území",  "public/data/katuze.geojson",        "NAZEV"),
    ("Obec",               "public/data/obec.geojson",          "NAZEV"),
]

def coords_to_kml(ring):
    return " ".join(f"{lng},{lat},0" for lng, lat in ring)

def polygon_to_kml(coords):
    outer = coords[0]
    lines = [
        "<Polygon>",
        "  <outerBoundaryIs><LinearRing><coordinates>",
        f"    {coords_to_kml(outer)}",
        "  </coordinates></LinearRing></outerBoundaryIs>",
    ]
    for inner in coords[1:]:
        lines += [
            "  <innerBoundaryIs><LinearRing><coordinates>",
            f"    {coords_to_kml(inner)}",
            "  </coordinates></LinearRing></innerBoundaryIs>",
        ]
    lines.append("</Polygon>")
    return "\n".join(lines)

def geometry_to_kml(geom):
    t = geom["type"]
    if t == "Polygon":
        return polygon_to_kml(geom["coordinates"])
    if t == "MultiPolygon":
        parts = "\n".join(polygon_to_kml(poly) for poly in geom["coordinates"])
        return f"<MultiGeometry>\n{parts}\n</MultiGeometry>"
    return ""

lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '<Document>',
    '  <name>Plzeň</name>',
]

for folder_name, path, name_field in LAYERS:
    with open(path) as f:
        data = json.load(f)

    lines.append(f'  <Folder><name>{escape(folder_name)}</name>')
    for feat in data["features"]:
        name = escape(feat["properties"].get(name_field, ""))
        geom_kml = geometry_to_kml(feat["geometry"])
        lines += [
            "    <Placemark>",
            f"      <name>{name}</name>",
            f"      {geom_kml}",
            "    </Placemark>",
        ]
    lines.append("  </Folder>")
    print(f"  {folder_name}: {len(data['features'])} features")

lines += ["</Document>", "</kml>"]

out_path = "public/data/plzen.kml"
with open(out_path, "w") as f:
    f.write("\n".join(lines))

print(f"\nWrote {out_path}")
