import json, urllib.request

BASE = "https://sicee-api.ine.mx/api/v1/"

def post(path, body=None):
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())

# 1) Catalog JEFDEL (jefatura delegacional)
print("=== getEleccionesLocalesJEFDEL/11 ===")
catalog = post("local/getEleccionesLocalesJEFDEL/11", {})
print(json.dumps(catalog, ensure_ascii=False, indent=2)[:4000])

# find 2015 entries
y2015 = [x for x in catalog if x.get("anio") == 2015]
print("\n2015 entries:", len(y2015))
if y2015:
    print(json.dumps(y2015, ensure_ascii=False, indent=2))

# 2) downloads metadata
for ep in [
    "local/downloads/getElecciones",
    "local/downloads/getCargosElecciones",
    "local/downloads/getStates",
    "local/downloads/getLinks",
]:
    print(f"\n=== {ep} ===")
    try:
        res = post(ep, {})
        s = json.dumps(res, ensure_ascii=False, indent=2)
        print(s[:5000])
    except Exception as ex:
        print("ERR", ex)

# 3) If CDMX exists, try section query - common params from JS
# gIdCatAmbito: 2=local, gIdCatCargo from catalog, gAnio, gIdCatEntidad (CDMX=9?)
bodies = [
    {"gIdCatAmbito": 2, "gIdCatCargo": 11, "gAnio": 2015},
    {"gIdCatAmbito": 2, "gIdCatCargo": 11, "gAnio": 2015, "gIdCatEntidad": 9},
    {"gIdCatAmbito": 2, "gIdCatCargo": 11, "gAnio": 2015, "gIdCatEntidad": 9, "gIdCatMunicipio": 3},
]
for body in bodies:
    for ep in [
        "local/getCmbEntidadLocalconMpios",
        "local/getCmbEntxMunicipio",
        "local/getCmbSeccionesLocalesDelMpio",
        "local/cards/getResultTblASeccionesBasMpiosLoc",
    ]:
        try:
            res = post(ep, body)
            s = json.dumps(res, ensure_ascii=False)
            if s and s not in ("[]", "{}"):
                print(f"\nOK {ep} {body} -> {s[:800]}")
        except Exception as ex:
            pass
