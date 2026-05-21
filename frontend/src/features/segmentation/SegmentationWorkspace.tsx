import { ImageCanvas } from '../../components/ImageCanvas'
import { useSessionStore } from '../../lib/store/session'
import { UploadDropzone } from '../upload/UploadDropzone'

export function SegmentationWorkspace() {
  const imageUrl = useSessionStore((state) => state.imageUrl)

  return (
    <div className="flex gap-10">
      {imageUrl ? <ImageCanvas /> : <UploadDropzone />}
    </div>
  )
}
