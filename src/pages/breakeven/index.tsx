import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getDailyEntries, getBusinessSettings } from '../../services/storage'
import { formatCurrency, formatNumber } from '../../utils/format'
import emitter from '../../utils/eventBus'
import './index.scss'

export default function BreakEven() {
  const [hasData, setHasData] = useState(false)
  const [breakEvenData, setBreakEvenData] = useState({
    dailyFixedCosts: 0,
    monthlyFixedCosts: 0,
    grossMargin: 0,
    dailyBreakEven: 0,
    monthlyBreakEven: 0,
    isAchieved: false
  })
  const [currentDailyRevenue, setCurrentDailyRevenue] = useState(0)
  const [currentMonthlyRevenue, setCurrentMonthlyRevenue] = useState(0)

  const loadData = () => {
    const entries = getDailyEntries()
    const settings = getBusinessSettings()
    
    if (Object.keys(entries).length === 0) {
      setHasData(false)
      return
    }
    setHasData(true)
    
    // 计算月固定成本
    const monthlyFixedCosts = settings.monthlyRent + 
                              settings.monthlyUtilities + 
                              settings.monthlyFixedStaffCost + 
                              settings.monthlyInsurance +
                              settings.monthlyMarketing
    const dailyFixedCosts = monthlyFixedCosts / 30
    
    // 计算平均毛利率和当前收入
    let totalRevenue = 0
    let totalVariableCosts = 0
    let currentMonthRevenue = 0
    const currentMonth = new Date().toISOString().slice(0, 7)
    
    Object.values(entries).forEach(entry => {
      const classRevenue = (entry.classCount || 0) * (entry.avgClassSize || 8) * (entry.avgRevenuePerMember || 15)
      const ptRevenue = entry.ptRevenue || (entry.ptHours || 0) * (entry.ptRate || 80)
      const otherRevenue = (entry.newRevenue || 0) + (entry.retailRevenue || 0) + (entry.otherRevenue || 0)
      const revenue = classRevenue + ptRevenue + otherRevenue
      
      const ptCommission = ptRevenue * settings.ptCommissionRate
      const variableCosts = ptCommission + (entry.marketingSpend || 0) + (entry.variableStaffCost || 0)
      
      totalRevenue += revenue
      totalVariableCosts += variableCosts
      
      if (entry.date.startsWith(currentMonth)) {
        currentMonthRevenue += revenue
      }
    })
    
    const grossMargin = totalRevenue > 0 ? (totalRevenue - totalVariableCosts) / totalRevenue : 0.5
    const dailyBreakEven = grossMargin > 0 ? dailyFixedCosts / grossMargin : dailyFixedCosts
    const monthlyBreakEven = grossMargin > 0 ? monthlyFixedCosts / grossMargin : monthlyFixedCosts
    
    // 获取最新一日的收入作为当前日均收入参考
    const latestDate = Object.keys(entries).sort().reverse()[0]
    const latestEntry = entries[latestDate]
    let latestRevenue = 0
    if (latestEntry) {
      const classRevenue = (latestEntry.classCount || 0) * (latestEntry.avgClassSize || 8) * (latestEntry.avgRevenuePerMember || 15)
      const ptRevenue = latestEntry.ptRevenue || (latestEntry.ptHours || 0) * (latestEntry.ptRate || 80)
      const otherRevenue = (latestEntry.newRevenue || 0) + (latestEntry.retailRevenue || 0) + (latestEntry.otherRevenue || 0)
      latestRevenue = classRevenue + ptRevenue + otherRevenue
    }
    
    setCurrentDailyRevenue(latestRevenue)
    setCurrentMonthlyRevenue(currentMonthRevenue)
    setBreakEvenData({
      dailyFixedCosts,
      monthlyFixedCosts,
      grossMargin: grossMargin * 100,
      dailyBreakEven,
      monthlyBreakEven,
      isAchieved: latestRevenue >= dailyBreakEven
    })
  }

  useEffect(() => {
    loadData()
    emitter.on('data-updated', loadData)
    return () => {
      emitter.off('data-updated', loadData)
    }
  }, [])

  const dailyProgress = Math.min(100, (currentDailyRevenue / breakEvenData.dailyBreakEven) * 100)
  const monthlyProgress = Math.min(100, (currentMonthlyRevenue / breakEvenData.monthlyBreakEven) * 100)

  if (!hasData) {
    return (
      <View className="breakeven-page">
        <View className="empty-state">
          <View className="empty-icon">📊</View>
          <Text className="empty-text">暂无数据，请先录入数据</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="breakeven-page">
      {/* 日盈亏平衡卡片 */}
      <View className="summary-card">
        <Text className="summary-label">每日盈亏平衡点</Text>
        <Text className="summary-value">{formatCurrency(breakEvenData.dailyBreakEven)}</Text>
        <Text className="summary-sub">日均收入需达到此金额才能保本</Text>
      </View>

      {/* 日盈亏平衡详情 */}
      <View className="section">
        <Text className="section-title">日盈亏平衡分析</Text>
        <View className="row">
          <Text className="label">日均固定成本</Text>
          <Text className="value">{formatCurrency(breakEvenData.dailyFixedCosts)}</Text>
        </View>
        <View className="row">
          <Text className="label">平均毛利率</Text>
          <Text className="value">{breakEvenData.grossMargin.toFixed(1)}%</Text>
        </View>
        <View className="row highlight">
          <Text className="label">盈亏平衡点</Text>
          <Text className={breakEvenData.isAchieved ? 'value-positive' : 'value-negative'}>
            {formatCurrency(breakEvenData.dailyBreakEven)}
          </Text>
        </View>
        
        <View className="progress-bar">
          <View className="progress-label">
            <Text>当前日均收入</Text>
            <Text>{formatCurrency(currentDailyRevenue)} / {formatCurrency(breakEvenData.dailyBreakEven)}</Text>
          </View>
          <View className="progress-track">
            <View className="progress-fill" style={{ width: `${dailyProgress}%` }} />
          </View>
        </View>
        
        <View className="row">
          <Text className="label">当前状态</Text>
          <Text className={breakEvenData.isAchieved ? 'value-positive' : 'value-negative'}>
            {breakEvenData.isAchieved ? '✅ 已超过盈亏平衡点' : `⚠️ 还差 ${formatCurrency(breakEvenData.dailyBreakEven - currentDailyRevenue)} 达到平衡`}
          </Text>
        </View>
      </View>

      {/* 月盈亏平衡 */}
      <View className="section">
        <Text className="section-title">月盈亏平衡分析</Text>
        <View className="row">
          <Text className="label">月固定成本总额</Text>
          <Text className="value">{formatCurrency(breakEvenData.monthlyFixedCosts)}</Text>
        </View>
        <View className="row highlight">
          <Text className="label">月盈亏平衡点</Text>
          <Text className="value">{formatCurrency(breakEvenData.monthlyBreakEven)}</Text>
        </View>
        
        <View className="progress-bar">
          <View className="progress-label">
            <Text>本月累计收入</Text>
            <Text>{formatCurrency(currentMonthlyRevenue)} / {formatCurrency(breakEvenData.monthlyBreakEven)}</Text>
          </View>
          <View className="progress-track">
            <View className="progress-fill" style={{ width: `${monthlyProgress}%` }} />
          </View>
        </View>
      </View>

      {/* 解读说明 */}
      <View className="section">
        <Text className="section-title">📖 解读说明</Text>
        <View className="row">
          <Text className="label">什么是盈亏平衡点？</Text>
        </View>
        <View className="row">
          <Text className="label" style={{ fontSize: '24rpx', color: '#999', lineHeight: 1.6 }}>
            盈亏平衡点是指收入刚好覆盖所有成本（固定成本+变动成本）时的销售额。
            低于这个点会亏损，高于这个点开始盈利。
          </Text>
        </View>
        <View className="row">
          <Text className="label" style={{ fontSize: '24rpx', color: '#999', lineHeight: 1.6, marginTop: '16rpx' }}>
            💡 建议：如果长期低于盈亏平衡点，可以考虑提高客单价、增加课程销量或降低固定成本。
          </Text>
        </View>
      </View>
    </View>
  )
}