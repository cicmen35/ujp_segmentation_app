import { useMemo } from 'react'
import ujpLogo from '../assets/ujp-praha.png'

const links = [
  { label: 'Login', href: '#' },
  { label: 'Help', href: '#' },
]

export function Header() {
  const dateLabel = useMemo(() => new Date().toLocaleDateString('cs-CZ', { day: '2-digit', month: 'short' }), [])

  return (
    <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <img src={ujpLogo} alt="UJP Praha" className="h-9 w-auto" />
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] uppercase text-slate-500">{dateLabel}</span>
          </div>
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
