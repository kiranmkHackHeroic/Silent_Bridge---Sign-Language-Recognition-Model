"""Download the remaining 3 INCLUDE files in parallel."""
import os, sys, time, urllib.request, ssl
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except Exception:
    SSL_CONTEXT = ssl.create_default_context()

UA = {"User-Agent": "KannadaSignBridge-dataset-downloader/1.0"}
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "include"
RAW_DIR.mkdir(parents=True, exist_ok=True)

FILES = [
    ("Greetings_2of2.zip", "https://zenodo.org/records/4010759/files/Greetings_2of2.zip?download=1", 1208700458),
    ("Pronouns_1of2.zip", "https://zenodo.org/records/4010759/files/Pronouns_1of2.zip?download=1", 1419853451),
    ("Pronouns_2of2.zip", "https://zenodo.org/records/4010759/files/Pronouns_2of2.zip?download=1", 946837765),
]

def download_one(name, url, total_size):
    dest = RAW_DIR / name
    part = RAW_DIR / f"{name}.part"
    if dest.exists() and dest.stat().st_size == total_size:
        print(f"[{name}] Already complete ({total_size} bytes)")
        return
    print(f"[{name}] Starting download ({total_size / 1e9:.2f} GB)...")
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120, context=SSL_CONTEXT) as r, part.open("wb") as out:
        got = 0
        t0 = time.time()
        last_t = t0
        while chunk := r.read(1 << 20):
            out.write(chunk)
            got += len(chunk)
            now = time.time()
            if now - last_t >= 15:
                speed = (got / max(1e-5, now - t0)) / 1e6
                pct = (got / total_size) * 100
                print(f"[{name}] {got/1e9:.2f}/{total_size/1e9:.2f} GB ({pct:.1f}%) {speed:.2f} MB/s", flush=True)
                last_t = now
    part.replace(dest)
    print(f"[{name}] FINISHED successfully!")

with ThreadPoolExecutor(max_workers=3) as ex:
    futs = [ex.submit(download_one, name, url, sz) for name, url, sz in FILES]
    for f in futs:
        f.result()
print("All parallel INCLUDE files downloaded!")
