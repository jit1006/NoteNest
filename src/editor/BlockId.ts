import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { BLOCK_ID_TYPES } from './sanitize'

export const newBlockId = () => `b${crypto.randomUUID().replace(/-/g, '').slice(0, 11)}`

/**
 * Stable block ids: every block-level node carries `blockId` (rendered as data-block-id).
 * Bookmarks and annotations anchor to these ids, not to page numbers. When a block is split or pasted
 * and an id would be duplicated, the later node receives a fresh id.
 */
export const BlockId = Extension.create({
  name: 'blockId',

  addGlobalAttributes() {
    return [{
      types: BLOCK_ID_TYPES,
      attributes: {
        blockId: {
          default: null,
          parseHTML: (el: HTMLElement) => el.getAttribute('data-block-id'),
          renderHTML: (attrs: Record<string, unknown>) => (attrs.blockId ? { 'data-block-id': String(attrs.blockId) } : {}),
        },
      },
    }]
  },

  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('blockId'),
      appendTransaction: (transactions, _old, state) => {
        if (!transactions.some((t) => t.docChanged)) return null
        const seen = new Set<string>()
        const tr = state.tr
        let changed = false
        state.doc.descendants((node, pos) => {
          if (!BLOCK_ID_TYPES.includes(node.type.name)) return
          const id = node.attrs.blockId as string | null
          if (!id || seen.has(id)) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, blockId: newBlockId() })
            changed = true
          } else seen.add(id)
        })
        return changed ? tr.setMeta('addToHistory', false) : null
      },
    })]
  },
})
