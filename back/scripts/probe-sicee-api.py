import json, re, urllib.request, pathlib

JS = pathlib.Path(r"c:\Users\Administrador\Desktop\control\back\data\electoral\raw\sicee_main.js")
text = JS.read_text(encoding="utf-8", errors="ignore")
endpoints = sorted(set(re.findall(r'SiceenUrl\+\"([^\"]+)\"', text)))
print("=== local/alc related endpoints ===")
for e in endpoints:
    if any(k in e.lower() for k in ("local", "alc", "jef", "municip", "secc", "download", "zip", "export")):
        print(e)

BASE = "https://sicee-api.ine.mx/api/v1/"

def post(path, body=None):
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8", errors="replace")
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return raw[:500]
    except Exception as ex:
        return {"error": str(ex)}

# probe common local catalog calls
probes = [
    ("local/getEleccionesLocalesALC/21", {}),
    ("local/getEleccionesLocalesALC/8", {}),  # Jefatura de Gobierno
    ("local/getCmbEntidadConMpios", {"gIdCatAmbito": 2, "gIdCatCargo": 8, "gAnio": 2015}),
    ("local/getCmbEntidadConMpios/21", {"gIdCatAmbito": 2, "gIdCatCargo": 8, "gAnio": 2015}),
    ("local/getCmbNalxMunicipio", {"gIdCatAmbito": 2, "gIdCatCargo": 8, "gAnio": 2015, "gIdCatEntidad": 9}),
    ("federal/getCmbEntidadConDistFederal", {"gIdCatAmbito": 2, "gIdCatCargo": 8, "gAnio": 2015}),
    ("download/getDownloadZip", {}),
    ("download/getDownloadZipLocal", {}),
    ("download/getDownloadZip/21", {}),
]

for path, body in probes:
    print("\n---", path, body)
    res = post(path, body)
    s = json.dumps(res, ensure_ascii=False, indent=2) if isinstance(res, (dict, list)) else str(res)
    print(s[:2500])
