import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link to="/" className="text-sm font-semibold tracking-tight">
          RapidBro
        </Link>
        <p className="text-xs text-muted-foreground">Nearest bus stop lookup</p>
      </div>
    </header>
  )
}
