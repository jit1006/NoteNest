import { BookOpenText } from 'lucide-react'
import type { SubjectColor } from '../../types/db'
import { ACCENT } from '../../utils/accent'

const SIZES = { sm: 'h-9 w-9 rounded-xl', md: 'h-11 w-11 rounded-xl', lg: 'h-14 w-14 rounded-2xl' }
const GLYPH = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' }

export default function SubjectIcon({ color = 'indigo', size = 'md' }: { color?: SubjectColor; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-sm ${ACCENT[color].gradient} ${SIZES[size]}`}>
      <BookOpenText className={GLYPH[size]} />
    </span>
  )
}
