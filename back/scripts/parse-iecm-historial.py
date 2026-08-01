import re, pathlib
t = pathlib.Path(r"c:\Users\Administrador\Desktop\control\back\data\electoral\raw\iecm_historial.html").read_text("utf-8", errors="replace")
links = re.findall(r'href="([^"]+)"', t)
for u in links:
    if "2015" in u.lower() or "pelo2015" in u.lower() or "estadistica" in u.lower() and "2015" in u:
        print(u)
