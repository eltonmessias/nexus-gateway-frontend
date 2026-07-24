import Link from 'next/link'

const sections = [
  {
    title: 'Getting Started',
    items: [
      { href: '/docs/overview', label: 'Overview' },
      { href: '/docs/quickstart', label: 'Quickstart' },
      { href: '/docs/authentication', label: 'Authentication' },
    ],
  },
  {
    title: 'IAM',
    items: [
      { href: '/docs/organizations', label: 'Organizations' },
      { href: '/docs/users', label: 'Users' },
      { href: '/docs/teams', label: 'Teams' },
      { href: '/docs/projects', label: 'Projects' },
      { href: '/docs/api-clients', label: 'API Clients' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { href: '/docs/flags', label: 'Feature Flags' },
      { href: '/docs/jobs', label: 'Job Queue' },
      { href: '/docs/search', label: 'Full-Text Search' },
      { href: '/docs/audit', label: 'Audit Log' },
    ],
  },
  {
    title: 'SDK',
    items: [
      { href: '/docs/sdk/typescript', label: 'TypeScript SDK' },
      { href: '/docs/sdk/rate-limiting', label: 'Rate Limiting' },
      { href: '/docs/sdk/errors', label: 'Error Reference' },
    ],
  },
]

export default function DocsHomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-8 py-4 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <span className="text-sm font-bold text-white">N</span>
        </div>
        <span className="font-bold text-lg">Nexus Gateway</span>
        <span className="text-gray-400 ml-1">Documentation</span>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-16">
        <div className="mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Nexus Gateway</h1>
          <p className="text-xl text-gray-600 max-w-2xl">
            Open-source backend platform for Identity & Access Management, Feature Flags, Job Queues, and Full-Text
            Search — built with Java 21 + Spring Boot 3.3.
          </p>
          <div className="flex gap-3 mt-6">
            <Link
              href="/docs/quickstart"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Get started
            </Link>
            <Link
              href="/docs/overview"
              className="inline-flex items-center rounded-lg border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View architecture
            </Link>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">{section.title}</h2>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
