import { createContext, useContext } from 'react'

/** Provided while viewing an UNLISTED note: images are then resolved through the token-checking edge function. */
export const SharedAccessContext = createContext<{ noteId: string; token: string } | null>(null)
export const useSharedAccess = () => useContext(SharedAccessContext)
