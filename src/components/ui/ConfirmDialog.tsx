import Modal from './Modal'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="button" disabled={busy} onClick={onConfirm}
            className={danger ? 'btn bg-rose-600 text-white hover:bg-rose-500' : 'btn-primary'}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }>
      <p className="text-sm">{message}</p>
    </Modal>
  )
}
