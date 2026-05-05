import { PagePlaceholder } from './_PagePlaceholder'

export function LiveStream() {
  return (
    <PagePlaceholder
      title="Live stream"
      description="Polled feed of recent traces across all projects. Filter by status, kind, time range, retry/warning presence. Click a card for an inline deep-dive panel."
      arrivingIn="commit 10"
    />
  )
}
