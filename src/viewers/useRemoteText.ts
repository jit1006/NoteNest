import { useQuery } from '@tanstack/react-query'

const MAX_TEXT_BYTES = 1_500_000

/** Fetches a text file from a signed URL (size-capped). Never interpreted as HTML. */
export function useRemoteText(url: string | undefined) {
  return useQuery({
    queryKey: ['remote-text', url?.split('?')[0]],
    enabled: !!url,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch(url!)
      if (!res.ok) throw new Error(`Could not load the file (${res.status}).`)
      const buf = await res.arrayBuffer()
      const truncated = buf.byteLength > MAX_TEXT_BYTES
      return { text: new TextDecoder('utf-8').decode(truncated ? buf.slice(0, MAX_TEXT_BYTES) : buf), truncated }
    },
  })
}

export function useRemoteBuffer(url: string | undefined, key: string) {
  return useQuery({
    queryKey: ['remote-buffer', key],
    enabled: !!url,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const res = await fetch(url!)
      if (!res.ok) throw new Error(`Could not load the file (${res.status}).`)
      return res.arrayBuffer()
    },
  })
}
