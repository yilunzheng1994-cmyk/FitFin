import Taro from '@tarojs/taro'

export interface DailyEntry {
  date: string;
  // 现金类
  cashBalanceStart?: number;
  // 团课类
  classCount?: number;
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
  variableStaffCost?: number;
  createdAt: number;
  updatedAt: number;
}

export interface BusinessSettings {
  monthlyRent: number;
  monthlyUtilities: number;
  monthlyFixedStaffCost: number;
  monthlyInsurance: number;
  monthlyMarketing: number;
  ptCommissionRate: number;
  equipmentValue: number;
  equipmentDepreciationMonths: number;
  currency: string;
  defaultPtRate: number;
  avgClassSize: number;
  avgClassRevenuePerMember: number;
  openingUnearnedRevenue: number;
}

const STORAGE_KEYS = {
  DAILY_ENTRIES: 'daily_entries',
  BUSINESS_SETTINGS: 'business_settings'
}

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

const DEFAULT_SETTINGS: BusinessSettings = {
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
}

export const getBusinessSettings = (): BusinessSettings => {
  const data = Taro.getStorageSync(STORAGE_KEYS.BUSINESS_SETTINGS)
  if (!data) {
    saveBusinessSettings(DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS
  }
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data)
      return {
        ...DEFAULT_SETTINGS,
        ...parsed
      }
    } catch (e) {
      return DEFAULT_SETTINGS
    }
  }
  return data
}

export const saveBusinessSettings = (settings: BusinessSettings) => {
  Taro.setStorageSync(STORAGE_KEYS.BUSINESS_SETTINGS, JSON.stringify(settings))
}