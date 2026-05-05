import { PagePlaceholder } from './_PagePlaceholder'

export function CostDashboard() {
  return (
    <PagePlaceholder
      title="Cost"
      description="Total spend, token usage, error rate KPIs. Daily-cost stack chart and cache-hit-ratio line over the trailing 30 days. Top-10 leaderboards by project, user, retried turns."
      arrivingIn="commit 11"
    />
  )
}
