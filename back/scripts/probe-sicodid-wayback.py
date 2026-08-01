import pathlib, re, urllib.request, json

BASE = "https://web.archive.org/web/20160608173242/http://sicodid2015.iedf.org.mx"
paths = [
    "/gr1ds/todoseccion.php",
    "/gr1ds/jddelegacion.php",
    "/gr1ds/ganadoresjd.php",
    "/m3nv/sicodid2015.php",
]
out = pathlib.Path(r"c:\Users\Administrador\Desktop\control\back\data\electoral\raw")

for path in paths:
    url = BASE + path
    name = path.strip("/").replace("/", "_")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=90) as r:
            data = r.read()
        (out / name).write_bytes(data)
        t = data.decode("latin-1", errors="replace")
        print("\n===", path, "size", len(t), "===")
        print(t[:800].replace("\n", " ")[:800])
        # tables
        if "<table" in t.lower():
            print("HAS TABLE")
        links = re.findall(r'href=["\']([^"\']+)["\']', t, re.I)
        for u in links:
            ul = u.lower()
            if any(k in ul for k in ("xls", "csv", "download", "export", "coyo", "sec")):
                print(" link:", u)
        # look for coyoacan in page
        if "coyo" in t.lower():
            idx = t.lower().find("coyo")
            print(" coyo snippet:", t[max(0,idx-80):idx+200].replace("\n"," "))
    except Exception as ex:
        print(path, "ERR", ex)

# try POST/ajax endpoints if any in todoseccion
p = out / "gr1ds_todoseccion.php"
if p.exists():
    t = p.read_text("latin-1", errors="replace")
    for pat in ["ajax", "json", "csv", "xls", "download", "export", "api"]:
        if pat in t.lower():
            print("found keyword", pat)
