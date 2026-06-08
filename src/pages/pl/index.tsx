import { View, Text, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getDailyEntries, getBusinessSettings, DailyEntry, BusinessSettings } from '../../services/storage'
import { formatCurrency } from '../../utils/format'
import emitter from '../../utils/eventBus'
import './index.scss'

export default function PL() {
  const [selectedDate, setSelectedDate] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [entry, setEntry] = useState<DailyEntry | null>(null)
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [calculated, setCalculated] = useState({
    revenue: 0,
    classRevenue: 0,
    ptRevenue: 0,
    retailRevenue: 0,
    otherRevenue: 0,
    costRent: 0,
    costStaff: 0,
    costMarketing: 0,
    costPtCommission: 0,
    costDepreciation: 0,
    costRenovationAmort: 0,
    totalCosts: 0,
    profit: 0,
    profitMargin: 0
  })

  const loadData = () => {
    const entries = getDailyEntries()
    const allDates = Object.keys(entries).sort().reverse()
    setDates(allDates)
    
    if (allDates.length > 0 && !selectedDate) {
      setSelectedDate(allDates[0])
    }
    
    const bizSettings = getBusinessSettings()
    setSettings(bizSettings)
  }

  const loadEntry = () => {
    if (!selectedDate) return
    
    const entries = getDailyEntries()
    const currentEntry = entries[selectedDate]
    setEntry(currentEntry || null)
    
    if (currentEntry && settings) {
      calculatePL(currentEntry, settings)
    }
  }

  const calculatePL = (entry: DailyEntry, bizSettings: BusinessSettings) => {
    // 团课收入
    const classCount = entry.classCount || 0
    const avgClassSize = entry.avgClassSize || bizSettings.avgClassSize
    const avgRevenuePerMember = entry.avgRevenuePerMember || bizSettings.avgClassRevenuePerMember
    const classRevenue = classCount * avgClassSize * avgRevenuePerMember
    
    // 私教收入
    const ptRevenue = entry.ptRevenue || (entry.ptHours || 0) * (entry.ptRate || bizSettings.defaultPtRate)
    
    // 零售和其他收入（现结）
    const retailRevenue = entry.retailRevenue || 0
    const otherRevenue = entry.otherRevenue || 0
    
    // 总收入（不含新会员收入，新会员收入只影响现金流和资产负债表）
    const revenue = classRevenue + ptRevenue + retailRevenue + otherRevenue
    
    // 固定成本分摊
    const dailyRent = bizSettings.monthlyRent / 30
    const dailyUtilities = bizSettings.monthlyUtilities / 30
    const dailyFixedStaff = bizSettings.monthlyFixedStaffCost / 30
    const dailyInsurance = bizSettings.monthlyInsurance / 30
    const fixedCosts = dailyRent + dailyUtilities + dailyFixedStaff + dailyInsurance
    
    // 折旧
    const monthlyDepreciation = bizSettings.equipmentValue / bizSettings.equipmentDepreciationMonths
    const dailyDepreciation = monthlyDepreciation / 30
    
    // 装修摊销
    let dailyRenovationAmort = 0
    if (bizSettings.renovationCost && bizSettings.renovationYears) {
      const monthlyAmort = bizSettings.renovationCost / (bizSettings.renovationYears * 12)
      dailyRenovationAmort = monthlyAmort / 30
    }
    
    // 私教佣金
    const ptCommission = ptRevenue * bizSettings.ptCommissionRate
    
    // 变动成本
    const variableCosts = (entry.marketingSpend || 0) + (entry.variableStaffCost || 0)
    
    const totalCosts = fixedCosts + dailyDepreciation + dailyRenovationAmort + ptCommission + variableCosts
    const profit = revenue - totalCosts
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0
    
    setCalculated({
      revenue,
      classRevenue,
      ptRevenue,
      retailRevenue,
      otherRevenue,
      costRent: dailyRent,
      costStaff: dailyFixedStaff + (entry.variableStaffCost || 0),
      costMarketing: entry.marketingSpend || 0,
      costPtCommission: ptCommission,
      costDepreciation: dailyDepreciation,
      costRenovationAmort: dailyRenovationAmort,
      totalCosts,
      profit,
      profitMargin
    })
  }

  useEffect(() => {
    loadData()
    emitter.on('data-updated', () => {
      loadData()
    })
    return () => {
      emitter.off('data-updated')
    }
  }, [])

  useEffect(() => {
    loadEntry()
  }, [selectedDate, settings])

  const handleDateChange = (e: any) => {
    setSelectedDate(dates[e.detail.value])
  }

  if (dates.length === 0) {
    return (
      <View className="pl-page">
        <View className="empty-state">
          <View className="empty-icon">📊</View>
          <Text className="empty-text">暂无数据，请先录入数据</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="pl-page">
      <View className="date-header">
        <Text className="date-title">报表日期</Text>
        <Picker mode="selector" range={dates} value={dates.indexOf(selectedDate)} onChange={handleDateChange}>
          <View className="date-value">{selectedDate || '请选择日期'}</View>
        </Picker>
      </View>

      <View className="summary-card" style={{ background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' }}>
        <Text className="summary-label">净利润</Text>
        <Text className="summary-value">{formatCurrency(calculated.profit)}</Text>
        <Text className="summary-sub">净利润率 {calculated.profitMargin.toFixed(1)}%</Text>
      </View>

      {/* 收入部分 - 不含新会员收入 */}
      <View className="section">
        <Text className="section-title">收入</Text>
        <View className="row"><Text className="label">团课收入</Text><Text className="value value-positive">{formatCurrency(calculated.classRevenue)}</Text></View>
        <View className="row"><Text className="label">私教收入</Text><Text className="value value-positive">{formatCurrency(calculated.ptRevenue)}</Text></View>
        <View className="row"><Text className="label">零售收入</Text><Text className="value value-positive">{formatCurrency(calculated.retailRevenue)}</Text></View>
        <View className="row"><Text className="label">其他收入</Text><Text className="value value-positive">{formatCurrency(calculated.otherRevenue)}</Text></View>
        <View className="row total"><Text className="label">总收入</Text><Text className="value value-positive">{formatCurrency(calculated.revenue)}</Text></View>
      </View>

      {/* 成本部分 */}
      <View className="section">
        <Text className="section-title">成本与费用</Text>
        <Text className="section-subtitle">固定成本</Text>
        <View className="row"><Text className="label">房租（日分摊）</Text><Text className="value">{formatCurrency(calculated.costRent)}</Text></View>
        <View className="row"><Text className="label">固定人力成本（日分摊）</Text><Text className="value">{formatCurrency(calculated.costStaff - (entry?.variableStaffCost || 0))}</Text></View>
        <View className="row"><Text className="label">装修摊销（日）</Text><Text className="value">{formatCurrency(calculated.costRenovationAmort)}</Text></View>
        <Text className="section-subtitle">变动成本</Text>
        <View className="row"><Text className="label">变动人力成本</Text><Text className="value">{formatCurrency(entry?.variableStaffCost || 0)}</Text></View>
        <View className="row"><Text className="label">营销支出</Text><Text className="value">{formatCurrency(calculated.costMarketing)}</Text></View>
        <Text className="section-subtitle">运营成本</Text>
        <View className="row"><Text className="label">私教佣金</Text><Text className="value">{formatCurrency(calculated.costPtCommission)}</Text></View>
        <View className="row"><Text className="label">设备折旧（日）</Text><Text className="value">{formatCurrency(calculated.costDepreciation)}</Text></View>
        <View className="row total"><Text className="label">总成本</Text><Text className="value value-negative">{formatCurrency(calculated.totalCosts)}</Text></View>
      </View>
    </View>
  )
}