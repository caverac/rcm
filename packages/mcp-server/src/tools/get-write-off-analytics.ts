import { query } from '../db.js'
import { WriteOffAnalytics } from '../types.js'

export async function getWriteOffAnalytics(): Promise<WriteOffAnalytics> {
  // Get overall statistics
  const statsResult = await query<{
    total_write_offs: string
    total_amount: string
    preventable_amount: string
  }>(
    `SELECT
       COUNT(*) as total_write_offs,
       COALESCE(SUM(write_off_amount), 0) as total_amount,
       COALESCE(SUM(CASE WHEN is_preventable THEN write_off_amount ELSE 0 END), 0) as preventable_amount
     FROM write_offs`
  )

  const stats = statsResult[0]
  const totalWriteOffs = parseInt(stats.total_write_offs)
  const totalAmount = parseFloat(stats.total_amount)
  const preventableAmount = parseFloat(stats.preventable_amount)
  const preventablePercentage =
    totalAmount > 0 ? (preventableAmount / totalAmount) * 100 : 0

  // Get counts and amounts by reason
  const byReasonResult = await query<{
    write_off_reason: string
    count: string
    amount: string
  }>(
    `SELECT
       write_off_reason,
       COUNT(*) as count,
       COALESCE(SUM(write_off_amount), 0) as amount
     FROM write_offs
     GROUP BY write_off_reason`
  )

  const byReason: Record<string, { count: number; amount: number }> = {}
  byReasonResult.forEach((row) => {
    byReason[row.write_off_reason] = {
      count: parseInt(row.count),
      amount: parseFloat(row.amount),
    }
  })

  // Get counts and amounts by category
  const byCategoryResult = await query<{
    category: string
    count: string
    amount: string
  }>(
    `SELECT
       category,
       COUNT(*) as count,
       COALESCE(SUM(write_off_amount), 0) as amount
     FROM write_offs
     WHERE category IS NOT NULL
     GROUP BY category`
  )

  const byCategory: Record<string, { count: number; amount: number }> = {}
  byCategoryResult.forEach((row) => {
    byCategory[row.category] = {
      count: parseInt(row.count),
      amount: parseFloat(row.amount),
    }
  })

  // Get top preventable categories
  const topPreventableResult = await query<{
    category: string
    count: string
    amount: string
  }>(
    `SELECT
       category,
       COUNT(*) as count,
       COALESCE(SUM(write_off_amount), 0) as amount
     FROM write_offs
     WHERE is_preventable = true AND category IS NOT NULL
     GROUP BY category
     ORDER BY SUM(write_off_amount) DESC
     LIMIT 5`
  )

  const topPreventableCategories = topPreventableResult.map((row) => ({
    category: row.category,
    count: parseInt(row.count),
    amount: parseFloat(row.amount),
  }))

  // Generate insights
  const insights: string[] = []

  if (totalAmount > 0) {
    insights.push(
      `Total write-offs: ${totalWriteOffs} ($${totalAmount.toFixed(2)})`
    )
  }

  if (preventableAmount > 0) {
    insights.push(
      `⚠️ ${preventablePercentage.toFixed(1)}% ($${preventableAmount.toFixed(2)}) of write-offs were preventable`
    )
  }

  // Top reason insight
  const topReason = Object.entries(byReason).sort(
    (a, b) => b[1].amount - a[1].amount
  )[0]
  if (topReason) {
    insights.push(
      `Top write-off reason: ${topReason[0].replace(/_/g, ' ')} - ${topReason[1].count} cases, $${topReason[1].amount.toFixed(2)}`
    )
  }

  // Top preventable category
  if (topPreventableCategories.length > 0) {
    const top = topPreventableCategories[0]
    insights.push(
      `Top preventable category: ${top.category} - ${top.count} cases, $${top.amount.toFixed(2)}`
    )
  }

  // Recommendations based on data
  if (preventablePercentage > 20) {
    insights.push(
      '💡 High preventable write-off rate suggests need for process improvements'
    )
  }

  // Check for specific problematic reasons
  if (
    byReason.timely_filing_expired &&
    byReason.timely_filing_expired.amount > totalAmount * 0.1
  ) {
    insights.push(
      '⏰ Significant timely filing write-offs - consider workflow automation'
    )
  }

  if (
    byReason.below_threshold &&
    byReason.below_threshold.count > totalWriteOffs * 0.3
  ) {
    insights.push('📊 Many small-dollar write-offs - review threshold policies')
  }

  return {
    total_write_offs: totalWriteOffs,
    total_amount: totalAmount,
    preventable_amount: preventableAmount,
    preventable_percentage: parseFloat(preventablePercentage.toFixed(2)),
    by_reason: byReason,
    by_category: byCategory,
    top_preventable_categories: topPreventableCategories,
    insights,
  }
}
