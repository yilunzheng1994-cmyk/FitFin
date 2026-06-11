import { View, Text, Image } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getLatestMetrics, getCumulativeMetrics, getWeeklyTrend, calculateBreakEven, getCACMetrics } from '../../services/calculator'
import { getDailyEntries, getBusinessSettings, hasAnyData, initTestData, clearAllData } from '../../services/storage'
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
    costs: 0,
    profit: 0,
    confidence: 0,
    cashBalance: 0,
    unearnedRevenue: 0,
    availableCash: 0,
    newMembers: 0,
    totalRevenue: 0,
    totalProfit: 0,
    averageCAC: 0
  })
  const [chartData, setChartData] = useState<Array<{ date: string; revenue: number; profit: number }>>([])
  const [cashTrendData, setCashTrendData] = useState<Array<{ date: string; cashBalance: number; availableCash: number }>>([])
  const [hasData, setHasData] = useState(false)
  const [showTestDataPrompt, setShowTestDataPrompt] = useState(false)
  
  const [activeReport, setActiveReport] = useState('pl')
  
  const [plData, setPlData] = useState({
    revenue: 0,
    classRevenue: 0,
    ptRevenue: 0,
    otherRevenue: 0,
    fixedCosts: 0,
    fixedCostsDetail: {
      rent: 0,
      utilities: 0,
      staff: 0,
      insurance: 0,
      depreciation: 0,
      renovation: 0
    },
    variableCosts: 0,
    classCoachCost: 0,
    ptCommission: 0,
    marketingCost: 0,
    totalCosts: 0,
    profit: 0,
    profitMargin: 0
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
  
  const [customerMetrics, setCustomerMetrics] = useState({
    cac: 0,
    status: '',
    statusColor: '',
    statusDesc: '',
    hasData: false
  })

  // 辅助函数：计算单日现金流入流出
  const calculateCashFlowFromEntry = (entry: any) => {
    const cashIn = (entry.newRevenue || 0) + 
                   (entry.retailRevenue || 0) + 
                   (entry.otherRevenue || 0) + 
                   (entry.otherCashIn || 0)
    const cashOut = (entry.marketingSpend || 0) + 
                    (entry.otherCashOut || 0)
    return { cashIn, cashOut }
  }

  const loadCashTrend = () => {
    const entries = getDailyEntries()
    const settings = getBusinessSettings()
    const dates = Object.keys(entries).sort().slice(-7)
    const openingUnearned = settings.openingUnearnedRevenue || 0
    
    let cumulativeNewRevenue = 0
    let cumulativeConsumed = 0
    const trendData: Array<{ date: string; cashBalance: number; availableCash: number }> = []
    
    for (const date of dates) {
      const entry = entries[date]
      if (!entry) continue
      
      const { cashIn, cashOut } = calculateCashFlowFromEntry(entry)
      const endingCash = (entry.cashBalanceStart || 0) + cashIn - cashOut
      
      cumulativeNewRevenue += entry.newRevenue || 0
      const classConsumed = (entry.classCount || 0) * (entry.avgClassSize || 8) * (entry.avgRevenuePerMember || 15)
      const ptConsumed = (entry.ptHours || 0) * (entry.ptRate || 300)
      cumulativeConsumed += classConsumed + ptConsumed
      const unearnedRevenue = Math.max(0, openingUnearned + cumulativeNewRevenue - cumulativeConsumed)
      const availableCash = endingCash - unearnedRevenue
      
      trendData.push({
        date: date.slice(5),
        cashBalance: endingCash,
        availableCash: availableCash
      })
    }
    
    setCashTrendData(trendData)
  }

  const loadData = () => {
    const latest = getLatestMetrics()
    if (latest) {
      setMetrics(prev => ({
        ...prev,
        revenue: latest.revenue,
        costs: latest.costs,
        profit: latest.profit,
        confidence: latest.confidence,
        cashBalance: latest.cashBalance,
        newMembers: latest.newMembers
      }))
    } else {
      // 没有数据时重置相关指标
      setMetrics(prev => ({
        ...prev,
        revenue: 0,
        costs: 0,
        profit: 0,
        confidence: 0,
        cashBalance: 0,
        newMembers: 0
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
    loadCashFlowData()
    loadBreakEvenData()
    loadCustomerMetrics()
    loadCashTrend()
    
    const entries = getDailyEntries()
    const settings = getBusinessSettings()
    const dates = Object.keys(entries).sort()
    const latestDate = dates[dates.length - 1]
    
    if (latestDate) {
      const latestEntry = entries[latestDate]
      const { cashIn, cashOut } = calculateCashFlowFromEntry(latestEntry)
      const endingCash = (latestEntry.cashBalanceStart || 0) + cashIn - cashOut
      
      let totalNewRevenue = 0
      let totalClassConsumed = 0
      let totalPtConsumed = 0
      
      Object.entries(entries).forEach(([date, entry]) => {
        if (date <= latestDate) {
          totalNewRevenue += entry.newRevenue || 0
          totalClassConsumed += (entry.classCount || 0) * (entry.avgClassSize || 8) * (entry.avgRevenuePerMember || 15)
          totalPtConsumed += (entry.ptHours || 0) * (entry.ptRate || 300)
        }
      })
      
      const totalConsumed = totalClassConsumed + totalPtConsumed
      const openingUnearned = settings.openingUnearnedRevenue || 0
      const unearnedRevenue = Math.max(0, openingUnearned + totalNewRevenue - totalConsumed)
      const availableCash = endingCash - unearnedRevenue
      
      setMetrics(prev => ({
        ...prev,
        unearnedRevenue,
        availableCash
      }))
    } else {
      // 没有数据时重置预收账款和可用现金
      setMetrics(prev => ({
        ...prev,
        unearnedRevenue: 0,
        availableCash: 0
      }))
    }
    
    const entriesCount = Object.keys(entries).length
    setHasData(entriesCount > 0)
    
    // 检查是否显示测试数据提示
    const hasDataFlag = hasAnyData()
    setShowTestDataPrompt(!hasDataFlag)
    
    Taro.stopPullDownRefresh()
  }
  
  const loadPLData = () => {
    const entries = getDailyEntries()
    const settings = getBusinessSettings()
    const latestEntry = Object.values(entries).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    
    if (latestEntry) {
      const classRevenue = (latestEntry.classCount || 0) * (latestEntry.avgClassSize || 8) * (latestEntry.avgRevenuePerMember || 15)
      const ptRevenue = latestEntry.ptRevenue || (latestEntry.ptHours || 0) * (latestEntry.ptRate || 300)
      const otherRevenue = (latestEntry.retailRevenue || 0) + (latestEntry.otherRevenue || 0)
      const revenue = classRevenue + ptRevenue + otherRevenue
      
      // 日分摊固定成本明细
      const dailyRent = settings.monthlyRent / 30
      const dailyUtilities = settings.monthlyUtilities / 30
      const dailyFixedStaff = settings.fixedStaffCost / 30
      const dailyInsurance = settings.monthlyInsurance / 30
      
      const monthlyDepreciation = settings.equipmentValue / settings.equipmentDepreciationMonths
      const dailyDepreciation = monthlyDepreciation / 30
      
      let dailyRenovationAmort = 0
      if (settings.renovationCost && settings.renovationYears) {
        const monthlyAmort = settings.renovationCost / (settings.renovationYears * 12)
        dailyRenovationAmort = monthlyAmort / 30
      }
      
      const ptCommission = ptRevenue * settings.ptCommissionRate
      const classHours = latestEntry.classHours || latestEntry.classCount || 0
      const classCoachCost = classHours * settings.classCoachRate
      const marketingCost = latestEntry.marketingSpend || 0
      
      const fixedCostsTotal = dailyRent + dailyUtilities + dailyFixedStaff + dailyInsurance + dailyDepreciation + dailyRenovationAmort
      const variableCostsTotal = classCoachCost + ptCommission
      const totalCosts = fixedCostsTotal + variableCostsTotal + marketingCost
      const profit = revenue - totalCosts
      
      setPlData({
        revenue,
        classRevenue,
        ptRevenue,
        otherRevenue,
        fixedCosts: fixedCostsTotal,
        fixedCostsDetail: {
          rent: dailyRent,
          utilities: dailyUtilities,
          staff: dailyFixedStaff,
          insurance: dailyInsurance,
          depreciation: dailyDepreciation,
          renovation: dailyRenovationAmort
        },
        variableCosts: variableCostsTotal,
        classCoachCost,
        ptCommission,
        marketingCost,
        totalCosts,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
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
        variableStaff: 0,
        otherCashOut: latestEntry.otherCashOut || 0,
        total: (latestEntry.marketingSpend || 0) + (latestEntry.otherCashOut || 0)
      }
      
      const endingCash = (latestEntry.cashBalanceStart || 0) + cashIn.total - cashOut.total
      
      setCashFlowData({
        cashIn,
        cashOut,
        netChange: cashIn.total - cashOut.total,
        beginningCash: latestEntry.cashBalanceStart || 0,
        endingCash
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
  
  const loadCustomerMetrics = () => {
    const metrics = getCACMetrics()
    setCustomerMetrics(metrics)
  }

  // 加载测试数据
  const handleLoadTestData = () => {
    initTestData()
    setShowTestDataPrompt(false)
    loadData()
    Taro.showToast({
      title: '已加载示例数据',
      icon: 'success'
    })
  }

  // 清除所有数据
  const handleClearAllData = () => {
    Taro.showModal({
      title: '确认清除',
      content: '清除后所有数据将丢失，确定要清除吗？',
      confirmColor: '#e67e22',
      success: (res) => {
        if (res.confirm) {
          clearAllData()
          loadData()
          Taro.showToast({
            title: '已清除所有数据',
            icon: 'success'
          })
        }
      }
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

  const maxAllRevenueProfit = Math.max(
    ...chartData.map(d => d.revenue),
    ...chartData.map(d => d.profit),
    1
  )
  
  const maxAllCash = Math.max(
    ...cashTrendData.map(d => d.cashBalance),
    ...cashTrendData.map(d => d.availableCash),
    1
  )

  return (
    <View className="dashboard">
      <View className="header">
        <View className="title-wrapper">
          <Image className="header-logo" src={logoUrl} mode="aspectFit" />
          <Text className="title">FitFin 健身财务助手</Text>
        </View>
        <Text className="confidence">置信度 {metrics.confidence}%</Text>
      </View>

      {/* 测试数据提示卡片（仅新用户或无数据时显示） */}
      {showTestDataPrompt && (
        <View className="test-data-prompt">
          <View className="prompt-icon">📊</View>
          <Text className="prompt-title">欢迎使用 FitFin</Text>
          <Text className="prompt-desc">暂无数据，可加载示例数据快速体验</Text>
          <View className="prompt-buttons">
            <View className="prompt-btn primary" onClick={handleLoadTestData}>
              加载示例数据
            </View>
          </View>
        </View>
      )}

      {hasData ? (
        <>
          {/* 有数据时显示清除按钮 */}
          <View className="clear-data-btn" onClick={handleClearAllData}>
            <Text className="clear-icon">🗑️</Text>
            <Text className="clear-text">清除所有数据</Text>
          </View>

          {/* 第一行：利润计算卡 */}
          <View className="kpi-card-vertical">
            <Text className="kpi-title">今日经营成果</Text>
            <View className="kpi-row">
              <Text className="kpi-label">今日收入</Text>
              <Text className="kpi-value"><CountUpNumber end={metrics.revenue} prefix="¥" decimals={0} /></Text>
            </View>
            <View className="kpi-row subtract">
              <Text className="kpi-label">减：今日支出</Text>
              <Text className="kpi-value"><CountUpNumber end={metrics.costs} prefix="¥" decimals={0} /></Text>
            </View>
            <View className="kpi-divider" />
            <View className="kpi-row total">
              <Text className="kpi-label">等于：今日利润</Text>
              <Text className="kpi-value text-green-600">
                <CountUpNumber end={metrics.profit} prefix="¥" decimals={0} />
              </Text>
            </View>
          </View>

          {/* 第二行：资金状况卡 */}
          <View className="kpi-card-vertical">
            <Text className="kpi-title">今日资金状况</Text>
            <View className="kpi-row">
              <Text className="kpi-label">今日现金余额</Text>
              <Text className="kpi-value"><CountUpNumber end={metrics.cashBalance} prefix="¥" decimals={0} /></Text>
            </View>
            <View className="kpi-row subtract">
              <Text className="kpi-label">减：预收会员款</Text>
              <Text className="kpi-value"><CountUpNumber end={metrics.unearnedRevenue} prefix="¥" decimals={0} /></Text>
            </View>
            <View className="kpi-divider" />
            <View className="kpi-row total">
              <Text className="kpi-label">等于：可用现金余额</Text>
              <Text className="kpi-value text-green-600">
                <CountUpNumber end={metrics.availableCash} prefix="¥" decimals={0} />
              </Text>
            </View>
          </View>

          {/* 图表1：收入与利润趋势 */}
          {chartData.length > 0 && (
            <View className="chart-section">
              <Text className="section-title">近7天收入与利润趋势</Text>
              <View className="bar-chart">
                {chartData.map((item, idx) => (
                  <View key={idx} className="bar-column">
                    <View className="bar-container">
                      <View className="bar-revenue" style={{ height: `${(item.revenue / maxAllRevenueProfit) * 100}%` }} />
                      <View className="bar-profit" style={{ height: `${(item.profit / maxAllRevenueProfit) * 100}%` }} />
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

          {/* 图表2：现金与可用现金趋势 */}
          {cashTrendData.length > 0 && (
            <View className="chart-section">
              <Text className="section-title">近7天现金趋势</Text>
              <View className="bar-chart">
                {cashTrendData.map((item, idx) => (
                  <View key={idx} className="bar-column">
                    <View className="bar-container">
                      <View className="bar-cash" style={{ height: `${(item.cashBalance / maxAllCash) * 100}%` }} />
                      <View className="bar-available" style={{ height: `${(item.availableCash / maxAllCash) * 100}%` }} />
                    </View>
                    <Text className="bar-label">{item.date}</Text>
                  </View>
                ))}
              </View>
              <View className="chart-legend">
                <View className="legend-item"><View className="legend-color cash" />现金余额</View>
                <View className="legend-item"><View className="legend-color available" />可用现金</View>
              </View>
              <View className="chart-note">
                <Text>💡 可用现金 = 现金余额 - 预收账款</Text>
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
            <View className={`menu-item ${activeReport === 'breakeven' ? 'active' : ''}`} onClick={() => {
              vibrate('light')
              setActiveReport('breakeven')
            }}>
              <Text>⚖️ 盈亏平衡分析</Text>
            </View>
            <View className={`menu-item ${activeReport === 'cashflow' ? 'active' : ''}`} onClick={() => {
              vibrate('light')
              setActiveReport('cashflow')
            }}>
              <Text>💰 现金流量表</Text>
            </View>
            <View className={`menu-item ${activeReport === 'cashflowAnalysis' ? 'active' : ''}`} onClick={() => {
              vibrate('light')
              setActiveReport('cashflowAnalysis')
            }}>
              <Text>🏦 预收与可用现金余额</Text>
            </View>
            <View className={`menu-item ${activeReport === 'customer' ? 'active' : ''}`} onClick={() => {
              vibrate('light')
              setActiveReport('customer')
            }}>
              <Text>👥 客户价值分析</Text>
            </View>
          </View>

          {/* 利润表内容 */}
          {activeReport === 'pl' && (
            <View className="report-section">
              <View className="report-header">
                <Text className="report-title">利润表</Text>
                <Text className="report-date">{new Date().toLocaleDateString()}</Text>
              </View>
              <View className="report-content">
                <View className="report-sub">收入</View>
                <View className="report-row"><Text className="report-label">团课收入</Text><Text className="report-value">{formatCurrency(plData.classRevenue)}</Text></View>
                <View className="report-row"><Text className="report-label">私教收入</Text><Text className="report-value">{formatCurrency(plData.ptRevenue)}</Text></View>
                <View className="report-row"><Text className="report-label">零售收入</Text><Text className="report-value">{formatCurrency(plData.otherRevenue)}</Text></View>
                <View className="report-row total"><Text className="report-label">总收入</Text><Text className="report-value">{formatCurrency(plData.revenue)}</Text></View>
                
                <View className="report-sub">固定成本（日分摊）</View>
                <View className="report-row"><Text className="report-label">房租</Text><Text className="report-value">{formatCurrency(plData.fixedCostsDetail.rent)}</Text></View>
                <View className="report-row"><Text className="report-label">水电费</Text><Text className="report-value">{formatCurrency(plData.fixedCostsDetail.utilities)}</Text></View>
                <View className="report-row"><Text className="report-label">固定人力</Text><Text className="report-value">{formatCurrency(plData.fixedCostsDetail.staff)}</Text></View>
                <View className="report-row"><Text className="report-label">保险</Text><Text className="report-value">{formatCurrency(plData.fixedCostsDetail.insurance)}</Text></View>
                <View className="report-row"><Text className="report-label">设备折旧</Text><Text className="report-value">{formatCurrency(plData.fixedCostsDetail.depreciation)}</Text></View>
                <View className="report-row"><Text className="report-label">装修摊销</Text><Text className="report-value">{formatCurrency(plData.fixedCostsDetail.renovation)}</Text></View>
                <View className="report-row total"><Text className="report-label">固定成本小计</Text><Text className="report-value">{formatCurrency(plData.fixedCosts)}</Text></View>
                
                <View className="report-sub">变动成本</View>
                <View className="report-row"><Text className="report-label">变动人力成本 - 团课</Text><Text className="report-value">{formatCurrency(plData.classCoachCost)}</Text></View>
                <View className="report-row"><Text className="report-label">变动人力成本 - 私教</Text><Text className="report-value">{formatCurrency(plData.ptCommission)}</Text></View>
                <View className="report-row"><Text className="report-label">营销支出</Text><Text className="report-value">{formatCurrency(plData.marketingCost)}</Text></View>
                <View className="report-row total"><Text className="report-label">变动成本小计</Text><Text className="report-value">{formatCurrency(plData.variableCosts + plData.marketingCost)}</Text></View>
                
                <View className="report-sub">利润</View>
                <View className="report-row profit"><Text className="report-label">净利润</Text><Text className="report-value">{formatCurrency(plData.profit)}</Text></View>
                <View className="report-row"><Text className="report-label">净利润率</Text><Text className="report-value">{plData.profitMargin.toFixed(1)}%</Text></View>
              </View>
            </View>
          )}

          {/* 盈亏平衡分析内容 */}
          {activeReport === 'breakeven' && (
            <View className="report-section">
              <View className="report-header">
                <Text className="report-title">盈亏平衡分析</Text>
                <Text className="report-date">{new Date().toLocaleDateString()}</Text>
              </View>
              <View className="report-content">
                <View className="report-row">
                  <Text className="report-label">日盈亏平衡点</Text>
                  <Text className="report-value">{formatCurrency(breakEvenData.dailyBreakEven)}</Text>
                </View>
                <View className="report-row">
                  <Text className="report-label">月盈亏平衡点</Text>
                  <Text className="report-value">{formatCurrency(breakEvenData.monthlyBreakEven)}</Text>
                </View>
                <View className="report-row">
                  <Text className="report-label">今日主营业务收入</Text>
                  <Text className="report-value">{formatCurrency(breakEvenData.currentDailyRevenue)}</Text>
                </View>
                
                {/* 进度条 */}
                <View className="progress-bar">
                  <View className="progress-track">
                    <View className="progress-fill" style={{ width: `${breakEvenData.dailyProgress}%` }} />
                  </View>
                </View>
                
                <View className={`report-row ${breakEvenData.isAchieved ? 'profit' : 'loss'}`}>
                  <Text className="report-label">当前状态</Text>
                  <Text className="report-value">{breakEvenData.isAchieved ? '✅ 已超过盈亏平衡点' : '⚠️ 未达到盈亏平衡点'}</Text>
                </View>
                
                {/* 备注说明 */}
                <View className="break-even-note">
                  <Text className="note-title">📌 计算说明</Text>
                  <View className="note-item">① 每月按30天折算日固定成本</View>
                  <View className="note-item">② 边际贡献利润率按最近7天平均计算</View>
                  <View className="note-item">③ 仅考虑主营业务（团课+私教），不含零售等一次性收入</View>
                </View>
              </View>
            </View>
          )}

          {/* 现金流量表内容 */}
          {activeReport === 'cashflow' && (
            <View className="report-section">
              <View className="report-header">
                <Text className="report-title">现金流量表</Text>
                <Text className="report-date">{new Date().toLocaleDateString()}</Text>
              </View>
              <View className="report-content">
                <View className="report-sub">现金流入</View>
                <View className="report-row"><Text className="report-label">新会员现金流入</Text><Text className="report-value">{formatCurrency(cashFlowData.cashIn.newRevenue)}</Text></View>
                <View className="report-row"><Text className="report-label">零售收入</Text><Text className="report-value">{formatCurrency(cashFlowData.cashIn.retailRevenue)}</Text></View>
                <View className="report-row"><Text className="report-label">其他收入</Text><Text className="report-value">{formatCurrency(cashFlowData.cashIn.otherRevenue)}</Text></View>
                <View className="report-row total"><Text className="report-label">现金流入小计</Text><Text className="report-value">{formatCurrency(cashFlowData.cashIn.total)}</Text></View>
                
                <View className="report-sub">现金流出</View>
                <View className="report-row"><Text className="report-label">营销支出</Text><Text className="report-value">{formatCurrency(cashFlowData.cashOut.marketing)}</Text></View>
                <View className="report-row"><Text className="report-label">其他现金流出</Text><Text className="report-value">{formatCurrency(cashFlowData.cashOut.otherCashOut)}</Text></View>
                <View className="report-row total"><Text className="report-label">现金流出小计</Text><Text className="report-value">{formatCurrency(cashFlowData.cashOut.total)}</Text></View>
                
                <View className="report-sub">净现金流</View>
                <View className="report-row profit"><Text className="report-label">净现金流</Text><Text className="report-value">{formatCurrency(cashFlowData.netChange)}</Text></View>
                
                <View className="report-sub">现金余额</View>
                <View className="report-row"><Text className="report-label">期初现金</Text><Text className="report-value">{formatCurrency(cashFlowData.beginningCash)}</Text></View>
                <View className="report-row"><Text className="report-label">期末现金</Text><Text className="report-value">{formatCurrency(cashFlowData.endingCash)}</Text></View>
              </View>
            </View>
          )}

          {/* 预收与可用现金余额内容 */}
          {activeReport === 'cashflowAnalysis' && (
            <View className="report-section">
              <View className="report-header">
                <Text className="report-title">预收与可用现金余额</Text>
                <Text className="report-date">{new Date().toLocaleDateString()}</Text>
              </View>
              <View className="cashflow-analysis-content">
                <View className="analysis-card">
                  <Text className="analysis-label">可用现金流</Text>
                  <Text className="analysis-value">{formatCurrency(metrics.availableCash)}</Text>
                  <Text className="analysis-status">
                    {metrics.availableCash <= 0 ? '⚠️ 资金链风险' : 
                     metrics.cashBalance > 0 && metrics.unearnedRevenue / metrics.cashBalance > 0.7 ? '⚠️ 预收占比较高' : '✅ 财务状况健康'}
                  </Text>
                </View>
                
                <View className="analysis-row">
                  <Text className="analysis-label">期末现金余额</Text>
                  <Text className="analysis-value">{formatCurrency(metrics.cashBalance)}</Text>
                </View>
                <View className="analysis-row">
                  <Text className="analysis-label">预收账款</Text>
                  <Text className="analysis-value">{formatCurrency(metrics.unearnedRevenue)}</Text>
                </View>
                <View className="analysis-divider" />
                <View className="analysis-row total">
                  <Text className="analysis-label">可用现金</Text>
                  <Text className="analysis-value">{formatCurrency(metrics.availableCash)}</Text>
                </View>
                
                <View className="analysis-note">
                  <Text>💡 可用现金 = 现金余额 - 预收账款</Text>
                  <Text>预收账款占比: {metrics.cashBalance > 0 ? ((metrics.unearnedRevenue / metrics.cashBalance) * 100).toFixed(1) : 0}%</Text>
                </View>
              </View>
            </View>
          )}

          {/* 客户价值分析内容 */}
          {activeReport === 'customer' && (
            <View className="report-section">
              <View className="report-header">
                <Text className="report-title">客户价值分析</Text>
                <Text className="report-date">{new Date().toLocaleDateString()}</Text>
              </View>
              <View className="report-content">
                {/* CAC 卡片 */}
                <View className="customer-card">
                  <View className="customer-icon">📢</View>
                  <View className="customer-info">
                    <Text className="customer-label">CAC 获客成本</Text>
                    <Text className="customer-value">{formatCurrency(customerMetrics.cac)}</Text>
                    <Text className="customer-unit">/人</Text>
                  </View>
                  <View className="customer-status" style={{ backgroundColor: customerMetrics.statusColor + '20' }}>
                    <Text className="status-text" style={{ color: customerMetrics.statusColor }}>
                      {customerMetrics.status}
                    </Text>
                  </View>
                </View>
                
                {/* LTV 提示卡片 */}
                <View className="customer-card ltv-disabled">
                  <View className="customer-icon">⏳</View>
                  <View className="customer-info">
                    <Text className="customer-label">LTV 客户生命周期价值</Text>
                    <Text className="customer-value">即将上线</Text>
                    <Text className="customer-unit">/人</Text>
                  </View>
                  <View className="customer-trend">
                    <Text className="trend-desc">接入会员系统后可精确计算</Text>
                  </View>
                </View>
                
                {/* LTV/CAC 提示卡片 */}
                <View className="customer-card ltv-disabled">
                  <View className="customer-icon">📊</View>
                  <View className="customer-info">
                    <Text className="customer-label">LTV / CAC</Text>
                    <Text className="customer-value">—</Text>
                    <Text className="customer-unit">倍</Text>
                  </View>
                  <View className="customer-trend">
                    <Text className="trend-desc">需要 LTV 数据后计算</Text>
                  </View>
                </View>
                
                {/* 指标解读 */}
                <View className="customer-interpretation">
                  <Text className="interpretation-title">📖 CAC 解读</Text>
                  <View className="interpretation-item">
                    <Text className="interpretation-label">当前状态：</Text>
                    <Text className="interpretation-text">{customerMetrics.statusDesc}</Text>
                  </View>
                  <View className="interpretation-item">
                    <Text className="interpretation-label">行业参考：</Text>
                    <Text className="interpretation-text">健身工作室 CAC 通常在 100-500 元之间</Text>
                  </View>
                </View>
                
                {/* 计算说明 */}
                <View className="customer-note">
                  <Text className="note-title">📌 计算说明</Text>
                  <Text className="note-item">① CAC = 总营销支出 ÷ 新增会员数</Text>
                  <Text className="note-item">② 营销支出包括广告、地推、转介绍奖励等</Text>
                  <Text className="note-item">③ 建议定期评估不同渠道的获客成本</Text>
                </View>
                
                {/* 优化建议 */}
                <View className="customer-suggestion">
                  <Text className="suggestion-title">💡 降低 CAC 的方法</Text>
                  <Text className="suggestion-item">• 优化投放渠道，关停低 ROI 渠道</Text>
                  <Text className="suggestion-item">• 增加会员转介绍活动（如赠课、返现）</Text>
                  <Text className="suggestion-item">• 提升到店转化率（优化体验课流程）</Text>
                  <Text className="suggestion-item">• 与周边商家合作，降低获客成本</Text>
                </View>
              </View>
            </View>
          )}
        </>
      ) : (
        <View className="empty-state">
          <View className="empty-icon">📊</View>
          <Text className="empty-title">暂无数据</Text>
          <Text className="empty-desc">点击下方「录入」开始记录你的经营数据</Text>
          <View className="empty-btn" onClick={() => Taro.navigateTo({ url: '/pages/entry/index' })}>
            去录入
          </View>
        </View>
      )}

      {/* 免责声明 */}
      <View className="dashboard-disclaimer">
        <Text className="disclaimer-text">
          免责声明：本小程序提供的数据分析仅供参考，不构成任何财务建议、投资建议或经营建议。决策前请咨询专业财务顾问。
        </Text>
      </View>

      <CustomTabBar />
    </View>
  )
}