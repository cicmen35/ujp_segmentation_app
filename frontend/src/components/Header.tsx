import { useMemo } from 'react'

const links = [
  { label: 'Projekty', href: '#' },
  { label: 'Sezení', href: '#' },
  { label: 'Nápověda', href: '#' },
]

export function Header() {
  const dateLabel = useMemo(() => new Date().toLocaleDateString('cs-CZ', { day: '2-digit', month: 'short' }), [])

  return (
    <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight text-slate-900">UJP Segmentace</span>
          <span className="text-xs uppercase text-slate-500">{dateLabel}</span>
        </div>

        <nav className="flex items-center gap-6 text-sm text-slate-500">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="transition hover:text-slate-900">
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
