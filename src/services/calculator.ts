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
  // 优先使用 entry 中的值，否则使用默认值 8 人和 15 元
  const avgClassSize = entry.avgClassSize || 8
  const avgRevenuePerMember = entry.avgRevenuePerMember || 15
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
  
  // 计算期末现金（用户录入后的结果）
  const endingCash = calculateEndingCash(latestEntry)
  
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
    cashBalance: endingCash,
    cashBalanceStart: latestEntry.cashBalanceStart,
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

// 计算盈亏平衡点（修正版）
export const calculateBreakEven = () => {
  const settings = getBusinessSettings()
  const entries = getDailyEntries()
  
  // 1. 计算月固定成本（含折旧和装修摊销）
  const monthlyFixedCosts = 
    settings.monthlyRent + 
    settings.monthlyUtilities + 
    settings.fixedStaffCost + 
    settings.monthlyInsurance
  
  // 装修摊销（按月）
  let monthlyRenovationAmort = 0
  if (settings.renovationCost && settings.renovationYears) {
    monthlyRenovationAmort = settings.renovationCost / (settings.renovationYears * 12)
  }
  
  // 设备折旧（按月）
  const monthlyDepreciation = settings.equipmentValue / settings.equipmentDepreciationMonths
  
  // 总月固定成本
  const totalMonthlyFixedCosts = monthlyFixedCosts + monthlyRenovationAmort + monthlyDepreciation
  
  // 日固定成本（按30天平均）
  const dailyFixedCosts = totalMonthlyFixedCosts / 30
  
  // 2. 获取最近7天的数据来计算边际贡献率（避免单日异常）
  const dates = Object.keys(entries).sort().slice(-7)
  
  // 如果没有历史数据，使用默认毛利率50%
  if (dates.length === 0) {
    const defaultGrossMargin = 0.5
    const dailyBreakEven = dailyFixedCosts / defaultGrossMargin
    const monthlyBreakEven = totalMonthlyFixedCosts / defaultGrossMargin
    
    return {
      dailyFixedCosts,
      monthlyFixedCosts: totalMonthlyFixedCosts,
      grossMargin: defaultGrossMargin * 100,
      dailyBreakEven,
      monthlyBreakEven,
      currentDailyRevenue: 0,
      isAchieved: false,
      note: '暂无数据，使用默认毛利率50%估算'
    }
  }
  
  // 3. 计算核心业务（团课 + 私教）的总收入和总变动成本
  let totalCoreRevenue = 0
  let totalVariableCosts = 0
  
  for (const date of dates) {
    const entry = entries[date]
    
    // ===== 团课部分 =====
    const avgClassSize = entry.avgClassSize || 8
    const avgRevenuePerMember = entry.avgRevenuePerMember || 15
    const classRevenue = (entry.classCount || 0) * avgClassSize * avgRevenuePerMember
    
    // 团课变动成本：教练课时费
    const classHours = (entry.classHours || entry.classCount || 0)
    const classCoachCost = classHours * settings.classCoachRate
    
    // ===== 私教部分 =====
    let ptRevenue = entry.ptRevenue || 0
    if (ptRevenue === 0 && entry.ptHours) {
      const ptRate = entry.ptRate || settings.defaultPtRate
      ptRevenue = entry.ptHours * ptRate
    }
    
    // 私教变动成本：教练提成
    const ptCommission = ptRevenue * settings.ptCommissionRate
    
    // 只累计核心业务（不含零售、新会员收入等）
    totalCoreRevenue += classRevenue + ptRevenue
    totalVariableCosts += classCoachCost + ptCommission
  }
  
  // 4. 计算核心业务的边际贡献率（毛利率）
  let grossMargin = 0.5 // 默认值
  if (totalCoreRevenue > 0) {
    grossMargin = (totalCoreRevenue - totalVariableCosts) / totalCoreRevenue
    // 防止极端值（毛利率不应低于0或高于1）
    grossMargin = Math.min(0.9, Math.max(0.1, grossMargin))
  }
  
  // 5. 计算盈亏平衡点
  const dailyBreakEven = grossMargin > 0 ? dailyFixedCosts / grossMargin : dailyFixedCosts
  const monthlyBreakEven = grossMargin > 0 ? totalMonthlyFixedCosts / grossMargin : totalMonthlyFixedCosts
  
  // 6. 计算当前最新一天的日收入（仅核心业务）
  let currentDailyRevenue = 0
  const latestEntry = getLatestEntry()
  if (latestEntry) {
    const avgClassSize = latestEntry.avgClassSize || 8
    const avgRevenuePerMember = latestEntry.avgRevenuePerMember || 15
    const classRevenue = (latestEntry.classCount || 0) * avgClassSize * avgRevenuePerMember
    
    let ptRevenue = latestEntry.ptRevenue || 0
    if (ptRevenue === 0 && latestEntry.ptHours) {
      const ptRate = latestEntry.ptRate || settings.defaultPtRate
      ptRevenue = latestEntry.ptHours * ptRate
    }
    currentDailyRevenue = classRevenue + ptRevenue
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

// ========== CAC 获客成本分析 ==========

// 计算 CAC（获客成本）
export const calculateCAC = (): number => {
  const entries = getDailyEntries()
  const dates = Object.keys(entries).sort()
  
  let totalMarketingSpend = 0
  let totalNewMembers = 0
  
  for (const date of dates) {
    const entry = entries[date]
    totalMarketingSpend += entry.marketingSpend || 0
    totalNewMembers += entry.newMembers || 0
  }
  
  if (totalNewMembers === 0) return 0
  return totalMarketingSpend / totalNewMembers
}

// 获取 CAC 指标（带状态解读）
export const getCACMetrics = () => {
  const cac = calculateCAC()
  
  let status = ''
  let statusColor = ''
  let statusDesc = ''
  
  if (cac === 0) {
    status = '暂无数据'
    statusColor = '#9ca3af'
    statusDesc = '请先在快捷录入中记录营销支出和新会员数'
  } else if (cac < 100) {
    status = '优秀'
    statusColor = '#10b981'
    statusDesc = '获客成本控制得很好，建议保持现有策略'
  } else if (cac < 300) {
    status = '良好'
    statusColor = '#34d399'
    statusDesc = '获客成本在合理范围内，可尝试优化渠道进一步提升'
  } else if (cac < 600) {
    status = '偏高'
    statusColor = '#f59e0b'
    statusDesc = '获客成本偏高，建议优化投放渠道或增加转介绍活动'
  } else {
    status = '危险'
    statusColor = '#ef4444'
    statusDesc = '获客成本过高，请立即优化营销策略'
  }
  
  return {
    cac,
    status,
    statusColor,
    statusDesc,
    hasData: cac > 0
  }
}