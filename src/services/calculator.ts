import { DailyEntry, BusinessSettings, getDailyEntries, getBusinessSettings, getLatestEntry } from './storage'
import { formatCurrency } from '../utils/format'

// 计算单日收入
export const calculateDailyRevenue = (entry: DailyEntry, settings?: BusinessSettings): number => {
  const bizSettings = settings || getBusinessSettings()
  
  // 团课收入：团课节数 × 平均每节课人数 × 人均收入
  const classCount = entry.classCount || 0
  const avgClassSize = entry.avgClassSize || bizSettings.avgClassSize
  const avgRevenuePerMember = entry.avgRevenuePerMember || bizSettings.avgClassRevenuePerMember
  const classRevenue = classCount * avgClassSize * avgRevenuePerMember
  
  // 私教收入
  let ptRevenue = entry.ptRevenue || 0
  if (ptRevenue === 0 && entry.ptHours) {
    const ptRate = entry.ptRate || bizSettings.defaultPtRate
    ptRevenue = entry.ptHours * ptRate
  }
  
  // 其他收入
  const otherRevenue = (entry.newRevenue || 0) + 
                       (entry.retailRevenue || 0) + 
                       (entry.otherRevenue || 0)
  
  return classRevenue + ptRevenue + otherRevenue
}

// 计算单日成本
export const calculateDailyCosts = (entry: DailyEntry, settings: BusinessSettings): number => {
  // 私教佣金
  let ptRevenue = entry.ptRevenue || 0
  if (ptRevenue === 0 && entry.ptHours) {
    const ptRate = entry.ptRate || settings.defaultPtRate
    ptRevenue = entry.ptHours * ptRate
  }
  const ptCommission = ptRevenue * settings.ptCommissionRate
  
  // 变动成本
  const variableCosts = (entry.marketingSpend || 0) + (entry.variableStaffCost || 0)
  
  // 固定成本分摊（月成本 / 30）
  const dailyFixedCost = (settings.monthlyRent + 
                          settings.monthlyUtilities + 
                          settings.monthlyFixedStaffCost + 
                          settings.monthlyInsurance) / 30
  
  // 折旧成本
  const monthlyDepreciation = settings.equipmentValue / settings.equipmentDepreciationMonths
  const dailyDepreciation = monthlyDepreciation / 30
  
  return dailyFixedCost + dailyDepreciation + ptCommission + variableCosts
}

// 计算单日利润
export const calculateDailyProfit = (entry: DailyEntry, settings: BusinessSettings): number => {
  return calculateDailyRevenue(entry, settings) - calculateDailyCosts(entry, settings)
}

// 获取最新日期的关键指标
export const getLatestMetrics = () => {
  const latestEntry = getLatestEntry()
  const settings = getBusinessSettings()
  
  if (!latestEntry) return null
  
  const revenue = calculateDailyRevenue(latestEntry, settings)
  const costs = calculateDailyCosts(latestEntry, settings)
  const profit = revenue - costs
  
  // 计算置信度：基于已填字段数量
  const allFields = [
    'cashBalanceStart', 'newMembers', 'newRevenue', 'ptHours', 
    'ptRevenue', 'retailRevenue', 'marketingSpend', 'variableStaffCost',
    'classCount', 'avgClassSize', 'avgRevenuePerMember'
  ]
  
  let filledCount = 0
  allFields.forEach(field => {
    const value = latestEntry[field as keyof DailyEntry]
    if (value !== undefined && value !== 0) {
      filledCount++
    }
  })
  
  const confidence = Math.min(100, Math.floor((filledCount / allFields.length) * 100))
  
  return {
    date: latestEntry.date,
    revenue,
    costs,
    profit,
    cashBalance: latestEntry.cashBalanceStart || 0,
    newMembers: latestEntry.newMembers || 0,
    confidence
  }
}

// 获取累计指标
export const getCumulativeMetrics = () => {
  const entries = getDailyEntries()
  const settings = getBusinessSettings()
  const dates = Object.keys(entries).sort()
  
  let totalRevenue = 0
  let totalCosts = 0
  let totalNewMembers = 0
  let totalMarketingSpend = 0
  
  for (const date of dates) {
    const entry = entries[date]
    totalRevenue += calculateDailyRevenue(entry, settings)
    totalCosts += calculateDailyCosts(entry, settings)
    totalNewMembers += entry.newMembers || 0
    totalMarketingSpend += entry.marketingSpend || 0
  }
  
  return {
    totalRevenue,
    totalCosts,
    totalProfit: totalRevenue - totalCosts,
    totalNewMembers,
    totalMarketingSpend,
    averageCAC: totalNewMembers > 0 ? totalMarketingSpend / totalNewMembers : 0
  }
}

// 获取近7天趋势数据（用于图表）
export const getWeeklyTrend = () => {
  const entries = getDailyEntries()
  const settings = getBusinessSettings()
  const dates = Object.keys(entries).sort().slice(-7)
  
  return dates.map(date => {
    const entry = entries[date]
    const revenue = calculateDailyRevenue(entry, settings)
    const profit = calculateDailyProfit(entry, settings)
    return {
      date: date.slice(5), // 显示 MM-DD
      revenue,
      profit
    }
  })
}

// 计算盈亏平衡点
export const calculateBreakEven = () => {
  const settings = getBusinessSettings()
  const entries = getDailyEntries()
  
  // 1. 计算月固定成本总额
  const monthlyFixedCosts = settings.monthlyRent + 
                            settings.monthlyUtilities + 
                            settings.monthlyFixedStaffCost + 
                            settings.monthlyInsurance +
                            settings.monthlyMarketing
  
  // 2. 计算日均固定成本
  const dailyFixedCosts = monthlyFixedCosts / 30
  
  // 3. 计算平均毛利率（基于历史数据）
  let totalRevenue = 0
  let totalVariableCosts = 0
  
  Object.values(entries).forEach(entry => {
    // 总收入
    const classRevenue = (entry.classCount || 0) * (entry.avgClassSize || 8) * (entry.avgRevenuePerMember || 15)
    const ptRevenue = entry.ptRevenue || (entry.ptHours || 0) * (entry.ptRate || 80)
    const otherRevenue = (entry.newRevenue || 0) + (entry.retailRevenue || 0) + (entry.otherRevenue || 0)
    const revenue = classRevenue + ptRevenue + otherRevenue
    
    // 变动成本（私教佣金 + 变动人力 + 营销）
    const ptCommission = ptRevenue * settings.ptCommissionRate
    const variableCosts = ptCommission + (entry.marketingSpend || 0) + (entry.variableStaffCost || 0)
    
    totalRevenue += revenue
    totalVariableCosts += variableCosts
  })
  
  // 毛利率 = (收入 - 变动成本) / 收入
  const grossMargin = totalRevenue > 0 ? (totalRevenue - totalVariableCosts) / totalRevenue : 0.5
  
  // 4. 盈亏平衡点 = 固定成本 ÷ 毛利率
  const dailyBreakEven = grossMargin > 0 ? dailyFixedCosts / grossMargin : dailyFixedCosts
  const monthlyBreakEven = grossMargin > 0 ? monthlyFixedCosts / grossMargin : monthlyFixedCosts
  
  // 5. 获取当前日均收入
  let currentDailyRevenue = 0
  const latestEntry = getLatestEntry()
  if (latestEntry) {
    const classRevenue = (latestEntry.classCount || 0) * (latestEntry.avgClassSize || 8) * (latestEntry.avgRevenuePerMember || 15)
    const ptRevenue = latestEntry.ptRevenue || (latestEntry.ptHours || 0) * (latestEntry.ptRate || 80)
    const otherRevenue = (latestEntry.newRevenue || 0) + (latestEntry.retailRevenue || 0) + (latestEntry.otherRevenue || 0)
    currentDailyRevenue = classRevenue + ptRevenue + otherRevenue
  }
  
  return {
    dailyFixedCosts,
    monthlyFixedCosts,
    grossMargin: grossMargin * 100,
    dailyBreakEven,
    monthlyBreakEven,
    currentDailyRevenue,
    isAchieved: currentDailyRevenue >= dailyBreakEven
  }
}