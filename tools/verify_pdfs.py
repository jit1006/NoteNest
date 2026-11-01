#!/usr/bin/env python3
"""Structural check of generated PDFs: header/trailer, xref offsets, page count, readable text."""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent / "public" / "pdfs"
problems = 0
for f in sorted(root.glob("*.pdf")):
    d = f.read_bytes()
    errs = []
    if not d.startswith(b"%PDF-1.4"):
        errs.append("bad header")
    if not d.rstrip().endswith(b"%%EOF"):
        errs.append("no EOF")
    m = re.search(rb"startxref\n(\d+)\n", d)
    if not m or d[int(m.group(1)):int(m.group(1)) + 4] != b"xref":
        errs.append("startxref does not point at xref")
    else:
        pos = int(m.group(1))
        lines = d[pos:].split(b"\n")
        count = int(lines[1].split()[1])
        for i in range(1, count):
            off = int(lines[2 + i].split()[0])
            if not d[off:].startswith(b"%d 0 obj" % i):
                errs.append(f"xref entry {i} wrong")
                break
    pages = len(re.findall(rb"/Type /Page /Parent", d))
    declared = re.search(rb"/Type /Pages /Count (\d+)", d)
    if not declared or int(declared.group(1)) != pages:
        errs.append("page count mismatch")
    texts = re.findall(rb"\((.*?)(?<!\\)\) Tj", d)
    words = sum(len(t.split()) for t in texts)
    if words < 80:
        errs.append(f"too little text ({words} words)")
    if b"Page 1 of %d" % pages not in d:
        errs.append("footer page numbering missing")
    status = "OK " if not errs else "ERR"
    print(f"{status} {f.name:40s} pages={pages} words={words} {'; '.join(errs)}")
    problems += bool(errs)
sys.exit(1 if problems else 0)
