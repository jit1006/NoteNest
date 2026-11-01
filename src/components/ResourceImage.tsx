import { useResource } from '../api/resources'
import { SignedImg } from '../editor/nodes'

/** Renders an image resource (e.g. a note cover) through a signed URL. */
export default function ResourceImage({ resourceId, className = '', alt = '' }: { resourceId: string | null | undefined; className?: string; alt?: string }) {
  const { data } = useResource(resourceId ?? undefined)
  const path = data?.resource_files?.[0]?.storage_path
  if (!resourceId || !path) return null
  return <SignedImg path={path} alt={alt} className={className} />
}
