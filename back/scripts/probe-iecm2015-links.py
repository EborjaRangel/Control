import re, pathlib, urllib.request

raw = pathlib.Path(r"c:\Users\Administrador\Desktop\control\back\data\electoral\raw")

urls = [
    "https://www.iecm.mx/www/estadisticaparticipacionpelo2015/",
    "https://www.iecm.mx/www/estadisticaresultadospelo2015/resultados.php?mod=4",
    "https://www.iecm.mx/www/estadisticaparticipacionpelo2015/nota-metodologica.php",
]
for i, url in enumerate(urls):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        t = r.read().decode("utf-8", errors="replace")
    name = f"probe2015_{i}.html"
    (raw / name).write_text(t, encoding="utf-8")
    print("\n", url, "size", len(t))
    for m in re.findall(r'(?:href|src)=["\']([^"\']+)["\']', t, re.I):
        ml = m.lower()
        if any(k in ml for k in ("xls", "xlsx", "csv", "download", "bd2015", "archivo", "base", "zip")):
            print(" ", m)

# brute force common archivos names
candidates = [
    "bd2015jefcas.xls", "bd2015jefcas.xlsx", "bd2015jefsec.xls", "bd2015jefsec.xlsx",
    "bd2015jefdem.xls", "bd2015jefdelcas.xls", "bd2015jefdelsec.xls",
    "bd2015jefcas.zip", "bd2015jef.zip", "jef2015cas.xls", "JEFDEL2015.xls",
]
base = "https://www.iecm.mx/www/estadisticaresultadospelo2015/archivos/"
for c in candidates:
    url = base + c
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            ct = r.headers.get("Content-Type", "")
            cl = r.headers.get("Content-Length", "")
            print(f"OK {c} type={ct} len={cl}")
    except Exception as ex:
        pass
