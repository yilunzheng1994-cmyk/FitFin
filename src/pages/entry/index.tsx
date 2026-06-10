import { View, Text, Input, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getDailyEntryByDate, saveDailyEntry, getBusinessSettings } from '../../services/storage'
import { calculateEndingCash } from '../../services/calculator'
import { formatCurrency } from '../../utils/format'
import emitter from '../../utils/eventBus'
import CustomTabBar from '../../components/CustomTabBar'
import { vibrate } from '../../utils/vibrate'
import './index.scss'

export default function Entry() {
  const [selectedDate, setSelectedDate] = useState('')
  const [formData, setFormData] = useState({
    cashBalanceStart: 0,
    classCount: 0,
    classHours: 0,
    avgClassSize: 8,
    avgRevenuePerMember: 15,
    ptHours: 0,
    ptRate: 300,
    newMembers: 0,
    newRevenue: 0,
    retailRevenue: 0,
    otherRevenue: 0,
    marketingSpend: 0,
    otherCashIn: 0,
    otherCashOut: 0
  })
  
  const [suggestedCashStart, setSuggestedCashStart] = useState<number | null>(null)
  const [cashStartWarning, setCashStartWarning] = useState('')
  const [hasSaved, setHasSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [defaultPtRate, setDefaultPtRate] = useState(300)

  // 加载业务设置
  useEffect(() => {
    const settings = getBusinessSettings()
    setDefaultPtRate(settings.defaultPtRate || 300)
    setFormData(prev => ({ ...prev, ptRate: settings.defaultPtRate || 300 }))
  }, [])

  // 通用更新函数
  const updateFormField = (field: keyof typeof formData, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  // 计算建议的期初现金
  const calculateSuggestedCashStart = (date: string) => {
    const entry = getDailyEntryByDate(date)
    if (entry?.cashBalanceStart && entry.cashBalanceStart > 0) {
      setSuggestedCashStart(null)
      setCashStartWarning('')
      return
    }
    
    const prevDate = new Date(date)
    prevDate.setDate(prevDate.getDate() - 1)
    const prevDateStr = prevDate.toISOString().split('T')[0]
    const prevEntry = getDailyEntryByDate(prevDateStr)
    
    if (prevEntry) {
      const prevEndingCash = calculateEndingCash(prevEntry)
      if (prevEndingCash > 0) {
        setSuggestedCashStart(prevEndingCash)
        setCashStartWarning(`建议期初现金为 ${formatCurrency(prevEndingCash)}（来自前一日期末现金）`)
      } else {
        setSuggestedCashStart(null)
        setCashStartWarning('')
      }
    } else {
      setSuggestedCashStart(null)
      setCashStartWarning('')
    }
  }

  // 加载指定日期的数据
  const loadDataForDate = (date: string) => {
    const entry = getDailyEntryByDate(date)
    if (entry) {
      setFormData({
        cashBalanceStart: entry.cashBalanceStart || 0,
        classCount: entry.classCount || 0,
        classHours: entry.classHours || 0,
        avgClassSize: entry.avgClassSize || 8,
        avgRevenuePerMember: entry.avgRevenuePerMember || 15,
        ptHours: entry.ptHours || 0,
        ptRate: entry.ptRate || defaultPtRate,
        newMembers: entry.newMembers || 0,
        newRevenue: entry.newRevenue || 0,
        retailRevenue: entry.retailRevenue || 0,
        otherRevenue: entry.otherRevenue || 0,
        marketingSpend: entry.marketingSpend || 0,
        otherCashIn: entry.otherCashIn || 0,
        otherCashOut: entry.otherCashOut || 0
      })
      setHasSaved(true)
      setIsDirty(false)
    } else {
      setFormData({
        cashBalanceStart: 0,
        classCount: 0,
        classHours: 0,
        avgClassSize: 8,
        avgRevenuePerMember: 15,
        ptHours: 0,
        ptRate: defaultPtRate,
        newMembers: 0,
        newRevenue: 0,
        retailRevenue: 0,
        otherRevenue: 0,
        marketingSpend: 0,
        otherCashIn: 0,
        otherCashOut: 0
      })
      setHasSaved(false)
      setIsDirty(false)
    }
    calculateSuggestedCashStart(date)
  }

  // 初始化
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
    loadDataForDate(today)
  }, [])

  // 日期切换
  const handleDateChange = (e: { detail: { value: string } }) => {
    const newDate = e.detail.value
    setSelectedDate(newDate)
    loadDataForDate(newDate)
  }

  // 步进器
  const decrement = (field: keyof typeof formData, step: number = 1) => {
    vibrate('light')
    const newValue = Math.max(0, (formData[field] || 0) - step)
    updateFormField(field, newValue)
  }

  const increment = (field: keyof typeof formData, step: number = 1) => {
    vibrate('light')
    const newValue = (formData[field] || 0) + step
    updateFormField(field, newValue)
  }

  // 输入框变更
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const numValue = value === '' ? 0 : Number(value)
    if (!isNaN(numValue)) {
      updateFormField(field, numValue)
    }
  }

  // 使用建议的期初现金
  const handleUseSuggestedCash = () => {
    if (suggestedCashStart !== null) {
      updateFormField('cashBalanceStart', suggestedCashStart)
      setSuggestedCashStart(null)
      setCashStartWarning('')
      Taro.showToast({ title: '已使用建议值', icon: 'success' })
    }
  }

  // 保存
  const handleSaveAll = () => {
    const entry = {
      date: selectedDate,
      ...formData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    saveDailyEntry(entry)
    setHasSaved(true)
    setIsDirty(false)
    vibrate('light')
    Taro.showToast({ title: '保存成功', icon: 'success' })
    emitter.emit('data-updated')
  }

  // 跳转到固定配置
  const handleGoToSettings = () => {
    Taro.navigateTo({ url: '/pages/settings/index' })
  }

  // 字段备注
  const fieldNotes: Record<string, string> = {
    cashBalanceStart: '影响：当日现金余额、可用现金计算。建议与前一日期末现金保持一致。',
    classCount: '影响：团课收入、团课教练成本、利润表。每节课时长请填写「团课总课时」。',
    classHours: '影响：团课教练成本（课时费 × 总课时）。例如：5节课 × 1小时 = 5小时。',
    avgClassSize: '影响：团课收入估算。公式：团课节数 × 平均人数 × 人均收入。',
    avgRevenuePerMember: '影响：团课收入估算。公式：团课节数 × 平均人数 × 人均收入。',
    ptHours: '影响：私教收入、私教佣金、利润表。',
    ptRate: '影响：私教收入估算。公式：私教课时 × 私教单价。',
    newMembers: '影响：CAC（获客成本）计算。公式：总营销支出 ÷ 新增会员数。',
    newRevenue: '影响：现金流量表（现金流入）。不计入利润表。',
    retailRevenue: '影响：现金流量表、利润表（其他收入）。',
    otherRevenue: '影响：现金流量表、利润表（其他收入）。',
    marketingSpend: '影响：CAC计算、利润表（营销支出）、现金流量表（现金流出）。',
    otherCashIn: '影响：现金流量表（其他现金流入）。',
    otherCashOut: '影响：现金流量表（其他现金流出）。'
  }

  return (
    <View className="entry-batch">
      {/* 顶部栏 */}
      <View className="batch-header">
        <View className="date-selector">
          <Text className="date-label">日期</Text>
          <Picker mode="date" value={selectedDate} start="2020-01-01" end="2030-12-31" onChange={handleDateChange}>
            <View className="date-picker">{selectedDate}</View>
          </Picker>
        </View>
        <View className={`save-btn ${!isDirty && hasSaved ? 'saved' : ''}`} onClick={handleSaveAll}>
          <Text className="save-text">{!isDirty && hasSaved ? '✓ 已保存' : '💾 保存'}</Text>
        </View>
      </View>

      {/* 固定配置提示卡片 */}
      <View className="config-reminder" onClick={handleGoToSettings}>
        <View className="config-icon">⚙️</View>
        <View className="config-content">
          <Text className="config-title">固定配置</Text>
          <Text className="config-desc">点击设置房租、人力成本、私教佣金等固定参数</Text>
        </View>
        <Text className="config-arrow">›</Text>
      </View>

      {/* 期初现金警告 */}
      {cashStartWarning && (
        <View className="cash-warning-banner">
          <Text className="warning-text">⚠️ {cashStartWarning}</Text>
          <View className="warning-btn" onClick={handleUseSuggestedCash}>
            一键使用
          </View>
        </View>
      )}

      <View className="batch-form">
        {/* 现金余额 */}
        <View className="form-section">
          <View className="section-title">💰 现金余额</View>
          <View className="form-row">
            <View className="form-label-wrapper">
              <Text className="form-label">期初现金</Text>
              <Text className="form-unit">¥</Text>
            </View>
            <Input
              type="number"
              value={String(formData.cashBalanceStart)}
              onInput={(e) => handleInputChange('cashBalanceStart', e.detail.value)}
              className="form-input"
              placeholder="0"
            />
          </View>
          <Text className="field-note">{fieldNotes.cashBalanceStart}</Text>
        </View>

        {/* 团课 */}
        <View className="form-section">
          <View className="section-title">🏋️ 团课</View>
          
          <View className="form-row stepper-row">
            <View className="form-label-wrapper">
              <Text className="form-label">团课节数</Text>
              <Text className="form-unit">节</Text>
            </View>
            <View className="stepper">
              <View className="stepper-btn" onClick={() => decrement('classCount')}>-</View>
              <Text className="stepper-value">{formData.classCount}</Text>
              <View className="stepper-btn" onClick={() => increment('classCount')}>+</View>
            </View>
          </View>
          <Text className="field-note">{fieldNotes.classCount}</Text>

          <View className="form-row stepper-row">
            <View className="form-label-wrapper">
              <Text className="form-label">团课总课时</Text>
              <Text className="form-unit">小时</Text>
            </View>
            <View className="stepper">
              <View className="stepper-btn" onClick={() => decrement('classHours')}>-</View>
              <Text className="stepper-value">{formData.classHours}</Text>
              <View className="stepper-btn" onClick={() => increment('classHours')}>+</View>
            </View>
          </View>
          <Text className="field-note">{fieldNotes.classHours}</Text>

          <View className="form-row">
            <View className="form-label-wrapper">
              <Text className="form-label">平均每节课人数</Text>
              <Text className="form-unit">人</Text>
            </View>
            <Input
              type="number"
              value={String(formData.avgClassSize)}
              onInput={(e) => handleInputChange('avgClassSize', e.detail.value)}
              className="form-input"
              placeholder="8"
            />
          </View>
          <Text className="field-note">{fieldNotes.avgClassSize}</Text>

          <View className="form-row">
            <View className="form-label-wrapper">
              <Text className="form-label">单次课人均收入</Text>
              <Text className="form-unit">¥</Text>
            </View>
            <Input
              type="digit"
              value={String(formData.avgRevenuePerMember)}
              onInput={(e) => handleInputChange('avgRevenuePerMember', e.detail.value)}
              className="form-input"
              placeholder="15"
            />
          </View>
          <Text className="field-note">{fieldNotes.avgRevenuePerMember}</Text>
        </View>

        {/* 私教 */}
        <View className="form-section">
          <View className="section-title">💪 私教</View>
          
          <View className="form-row stepper-row">
            <View className="form-label-wrapper">
              <Text className="form-label">私教课时</Text>
              <Text className="form-unit">小时</Text>
            </View>
            <View className="stepper">
              <View className="stepper-btn" onClick={() => decrement('ptHours')}>-</View>
              <Text className="stepper-value">{formData.ptHours}</Text>
              <View className="stepper-btn" onClick={() => increment('ptHours')}>+</View>
            </View>
          </View>
          <Text className="field-note">{fieldNotes.ptHours}</Text>

          <View className="form-row">
            <View className="form-label-wrapper">
              <Text className="form-label">私教单价</Text>
              <Text className="form-unit">¥/小时</Text>
            </View>
            <Input
              type="digit"
              value={String(formData.ptRate)}
              onInput={(e) => handleInputChange('ptRate', e.detail.value)}
              className="form-input"
              placeholder="300"
            />
          </View>
          <Text className="field-note">{fieldNotes.ptRate}</Text>
        </View>

        {/* 会员 */}
        <View className="form-section">
          <View className="section-title">👥 会员</View>
          
          <View className="form-row stepper-row">
            <View className="form-label-wrapper">
              <Text className="form-label">新会员数</Text>
              <Text className="form-unit">人</Text>
            </View>
            <View className="stepper">
              <View className="stepper-btn" onClick={() => decrement('newMembers')}>-</View>
              <Text className="stepper-value">{formData.newMembers}</Text>
              <View className="stepper-btn" onClick={() => increment('newMembers')}>+</View>
            </View>
          </View>
          <Text className="field-note">{fieldNotes.newMembers}</Text>

          <View className="form-row">
            <View className="form-label-wrapper">
              <Text className="form-label">新会员现金流入</Text>
              <Text className="form-unit">¥</Text>
            </View>
            <Input
              type="digit"
              value={String(formData.newRevenue)}
              onInput={(e) => handleInputChange('newRevenue', e.detail.value)}
              className="form-input"
              placeholder="0"
            />
          </View>
          <Text className="field-note">{fieldNotes.newRevenue}</Text>
        </View>

        {/* 其他收入 */}
        <View className="form-section">
          <View className="section-title">💵 其他收入</View>
          <View className="form-row">
            <View className="form-label-wrapper">
              <Text className="form-label">零售收入</Text>
              <Text className="form-unit">¥</Text>
            </View>
            <Input
              type="digit"
              value={String(formData.retailRevenue)}
              onInput={(e) => handleInputChange('retailRevenue', e.detail.value)}
              className="form-input"
              placeholder="0"
            />
          </View>
          <Text className="field-note">{fieldNotes.retailRevenue}</Text>

          <View className="form-row">
            <View className="form-label-wrapper">
              <Text className="form-label">其他收入</Text>
              <Text className="form-unit">¥</Text>
            </View>
            <Input
              type="digit"
              value={String(formData.otherRevenue)}
              onInput={(e) => handleInputChange('otherRevenue', e.detail.value)}
              className="form-input"
              placeholder="0"
            />
          </View>
          <Text className="field-note">{fieldNotes.otherRevenue}</Text>

          <View className="form-row">
            <View className="form-label-wrapper">
              <Text className="form-label">其他现金流入</Text>
              <Text className="form-unit">¥</Text>
            </View>
            <Input
              type="digit"
              value={String(formData.otherCashIn)}
              onInput={(e) => handleInputChange('otherCashIn', e.detail.value)}
              className="form-input"
              placeholder="0"
            />
          </View>
          <Text className="field-note">{fieldNotes.otherCashIn}</Text>
        </View>

        {/* 支出 */}
        <View className="form-section">
          <View className="section-title">💸 支出</View>
          <View className="form-row">
            <View className="form-label-wrapper">
              <Text className="form-label">营销支出</Text>
              <Text className="form-unit">¥</Text>
            </View>
            <Input
              type="digit"
              value={String(formData.marketingSpend)}
              onInput={(e) => handleInputChange('marketingSpend', e.detail.value)}
              className="form-input"
              placeholder="0"
            />
          </View>
          <Text className="field-note">{fieldNotes.marketingSpend}</Text>

          <View className="form-row">
            <View className="form-label-wrapper">
              <Text className="form-label">其他现金流出</Text>
              <Text className="form-unit">¥</Text>
            </View>
            <Input
              type="digit"
              value={String(formData.otherCashOut)}
              onInput={(e) => handleInputChange('otherCashOut', e.detail.value)}
              className="form-input"
              placeholder="0"
            />
          </View>
          <Text className="field-note">{fieldNotes.otherCashOut}</Text>
        </View>
      </View>

      <CustomTabBar />
    </View>
  )
}