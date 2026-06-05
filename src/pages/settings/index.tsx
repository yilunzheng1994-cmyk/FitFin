import { View, Input, Button, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getBusinessSettings, saveBusinessSettings, BusinessSettings } from '../../services/storage'
import './index.scss'

export default function Settings() {
  const [formData, setFormData] = useState<BusinessSettings>({
    monthlyRent: 5000,
    monthlyUtilities: 800,
    monthlyFixedStaffCost: 4000,
    monthlyInsurance: 200,
    monthlyMarketing: 1000,
    ptCommissionRate: 0.35,
    equipmentValue: 30000,
    equipmentDepreciationMonths: 60,
    currency: '¥',
    defaultPtRate: 80,
    avgClassSize: 8,
    avgClassRevenuePerMember: 15,
    openingUnearnedRevenue: 0
  })

  useEffect(() => {
    const settings = getBusinessSettings()
    setFormData(settings)
  }, [])

  const handleSubmit = () => {
    saveBusinessSettings(formData)
    Taro.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => Taro.navigateBack(), 1500)
  }

  return (
    <View className="settings">
      <View className="desc"><Text>设置固定成本参数，财务分析将更精准</Text></View>
      <View className="form">
        <View className="form-divider"><Text className="divider-text">初始化设置</Text></View>
        <View className="form-item"><Text className="label">期初预收账款 (¥)</Text><Input type="number" value={String(formData.openingUnearnedRevenue)} onInput={(e) => setFormData({ ...formData, openingUnearnedRevenue: Number(e.detail.value) })} className="input" /><Text className="hint">使用本系统前已收但未消耗的会员费</Text></View>

        <View className="form-divider"><Text className="divider-text">固定成本</Text></View>
        <View className="form-item"><Text className="label">月租金 (¥)</Text><Input type="number" value={String(formData.monthlyRent)} onInput={(e) => setFormData({ ...formData, monthlyRent: Number(e.detail.value) })} className="input" /></View>
        <View className="form-item"><Text className="label">月水电物业 (¥)</Text><Input type="number" value={String(formData.monthlyUtilities)} onInput={(e) => setFormData({ ...formData, monthlyUtilities: Number(e.detail.value) })} className="input" /></View>
        <View className="form-item"><Text className="label">月固定人力成本 (¥)</Text><Input type="number" value={String(formData.monthlyFixedStaffCost)} onInput={(e) => setFormData({ ...formData, monthlyFixedStaffCost: Number(e.detail.value) })} className="input" /></View>
        <View className="form-item"><Text className="label">月保险 (¥)</Text><Input type="number" value={String(formData.monthlyInsurance)} onInput={(e) => setFormData({ ...formData, monthlyInsurance: Number(e.detail.value) })} className="input" /></View>
        <View className="form-item"><Text className="label">月营销预算 (¥)</Text><Input type="number" value={String(formData.monthlyMarketing)} onInput={(e) => setFormData({ ...formData, monthlyMarketing: Number(e.detail.value) })} className="input" /></View>
        <View className="form-item"><Text className="label">私教佣金比例 (%)</Text><Input type="number" value={String(formData.ptCommissionRate * 100)} onInput={(e) => setFormData({ ...formData, ptCommissionRate: Number(e.detail.value) / 100 })} className="input" /></View>
        <View className="form-item"><Text className="label">设备价值 (¥)</Text><Input type="number" value={String(formData.equipmentValue)} onInput={(e) => setFormData({ ...formData, equipmentValue: Number(e.detail.value) })} className="input" /></View>
        <View className="form-item"><Text className="label">折旧月数</Text><Input type="number" value={String(formData.equipmentDepreciationMonths)} onInput={(e) => setFormData({ ...formData, equipmentDepreciationMonths: Number(e.detail.value) })} className="input" /></View>
        <View className="form-item"><Text className="label">默认私教单价 (¥/小时)</Text><Input type="number" value={String(formData.defaultPtRate)} onInput={(e) => setFormData({ ...formData, defaultPtRate: Number(e.detail.value) })} className="input" /><Text className="hint">未录入私教单价时使用此默认值</Text></View>

        <View className="form-divider"><Text className="divider-text">团课收入估算</Text></View>
        <View className="form-item"><Text className="label">平均每节课人数</Text><Input type="number" value={String(formData.avgClassSize)} onInput={(e) => setFormData({ ...formData, avgClassSize: Number(e.detail.value) })} className="input" /><Text className="hint">用于估算团课收入，可每日覆盖</Text></View>
        <View className="form-item"><Text className="label">单次课人均收入 (¥)</Text><Input type="number" value={String(formData.avgClassRevenuePerMember)} onInput={(e) => setFormData({ ...formData, avgClassRevenuePerMember: Number(e.detail.value) })} className="input" /><Text className="hint">每节团课每位会员带来的平均收入</Text></View>
      </View>
      <Button className="submit-btn" onClick={handleSubmit}>保存配置</Button>
    </View>
  )
}