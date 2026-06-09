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
// 在 calculator.ts 末尾添加以下函数

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

// 计算 LTV（客户生命周期价值）
export const calculateLTV = (): number => {
  const settings = getBusinessSettings()
  const entries = getDailyEntries()
  const dates = Object.keys(entries).sort()
  
  if (dates.length === 0) return 0
  
  // 取最近30天数据计算平均月消费
  const recentDates = dates.slice(-30)
  let totalMemberRevenue = 0
  let totalMemberDays = 0
  
  for (const date of recentDates) {
    const entry = entries[date]
    // 会员消耗收入 = 团课消耗 + 私教消耗
    const classConsumed = (entry.classCount || 0) * (entry.avgClassSize || 8) * (entry.avgRevenuePerMember || 15)
    const ptConsumed = (entry.ptHours || 0) * (entry.ptRate || settings.defaultPtRate)
    const renewRevenue = entry.newRevenue || 0  // 续费收入
    
    totalMemberRevenue += classConsumed + ptConsumed + renewRevenue
    
    // 统计有会员数据的活跃天数
    if (entry.memberCount && entry.memberCount > 0) {
      totalMemberDays += 1
    }
  }
  
  // 如果没有会员数据，使用行业默认值
  if (totalMemberDays === 0) {
    // 默认月消费 800 元，平均留存 6 个月
    return 800 * 6
  }
  
  // 计算日均会员收入，转为月收入（×30）
  const dailyAvgRevenue = totalMemberRevenue / recentDates.length
  const avgMonthlySpend = dailyAvgRevenue * 30
  
  // 平均客户留存月数（行业默认6个月，未来可基于续费率动态计算）
  const avgRetentionMonths = 6
  
  const ltv = avgMonthlySpend * avgRetentionMonths
  
  // 防止极端值
  return Math.min(20000, Math.max(500, ltv))
}

// 计算 LTV/CAC 比值
export const calculateLTVtoCAC = (): number => {
  const cac = calculateCAC()
  const ltv = calculateLTV()
  
  if (cac === 0) return 0
  return ltv / cac
}

// 获取客户健康度指标（带状态解读）
export const getCustomerHealthMetrics = () => {
  const cac = calculateCAC()
  const ltv = calculateLTV()
  const ratio = ltv / cac
  
  let status = ''
  let statusColor = ''
  let statusDesc = ''
  
  if (ratio >= 3) {
    status = '非常健康'
    statusColor = '#10b981'
    statusDesc = '每投入1元获客成本，可收回3元以上价值，商业模式优秀'
  } else if (ratio >= 2) {
    status = '健康'
    statusColor = '#34d399'
    statusDesc = '获客效率良好，建议优化留存进一步提升'
  } else if (ratio >= 1) {
    status = '需要注意'
    statusColor = '#f59e0b'
    statusDesc = '获客成本偏高或客户价值偏低，需优化营销策略'
  } else {
    status = '危险'
    statusColor = '#ef4444'
    statusDesc = '每卖一单亏一单，请立即优化获客渠道或提升客单价'
  }
  
  return {
    cac,
    ltv,
    ratio,
    status,
    statusColor,
    statusDesc,
    hasData: cac > 0 && ltv > 0
  }
}