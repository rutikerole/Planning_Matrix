import { PagePlaceholder } from './_PagePlaceholder'

export function Search() {
  return (
    <PagePlaceholder
      title="Search"
      description="Datadog-style structured query — status:error AND cost_cents:>500 — across all traces. Saved searches kept locally."
      arrivingIn="commit 12"
    />
  )
}
