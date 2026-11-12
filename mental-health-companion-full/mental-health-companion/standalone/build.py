"""Assemble src/*.js + styles.css into ONE self-contained HTML file (no build tools, no network needed)."""
from pathlib import Path
src = Path(__file__).parent / "src"
css = (src / "styles.css").read_text()
js = "\n".join((src / f).read_text() for f in ["engine.js", "app_core.js", "app_views.js", "app_main.js"])
assert "</script" not in js.lower()
fav = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%232563EB'/%3E%3Ccircle cx='16' cy='16' r='4' fill='white'/%3E%3C/svg%3E"
html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Mental Health Companion and Stress Sentiment Tracker. General support only, not a medical diagnosis.">
<title>Mental Health Companion</title>
<link rel="icon" href="{fav}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Newsreader:wght@500;600&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
<noscript>This app needs JavaScript. If you need help now, call 112 (India emergency), Tele-MANAS 14416 or KIRAN 1800-599-0019.</noscript>
<script>
{js}
</script>
</body>
</html>
"""
out = Path(__file__).parent / "mental-health-companion-app.html"
out.write_text(html)
print(out, f"{len(html)/1024:.0f} KB")
