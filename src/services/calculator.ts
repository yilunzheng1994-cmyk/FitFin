import { DailyEntry, BusinessSettings, getDailyEntries, getBusinessSettings, getLatestEntry } from './storage'

// 计算团课总课时
const calculateClassHours = (entry: DailyEntry): number => {
  if (entry.classHours) return entry.classHours
  return entry.classCount || 0
}

// 计算单日收入
export const calculateDailyRevenue = (entry: DailyEntry, settings?: BusinessSettings): number => {
  const bizSettings = settings || getBusinessSettings()
  
  const classCount = entry.classCount || 0
  const avgClassSize = entry.avgClassSize || bizSettings.avgClassSize
  const avgRevenuePerMember = entry.avgRevenuePerMember || bizSettings.avgClassRevenuePerMember
  const classRevenue = classCount * avgClassSize * avgRevenuePerMember
  
  let ptRevenue = entry.ptRevenue || 0
  if (ptRevenue === 0 && entry.ptHours) {
    const ptRate = entry.ptRate || bizSettings.defaultPtRate
    ptRevenue = entry.ptHours * ptRate
  }
  
  const otherRevenue = (entry.retailRevenue || 0) + (entry.otherRevenue || 0)
  
  return classRevenue + ptRevenue + otherRevenue
}

// 计算单日成本
export const calculateDailyCosts = (entry: DailyEntry, settings: BusinessSettings): number => {
  let ptRevenue = entry.ptRevenue || 0
  if (ptRevenue === 0 && entry.ptHours) {
    const ptRate = entry.ptRate || settings.defaultPtRate
    ptRevenue = entry.ptHours * ptRate
  }
  
  const ptCommission = ptRevenue * settings.ptCommissionRate
  
  const classHours = calculateClassHours(entry)
  const classCoachCost = classHours * settings.classCoachRate
  
  const dailyRent = settings.monthlyRent / 30
  const dailyUtilities = settings.monthlyUtilities / 30
  const dailyFixedStaff = settings.fixedStaffCost / 30
  const dailyInsurance = settings.monthlyInsurance / 30
  const fixedCosts = dailyRent + dailyUtilities + dailyFixedStaff + dailyInsurance
  
  const monthlyDepreciation = settings.equipmentValue / settings.equipmentDepreciationMonths
  const dailyDepreciation = monthlyDepreciation / 30
  
  let dailyRenovationAmort = 0
  if (settings.renovationCost && settings.renovationYears) {
    const monthlyAmort = settings.renovationCost / (settings.renovationYears * 12)
    dailyRenovationAmort = monthlyAmort / 30
  }
  
  const variableMarketing = entry.marketingSpend || 0
  
  return fixedCosts + dailyDepreciation + dailyRenovationAmort + 
         ptCommission + classCoachCost + variableMarketing
}

// 计算单日利润
export const calculateDailyProfit = (entry: DailyEntry, settings: BusinessSettings): number => {
  return calculateDailyRevenue(entry, settings) - calculateDailyCosts(entry, settings)
}

// 计算单日现金变化
export const calculateDailyCashChange = (entry: DailyEntry): { cashIn: number; cashOut: number; netChange: number } => {
  const cashIn = (entry.newRevenue || 0) + 
                 (entry.retailRevenue || 0) + 
                 (entry.otherRevenue || 0) + 
                 (entry.otherCashIn || 0)
  
  const cashOut = (entry.marketingSpend || 0) + 
                  (entry.otherCashOut || 0)
  
  return { cashIn, cashOut, netChange: cashIn - cashOut }
}

// 计算期末现金
export const calculateEndingCash = (entry: DailyEntry): number => {
  const { cashIn, cashOut } = calculateDailyCashChange(entry)
  return (entry.cashBalanceStart || 0) + cashIn - cashOut
}

// 获取最新日期的关键指标
export const getLatestMetrics = () => {
  const latestEntry = getLatestEntry()
  const settings = getBusinessSettings()
  
  if (!latestEntry) return null
  
  const revenue = calculateDailyRevenue(latestEntry, settings)
  const costs = calculateDailyCosts(latestEntry, settings)
  const profit = revenue - costs
  
  const allFields = [
    'cashBalanceStart', 'classCount', 'avgClassSize', 'avgRevenuePerMember',
    'ptHours', 'ptRate', 'retailRevenue', 'marketingSpend'
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

// 获取近7天趋势
export const getWeeklyTrend = () => {
  const entries = getDailyEntries()
  const settings = getBusinessSettings()
  const dates = Object.keys(entries).sort().slice(-7)
  
  return dates.map(date => {
    const entry = entries[date]
    const revenue = calculateDailyRevenue(entry, settings)
    const profit = calculateDailyProfit(entry, settings)
    return {
      date: date.slice(5),
      revenue,
      profit
    }
  })
}

// 计算盈亏平衡点
export const calculateBreakEven = () => {
  const settings = getBusinessSettings()
  const entries = getDailyEntries()
  
  const monthlyFixedCosts = settings.monthlyRent + 
                            settings.monthlyUtilities + 
                            settings.fixedStaffCost + 
                            settings.monthlyInsurance
  
  let monthlyRenovationAmort = 0
  if (settings.renovationCost && settings.renovationYears) {
    monthlyRenovationAmort = settings.renovationCost / (settings.renovationYears * 12)
  }
  
  const monthlyDepreciation = settings.equipmentValue / settings.equipmentDepreciationMonths
  
  const totalMonthlyFixedCosts = monthlyFixedCosts + monthlyRenovationAmort + monthlyDepreciation
  const dailyFixedCosts = totalMonthlyFixedCosts / 30
  
  let totalRevenue = 0
  let totalVariableCosts = 0
  
  Object.values(entries).forEach(entry => {
    const classRevenue = (entry.classCount || 0) * (entry.avgClassSize || 8) * (entry.avgRevenuePerMember || 15)
    let ptRevenue = entry.ptRevenue || 0
    if (ptRevenue === 0 && entry.ptHours) {
      ptRevenue = (entry.ptHours || 0) * (entry.ptRate || 80)
    }
    const otherRevenue = (entry.retailRevenue || 0) + (entry.otherRevenue || 0)
    const revenue = classRevenue + ptRevenue + otherRevenue
    
    const ptCommission = ptRevenue * settings.ptCommissionRate
    const classHours = (entry.classHours || entry.classCount || 0)
    const classCoachCost = classHours * settings.classCoachRate
    const variableMarketing = entry.marketingSpend || 0
    
    const variableCosts = ptCommission + classCoachCost + variableMarketing
    
    totalRevenue += revenue
    totalVariableCosts += variableCosts
  })
  
  const grossMargin = totalRevenue > 0 ? (totalRevenue - totalVariableCosts) / totalRevenue : 0.5
  const dailyBreakEven = grossMargin > 0 ? dailyFixedCosts / grossMargin : dailyFixedCosts
  const monthlyBreakEven = grossMargin > 0 ? totalMonthlyFixedCosts / grossMargin : totalMonthlyFixedCosts
  
  let currentDailyRevenue = 0
  const latestEntry = getLatestEntry()
  if (latestEntry) {
    const classRevenue = (latestEntry.classCount || 0) * (latestEntry.avgClassSize || 8) * (latestEntry.avgRevenuePerMember || 15)
    let ptRevenue = latestEntry.ptRevenue || 0
    if (ptRevenue === 0 && latestEntry.ptHours) {
      ptRevenue = (latestEntry.ptHours || 0) * (latestEntry.ptRate || 80)
    }
    const otherRevenue = (latestEntry.retailRevenue || 0) + (latestEntry.otherRevenue || 0)
    currentDailyRevenue = classRevenue + ptRevenue + otherRevenue
  }
  
  return {
    dailyFixedCosts,
    monthlyFixedCosts: totalMonthlyFixedCosts,
    grossMargin: grossMargin * 100,
    dailyBreakEven,
    monthlyBreakEven,
    currentDailyRevenue,
    isAchieved: currentDailyRevenue >= dailyBreakEven
  }
}