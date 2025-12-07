import { query } from '../db.js'
import { AppealAnalytics } from '../types.js'

export async function getAppealAnalytics(): Promise<AppealAnalytics> {
  // Get overall statistics
  const statsResult = await query<{
    total_appeals: string
    total_amount: string
    total_approved_amount: string
  }>(
    `SELECT
       COUNT(*) as total_appeals,
       COALESCE(SUM(appeal_amount), 0) as total_amount,
       COALESCE(SUM(approved_amount), 0) as total_approved_amount
     FROM appeals`
  )

  const stats = statsResult[0]
  const totalAppeals = parseInt(stats.total_appeals)
  const totalAmount = parseFloat(stats.total_amount)
  const totalApprovedAmount = parseFloat(stats.total_approved_amount)

  // Calculate success rate (approved + partially_approved)
  const successResult = await query<{ success_count: string }>(
    `SELECT COUNT(*) as success_count
     FROM appeals
     WHERE status IN ('approved', 'partially_approved')`
  )
  const successCount = parseInt(successResult[0].success_count)
  const successRate = totalAppeals > 0 ? (successCount / totalAppeals) * 100 : 0

  // Calculate average days to decision
  const avgDaysResult = await query<{ avg_days: string | null }>(
    `SELECT AVG(EXTRACT(DAY FROM (decision_date - created_at))) as avg_days
     FROM appeals
     WHERE decision_date IS NOT NULL`
  )
  const avgDays = avgDaysResult[0].avg_days
    ? parseFloat(avgDaysResult[0].avg_days)
    : undefined

  // Get counts by status
  const byStatusResult = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*) as count
     FROM appeals
     GROUP BY status`
  )
  const byStatus: Record<string, number> = {}
  byStatusResult.forEach((row) => {
    byStatus[row.status] = parseInt(row.count)
  })

  // Get counts by priority
  const byPriorityResult = await query<{ priority: string; count: string }>(
    `SELECT priority, COUNT(*) as count
     FROM appeals
     GROUP BY priority`
  )
  const byPriority: Record<string, number> = {}
  byPriorityResult.forEach((row) => {
    byPriority[row.priority] = parseInt(row.count)
  })

  // Get overdue count
  const overdueResult = await query<{ overdue_count: string }>(
    `SELECT COUNT(*) as overdue_count
     FROM appeals
     WHERE due_date < now()
       AND status IN ('pending', 'in_progress', 'submitted', 'under_review')`
  )
  const overdueCount = parseInt(overdueResult[0].overdue_count)

  // Generate insights
  const insights: string[] = []

  if (successRate > 0) {
    insights.push(`Overall appeal success rate: ${successRate.toFixed(1)}%`)
  }

  if (totalApprovedAmount > 0) {
    const recoveryRate = (totalApprovedAmount / totalAmount) * 100
    insights.push(
      `Recovery rate: ${recoveryRate.toFixed(1)}% ($${totalApprovedAmount.toFixed(2)} of $${totalAmount.toFixed(2)})`
    )
  }

  if (overdueCount > 0) {
    insights.push(
      `⚠️ ${overdueCount} appeal${overdueCount > 1 ? 's are' : ' is'} overdue and requires immediate attention`
    )
  }

  if (byPriority.high > 0) {
    insights.push(
      `${byPriority.high} high-priority appeal${byPriority.high > 1 ? 's' : ''} in queue`
    )
  }

  if (avgDays) {
    insights.push(`Average time to decision: ${avgDays.toFixed(1)} days`)
  }

  const pendingCount = (byStatus.pending || 0) + (byStatus.in_progress || 0)
  if (pendingCount > 0) {
    insights.push(
      `${pendingCount} appeal${pendingCount > 1 ? 's' : ''} currently in progress`
    )
  }

  return {
    total_appeals: totalAppeals,
    total_amount: totalAmount,
    total_approved_amount: totalApprovedAmount,
    success_rate: parseFloat(successRate.toFixed(2)),
    average_days_to_decision: avgDays,
    by_status: byStatus,
    by_priority: byPriority,
    overdue_count: overdueCount,
    insights,
  }
}
