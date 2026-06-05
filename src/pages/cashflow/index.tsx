import { View, Text, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getDailyEntries } from '../../services/storage'
import { formatCurrency } from '../../utils/format'
import emitter from '../../utils/eventBus'
import './index.scss'

type Period = 'day' | 'week' | 'month'

export default function CashFlow() {
  const [selectedDate, setSelectedDate] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [period, setPeriod] = useState<Period>('day')
  const [cashFlow, setCashFlow] = useState({
    cashIn: { newRevenue: 0, retailRevenue: 0, otherRevenue: 0, total: 0 },
    cashOut: { marketing: 0, variableStaff: 0, total: 0 },
    netChange: 0,
    beginningCash: 0,
    endingCash: 0
  })

  const loadData = () => {
    const entries = getDailyEntries()
    const allDates = Object.keys(entries).sort().reverse()
    setDates(allDates)
    
    if (allDates.length > 0 && !selectedDate) {
      setSelectedDate(allDates[0])
    }
  }

  const loadCashFlow = () => {
    if (!selectedDate) return
    
    const entries = getDailyEntries()
    const dates = Object.keys(entries).sort()
    
    let filteredDates: string[] = []
    const targetDate = new Date(selectedDate)
    
    if (period === 'day') {
      filteredDates = dates.filter(d => d === selectedDate)
    } else if (period === 'week') {
      const oneWeekAgo = new Date(targetDate)
      oneWeekAgo.setDate(targetDate.getDate() - 7)
      filteredDates = dates.filter(d => new Date(d) >= oneWeekAgo && new Date(d) <= targetDate)
    } else {
      const oneMonthAgo = new Date(targetDate)
      oneMonthAgo.setMonth(targetDate.getMonth() - 1)
      filteredDates = dates.filter(d => new Date(d) >= oneMonthAgo && new Date(d) <= targetDate)
    }
    
    let cashIn = { newRevenue: 0, retailRevenue: 0, otherRevenue: 0, total: 0 }
    let cashOut = { marketing: 0, variableStaff: 0, total: 0 }
    let beginningCash = 0
    let endingCash = 0
    
    filteredDates.forEach(date => {
      const entry = entries[date]
      if (entry) {
        cashIn.newRevenue += entry.newRevenue || 0
        cashIn.retailRevenue += entry.retailRevenue || 0
        cashIn.otherRevenue += entry.otherRevenue || 0
        cashIn.total += (entry.newRevenue || 0) + (entry.retailRevenue || 0) + (entry.otherRevenue || 0)
        
        cashOut.marketing += entry.marketingSpend || 0
        cashOut.variableStaff += entry.variableStaffCost || 0
        cashOut.total += (entry.marketingSpend || 0) + (entry.variableStaffCost || 0)
      }
    })
    
    if (filteredDates.length > 0) {
      const firstEntry = entries[filteredDates[0]]
      const lastEntry = entries[filteredDates[filteredDates.length - 1]]
      beginningCash = firstEntry?.cashBalanceStart || 0
      endingCash = lastEntry?.cashBalanceStart || 0
    }
    
    const netChange = cashIn.total - cashOut.total
    
    setCashFlow({ cashIn, cashOut, netChange, beginningCash, endingCash })
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
    loadCashFlow()
  }, [selectedDate, period])

  const handleDateChange = (e: any) => {
    setSelectedDate(dates[e.detail.value])
  }

  const getPeriodText = () => {
    switch (period) {
      case 'day': return '本日'
      case 'week': return '本周'
      default: return '本月'
    }
  }

  if (dates.length === 0) {
    return (
      <View className="cashflow-page">
        <View className="empty-state">
          <View className="empty-icon">💰</View>
          <Text className="empty-text">暂无数据，请先录入数据</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="cashflow-page">
      <View className="date-header">
        <Text className="date-title">截止日期</Text>
        <Picker mode="selector" range={dates} value={dates.indexOf(selectedDate)} onChange={handleDateChange}>
          <View className="date-value">{selectedDate}</View>
        </Picker>
      </View>

      <View className="period-selector">
        <View className={`period-btn ${period === 'day' ? 'active' : ''}`} onClick={() => setPeriod('day')}>日</View>
        <View className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>周</View>
        <View className={`period-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>月</View>
      </View>

      <View className="net-change"><Text className="net-label">{getPeriodText()}净现金流</Text><Text className="net-value">{formatCurrency(cashFlow.netChange)}</Text></View>

      <View className="section">
        <Text className="section-title">现金流入</Text>
        <View className="row"><Text className="label">新会员收入</Text><Text className="value value-positive">{formatCurrency(cashFlow.cashIn.newRevenue)}</Text></View>
        <View className="row"><Text className="label">零售收入</Text><Text className="value value-positive">{formatCurrency(cashFlow.cashIn.retailRevenue)}</Text></View>
        <View className="row"><Text className="label">其他收入</Text><Text className="value value-positive">{formatCurrency(cashFlow.cashIn.otherRevenue)}</Text></View>
        <View className="row total"><Text className="label">现金流入小计</Text><Text className="value value-positive">{formatCurrency(cashFlow.cashIn.total)}</Text></View>
      </View>

      <View className="section">
        <Text className="section-title">现金流出</Text>
        <View className="row"><Text className="label">营销支出</Text><Text className="value value-negative">{formatCurrency(cashFlow.cashOut.marketing)}</Text></View>
        <View className="row"><Text className="label">变动人力成本</Text><Text className="value value-negative">{formatCurrency(cashFlow.cashOut.variableStaff)}</Text></View>
        <View className="row total"><Text className="label">现金流出小计</Text><Text className="value value-negative">{formatCurrency(cashFlow.cashOut.total)}</Text></View>
      </View>

      <View className="section">
        <Text className="section-title">现金余额</Text>
        <View className="row"><Text className="label">期初现金</Text><Text className="value">{formatCurrency(cashFlow.beginningCash)}</Text></View>
        <View className="row"><Text className="label">期末现金</Text><Text className="value">{formatCurrency(cashFlow.endingCash)}</Text></View>
      </View>
    </View>
  )
}