"""
copy-photos.py — Kopieer productfoto's vanuit iCloud naar public/products/

Vereisten (eenmalig installeren):
  pip install pillow pillow-heif

Gebruik (uitvoeren vanuit de vinted-dashboard/ map):
  python3 scripts/copy-photos.py

Resultaat:
  - public/products/{slug}/1.jpg, 2.jpg, ...  (volledig EXIF-vrij)
  - public/products/manifest.json              (gebruikt door de app)
"""

import json
from pathlib import Path
from PIL import Image

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    print("HEIC-ondersteuning geladen via pillow-heif")
except ImportError:
    print("WAARSCHUWING: pillow-heif niet gevonden. HEIC-bestanden worden overgeslagen.")
    print("  Installeer met: pip install pillow-heif")

ICLOUD = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs/Documents"
PUBLIC = Path(__file__).parent.parent / "public" / "products"

# Mapping: exacte mapnaam in iCloud → product slug in de app
# Pas de mapnamen aan als jouw mappen anders heten
FOLDER_MAP = {
    "Porsche Green":       "porsche-green",
    "Porsche Black":       "porsche-black",
    "Porsche Red":         "porsche-red",
    "Porsche Beige Green": "porsche-white-green",  # product heet nu 'Porsche White Green'
    "NY Navy":          "ny-navy",
    "NY Beige Green":   "ny-beige-green",
    "UNI Navy":         "uni-navy",
    "UNI Black":        "uni-black",
    "UNI Beige Green":  "uni-beige",   # map heet 'UNI Beige Green' in iCloud
    "UNI White":        "uni-white",
    "UNI Green":        "uni-green",
    # "UNI Blue":       geen map gevonden in iCloud
}

ONDERSTEUNDE_EXTENSIES = {".heic", ".heif", ".jpg", ".jpeg", ".png"}

manifest = {}

print(f"\nBron: {ICLOUD}")
print(f"Doel: {PUBLIC}\n")

for folder_naam, slug in FOLDER_MAP.items():
    bron_map = ICLOUD / folder_naam

    if not bron_map.exists():
        print(f"SKIP  '{folder_naam}' — map niet gevonden in iCloud")
        continue

    doel_map = PUBLIC / slug
    doel_map.mkdir(parents=True, exist_ok=True)

    # Verzamel afbeeldingsbestanden, gesorteerd op naam voor stabiele volgorde
    bestanden = sorted([
        f for f in bron_map.iterdir()
        if f.suffix.lower() in ONDERSTEUNDE_EXTENSIES and not f.name.startswith('.')
    ])

    if not bestanden:
        print(f"SKIP  '{folder_naam}' — geen afbeeldingen gevonden")
        continue

    opgeslagen = []
    for idx, bron_pad in enumerate(bestanden, start=1):
        doel_pad = doel_map / f"{idx}.jpg"
        try:
            with Image.open(bron_pad) as img:
                # Converteer naar RGB (HEIC kan andere kleurmodi hebben)
                rgb = img.convert("RGB")
                # Sla op zonder exif= parameter → Pillow kopieert GEEN metadata
                # Hierdoor worden GPS-locatie, apparaatinfo etc. volledig verwijderd
                rgb.save(doel_pad, "JPEG", quality=85)
            opgeslagen.append(f"{idx}.jpg")
            print(f"  OK  {slug}/{idx}.jpg  ← {bron_pad.name}")
        except Exception as e:
            print(f"  FOUT  {bron_pad.name}: {e}")

    if opgeslagen:
        manifest[slug] = opgeslagen
        print(f"  {len(opgeslagen)} foto's verwerkt voor '{slug}'\n")

# Schrijf manifest.json
manifest_pad = PUBLIC / "manifest.json"
with open(manifest_pad, "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print(f"\nManifest geschreven: {manifest_pad}")
print(f"Klaar. {len(manifest)} producten verwerkt.")
print("\nVolgende stap: npm run dev en check de Listings-pagina.")
