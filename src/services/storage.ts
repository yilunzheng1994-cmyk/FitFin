import Taro from '@tarojs/taro'
import { getTestBusinessSettings, getTestDailyEntries } from './testData'

export interface DailyEntry {
  date: string;
  // 现金类
  cashBalanceStart?: number;
  // 其他现金
  otherCashIn?: number;
  otherCashOut?: number;
  // 团课类
  classCount?: number;
  classHours?: number;           // 团课总课时（用于计算团课教练费）
  avgClassSize?: number;
  avgRevenuePerMember?: number;
  // 会员类
  newMembers?: number;
  newRevenue?: number;
  memberCount?: number;
  // 私教类
  ptHours?: number;
  ptRate?: number;
  ptRevenue?: number;
  // 收入类
  retailRevenue?: number;
  otherRevenue?: number;
  // 支出类
  marketingSpend?: number;
  // 时间戳
  createdAt: number;
  updatedAt: number;
}

export interface BusinessSettings {
  monthlyRent: number;
  monthlyUtilities: number;
  fixedStaffCost: number;        // 固定人力成本（底薪）
  monthlyInsurance: number;
  monthlyMarketingBudget?: number; // 月营销预算
  classCoachRate: number;        // 团课教练课时费（元/小时）
  ptCommissionRate: number;      // 私教佣金比例（%）
  equipmentValue: number;
  equipmentDepreciationMonths: number;
  currency: string;
  defaultPtRate: number;
  openingUnearnedRevenue: number;
  renovationCost: number;
  renovationYears: number;
}

const STORAGE_KEYS = {
  DAILY_ENTRIES: 'daily_entries',
  BUSINESS_SETTINGS: 'business_settings'
}

// ========== 每日数据操作 ==========
export const getDailyEntries = (): Record<string, DailyEntry> => {
  const data = Taro.getStorageSync(STORAGE_KEYS.DAILY_ENTRIES)
  if (!data) return {}
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (e) {
      console.error('解析数据失败:', e)
      return {}
    }
  }
  return data
}

export const saveDailyEntries = (entries: Record<string, DailyEntry>) => {
  Taro.setStorageSync(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(entries))
}

export const getDailyEntryByDate = (date: string): DailyEntry | null => {
  const entries = getDailyEntries()
  return entries[date] || null
}

export const saveDailyEntry = (entry: DailyEntry) => {
  const entries = getDailyEntries()
  const existing = entries[entry.date] || {}
  entries[entry.date] = {
    ...existing,
    ...entry,
    date: entry.date,
    createdAt: existing.createdAt || Date.now(),
    updatedAt: Date.now()
  }
  saveDailyEntries(entries)
}

export const quickSaveField = (date: string, field: keyof DailyEntry, value: number) => {
  const existing = getDailyEntryByDate(date) || {
    date,
    createdAt: Date.now(),
    updatedAt: Date.now()
  } as DailyEntry
  
  const updated = {
    ...existing,
    [field]: value,
    updatedAt: Date.now()
  }
  
  saveDailyEntry(updated)
}

export const getLatestDate = (): string | null => {
  const entries = getDailyEntries()
  const dates = Object.keys(entries).sort()
  return dates.length > 0 ? dates[dates.length - 1] : null
}

export const getLatestEntry = (): DailyEntry | null => {
  const latestDate = getLatestDate()
  if (!latestDate) return null
  return getDailyEntryByDate(latestDate)
}

export const getRecentEntries = (days: number = 7): DailyEntry[] => {
  const entries = getDailyEntries()
  const dates = Object.keys(entries).sort().slice(-days)
  return dates.map(date => entries[date])
}

// ========== 默认设置（已删除 avgClassSize 和 avgClassRevenuePerMember）==========
const DEFAULT_SETTINGS: BusinessSettings = {
  monthlyRent: 5000,
  monthlyUtilities: 800,
  fixedStaffCost: 4000,
  monthlyInsurance: 200,
  monthlyMarketingBudget: 2000,
  classCoachRate: 100,
  ptCommissionRate: 0.35,
  equipmentValue: 30000,
  equipmentDepreciationMonths: 60,
  currency: '¥',
  defaultPtRate: 300,  // 默认私教单价 300元/小时
  openingUnearnedRevenue: 0,
  renovationCost: 0,
  renovationYears: 5
}

// ========== 业务设置操作 ==========
export const getBusinessSettings = (): BusinessSettings => {
  const data = Taro.getStorageSync(STORAGE_KEYS.BUSINESS_SETTINGS)
  if (!data) {
    saveBusinessSettings(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      // 清理旧数据中的废弃字段
      delete parsed.avgClassSize
      delete parsed.avgClassRevenuePerMember
      return {
        ...DEFAULT_SETTINGS,
        ...parsed
      }
    } catch (e) {
      return DEFAULT_SETTINGS
    }
  }
  // 清理旧数据中的废弃字段
  const cleaned = { ...data }
  delete cleaned.avgClassSize
  delete cleaned.avgClassRevenuePerMember
  return {
    ...DEFAULT_SETTINGS,
    ...cleaned
  }
}

export const saveBusinessSettings = (settings: BusinessSettings) => {
  // 确保不保存废弃字段
  const toSave = { ...settings }
  delete (toSave as any).avgClassSize
  delete (toSave as any).avgClassRevenuePerMember
  Taro.setStorageSync(STORAGE_KEYS.BUSINESS_SETTINGS, JSON.stringify(toSave))
}

// ========== 测试数据相关 ==========
// 检查是否有数据（非空）
export const hasAnyData = (): boolean => {
  const settings = getBusinessSettings()
  const entries = getDailyEntries()
  
  // 检查是否有非默认的业务设置（判断是否还是初始默认值）
  const isDefaultSettings = 
    settings.monthlyRent === DEFAULT_SETTINGS.monthlyRent &&
    settings.monthlyUtilities === DEFAULT_SETTINGS.monthlyUtilities &&
    settings.fixedStaffCost === DEFAULT_SETTINGS.fixedStaffCost &&
    settings.monthlyInsurance === DEFAULT_SETTINGS.monthlyInsurance
  
  const hasCustomSettings = !isDefaultSettings
  const hasEntries = Object.keys(entries).length > 0
  
  return hasCustomSettings || hasEntries
}

// 检查是否为空（没有任何数据）
export const isEmpty = (): boolean => {
  return !hasAnyData()
}

// 初始化测试数据（清除现有数据后加载测试数据）
export const initTestData = (): void => {
  // 清除现有数据
  Taro.removeStorageSync(STORAGE_KEYS.BUSINESS_SETTINGS)
  Taro.removeStorageSync(STORAGE_KEYS.DAILY_ENTRIES)
  
  // 加载测试数据
  const testSettings = getTestBusinessSettings()
  const testEntries = getTestDailyEntries()
  
  Taro.setStorageSync(STORAGE_KEYS.BUSINESS_SETTINGS, JSON.stringify(testSettings))
  Taro.setStorageSync(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(testEntries))
}

// 清除所有数据（清除后恢复默认空状态）
export const clearAllData = (): void => {
  Taro.removeStorageSync(STORAGE_KEYS.BUSINESS_SETTINGS)
  Taro.removeStorageSync(STORAGE_KEYS.DAILY_ENTRIES)
}

// 重置为默认设置（不清除每日数据）
export const resetToDefaultSettings = (): void => {
  saveBusinessSettings(DEFAULT_SETTINGS)
}