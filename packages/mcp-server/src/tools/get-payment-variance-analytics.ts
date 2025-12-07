import { query } from '../db.js'
import { PaymentVarianceAnalytics } from '../types.js'

export async function getPaymentVarianceAnalytics(): Promise<PaymentVarianceAnalytics> {
  // Get overall statistics
  const statsResult = await query<{
    total_variances: string
    total_variance_amount: string
    total_underpayment: string
    total_overpayment: string
    avg_variance_pct: string
  }>(`
    SELECT
      COUNT(*) as total_variances,
      COALESCE(SUM(ABS(variance_amount)), 0) as total_variance_amount,
      COALESCE(SUM(CASE WHEN variance_type = 'underpayment' THEN ABS(variance_amount) ELSE 0 END), 0) as total_underpayment,
      COALESCE(SUM(CASE WHEN variance_type = 'overpayment' THEN variance_amount ELSE 0 END), 0) as total_overpayment,
      COALESCE(AVG(ABS(variance_percentage)), 0) as avg_variance_pct
    FROM payment_variances
  `)

  const stats = statsResult[0]
  const totalVariances = parseInt(stats.total_variances)
  const totalVarianceAmount = parseFloat(stats.total_variance_amount)
  const totalUnderpayment = parseFloat(stats.total_underpayment)
  const totalOverpayment = parseFloat(stats.total_overpayment)
  const avgVariancePct = parseFloat(stats.avg_variance_pct)

  // Get unresolved statistics
  const unresolvedResult = await query<{
    unresolved_count: string
    unresolved_amount: string
  }>(`
    SELECT
      COUNT(*) as unresolved_count,
      COALESCE(SUM(ABS(variance_amount)), 0) as unresolved_amount
    FROM payment_variances
    WHERE resolved = false
  `)
  const unresolvedCount = parseInt(unresolvedResult[0].unresolved_count)
  const unresolvedAmount = parseFloat(unresolvedResult[0].unresolved_amount)

  // Get appeals required count
  const appealsRequiredResult = await query<{
    appeals_required_count: string
  }>(`
    SELECT COUNT(*) as appeals_required_count
    FROM payment_variances
    WHERE requires_appeal = true AND (appeal_id IS NULL OR appeal_id = '')
  `)
  const appealsRequiredCount = parseInt(
    appealsRequiredResult[0].appeals_required_count
  )

  // Get counts and amounts by variance type
  const byTypeResult = await query<{
    variance_type: string
    count: string
    amount: string
  }>(`
    SELECT
      variance_type,
      COUNT(*) as count,
      COALESCE(SUM(ABS(variance_amount)), 0) as amount
    FROM payment_variances
    GROUP BY variance_type
  `)
  const byVarianceType: Record<string, { count: number; amount: number }> = {}
  byTypeResult.forEach((row) => {
    byVarianceType[row.variance_type] = {
      count: parseInt(row.count),
      amount: parseFloat(row.amount),
    }
  })

  // Get statistics by reason
  const byReasonResult = await query<{
    variance_reason: string
    count: string
    amount: string
    avg_variance_pct: string
  }>(`
    SELECT
      variance_reason,
      COUNT(*) as count,
      COALESCE(SUM(ABS(variance_amount)), 0) as amount,
      COALESCE(AVG(ABS(variance_percentage)), 0) as avg_variance_pct
    FROM payment_variances
    WHERE variance_reason IS NOT NULL
    GROUP BY variance_reason
  `)
  const byReason: Record<
    string,
    { count: number; amount: number; avg_variance_pct: number }
  > = {}
  byReasonResult.forEach((row) => {
    byReason[row.variance_reason] = {
      count: parseInt(row.count),
      amount: parseFloat(row.amount),
      avg_variance_pct: parseFloat(row.avg_variance_pct),
    }
  })

  // Get statistics by payer
  const byPayerResult = await query<{
    payer_id: string
    count: string
    total_variance: string
    avg_variance_pct: string
  }>(`
    SELECT
      payer_id,
      COUNT(*) as count,
      COALESCE(SUM(variance_amount), 0) as total_variance,
      COALESCE(AVG(ABS(variance_percentage)), 0) as avg_variance_pct
    FROM payment_variances
    GROUP BY payer_id
    ORDER BY ABS(SUM(variance_amount)) DESC
    LIMIT 10
  `)
  const byPayer: Record<
    string,
    { count: number; total_variance: number; avg_variance_pct: number }
  > = {}
  byPayerResult.forEach((row) => {
    byPayer[row.payer_id] = {
      count: parseInt(row.count),
      total_variance: parseFloat(row.total_variance),
      avg_variance_pct: parseFloat(row.avg_variance_pct),
    }
  })

  // Generate insights
  const insights: string[] = []

  if (totalVariances > 0) {
    insights.push(
      `Total variances: ${totalVariances} ($${totalVarianceAmount.toFixed(2)} total variance)`
    )
  }

  if (totalUnderpayment > 0) {
    const underpaymentPct = (totalUnderpayment / totalVarianceAmount) * 100
    insights.push(
      `Underpayments: $${totalUnderpayment.toFixed(2)} (${underpaymentPct.toFixed(1)}% of total variance)`
    )
  }

  if (totalOverpayment > 0) {
    const overpaymentPct = (totalOverpayment / totalVarianceAmount) * 100
    insights.push(
      `Overpayments: $${totalOverpayment.toFixed(2)} (${overpaymentPct.toFixed(1)}% of total variance)`
    )
  }

  if (avgVariancePct > 0) {
    insights.push(`Average variance: ${avgVariancePct.toFixed(1)}%`)
  }

  // Unresolved variances
  if (unresolvedCount > 0) {
    insights.push(
      `${unresolvedCount} unresolved variance${unresolvedCount > 1 ? 's' : ''} ($${unresolvedAmount.toFixed(2)})`
    )
  }

  // Appeals required
  if (appealsRequiredCount > 0) {
    insights.push(
      `⚠️ ${appealsRequiredCount} variance${appealsRequiredCount > 1 ? 's' : ''} requiring appeal action`
    )
  }

  // Top reason by amount
  const topReason = Object.entries(byReason).sort(
    (a, b) => b[1].amount - a[1].amount
  )[0]
  if (topReason && topReason[1].count >= 5) {
    insights.push(
      `Top variance reason: ${topReason[0].replace(/_/g, ' ')} ($${topReason[1].amount.toFixed(2)} across ${topReason[1].count} cases)`
    )
  }

  // High variance percentage warning
  if (avgVariancePct > 15 && totalVariances >= 10) {
    insights.push(
      '💡 High average variance percentage suggests contract verification needed'
    )
  }

  // Payer with most issues
  const topPayer = Object.entries(byPayer).sort(
    (a, b) => b[1].count - a[1].count
  )[0]
  if (
    topPayer &&
    topPayer[1].count > totalVariances * 0.2 &&
    totalVariances >= 10
  ) {
    insights.push(
      `⚠️ Payer ${topPayer[0]} accounts for ${topPayer[1].count} variances - review contract terms`
    )
  }

  // Underpayment dominance
  if (totalUnderpayment > totalVarianceAmount * 0.7 && totalVariances >= 10) {
    insights.push(
      '💰 Significant underpayment pattern - prioritize appeals and payer contract review'
    )
  }

  return {
    total_variances: totalVariances,
    total_variance_amount: parseFloat(totalVarianceAmount.toFixed(2)),
    total_underpayment: parseFloat(totalUnderpayment.toFixed(2)),
    total_overpayment: parseFloat(totalOverpayment.toFixed(2)),
    average_variance_percentage: parseFloat(avgVariancePct.toFixed(2)),
    unresolved_count: unresolvedCount,
    unresolved_amount: parseFloat(unresolvedAmount.toFixed(2)),
    appeals_required_count: appealsRequiredCount,
    by_variance_type: byVarianceType,
    by_reason: byReason,
    by_payer: byPayer,
    insights,
  }
}
