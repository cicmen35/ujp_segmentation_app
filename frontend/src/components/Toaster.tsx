export type Toast = {
  id: number
  kind: 'success' | 'error'
  message: string
}

type Props = {
  toasts: Toast[]
}

export function Toaster({ toasts }: Props) {
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-2xl border px-4 py-3 text-sm shadow-lg ${
            toast.kind === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
