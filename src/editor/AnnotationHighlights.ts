import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Annotation, NoteAnchor } from '../types/db'
import { locateAnchor } from '../lib/anchors'
import { blockTextMap, offsetToDocPos } from './anchorDom'

export interface HighlightStorage { items: Annotation[]; activeId: string | null }

/** Draws a user's personal highlights as decorations — they never touch the shared document. */
export const AnnotationHighlights = Extension.create<unknown, HighlightStorage>({
  name: 'annotationHighlights',
  addStorage() { return { items: [], activeId: null } },
  addProseMirrorPlugins() {
    const storage = this.storage
    return [new Plugin({
      key: new PluginKey('annotationHighlights'),
      props: {
        decorations(state) {
          const byBlock = new Map<string, Annotation[]>()
          for (const a of storage.items) {
            if (a.anchor.type !== 'block') continue
            const list = byBlock.get(a.anchor.blockId) ?? []
            list.push(a); byBlock.set(a.anchor.blockId, list)
          }
          if (!byBlock.size) return DecorationSet.empty
          const decos: Decoration[] = []
          state.doc.descendants((node, pos) => {
            const id = node.attrs?.blockId as string | undefined
            if (!node.isTextblock || !id) return
            const list = byBlock.get(id)
            if (!list) return
            const map = blockTextMap(node, pos + 1)
            for (const a of list) {
              const loc = locateAnchor(map.text, a.anchor as NoteAnchor)
              if (!loc) continue
              const from = offsetToDocPos(map, loc.start, false)
              const to = offsetToDocPos(map, loc.end, true)
              if (from == null || to == null || from >= to) continue
              decos.push(Decoration.inline(from, to, {
                class: `annot-hl annot-${a.color}${a.comment ? ' annot-has-comment' : ''}${a.id === storage.activeId ? ' annot-active' : ''}`,
                'data-annot-id': a.id,
              }))
            }
          })
          return DecorationSet.create(state.doc, decos)
        },
      },
    })]
  },
})
