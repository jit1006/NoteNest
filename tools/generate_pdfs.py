#!/usr/bin/env python3
"""Generate the NoteNest demo PDFs (no third-party dependencies).

Usage:  python3 tools/generate_pdfs.py            # writes public/pdfs/*.pdf

Content lives in tools/content_core.py and tools/content_apps.py. Each document is:
    {"file": "dbms-unit1-er-model", "title": ..., "subtitle": ..., "kind": "notes|pyq|reference",
     "subject": "Database Management Systems", "blocks": [...]}
Block types:
    ("h", "Heading")             section heading
    ("p", "Paragraph")           body text (wrapped)
    ("b", ["item", ...])         bullet list
    ("code", ["line", ...])      monospaced box
    ("note", "Text")             highlighted callout
    ("q", "Question", marks)     numbered exam question with marks
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

PAGE_W, PAGE_H = 595.28, 841.89
MARGIN = 54
TOP = PAGE_H - 54
BOTTOM = 64

# Helvetica advance widths (1/1000 em) for ASCII 32..126
_HELV = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
         556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
         1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
         667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
         333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
         556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584]

INDIGO = (0.31, 0.27, 0.90)
VIOLET = (0.49, 0.23, 0.93)
SLATE = (0.12, 0.16, 0.23)
MUTED = (0.39, 0.45, 0.55)

_REPL = {"\u2013": "-", "\u2014": "-", "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"',
         "\u2192": "->", "\u2264": "<=", "\u2265": ">=", "\u00d7": "x", "\u2022": "-", "\u2026": "...",
         "\u2260": "!=", "\u2208": "in"}


def clean(s: str) -> str:
    for k, v in _REPL.items():
        s = s.replace(k, v)
    bad = [c for c in s if ord(c) > 126 or (ord(c) < 32 and c != "\t")]
    if bad:
        raise ValueError(f"Non-ASCII character(s) {bad!r} in: {s[:60]!r}")
    return s.replace("\t", "    ")


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def text_width(s: str, size: float, bold: bool = False, mono: bool = False) -> float:
    if mono:
        return len(s) * 0.6 * size
    w = sum(_HELV[ord(c) - 32] for c in s)
    return w * size / 1000 * (1.07 if bold else 1.0)


def wrap(s: str, size: float, width: float, bold: bool = False) -> list[str]:
    lines, cur = [], ""
    for word in s.split():
        trial = f"{cur} {word}".strip()
        if text_width(trial, size, bold) <= width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines or [""]


class Page:
    def __init__(self) -> None:
        self.ops: list[str] = []

    def rect(self, x, y, w, h, color):
        self.ops.append(f"{color[0]:.3f} {color[1]:.3f} {color[2]:.3f} rg {x:.2f} {y:.2f} {w:.2f} {h:.2f} re f")

    def text(self, x, y, s, font, size, color=SLATE):
        self.ops.append(
            f"BT /{font} {size} Tf {color[0]:.3f} {color[1]:.3f} {color[2]:.3f} rg "
            f"{x:.2f} {y:.2f} Td ({esc(s)}) Tj ET"
        )


class Doc:
    def __init__(self, title: str, subtitle: str, subject: str, kind: str):
        self.title, self.subtitle, self.subject, self.kind = clean(title), clean(subtitle), clean(subject), kind
        self.pages: list[Page] = []
        self.page: Page
        self.y = TOP
        self._new_page(first=True)

    # ---- layout helpers
    def _new_page(self, first=False):
        self.page = Page()
        self.pages.append(self.page)
        if first:
            p = self.page
            p.rect(0, PAGE_H - 150, PAGE_W, 150, INDIGO)
            p.rect(0, PAGE_H - 150, PAGE_W * 0.45, 150, VIOLET)
            p.rect(0, PAGE_H - 154, PAGE_W, 4, (0.86, 0.84, 0.99))
            label = {"notes": "STUDY NOTES", "pyq": "MODEL PRACTICE PAPER", "reference": "QUICK REFERENCE"}[self.kind]
            p.text(MARGIN, PAGE_H - 52, f"NOTENEST  |  {label}  |  DEMO", "F2", 9, (0.88, 0.87, 1.0))
            ty = PAGE_H - 88
            for line in wrap(self.title, 24, PAGE_W - 2 * MARGIN, True):
                p.text(MARGIN, ty, line, "F2", 24, (1, 1, 1))
                ty -= 29
            p.text(MARGIN, PAGE_H - 134, self.subject + "  -  " + self.subtitle, "F1", 10.5, (0.93, 0.92, 1.0))
            self.y = PAGE_H - 186
        else:
            self.y = TOP

    def _need(self, h):
        if self.y - h < BOTTOM:
            self._new_page()

    # ---- blocks
    def heading(self, s):
        s = clean(s)
        self._need(46)
        self.y -= 10
        self.page.rect(MARGIN, self.y - 4, 3.5, 17, VIOLET)
        self.page.text(MARGIN + 11, self.y, s, "F2", 14, INDIGO)
        self.y -= 22

    def para(self, s, indent=0.0, size=10.5, font="F1", color=SLATE, lead=15.0):
        w = PAGE_W - 2 * MARGIN - indent
        for line in wrap(clean(s), size, w):
            self._need(lead)
            self.page.text(MARGIN + indent, self.y, line, font, size, color)
            self.y -= lead
        self.y -= 4

    def bullets(self, items):
        for it in items:
            w = PAGE_W - 2 * MARGIN - 18
            lines = wrap(clean(it), 10.5, w)
            self._need(15 * len(lines[:2]))
            self.page.rect(MARGIN + 5, self.y + 3, 3.2, 3.2, VIOLET)
            for i, line in enumerate(lines):
                self._need(15)
                self.page.text(MARGIN + 18, self.y, line, "F1", 10.5)
                self.y -= 15
            self.y -= 2
        self.y -= 4

    def code(self, lines):
        lines = [clean(l) for l in lines]
        maxc = int((PAGE_W - 2 * MARGIN - 20) / (0.6 * 9))
        for l in lines:
            if len(l) > maxc:
                raise ValueError(f"code line too long ({len(l)}>{maxc}): {l}")
        i = 0
        while i < len(lines):
            fit = max(1, int((self.y - BOTTOM - 16) // 12))
            chunk = lines[i:i + fit]
            if self.y - (len(chunk) * 12 + 12) < BOTTOM:
                self._new_page()
                continue
            h = len(chunk) * 12 + 12
            self.page.rect(MARGIN, self.y - h + 8, PAGE_W - 2 * MARGIN, h, (0.945, 0.953, 0.98))
            self.page.rect(MARGIN, self.y - h + 8, 3, h, INDIGO)
            yy = self.y - 4
            for l in chunk:
                self.page.text(MARGIN + 12, yy, l, "F3", 9, SLATE)
                yy -= 12
            self.y -= h + 6
            i += len(chunk)

    def note(self, s):
        w = PAGE_W - 2 * MARGIN - 24
        lines = wrap(clean(s), 10, w)
        h = len(lines) * 14 + 14
        self._need(h + 6)
        self.page.rect(MARGIN, self.y - h + 10, PAGE_W - 2 * MARGIN, h, (0.93, 0.92, 1.0))
        self.page.rect(MARGIN, self.y - h + 10, 3, h, VIOLET)
        yy = self.y - 3
        for l in lines:
            self.page.text(MARGIN + 14, yy, l, "F4", 10, (0.22, 0.18, 0.55))
            yy -= 14
        self.y -= h + 8

    def question(self, n, s, marks):
        w = PAGE_W - 2 * MARGIN - 70
        lines = wrap(clean(s), 10.5, w)
        self._need(15 * len(lines) + 10)
        self.page.text(MARGIN, self.y, f"Q{n}.", "F2", 10.5, INDIGO)
        self.page.text(PAGE_W - MARGIN - 52, self.y, f"[{marks} marks]", "F2", 9.5, MUTED)
        for l in lines:
            self.page.text(MARGIN + 28, self.y, l, "F1", 10.5)
            self.y -= 15
        self.y -= 8

    # ---- serialisation
    def render(self, meta_title: str) -> bytes:
        n = len(self.pages)
        for i, p in enumerate(self.pages, 1):
            p.rect(MARGIN, 48, PAGE_W - 2 * MARGIN, 0.6, (0.82, 0.84, 0.9))
            p.text(MARGIN, 34, "NoteNest demo material - self-created for illustration, not an official publication.", "F1", 8, MUTED)
            p.text(PAGE_W - MARGIN - 48, 34, f"Page {i} of {n}", "F1", 8, MUTED)

        objs: list[bytes] = []

        def add(b: bytes) -> int:
            objs.append(b)
            return len(objs)

        add(b"")  # 1 catalog placeholder
        add(b"")  # 2 pages placeholder
        fonts = {}
        for name, base in (("F1", "Helvetica"), ("F2", "Helvetica-Bold"), ("F3", "Courier"), ("F4", "Helvetica-Oblique")):
            fonts[name] = add(f"<< /Type /Font /Subtype /Type1 /BaseFont /{base} /Encoding /WinAnsiEncoding >>".encode())
        font_res = " ".join(f"/{k} {v} 0 R" for k, v in fonts.items())
        kids = []
        for p in self.pages:
            stream = "\n".join(p.ops).encode("latin-1")
            cid = add(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
            pid = add(
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_W:.2f} {PAGE_H:.2f}] "
                f"/Resources << /Font << {font_res} >> >> /Contents {cid} 0 R >>".encode()
            )
            kids.append(pid)
        objs[0] = b"<< /Type /Catalog /Pages 2 0 R /PageMode /UseNone >>"
        objs[1] = f"<< /Type /Pages /Count {len(kids)} /Kids [{' '.join(f'{k} 0 R' for k in kids)}] >>".encode()
        info = add(
            f"<< /Title ({esc(clean(meta_title))}) /Author (NoteNest demo content) "
            f"/Subject ({esc(self.subject)}) /Creator (NoteNest tools/generate_pdfs.py) >>".encode()
        )
        out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = []
        for i, o in enumerate(objs, 1):
            offsets.append(len(out))
            out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
        xref = len(out)
        out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode()
        for off in offsets:
            out += f"{off:010d} 00000 n \n".encode()
        out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R /Info {info} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
        return bytes(out)


def build(doc_spec: dict) -> bytes:
    d = Doc(doc_spec["title"], doc_spec["subtitle"], doc_spec["subject"], doc_spec["kind"])
    qn = 0
    for blk in doc_spec["blocks"]:
        t = blk[0]
        if t == "h":
            d.heading(blk[1])
        elif t == "p":
            d.para(blk[1])
        elif t == "b":
            d.bullets(blk[1])
        elif t == "code":
            d.code(blk[1])
        elif t == "note":
            d.note(blk[1])
        elif t == "q":
            qn += 1
            d.question(qn, blk[1], blk[2])
        else:
            raise ValueError(f"unknown block {t}")
    return d.render(doc_spec["title"])


def main() -> int:
    sys.path.insert(0, str(Path(__file__).parent))
    from content_core import DOCS as core
    from content_apps import DOCS as apps

    docs = core + apps
    out_dir = Path(__file__).resolve().parent.parent / "public" / "pdfs"
    out_dir.mkdir(parents=True, exist_ok=True)
    seen = set()
    for spec in docs:
        if spec["file"] in seen:
            raise SystemExit(f"duplicate file id {spec['file']}")
        seen.add(spec["file"])
        data = build(spec)
        (out_dir / f"{spec['file']}.pdf").write_bytes(data)
    print(f"Wrote {len(docs)} PDFs to {os.path.relpath(out_dir)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
