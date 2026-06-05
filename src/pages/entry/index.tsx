import { View, Text, Input, Picker } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { quickSaveField, getLatestDate, getDailyEntries } from '../../services/storage'
import { formatCurrency } from '../../utils/format'
import emitter from '../../utils/eventBus'
import CustomTabBar from '../../components/CustomTabBar'
import './index.scss'

export default function Entry() {
  const [showModal, setShowModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedField, setSelectedField] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterField, setFilterField] = useState('')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [records, setRecords] = useState<Array<{ date: string; field: string; value: number }>>([])

  const groups = [
    { key: 'cash', label: '💰 现金', fields: [{ key: 'cashBalanceStart', label: '期初现金', unit: '¥' }] },
    { key: 'class', label: '🏋️ 团课', fields: [
      { key: 'classCount', label: '团课节数', unit: '节' },
      { key: 'avgClassSize', label: '平均每节课人数', unit: '人' },
      { key: 'avgRevenuePerMember', label: '单次课人均收入', unit: '¥' }
    ]},
    { key: 'member', label: '👥 会员', fields: [
      { key: 'newMembers', label: '新会员数', unit: '人' },
      { key: 'newRevenue', label: '新会员收入', unit: '¥' },
      { key: 'memberCount', label: '当日会员数', unit: '人' }
    ]},
    { key: 'pt', label: '💪 私教', fields: [
      { key: 'ptHours', label: '私教课时', unit: '小时' },
      { key: 'ptRate', label: '私教单价', unit: '¥/小时' },
      { key: 'ptRevenue', label: '私教收入', unit: '¥' }
    ]},
    { key: 'revenue', label: '💰 收入', fields: [
      { key: 'retailRevenue', label: '零售收入', unit: '¥' },
      { key: 'otherRevenue', label: '其他收入', unit: '¥' }
    ]},
    { key: 'expense', label: '💸 支出', fields: [
      { key: 'marketingSpend', label: '营销支出', unit: '¥' },
      { key: 'variableStaffCost', label: '变动人力成本', unit: '¥' }
    ]}
  ]

  const allFields = groups.flatMap(g => g.fields)
  const fieldLabels: Record<string, string> = {}
  const fieldUnits: Record<string, string> = {}
  allFields.forEach(f => {
    fieldLabels[f.key] = f.label
    fieldUnits[f.key] = f.unit
  })

  const loadRecords = () => {
    const entries = getDailyEntries()
    const dates = Object.keys(entries).sort().reverse()
    setAvailableDates(dates)
    
    const recordList: Array<{ date: string; field: string; value: number }> = []
    Object.entries(entries).forEach(([date, data]) => {
      if (filterDate && date !== filterDate) return
      allFields.forEach(field => {
        if (filterField && field.key !== filterField) return
        const value = data[field.key as keyof typeof data] as number
        if (value !== undefined && value !== 0) {
          recordList.push({ date, field: field.key, value })
        }
      })
    })
    recordList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setRecords(recordList)
  }

  useEffect(() => {
    loadRecords()
  }, [filterDate, filterField])

  useEffect(() => {
    loadRecords()
    emitter.on('data-updated', loadRecords)
    return () => emitter.off('data-updated', loadRecords)
  }, [])

  const openQuickEntry = () => {
    const latestDate = getLatestDate()
    setSelectedDate(latestDate || new Date().toISOString().split('T')[0])
    setSelectedGroup('')
    setSelectedField('')
    setInputValue('')
    setShowModal(true)
  }

  const handleSave = () => {
    if (!selectedField || !inputValue) {
      Taro.showToast({ title: '请选择字段并输入数值', icon: 'none' })
      return
    }
    quickSaveField(selectedDate, selectedField as any, Number(inputValue))
    Taro.showToast({ title: '保存成功', icon: 'success' })
    setShowModal(false)
    setSelectedGroup('')
    setSelectedField('')
    setInputValue('')
    loadRecords()
    emitter.emit('data-updated')
  }

  const handleEdit = (date: string, field: string, currentValue: number) => {
    Taro.showModal({
      title: '修改数值',
      content: `${fieldLabels[field]} 当前值为 ${currentValue}`,
      editable: true,
      placeholderText: '请输入新数值',
      success: (res) => {
        if (res.confirm && res.content) {
          const newValue = Number(res.content)
          if (!isNaN(newValue)) {
            const entries = getDailyEntries()
            if (entries[date]) {
              entries[date][field as keyof typeof entries[typeof date]] = newValue
              entries[date].updatedAt = Date.now()
              Taro.setStorageSync('daily_entries', JSON.stringify(entries))
              loadRecords()
              emitter.emit('data-updated')
              Taro.showToast({ title: '修改成功', icon: 'success' })
            }
          }
        }
      }
    })
  }

  const handleDelete = (date: string, field: string) => {
    Taro.showModal({
      title: '确认删除',
      content: `确定要删除 ${date} 的 ${fieldLabels[field]} 记录吗？`,
      success: (res) => {
        if (res.confirm) {
          const entries = getDailyEntries()
          if (entries[date]) {
            delete entries[date][field as keyof typeof entries[typeof date]]
            if (Object.keys(entries[date]).filter(k => !['date', 'createdAt', 'updatedAt'].includes(k)).length === 0) {
              delete entries[date]
            } else {
              entries[date].updatedAt = Date.now()
            }
            Taro.setStorageSync('daily_entries', JSON.stringify(entries))
            loadRecords()
            emitter.emit('data-updated')
            Taro.showToast({ title: '删除成功', icon: 'success' })
          }
        }
      }
    })
  }

  const handleSettings = () => Taro.navigateTo({ url: '/pages/settings/index' })
  const handleClearFilters = () => { setFilterDate(''); setFilterField('') }
  
  const formatValue = (field: string, value: number) => {
    const unit = fieldUnits[field] || ''
    if (unit === '¥') return formatCurrency(value)
    if (unit === '¥/小时') return `¥${value.toFixed(2)}/小时`
    return `${value}${unit}`
  }

  const currentGroupFields = groups.find(g => g.key === selectedGroup)?.fields || []
  const hasFilters = filterDate || filterField
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const [filterYear, setFilterYear] = useState(currentYear)
  const [filterMonth, setFilterMonth] = useState(1)
  const [filterDay, setFilterDay] = useState(1)
  
  useEffect(() => {
    if (filterDate) {
      const parts = filterDate.split('-')
      if (parts.length === 3) {
        setFilterYear(parseInt(parts[0]))
        setFilterMonth(parseInt(parts[1]))
        setFilterDay(parseInt(parts[2]))
      }
    }
  }, [filterDate])

  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate()
  const days = Array.from({ length: getDaysInMonth(filterYear, filterMonth) }, (_, i) => i + 1)
  const handleDateConfirm = () => setFilterDate(`${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(filterDay).padStart(2, '0')}`)

  return (
    <View className="entry">
      <View className="quick-entry" onClick={openQuickEntry}>
        <Text className="quick-icon">+</Text>
        <Text className="quick-text">快捷录入</Text>
      </View>
      <View className="settings" onClick={handleSettings}>
        <Text className="settings-icon">⚙️</Text>
        <Text className="settings-text">固定配置</Text>
      </View>

      <View className="records-section">
        <View className="records-header">
          <Text className="records-title">录入记录</Text>
          <View className="filter-buttons">
            <Picker mode="multiSelector" range={[years.map(y => `${y}年`), months.map(m => `${m}月`), days.map(d => `${d}日`)]} value={[years.indexOf(filterYear), filterMonth - 1, filterDay - 1]} onChange={(e) => { const [yearIdx, monthIdx, dayIdx] = e.detail.value; setFilterYear(years[yearIdx]); setFilterMonth(monthIdx + 1); setFilterDay(dayIdx + 1); handleDateConfirm() }}>
              <View className={`filter-btn ${filterDate ? 'active' : ''}`}><Text className="filter-icon">📅</Text><Text className="filter-text">{filterDate || '日期'}</Text></View>
            </Picker>
            <Picker mode="selector" range={allFields.map(f => f.label)} onChange={(e) => setFilterField(allFields[e.detail.value].key)}>
              <View className={`filter-btn ${filterField ? 'active' : ''}`}><Text className="filter-icon">🏷️</Text><Text className="filter-text">{filterField ? fieldLabels[filterField] : '字段'}</Text></View>
            </Picker>
            {hasFilters && <View className="filter-clear" onClick={handleClearFilters}><Text className="clear-text">清除</Text></View>}
          </View>
        </View>
        {records.length === 0 ? (
          <View className="records-empty"><Text>{hasFilters ? '没有符合条件的记录' : '暂无记录，点击上方按钮录入数据'}</Text></View>
        ) : (
          <View className="records-list">
            {records.map((record, index) => (
              <View key={index} className="record-item">
                <View className="record-info">
                  <Text className="record-date">{record.date}</Text>
                  <Text className="record-field">{fieldLabels[record.field]}</Text>
                  <Text className="record-value">{formatValue(record.field, record.value)}</Text>
                </View>
                <View className="record-actions">
                  <Text className="record-edit" onClick={() => handleEdit(record.date, record.field, record.value)}>修改</Text>
                  <Text className="record-delete" onClick={() => handleDelete(record.date, record.field)}>删除</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {showModal && (
        <View className="modal-mask" onClick={() => setShowModal(false)}>
          <View className="modal-container" onClick={(e) => e.stopPropagation()}>
            <Text className="modal-title">快捷录入</Text>
            <View className="modal-field"><Text className="modal-label">日期</Text><Picker mode="date" value={selectedDate} start="2020-01-01" end="2030-12-31" onChange={(e) => setSelectedDate(e.detail.value)}><View className="modal-picker">{selectedDate || '请选择日期'}</View></Picker></View>
            <View className="modal-field"><Text className="modal-label">分类</Text><Picker mode="selector" range={groups.map(g => g.label)} onChange={(e) => { setSelectedGroup(groups[e.detail.value].key); setSelectedField('') }}><View className="modal-picker">{selectedGroup ? groups.find(g => g.key === selectedGroup)?.label : '请选择分类'}</View></Picker></View>
            {selectedGroup && <View className="modal-field"><Text className="modal-label">字段</Text><Picker mode="selector" range={currentGroupFields.map(f => `${f.label} (${f.unit})`)} onChange={(e) => setSelectedField(currentGroupFields[e.detail.value].key)}><View className="modal-picker">{selectedField ? currentGroupFields.find(f => f.key === selectedField)?.label : '请选择字段'}</View></Picker></View>}
            {selectedField && <View className="modal-field"><Text className="modal-label">数值</Text><Input type="number" value={inputValue} onInput={(e) => setInputValue(e.detail.value)} placeholder="请输入数值" className="modal-input" /></View>}
            <View className="modal-buttons"><View className="modal-btn cancel" onClick={() => setShowModal(false)}>取消</View><View className="modal-btn confirm" onClick={handleSave}>保存</View></View>
          </View>
        </View>
      )}

      <CustomTabBar />
    </View>
  )
}