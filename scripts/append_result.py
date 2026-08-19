#!/usr/bin/env python3
"""
Appends one entry to results/index.json for the GitHub Pages gallery.

Reads text/font/theme from the same NASTALIQ_* env vars the Action already
sets (never from argv) so we don't have to worry about shell-quoting
arbitrary user text a second time.

Usage: append_result.py <path-to-png-relative-to-repo-root>
"""
import datetime
import json
import os
import sys

RESULTS_DIR = "results"
INDEX_PATH = os.path.join(RESULTS_DIR, "index.json")
MAX_ENTRIES = 300  # cap so index.json / the Pages payload stay bounded


def main():
    if len(sys.argv) != 2:
        print("Usage: append_result.py <image_path>", file=sys.stderr)
        sys.exit(1)
    image_path = sys.argv[1]

    entry = {
        "id": os.path.basename(image_path).rsplit(".", 1)[0],
        "image": image_path,
        # Truncated: the full text is already visible in the image itself,
        # this is just for gallery captions/search, not extra disclosure.
        "text": os.environ.get("NASTALIQ_TEXT", "")[:300],
        "font": os.environ.get("NASTALIQ_FONT", ""),
        "theme": os.environ.get("NASTALIQ_THEME", ""),
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
    }

    os.makedirs(RESULTS_DIR, exist_ok=True)
    index = []
    if os.path.exists(INDEX_PATH):
        try:
            with open(INDEX_PATH, encoding="utf-8") as f:
                index = json.load(f)
        except json.JSONDecodeError:
            index = []

    index.insert(0, entry)  # newest first
    index = index[:MAX_ENTRIES]

    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"Appended entry {entry['id']} ({len(index)} total in index)")


if __name__ == "__main__":
    main()
