import { View, Text, Image } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getLatestMetrics, getCumulativeMetrics, getWeeklyTrend, calculateBreakEven, calculateEndingCash } from '../../services/calculator'
import { getDailyEntries, getBusinessSettings } from '../../services/storage'
import { formatCurrency } from '../../utils/format'
import emitter from '../../utils/eventBus'
import CustomTabBar from '../../components/CustomTabBar'
import CountUpNumber from '../../components/CountUpNumber'
import { vibrate } from '../../utils/vibrate'
import logoUrl from '../../assets/images/logo.png'
import './index.scss'

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    revenue: 0,
    profit: 0,
    confidence: 0,
    cashBalance: 0,
    newMembers: 0,
    totalRevenue: 0,
    totalProfit: 0,
    averageCAC: 0
  })
  const [chartData, setChartData] = useState<Array<{ date: string; revenue: number; profit: number }>>([])
  const [hasData, setHasData] = useState(false)
  
  const [activeReport, setActiveReport] = useState('pl')
  
  const [plData, setPlData] = useState({
    revenue: 0,
    classRevenue: 0,
    ptRevenue: 0,
    otherRevenue: 0,
    fixedCosts: 0,
    variableCosts: 0,
    ptCommission: 0,
    marketingCost: 0,
    totalCosts: 0,
    profit: 0,
    profitMargin: 0
  })
  
  const [balanceData, setBalanceData] = useState({
    cash: 0,
    unearnedRevenue: 0,
    ownerEquity: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    isBalanced: true
  })
  
  const [cashFlowData, setCashFlowData] = useState({
    cashIn: { newRevenue: 0, retailRevenue: 0, otherRevenue: 0, total: 0 },
    cashOut: { marketing: 0, variableStaff: 0, otherCashOut: 0, total: 0 },
    netChange: 0,
    beginningCash: 0,
    endingCash: 0
  })
  
  const [breakEvenData, setBreakEvenData] = useState({
    dailyBreakEven: 0,
    monthlyBreakEven: 0,
    currentDailyRevenue: 0,
    isAchieved: false,
    dailyProgress: 0
  })

  const loadData = () => {
    const latest = getLatestMetrics()
    if (latest) {
      setMetrics(prev => ({
        ...prev,
        revenue: latest.revenue,
        profit: latest.profit,
        confidence: latest.confidence,
        cashBalance: latest.cashBalance,
        newMembers: latest.newMembers
      }))
    }
    
    const cumulative = getCumulativeMetrics()
    setMetrics(prev => ({
      ...prev,
      totalRevenue: cumulative.totalRevenue,
      totalProfit: cumulative.totalProfit,
      averageCAC: cumulative.averageCAC
    }))
    
    const weeklyTrend = getWeeklyTrend()
    setChartData(weeklyTrend)
    
    loadPLData()
    loadBalanceData()
    loadCashFlowData()
    loadBreakEvenData()
    
    const entries = getDailyEntries()
    setHasData(Object.keys(entries).length > 0)
    
    Taro.stopPullDownRefresh()
  }
  
  const loadPLData = () => {
    const entries = getDailyEntries()
    const settings = getBusinessSettings()
    const latestEntry = Object.values(entries).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    
    if (latestEntry) {
      const classRevenue = (latestEntry.classCount || 0) * (latestEntry.avgClassSize || 8) * (latestEntry.avgRevenuePerMember || 15)
      const ptRevenue = latestEntry.ptRevenue || (latestEntry.ptHours || 0) * (latestEntry.ptRate || 80)
      const otherRevenue = (latestEntry.retailRevenue || 0) + (latestEntry.otherRevenue || 0)
      const revenue = classRevenue + ptRevenue + otherRevenue
      
      const dailyFixedCost = (settings.monthlyRent + settings.monthlyUtilities + settings.monthlyFixedStaffCost + settings.monthlyInsurance) / 30
      const monthlyDepreciation = settings.equipmentValue / settings.equipmentDepreciationMonths
      const dailyDepreciation = monthlyDepreciation / 30
      const ptCommission = ptRevenue * settings.ptCommissionRate
      const variableCosts = (latestEntry.marketingSpend || 0) + (latestEntry.variableStaffCost || 0)
      const totalCosts = dailyFixedCost + dailyDepreciation + ptCommission + variableCosts
      const profit = revenue - totalCosts
      
      setPlData({
        revenue,
        classRevenue,
        ptRevenue,
        otherRevenue,
        fixedCosts: dailyFixedCost + dailyDepreciation,
        variableCosts,
        ptCommission,
        marketingCost: latestEntry.marketingSpend || 0,
        totalCosts,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
      })
    }
  }
  
  const loadBalanceData = () => {
    const entries = getDailyEntries()
    const settings = getBusinessSettings()
    const latestDate = Object.keys(entries).sort().reverse()[0]
    
    if (latestDate) {
      const latestEntry = entries[latestDate]
      const cash = latestEntry?.cashBalanceStart || 0
      
      let totalNewRevenue = 0
      let totalClassConsumed = 0
      let totalPtConsumed = 0
      
      Object.entries(entries).forEach(([date, entry]) => {
        if (date <= latestDate) {
          totalNewRevenue += entry.newRevenue || 0
          totalClassConsumed += (entry.classCount || 0) * (entry.avgClassSize || 8) * (entry.avgRevenuePerMember || 15)
          totalPtConsumed += (entry.ptHours || 0) * (entry.ptRate || 80)
        }
      })
      
      const totalConsumed = totalClassConsumed + totalPtConsumed
      const openingUnearned = settings.openingUnearnedRevenue || 0
      const unearnedRevenue = Math.max(0, openingUnearned + totalNewRevenue - totalConsumed)
      const ownerEquity = cash - unearnedRevenue
      
      setBalanceData({
        cash,
        unearnedRevenue,
        ownerEquity,
        totalAssets: cash,
        totalLiabilities: unearnedRevenue,
        isBalanced: Math.abs(cash - (unearnedRevenue + ownerEquity)) < 0.01
      })
    }
  }
  
  const loadCashFlowData = () => {
    const entries = getDailyEntries()
    const latestEntry = Object.values(entries).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    
    if (latestEntry) {
      const cashIn = {
        newRevenue: latestEntry.newRevenue || 0,
        retailRevenue: latestEntry.retailRevenue || 0,
        otherRevenue: latestEntry.otherRevenue || 0,
        total: (latestEntry.newRevenue || 0) + (latestEntry.retailRevenue || 0) + (latestEntry.otherRevenue || 0)
      }
      const cashOut = {
        marketing: latestEntry.marketingSpend || 0,
        variableStaff: latestEntry.variableStaffCost || 0,
        otherCashOut: latestEntry.otherCashOut || 0,
        total: (latestEntry.marketingSpend || 0) + (latestEntry.variableStaffCost || 0) + (latestEntry.otherCashOut || 0)
      }
      
      setCashFlowData({
        cashIn,
        cashOut,
        netChange: cashIn.total - cashOut.total,
        beginningCash: latestEntry.cashBalanceStart || 0,
        endingCash: (latestEntry.cashBalanceStart || 0) + cashIn.total - cashOut.total
      })
    }
  }
  
  const loadBreakEvenData = () => {
    const breakEven = calculateBreakEven()
    const dailyProgress = Math.min(100, (breakEven.currentDailyRevenue / breakEven.dailyBreakEven) * 100)
    
    setBreakEvenData({
      dailyBreakEven: breakEven.dailyBreakEven,
      monthlyBreakEven: breakEven.monthlyBreakEven,
      currentDailyRevenue: breakEven.currentDailyRevenue,
      isAchieved: breakEven.isAchieved,
      dailyProgress
    })
  }

  useEffect(() => {
    emitter.on('data-updated', () => {
      loadData()
    })
    return () => {
      emitter.off('data-updated')
    }
  }, [])

  Taro.useDidShow(() => {
    loadData()
  })

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1)
  const maxProfit = Math.max(...chartData.map(d => d.profit), 1)

  return (
    <View className="dashboard">
      <View className="header">
        <View className="title-wrapper">
          <Image className="header-logo" src={logoUrl} mode="aspectFit" />
          <Text className="title">FitFin 健身财务助手</Text>
        </View>
        <Text className="confidence">置信度 {metrics.confidence}%</Text>
      </View>

      {/* KPI 卡片始终显示 */}
      <View className="kpi-grid">
        <View className="kpi-card">
          <Text className="kpi-label">今日收入</Text>
          <Text className="kpi-value">
            <CountUpNumber end={metrics.revenue} prefix="¥" decimals={2} />
          </Text>
        </View>
        <View className="kpi-card">
          <Text className="kpi-label">今日利润</Text>
          <Text className="kpi-value">
            <CountUpNumber end={metrics.profit} prefix="¥" decimals={2} />
          </Text>
        </View>
      </View>

      <View className="kpi-grid">
        <View className="kpi-card">
          <Text className="kpi-label">累计收入</Text>
          <Text className="kpi-value">
            <CountUpNumber end={metrics.totalRevenue} prefix="¥" decimals={2} />
          </Text>
        </View>
        <View className="kpi-card">
          <Text className="kpi-label">累计利润</Text>
          <Text className="kpi-value">
            <CountUpNumber end={metrics.totalProfit} prefix="¥" decimals={2} />
          </Text>
        </View>
      </View>

      {/* 根据是否有数据显示不同内容 */}
      {hasData ? (
        <>
          {/* 有数据时显示图表 */}
          {chartData.length > 0 && (
            <View className="chart-section">
              <Text className="section-title">近7天趋势</Text>
              <View className="bar-chart">
                {chartData.map((item, idx) => (
                  <View key={idx} className="bar-column">
                    <View className="bar-container">
                      <View className="bar-revenue" style={{ height: `${(item.revenue / maxRevenue) * 100}%` }} />
                      <View className="bar-profit" style={{ height: `${(item.profit / maxProfit) * 100}%` }} />
                    </View>
                    <Text className="bar-label">{item.date}</Text>
                  </View>
                ))}
              </View>
              <View className="chart-legend">
                <View className="legend-item"><View className="legend-color revenue" />收入</View>
                <View className="legend-item"><View className="legend-color profit" />利润</View>
              </View>
            </View>
          )}

          {/* 报表菜单 */}
          <View className="menu-grid">
            <View className={`menu-item ${activeReport === 'pl' ? 'active' : ''}`} onClick={() => {
              vibrate('light')
              setActiveReport('pl')
            }}>
              <Text>📊 利润表</Text>
            </View>
            <View className={`menu-item ${activeReport === 'balance' ? 'active' : ''}`} onClick={() => {
              vibrate('light')
              setActiveReport('balance')
            }}>
              <Text>📋 资产负债表</Text>
            </View>
            <View className={`menu-item ${activeReport === 'cashflow' ? 'active' : ''}`} onClick={() => {
              vibrate('light')
              setActiveReport('cashflow')
            }}>
              <Text>💰 现金流量表</Text>
            </View>
            <View className={`menu-item ${activeReport === 'breakeven' ? 'active' : ''}`} onClick={() => {
              vibrate('light')
              setActiveReport('breakeven')
            }}>
              <Text>⚖️ 盈亏平衡分析</Text>
            </View>
          </View>

          {/* 报表内容 */}
          {activeReport === 'pl' && (
            <View className="report-section">
              <View className="report-header">
                <Text className="report-title">利润表</Text>
                <Text className="report-date">{new Date().toLocaleDateString()}</Text>
              </View>
              <View className="report-content">
                <View className="report-row"><Text className="report-label">总收入</Text><Text className="report-value">{formatCurrency(plData.revenue)}</Text></View>
                <View className="report-sub"><Text>收入构成</Text></View>
                <View className="report-row indent"><Text className="report-label">团课收入</Text><Text className="report-value">{formatCurrency(plData.classRevenue)}</Text></View>
                <View className="report-row indent"><Text className="report-label">私教收入</Text><Text className="report-value">{formatCurrency(plData.ptRevenue)}</Text></View>
                <View className="report-row indent"><Text className="report-label">零售收入</Text><Text className="report-value">{formatCurrency(plData.otherRevenue)}</Text></View>
                <View className="report-sub"><Text>成本与费用</Text></View>
                <View className="report-row indent"><Text className="report-label">固定成本（日分摊）</Text><Text className="report-value">{formatCurrency(plData.fixedCosts)}</Text></View>
                <View className="report-row indent"><Text className="report-label">变动人力成本</Text><Text className="report-value">{formatCurrency(plData.variableCosts)}</Text></View>
                <View className="report-row indent"><Text className="report-label">私教佣金</Text><Text className="report-value">{formatCurrency(plData.ptCommission)}</Text></View>
                <View className="report-row indent"><Text className="report-label">营销支出</Text><Text className="report-value">{formatCurrency(plData.marketingCost)}</Text></View>
                <View className="report-row total"><Text className="report-label">总成本</Text><Text className="report-value">{formatCurrency(plData.totalCosts)}</Text></View>
                <View className="report-row profit"><Text className="report-label">净利润</Text><Text className="report-value">{formatCurrency(plData.profit)}</Text></View>
                <View className="report-row"><Text className="report-label">净利润率</Text><Text className="report-value">{plData.profitMargin.toFixed(1)}%</Text></View>
              </View>
            </View>
          )}

          {activeReport === 'balance' && (
            <View className="report-section">
              <View className="report-header">
                <Text className="report-title">资产负债表</Text>
                <Text className="report-date">{new Date().toLocaleDateString()}</Text>
              </View>
              <View className="report-content">
                <View className="report-sub"><Text>资产</Text></View>
                <View className="report-row indent"><Text className="report-label">货币资金</Text><Text className="report-value">{formatCurrency(balanceData.cash)}</Text></View>
                <View className="report-row total"><Text className="report-label">资产总计</Text><Text className="report-value">{formatCurrency(balanceData.totalAssets)}</Text></View>
                <View className="report-sub"><Text>负债</Text></View>
                <View className="report-row indent"><Text className="report-label">预收账款</Text><Text className="report-value">{formatCurrency(balanceData.unearnedRevenue)}</Text></View>
                <View className="report-row total"><Text className="report-label">负债总计</Text><Text className="report-value">{formatCurrency(balanceData.totalLiabilities)}</Text></View>
                <View className="report-sub"><Text>所有者权益</Text></View>
                <View className="report-row indent"><Text className="report-label">所有者权益</Text><Text className="report-value">{formatCurrency(balanceData.ownerEquity)}</Text></View>
                <View className="report-row total"><Text className="report-label">权益总计</Text><Text className="report-value">{formatCurrency(balanceData.ownerEquity)}</Text></View>
                <View className={`report-row ${balanceData.isBalanced ? 'profit' : 'loss'}`}>
                  <Text className="report-label">平衡检查</Text>
                  <Text className="report-value">{balanceData.isBalanced ? '✅ 平衡' : '⚠️ 不平衡'}</Text>
                </View>
              </View>
            </View>
          )}

          {activeReport === 'cashflow' && (
            <View className="report-section">
              <View className="report-header">
                <Text className="report-title">现金流量表</Text>
                <Text className="report-date">{new Date().toLocaleDateString()}</Text>
              </View>
              <View className="report-content">
                <View className="report-sub"><Text>现金流入</Text></View>
                <View className="report-row indent"><Text className="report-label">新会员现金流入</Text><Text className="report-value">{formatCurrency(cashFlowData.cashIn.newRevenue)}</Text></View>
                <View className="report-row indent"><Text className="report-label">零售收入</Text><Text className="report-value">{formatCurrency(cashFlowData.cashIn.retailRevenue)}</Text></View>
                <View className="report-row indent"><Text className="report-label">其他收入</Text><Text className="report-value">{formatCurrency(cashFlowData.cashIn.otherRevenue)}</Text></View>
                <View className="report-row total"><Text className="report-label">现金流入小计</Text><Text className="report-value">{formatCurrency(cashFlowData.cashIn.total)}</Text></View>
                <View className="report-sub"><Text>现金流出</Text></View>
                <View className="report-row indent"><Text className="report-label">营销支出</Text><Text className="report-value">{formatCurrency(cashFlowData.cashOut.marketing)}</Text></View>
                <View className="report-row indent"><Text className="report-label">变动人力成本</Text><Text className="report-value">{formatCurrency(cashFlowData.cashOut.variableStaff)}</Text></View>
                <View className="report-row indent"><Text className="report-label">其他现金流出</Text><Text className="report-value">{formatCurrency(cashFlowData.cashOut.otherCashOut)}</Text></View>
                <View className="report-row total"><Text className="report-label">现金流出小计</Text><Text className="report-value">{formatCurrency(cashFlowData.cashOut.total)}</Text></View>
                <View className="report-row profit"><Text className="report-label">净现金流</Text><Text className="report-value">{formatCurrency(cashFlowData.netChange)}</Text></View>
                <View className="report-sub"><Text>现金余额</Text></View>
                <View className="report-row indent"><Text className="report-label">期初现金</Text><Text className="report-value">{formatCurrency(cashFlowData.beginningCash)}</Text></View>
                <View className="report-row indent"><Text className="report-label">期末现金</Text><Text className="report-value">{formatCurrency(cashFlowData.endingCash)}</Text></View>
              </View>
            </View>
          )}

          {activeReport === 'breakeven' && (
            <View className="report-section">
              <View className="report-header">
                <Text className="report-title">盈亏平衡分析</Text>
                <Text className="report-date">{new Date().toLocaleDateString()}</Text>
              </View>
              <View className="report-content">
                <View className="report-row"><Text className="report-label">日盈亏平衡点</Text><Text className="report-value">{formatCurrency(breakEvenData.dailyBreakEven)}</Text></View>
                <View className="report-row"><Text className="report-label">月盈亏平衡点</Text><Text className="report-value">{formatCurrency(breakEvenData.monthlyBreakEven)}</Text></View>
                <View className="report-row"><Text className="report-label">当前日均收入</Text><Text className="report-value">{formatCurrency(breakEvenData.currentDailyRevenue)}</Text></View>
                <View className="progress-bar">
                  <View className="progress-track">
                    <View className="progress-fill" style={{ width: `${breakEvenData.dailyProgress}%` }} />
                  </View>
                </View>
                <View className={`report-row ${breakEvenData.isAchieved ? 'profit' : 'loss'}`}>
                  <Text className="report-label">当前状态</Text>
                  <Text className="report-value">{breakEvenData.isAchieved ? '✅ 已超过盈亏平衡点' : '⚠️ 未达到盈亏平衡点'}</Text>
                </View>
              </View>
            </View>
          )}
        </>
      ) : (
        /* 无数据时显示空状态 */
        <View className="empty-state">
          <View className="empty-icon">📊</View>
          <Text className="empty-title">暂无数据</Text>
          <Text className="empty-desc">点击下方「录入」开始记录你的经营数据</Text>
          <View className="empty-btn" onClick={() => Taro.navigateTo({ url: '/pages/entry/index' })}>
            去录入
          </View>
        </View>
      )}

      <CustomTabBar />
    </View>
  )
}