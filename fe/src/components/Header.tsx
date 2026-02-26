import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            RapidBro
          </Link>
          <Link
            to="/t789"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            T789 ETA
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">Nearest bus stop lookup</p>
      </div>
    </header>
  )
}
