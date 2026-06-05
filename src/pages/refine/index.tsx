import { View, Input, Button, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import './index.scss'

export default function Refine() {
  const [formData, setFormData] = useState({
    ptRevenue: '',
    ptHours: '',
    retailRevenue: '',
    otherRevenue: ''
  })

  // 加载已保存的数据
  useEffect(() => {
    const stored = Taro.getStorageSync('finance_data')
    if (stored) {
      setFormData({
        ptRevenue: stored.ptRevenue || '',
        ptHours: stored.ptHours || '',
        retailRevenue: stored.retailRevenue || '',
        otherRevenue: stored.otherRevenue || ''
      })
    }
  }, [])

  const handleSubmit = () => {
    // 读取已有的基础数据
    const existing = Taro.getStorageSync('finance_data') || {}
    
    // 合并细化数据
    const updatedData = {
      ...existing,
      ptRevenue: Number(formData.ptRevenue) || 0,
      ptHours: Number(formData.ptHours) || 0,
      retailRevenue: Number(formData.retailRevenue) || 0,
      otherRevenue: Number(formData.otherRevenue) || 0
    }

    Taro.setStorageSync('finance_data', updatedData)

    Taro.showToast({
      title: '保存成功',
      icon: 'success'
    })

    setTimeout(() => {
      Taro.navigateBack()
    }, 1500)
  }

  return (
    <View className="refine">
      <View className="desc">
        <Text>补充更多数据，让财务分析更精准</Text>
      </View>

      <View className="form">
        {[
          { label: '私教收入 ($/月)', key: 'ptRevenue', placeholder: '例如: 3000' },
          { label: '私教课时数 (小时/月)', key: 'ptHours', placeholder: '例如: 40' },
          { label: '零售收入 ($/月)', key: 'retailRevenue', placeholder: '例如: 1000' },
          { label: '其他收入 ($/月)', key: 'otherRevenue', placeholder: '例如: 500' }
        ].map(field => (
          <View key={field.key} className="form-item">
            <Text className="label">{field.label}</Text>
            <Input
              type="number"
              placeholder={field.placeholder}
              value={formData[field.key]}
              onInput={(e) => setFormData({ ...formData, [field.key]: e.detail.value })}
              className="input"
            />
          </View>
        ))}
      </View>

      <Button className="submit-btn" onClick={handleSubmit}>
        保存细化数据
      </Button>
    </View>
  )
}