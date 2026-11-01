import { useState } from 'react'
import Modal from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { useReport } from '../../api/reports'
import { friendlyMessage } from '../../lib/errors'

export default function ReportDialog({ open, onClose, type, id }: { open: boolean; onClose: () => void; type: 'note' | 'resource'; id: string }) {
  const toast = useToast(); const report = useReport()
  const [reason, setReason] = useState<'spam' | 'copyright' | 'inappropriate' | 'other'>('inappropriate'); const [details, setDetails] = useState('')
  const submit = async () => {
    try { await report.mutateAsync({ type, id, reason, details }); toast.success('Thanks — the report was sent for review'); setDetails(''); onClose() }
    catch (e) { toast.error(friendlyMessage(e as Error)) }
  }
  return (
    <Modal open={open} onClose={onClose} title={`Report this ${type}`} description="Reports are reviewed by the NoteNest team. You can report each item once."
      footer={<><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn-primary" disabled={report.isPending} onClick={() => void submit()}>{report.isPending ? 'Sending…' : 'Send report'}</button></>}>
      <div className="space-y-4">
        <div><label htmlFor="rp-reason" className="label">Reason</label><select id="rp-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}><option value="inappropriate">Inappropriate content</option><option value="spam">Spam</option><option value="copyright">Copyright problem</option><option value="other">Something else</option></select></div>
        <div><label htmlFor="rp-details" className="label">Details (optional)</label><textarea id="rp-details" rows={3} maxLength={1000} className="input" value={details} onChange={(e) => setDetails(e.target.value)} /></div>
      </div>
    </Modal>
  )
}
