import { Boxes, Brain, ClipboardList, Cpu, Database, Globe, LayoutTemplate, Network, type LucideIcon } from 'lucide-react'
import type { Subject } from '../../types'
import { ACCENT } from '../../utils/accent'

const ICONS: Record<Subject['icon'], LucideIcon> = {
  database: Database,
  network: Network,
  cpu: Cpu,
  globe: Globe,
  boxes: Boxes,
  clipboard: ClipboardList,
  layout: LayoutTemplate,
  brain: Brain,
}

interface Props {
  subject: Pick<Subject, 'icon' | 'accent'>
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 'h-9 w-9 rounded-xl', md: 'h-11 w-11 rounded-xl', lg: 'h-14 w-14 rounded-2xl' }
const GLYPH = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' }

export default function SubjectIcon({ subject, size = 'md' }: Props) {
  const Icon = ICONS[subject.icon]
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-sm ${ACCENT[subject.accent].gradient} ${SIZES[size]}`}
    >
      <Icon className={GLYPH[size]} />
    </span>
  )
}
