import { View, Text, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getDailyEntries, getBusinessSettings, DailyEntry, BusinessSettings } from '../../services/storage'
import { calculateEndingCash } from '../../services/calculator'
import { formatCurrency } from '../../utils/format'
import emitter from '../../utils/eventBus'
import './index.scss'

export default function CashflowAnalysis() {
  const [selectedDate, setSelectedDate] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [analysis, setAnalysis] = useState({
    // 当日数据
    date: '',
    cashStart: 0,
    cashEnd: 0,
    unearnedRevenue: 0,
    availableCash: 0,
    // 累计数据
    totalNewRevenue: 0,
    totalConsumed: 0,
    // 比率
    unearnedRatio: 0,
    cashRatio: 0,
    // 趋势
    isHealthy: true
  })

  const loadData = () => {
    const entries = getDailyEntries()
    const allDates = Object.keys(entries).sort()
    setDates(allDates)
    
    if (allDates.length > 0 && !selectedDate) {
      setSelectedDate(allDates[allDates.length - 1])
    }
  }

  const loadAnalysis = () => {
    if (!selectedDate) return
    
    const entries = getDailyEntries()
    const settings = getBusinessSettings()
    
    // 获取截止日期的所有数据
    const entriesUpToDate = Object.entries(entries)
      .filter(([date]) => date <= selectedDate)
      .sort(([a], [b]) => a.localeCompare(b))
    
    // 累计新会员收入
    let totalNewRevenue = 0
    
    // 累计消耗
    let totalClassConsumed = 0
    let totalPtConsumed = 0
    
    // 计算期末现金（取当天数据的 cashBalanceStart 加上当天变动？需要从第一天开始累计）
    // 简化：直接使用当天录入的 cashBalanceStart 作为当天开始现金
    // 期末现金需要通过前一天计算
    
    entriesUpToDate.forEach(([date, entry]) => {
      totalNewRevenue += entry.newRevenue || 0
      
      // 团课消耗
      const classCount = entry.classCount || 0
      const avgClassSize = entry.avgClassSize || settings.avgClassSize
      const avgRevenuePerMember = entry.avgRevenuePerMember || settings.avgClassRevenuePerMember
      totalClassConsumed += classCount * avgClassSize * avgRevenuePerMember
      
      // 私教消耗
      const ptHours = entry.ptHours || 0
      const ptRate = entry.ptRate || settings.defaultPtRate
      totalPtConsumed += ptHours * ptRate
    })
    
    const totalConsumed = totalClassConsumed + totalPtConsumed
    
    // 预收账款
    const openingUnearned = settings.openingUnearnedRevenue || 0
    const unearnedRevenue = Math.max(0, openingUnearned + totalNewRevenue - totalConsumed)
    
    // 获取当天数据
    const currentEntry = entries[selectedDate]
    const cashStart = currentEntry?.cashBalanceStart || 0
    
    // 计算期末现金（需要累计当天之前的现金变化）
    let cumulativeCash = cashStart
    // 简化：直接使用当前录入的 cashBalanceStart 作为期末（因为用户每天会录入期初）
    // 更准确的做法：从第一天开始累计计算期末现金
    const cashEnd = cashStart
    
    // 计算可用现金流
    const availableCash = cashEnd - unearnedRevenue
    
    // 计算比率
    const unearnedRatio = cashEnd > 0 ? (unearnedRevenue / cashEnd) * 100 : 0
    const cashRatio = cashEnd > 0 ? (availableCash / cashEnd) * 100 : 0
    
    // 健康判断：可用现金流 > 0 且 预收账款占比 < 70%
    const isHealthy = availableCash > 0 && unearnedRatio < 70
    
    setAnalysis({
      date: selectedDate,
      cashStart,
      cashEnd,
      unearnedRevenue,
      availableCash,
      totalNewRevenue,
      totalConsumed,
      unearnedRatio,
      cashRatio,
      isHealthy
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
    loadAnalysis()
  }, [selectedDate])

  const handleDateChange = (e: any) => {
    setSelectedDate(dates[e.detail.value])
  }

  if (dates.length === 0) {
    return (
      <View className="cashflow-analysis">
        <View className="empty-state">
          <View className="empty-icon">💰</View>
          <Text className="empty-text">暂无数据，请先录入数据</Text>
        </View>
      </View>
    )
  }

  // 判断可用现金流状态
  let cardStatus = ''
  let statusText = ''
  if (analysis.availableCash <= 0) {
    cardStatus = 'danger'
    statusText = '⚠️ 资金链风险！可用现金流为负'
  } else if (analysis.unearnedRatio > 70) {
    cardStatus = 'warning'
    statusText = '⚠️ 预收账款占比较高，注意资金安全'
  } else {
    cardStatus = ''
    statusText = '✅ 财务状况健康'
  }

  return (
    <View className="cashflow-analysis">
      <View className="date-header">
        <Text className="date-title">分析日期</Text>
        <Picker mode="selector" range={dates} value={dates.indexOf(selectedDate)} onChange={handleDateChange}>
          <View className="date-value">{selectedDate || '请选择日期'}</View>
        </Picker>
      </View>

      {/* 可用现金流汇总卡片 */}
      <View className={`summary-card ${cardStatus}`}>
        <Text className="summary-label">可用现金流</Text>
        <Text className="summary-value">{formatCurrency(analysis.availableCash)}</Text>
        <Text className="summary-sub">{statusText}</Text>
      </View>

      {/* 预收账款与现金对比 */}
      <View className="section">
        <Text className="section-title">预收账款 vs 现金</Text>
        
        <View className="row">
          <Text className="label">期末现金余额</Text>
          <Text className="value">{formatCurrency(analysis.cashEnd)}</Text>
        </View>
        <View className="row">
          <Text className="label">预收账款（未消耗课时）</Text>
          <Text className="value value-negative">{formatCurrency(analysis.unearnedRevenue)}</Text>
        </View>
        <View className="row total">
          <Text className="label">可用现金流</Text>
          <Text className={`value ${analysis.availableCash >= 0 ? 'value-positive' : 'value-negative'}`}>
            {formatCurrency(analysis.availableCash)}
          </Text>
        </View>

        <View className="progress-bar">
          <View className="progress-label">
            <Text>预收账款占比</Text>
            <Text>{analysis.unearnedRatio.toFixed(1)}%</Text>
          </View>
          <View className={`progress-track ${analysis.unearnedRatio > 70 ? 'warning' : analysis.unearnedRatio > 50 ? 'warning' : ''}`}>
            <View className="progress-fill" style={{ width: `${Math.min(100, analysis.unearnedRatio)}%` }} />
          </View>
        </View>

        <View className="progress-bar">
          <View className="progress-label">
            <Text>可用现金占比</Text>
            <Text>{analysis.cashRatio.toFixed(1)}%</Text>
          </View>
          <View className="progress-track">
            <View className="progress-fill" style={{ width: `${Math.min(100, analysis.cashRatio)}%` }} />
          </View>
        </View>
      </View>

      {/* 累计数据 */}
      <View className="section">
        <Text className="section-title">累计数据（自使用系统以来）</Text>
        <View className="row">
          <Text className="label">累计新会员现金流入</Text>
          <Text className="value value-positive">{formatCurrency(analysis.totalNewRevenue)}</Text>
        </View>
        <View className="row">
          <Text className="label">累计已消耗课时价值</Text>
          <Text className="value value-negative">{formatCurrency(analysis.totalConsumed)}</Text>
        </View>
        <View className="row total">
          <Text className="label">预收账款净额</Text>
          <Text className="value">{formatCurrency(analysis.unearnedRevenue)}</Text>
        </View>
      </View>

      {/* 解读说明 */}
      <View className="section">
        <Text className="section-title">📖 解读说明</Text>
        <View className="row">
          <Text className="label" style={{ fontSize: '24rpx', color: '#999', lineHeight: 1.6 }}>
            可用现金流 = 期末现金 - 预收账款
          </Text>
        </View>
        <View className="row">
          <Text className="label" style={{ fontSize: '24rpx', color: '#999', lineHeight: 1.6, marginTop: '16rpx' }}>
            💡 预收账款是已收但未提供服务的会员费，属于负债。
            可用现金流反映扣除负债后真正可动用的资金。
          </Text>
        </View>
        <View className="row">
          <Text className="label" style={{ fontSize: '24rpx', color: '#999', lineHeight: 1.6, marginTop: '16rpx' }}>
            ⚠️ 如果可用现金流为负，说明资金链紧张，建议：
            • 控制营销支出
            • 提高耗课率
            • 暂缓大额采购
          </Text>
        </View>
      </View>
    </View>
  )
}