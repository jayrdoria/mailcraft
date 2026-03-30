export const metadata = {
  title: 'Browse Templates — MailCraft',
}

export default function TemplatesPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Browse Templates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose a master template to start editing
        </p>
      </div>

      {/* Template grid — implemented in Phase 4 */}
      <div className="rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Template browser — coming in Phase 4
        </p>
      </div>
    </div>
  )
}
