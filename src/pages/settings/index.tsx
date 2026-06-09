import { View, Input, Button, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { getBusinessSettings, saveBusinessSettings, BusinessSettings } from '../../services/storage'
import './index.scss'

export default function Settings() {
  const [formData, setFormData] = useState<BusinessSettings>({
    monthlyRent: 5000,
    monthlyUtilities: 800,
    fixedStaffCost: 4000,
    monthlyInsurance: 200,
    classCoachRate: 100,
    ptCommissionRate: 0.35,
    equipmentValue: 30000,
    equipmentDepreciationMonths: 60,
    currency: '¥',
    defaultPtRate: 300,
    openingUnearnedRevenue: 0,
    renovationCost: 0,
    renovationYears: 5
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
        <View className="form-item"><Text className="label">固定人力成本 (¥/月)</Text><Input type="number" value={String(formData.fixedStaffCost)} onInput={(e) => setFormData({ ...formData, fixedStaffCost: Number(e.detail.value) })} className="input" /><Text className="hint">前台、行政、教练固定底薪，不随收入变动</Text></View>
        <View className="form-item"><Text className="label">月保险 (¥)</Text><Input type="number" value={String(formData.monthlyInsurance)} onInput={(e) => setFormData({ ...formData, monthlyInsurance: Number(e.detail.value) })} className="input" /></View>

        <View className="form-divider"><Text className="divider-text">变动人力成本</Text></View>
        <View className="form-item"><Text className="label">团课教练课时费 (¥/小时)</Text><Input type="number" value={String(formData.classCoachRate)} onInput={(e) => setFormData({ ...formData, classCoachRate: Number(e.detail.value) })} className="input" /><Text className="hint">每节团课支付给教练的固定费用，随团课课时变动</Text></View>
        <View className="form-item"><Text className="label">私教佣金比例 (%)</Text><Input type="number" value={String(formData.ptCommissionRate * 100)} onInput={(e) => setFormData({ ...formData, ptCommissionRate: Number(e.detail.value) / 100 })} className="input" /><Text className="hint">私教收入分成比例，随私教收入变动</Text></View>

        <View className="form-divider"><Text className="divider-text">收入设置</Text></View>
        <View className="form-item"><Text className="label">默认私教单价 (¥/小时)</Text><Input type="number" value={String(formData.defaultPtRate)} onInput={(e) => setFormData({ ...formData, defaultPtRate: Number(e.detail.value) })} className="input" /><Text className="hint">未录入私教单价时使用此默认值</Text></View>

        <View className="form-divider"><Text className="divider-text">资产折旧与摊销</Text></View>
        <View className="form-item"><Text className="label">设备价值 (¥)</Text><Input type="number" value={String(formData.equipmentValue)} onInput={(e) => setFormData({ ...formData, equipmentValue: Number(e.detail.value) })} className="input" /></View>
        <View className="form-item"><Text className="label">折旧月数</Text><Input type="number" value={String(formData.equipmentDepreciationMonths)} onInput={(e) => setFormData({ ...formData, equipmentDepreciationMonths: Number(e.detail.value) })} className="input" /></View>
        <View className="form-item"><Text className="label">装修总投入 (¥)</Text><Input type="number" value={String(formData.renovationCost)} onInput={(e) => setFormData({ ...formData, renovationCost: Number(e.detail.value) })} className="input" /><Text className="hint">开业时的装修总花费</Text></View>
        <View className="form-item"><Text className="label">摊销年限 (年)</Text><Input type="number" value={String(formData.renovationYears)} onInput={(e) => setFormData({ ...formData, renovationYears: Number(e.detail.value) })} className="input" /><Text className="hint">通常 3-5 年</Text></View>

        {/* 已删除「平均每节课人数」和「单次课人均收入」字段 */}
      </View>
      <View className="notice">
        <Text className="notice-text">⚠️ 修改以下配置后，会重新计算所有历史数据的成本和利润。</Text>
      </View>
      <Button className="submit-btn" onClick={handleSubmit}>保存配置</Button>
    </View>
  )
}