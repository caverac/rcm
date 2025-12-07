import { query } from '../db.js'
import { RebillAnalytics } from '../types.js'

export async function getRebillAnalytics(): Promise<RebillAnalytics> {
  // Get overall statistics
  const statsResult = await query<{
    total_rebills: string
    total_amount: string
    total_recovered: string
  }>(
    `SELECT
       COUNT(*) as total_rebills,
       COALESCE(SUM(rebill_amount), 0) as total_amount,
       COALESCE(SUM(recovered_amount), 0) as total_recovered
     FROM rebills`
  )

  const stats = statsResult[0]
  const totalRebills = parseInt(stats.total_rebills)
  const totalAmount = parseFloat(stats.total_amount)
  const totalRecovered = parseFloat(stats.total_recovered)

  // Calculate success rate (paid + partially_paid)
  const successResult = await query<{ success_count: string }>(
    `SELECT COUNT(*) as success_count
     FROM rebills
     WHERE status IN ('paid', 'partially_paid')`
  )
  const successCount = parseInt(successResult[0].success_count)
  const successRate = totalRebills > 0 ? (successCount / totalRebills) * 100 : 0

  // Calculate average days to resolution
  const avgDaysResult = await query<{ avg_days: string | null }>(
    `SELECT AVG(EXTRACT(DAY FROM (resolution_date - created_at))) as avg_days
     FROM rebills
     WHERE resolution_date IS NOT NULL`
  )
  const avgDays = avgDaysResult[0].avg_days
    ? parseFloat(avgDaysResult[0].avg_days)
    : undefined

  // Get counts by status
  const byStatusResult = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*) as count
     FROM rebills
     GROUP BY status`
  )
  const byStatus: Record<string, number> = {}
  byStatusResult.forEach((row) => {
    byStatus[row.status] = parseInt(row.count)
  })

  // Get success rates by reason
  const byReasonResult = await query<{
    rebill_reason: string
    total_count: string
    success_count: string
  }>(
    `SELECT
       rebill_reason,
       COUNT(*) as total_count,
       SUM(CASE WHEN status IN ('paid', 'partially_paid') THEN 1 ELSE 0 END) as success_count
     FROM rebills
     GROUP BY rebill_reason`
  )
  const byReason: Record<string, { count: number; success_rate: number }> = {}
  byReasonResult.forEach((row) => {
    const count = parseInt(row.total_count)
    const successes = parseInt(row.success_count)
    byReason[row.rebill_reason] = {
      count,
      success_rate: count > 0 ? (successes / count) * 100 : 0,
    }
  })

  // Generate insights
  const insights: string[] = []

  if (totalAmount > 0) {
    insights.push(
      `Total rebills: ${totalRebills} ($${totalAmount.toFixed(2)} attempted)`
    )
  }

  if (successRate > 0) {
    insights.push(`Rebill success rate: ${successRate.toFixed(1)}%`)
  }

  if (totalRecovered > 0) {
    const recoveryRate = (totalRecovered / totalAmount) * 100
    insights.push(
      `Recovery rate: ${recoveryRate.toFixed(1)}% ($${totalRecovered.toFixed(2)} recovered)`
    )
  }

  if (avgDays) {
    insights.push(`Average time to resolution: ${avgDays.toFixed(1)} days`)
  }

  // Top performing reason
  const topReason = Object.entries(byReason).sort(
    (a, b) => b[1].success_rate - a[1].success_rate
  )[0]
  if (topReason && topReason[1].count >= 5) {
    insights.push(
      `Best performing reason: ${topReason[0].replace(/_/g, ' ')} (${topReason[1].success_rate.toFixed(1)}% success rate)`
    )
  }

  // Warning for low success rate
  if (successRate < 50 && totalRebills >= 10) {
    insights.push('⚠️ Low rebill success rate - review correction processes')
  }

  // Check for denied_again
  const deniedAgainCount = byStatus.denied_again || 0
  if (deniedAgainCount > totalRebills * 0.2 && totalRebills >= 10) {
    insights.push(
      `⚠️ ${deniedAgainCount} rebills denied again - review root cause analysis`
    )
  }

  // Pending rebills
  const pendingCount = (byStatus.pending || 0) + (byStatus.submitted || 0)
  if (pendingCount > 0) {
    insights.push(
      `${pendingCount} rebill${pendingCount > 1 ? 's' : ''} currently pending`
    )
  }

  return {
    total_rebills: totalRebills,
    total_amount: totalAmount,
    total_recovered: totalRecovered,
    success_rate: parseFloat(successRate.toFixed(2)),
    average_days_to_resolution: avgDays,
    by_status: byStatus,
    by_reason: byReason,
    insights,
  }
}
