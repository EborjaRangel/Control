import pathlib, re, urllib.request

out = pathlib.Path(r"c:\Users\Administrador\Desktop\control\back\data\electoral\raw")

def fetch(url, name):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    p = out / name
    p.write_bytes(data)
    return p, data

# Wayback sicodid
try:
    p, data = fetch(
        "https://web.archive.org/web/20160608173242/http://sicodid2015.iedf.org.mx/m3nv/sicodid2015.php",
        "sicodid2015_wayback.html",
    )
    t = data.decode("latin-1", errors="replace")
    print("sicodid size", len(t))
    links = re.findall(r'href=["\']([^"\']+)["\']', t, re.I)
    print("links", len(links))
    for u in links:
        ul = u.lower()
        if any(k in ul for k in ("xls", "csv", "download", "bd", "jef", "cas", "sec", "coyo", "php")):
            print(" ", u)
except Exception as ex:
    print("sicodid ERR", ex)

# CEDE uploads 2022/09
try:
    p, data = fetch("https://cede.izt.uam.mx/wp-content/uploads/2022/09/", "cede_uploads_2022_09.html")
    t = data.decode("utf-8", errors="replace")
    for m in re.findall(r'href="([^"]+)"', t):
        ml = m.lower()
        if any(x in ml for x in ("xls", "csv", "2015", "jef", "coyo", "df", "cdmx", "del")):
            print("cede file", m)
except Exception as ex:
    print("cede ERR", ex)

# Try INE datos abiertos search API pattern
for q in [
    "https://www.ine.mx/wp-json/wp/v2/media?search=jefatura+2015",
    "https://www.ine.mx/wp-json/wp/v2/media?search=locales+2015+csv",
]:
    try:
        req = urllib.request.Request(q, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            j = r.read().decode()
        print("\n", q, j[:500])
    except Exception as ex:
        print(q, "ERR", ex)
