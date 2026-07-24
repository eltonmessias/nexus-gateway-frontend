import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { routes } from '@/lib/routes'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-8">
      <p className="text-6xl font-bold text-muted-foreground/30">404</p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      </div>
      <Button asChild variant="outline">
        <Link href={routes.home}>Go home</Link>
      </Button>
    </div>
  )
}
