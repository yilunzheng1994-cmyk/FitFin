import { View, Text, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getDailyEntries, getBusinessSettings } from '../../services/storage'
import { formatCurrency } from '../../utils/format'
import emitter from '../../utils/eventBus'
import './index.scss'

export default function Balance() {
  const [selectedDate, setSelectedDate] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [balance, setBalance] = useState({
    cash: 0,
    unearnedRevenue: 0,
    ownerEquity: 0,
    totalAssets: 0,
    totalLiabilitiesAndEquity: 0
  })

  const loadData = () => {
    const entries = getDailyEntries()
    const allDates = Object.keys(entries).sort().reverse()
    setDates(allDates)
    
    if (allDates.length > 0 && !selectedDate) {
      setSelectedDate(allDates[0])
    }
  }

  const loadBalance = () => {
    if (!selectedDate) return
    
    const entries = getDailyEntries()
    const settings = getBusinessSettings()
    
    const entriesUpToDate = Object.entries(entries)
      .filter(([date]) => date <= selectedDate)
      .sort(([a], [b]) => a.localeCompare(b))
    
    const latestEntry = entries[selectedDate]
    const cash = latestEntry?.cashBalanceStart || 0
    
    let totalNewRevenue = 0
    let totalClassConsumed = 0
    let totalPtConsumed = 0
    
    entriesUpToDate.forEach(([date, entry]) => {
      totalNewRevenue += entry.newRevenue || 0
      
      const classCount = entry.classCount || 0
      const avgClassSize = entry.avgClassSize || settings.avgClassSize
      const avgRevenuePerMember = entry.avgRevenuePerMember || settings.avgClassRevenuePerMember
      totalClassConsumed += classCount * avgClassSize * avgRevenuePerMember
      
      const ptHours = entry.ptHours || 0
      const ptRate = entry.ptRate || settings.defaultPtRate
      totalPtConsumed += ptHours * ptRate
    })
    
    const totalConsumed = totalClassConsumed + totalPtConsumed
    const openingUnearned = settings.openingUnearnedRevenue || 0
    const unearnedRevenue = Math.max(0, openingUnearned + totalNewRevenue - totalConsumed)
    const ownerEquity = cash - unearnedRevenue
    
    setBalance({
      cash,
      unearnedRevenue,
      ownerEquity,
      totalAssets: cash,
      totalLiabilitiesAndEquity: unearnedRevenue + ownerEquity
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
    loadBalance()
  }, [selectedDate])

  const handleDateChange = (e: any) => {
    setSelectedDate(dates[e.detail.value])
  }

  if (dates.length === 0) {
    return (
      <View className="balance-page">
        <View className="empty-state">
          <View className="empty-icon">📋</View>
          <Text className="empty-text">暂无数据，请先录入数据</Text>
        </View>
      </View>
    )
  }

  const isBalanced = Math.abs(balance.totalAssets - balance.totalLiabilitiesAndEquity) < 0.01

  return (
    <View className="balance-page">
      <View className="date-header">
        <Text className="date-title">报表日期</Text>
        <Picker mode="selector" range={dates} value={dates.indexOf(selectedDate)} onChange={handleDateChange}>
          <View className="date-value">{selectedDate || '请选择日期'}</View>
        </Picker>
      </View>

      <View className={`summary-card ${isBalanced ? 'balanced' : 'unbalanced'}`}>
        <Text className="summary-label">{isBalanced ? '✅ 资产负债表平衡' : '⚠️ 报表不平衡'}</Text>
        <Text className="summary-value">{formatCurrency(balance.totalAssets)}</Text>
        <Text className="summary-sub">{isBalanced ? '资产 = 负债 + 所有者权益' : `差额 ${formatCurrency(Math.abs(balance.totalAssets - balance.totalLiabilitiesAndEquity))}`}</Text>
      </View>

      <View className="section">
        <Text className="section-title">资产</Text>
        <View className="row"><Text className="label">货币资金</Text><Text className="value">{formatCurrency(balance.cash)}</Text></View>
        <View className="row total"><Text className="label">资产总计</Text><Text className="value value-positive">{formatCurrency(balance.totalAssets)}</Text></View>
      </View>

      <View className="section">
        <Text className="section-title">负债</Text>
        <View className="row"><Text className="label">预收账款</Text><Text className="value">{formatCurrency(balance.unearnedRevenue)}</Text></View>
        <View className="row total"><Text className="label">负债总计</Text><Text className="value value-negative">{formatCurrency(balance.unearnedRevenue)}</Text></View>
      </View>

      <View className="section">
        <Text className="section-title">所有者权益</Text>
        <View className="row"><Text className="label">所有者权益</Text><Text className="value">{formatCurrency(balance.ownerEquity)}</Text></View>
        <View className="row total"><Text className="label">权益总计</Text><Text className="value value-positive">{formatCurrency(balance.ownerEquity)}</Text></View>
      </View>

      <View className="section">
        <Text className="section-title">平衡验证</Text>
        <View className="row"><Text className="label">资产总计</Text><Text className="value">{formatCurrency(balance.totalAssets)}</Text></View>
        <View className="row"><Text className="label">负债+权益总计</Text><Text className="value">{formatCurrency(balance.totalLiabilitiesAndEquity)}</Text></View>
        <View className="row total"><Text className={isBalanced ? 'value-positive' : 'value-negative'}>差额 {formatCurrency(balance.totalAssets - balance.totalLiabilitiesAndEquity)}</Text></View>
      </View>
    </View>
  )
}