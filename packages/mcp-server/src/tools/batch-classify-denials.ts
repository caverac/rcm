import { BatchClassifyDenialsInput, DenialAnalytics } from '../types.js'
import { classifyDenial } from './classify-denial.js'

export async function batchClassifyDenials(
  input: BatchClassifyDenialsInput
): Promise<DenialAnalytics> {
  const { denials, group_by = 'category' } = input

  // Classify all denials
  const classifications = await Promise.all(
    denials.map(async (denial) => ({
      ...denial,
      classification: await classifyDenial({ denial_code: denial.denial_code }),
    }))
  )

  // Calculate totals
  const total_denials = denials.length
  const total_amount = denials.reduce((sum, d) => sum + d.denial_amount, 0)

  // Group denials based on group_by parameter
  const groupMap = new Map<
    string,
    {
      count: number
      total_amount: number
      codes: Set<string>
      payer_ids: Set<string>
    }
  >()

  for (const item of classifications) {
    let group_key: string

    switch (group_by) {
      case 'category':
        group_key = item.classification.category
        break
      case 'payer':
        group_key = item.payer_id || 'Unknown Payer'
        break
      case 'code':
        group_key = item.denial_code
        break
      default:
        group_key = item.classification.category
    }

    if (!groupMap.has(group_key)) {
      groupMap.set(group_key, {
        count: 0,
        total_amount: 0,
        codes: new Set(),
        payer_ids: new Set(),
      })
    }

    const group = groupMap.get(group_key)!
    group.count++
    group.total_amount += item.denial_amount
    group.codes.add(item.denial_code)
    if (item.payer_id) {
      group.payer_ids.add(item.payer_id)
    }
  }

  // Convert to array and sort by total amount (descending)
  const groups = Array.from(groupMap.entries())
    .map(([group_key, data]) => ({
      group_key,
      count: data.count,
      total_amount: Math.round(data.total_amount * 100) / 100,
      percentage: Math.round((data.total_amount / total_amount) * 10000) / 100,
      top_codes: Array.from(data.codes).slice(0, 5),
      avg_amount: Math.round((data.total_amount / data.count) * 100) / 100,
    }))
    .sort((a, b) => b.total_amount - a.total_amount)

  // Generate insights
  const insights: string[] = []

  // Top write-off category
  if (groups.length > 0) {
    const topGroup = groups[0]
    insights.push(
      `${topGroup.percentage}% of write-offs (${topGroup.count} denials, $${topGroup.total_amount.toFixed(2)}) are from ${topGroup.group_key}`
    )
  }

  // High-volume low-value vs low-volume high-value
  const highVolumeLowValue = groups.filter(
    (g) => g.count >= 5 && g.avg_amount < 100
  )
  if (highVolumeLowValue.length > 0) {
    const hvlv = highVolumeLowValue[0]
    insights.push(
      `High-volume, low-value denials in ${hvlv.group_key}: ${hvlv.count} denials averaging $${hvlv.avg_amount}. Consider process improvements to prevent these.`
    )
  }

  const lowVolumeHighValue = groups.filter(
    (g) => g.count < 5 && g.avg_amount >= 500
  )
  if (lowVolumeHighValue.length > 0) {
    const lvhv = lowVolumeHighValue[0]
    insights.push(
      `High-value denials in ${lvhv.group_key}: ${lvhv.count} denials averaging $${lvhv.avg_amount}. Priority for appeals.`
    )
  }

  // Preventable denials
  const preventableCategories = [
    'CODING_ERROR',
    'MISSING_INFO',
    'AUTHORIZATION',
    'TIMELY_FILING',
  ]
  const preventable = groups.filter((g) =>
    preventableCategories.includes(g.group_key)
  )
  if (preventable.length > 0) {
    const preventableAmount = preventable.reduce(
      (sum, g) => sum + g.total_amount,
      0
    )
    const preventablePercent =
      Math.round((preventableAmount / total_amount) * 10000) / 100
    insights.push(
      `${preventablePercent}% ($${preventableAmount.toFixed(2)}) of denials appear preventable through improved workflows`
    )
  }

  // Concentration risk
  if (groups.length > 0 && groups[0].percentage > 40) {
    insights.push(
      `Concentration risk: ${groups[0].group_key} represents ${groups[0].percentage}% of denials. Targeted intervention recommended.`
    )
  }

  // Specific recommendations based on top categories
  if (group_by === 'category' && groups.length > 0) {
    const topCategory = groups[0].group_key
    if (topCategory === 'AUTHORIZATION') {
      insights.push(
        'Recommendation: Implement pre-service authorization checks for all procedures requiring prior auth'
      )
    } else if (topCategory === 'CODING_ERROR') {
      insights.push(
        'Recommendation: Enhance coding validation rules and provide additional coder training'
      )
    } else if (topCategory === 'MISSING_INFO') {
      insights.push(
        'Recommendation: Implement claim scrubbing before submission to catch missing information'
      )
    } else if (topCategory === 'TIMELY_FILING') {
      insights.push(
        'Recommendation: Monitor claim submission timelines and implement alerts for approaching deadlines'
      )
    } else if (topCategory === 'BUNDLING') {
      insights.push(
        'Recommendation: Review NCCI edits before billing multiple procedures together'
      )
    }
  }

  return {
    total_denials,
    total_amount: Math.round(total_amount * 100) / 100,
    groups,
    insights,
  }
}
