#!/bin/bash

# Verwijdert alle EXIF-metadata (locatie, apparaatinfo, datum) uit productfoto's
FOLDER="$(dirname "$0")/public/products"
FOUND=0

for file in "$FOLDER"/*.jpg "$FOLDER"/*.jpeg "$FOLDER"/*.png; do
  [ -f "$file" ] || continue
  FOUND=1

  filename=$(basename "$file")
  ext="${filename##*.}"
  tmpfile="${file}.tmp.${ext}"

  # Hercodeer via sips — dit strips alle EXIF-metadata
  sips -s format jpeg "$file" --out "$tmpfile" --setProperty hasAlpha no 2>/dev/null

  if [ -f "$tmpfile" ] && [ -s "$tmpfile" ]; then
    mv "$tmpfile" "$file"
    echo "✓ $filename — metadata verwijderd"
  else
    rm -f "$tmpfile"
    echo "✗ $filename — mislukt"
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "Geen foto's gevonden in public/products/"
fi
