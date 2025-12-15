import { useRef, useState } from 'react'

const PaperclipIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
    <path
      d="M10.5 6.5v9.25a3.25 3.25 0 1 0 6.5 0V6a4.75 4.75 0 0 0-9.5 0v9.75a5.25 5.25 0 1 0 10.5 0V7"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleSelect = () => {
    inputRef.current?.click()
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setFileName(file ? file.name : null)
  }

  return (
    <div className="w-full max-w-xl">
      <button
        type="button"
        onClick={handleSelect}
        className="group flex h-64 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/80 text-slate-500 transition hover:border-slate-400 hover:bg-slate-100"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 group-hover:text-slate-700">
          <PaperclipIcon />
        </span>
        <span className="text-base font-medium text-slate-600 group-hover:text-slate-900">
          {fileName ? 'Replace image' : 'Insert image'}
        </span>
        <span className="text-xs text-slate-400">PNG / TIFF</span>
        {fileName && <span className="text-xs text-slate-500">Selected: {fileName}</span>}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".png,.tif,.tiff,image/png,image/tiff"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
