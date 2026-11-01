import type { Node as PMNode } from '@tiptap/pm/model'

/** A textblock's text is the concatenation of its text nodes; this maps text offsets <-> document positions. */
export interface TextMap { text: string; segs: { docPos: number; textOffset: number; len: number }[] }

export function blockTextMap(block: PMNode, contentStart: number): TextMap {
  let text = ''
  const segs: TextMap['segs'] = []
  block.forEach((child, offset) => {
    if (child.isText && child.text) {
      segs.push({ docPos: contentStart + offset, textOffset: text.length, len: child.text.length })
      text += child.text
    }
  })
  return { text, segs }
}

export function docPosToOffset(map: TextMap, pos: number): number {
  for (const s of map.segs) {
    if (pos >= s.docPos && pos <= s.docPos + s.len) return s.textOffset + (pos - s.docPos)
    if (pos < s.docPos) return s.textOffset
  }
  return map.text.length
}

export function offsetToDocPos(map: TextMap, offset: number, isEnd: boolean): number | null {
  for (const s of map.segs) {
    const within = isEnd ? offset > s.textOffset && offset <= s.textOffset + s.len : offset >= s.textOffset && offset < s.textOffset + s.len
    if (within) return s.docPos + (offset - s.textOffset)
  }
  const last = map.segs[map.segs.length - 1]
  return last && offset === last.textOffset + last.len ? last.docPos + last.len : null
}
