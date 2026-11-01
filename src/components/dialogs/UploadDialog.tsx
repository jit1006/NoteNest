import Modal from '../ui/Modal'
import UploadPanel, { type Destination } from '../UploadPanel'

export default function UploadDialog({ open, onClose, destination }: { open: boolean; onClose: () => void; destination: Destination }) {
  return (
    <Modal open={open} onClose={onClose} title="Upload files" description="Files are stored privately and checked on the server for type, size and ownership." size="lg"
      footer={<button type="button" className="btn-primary" onClick={onClose}>Done</button>}>
      <UploadPanel fixed={destination} />
    </Modal>
  )
}
