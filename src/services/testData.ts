import { DailyEntry, BusinessSettings } from './storage'

export const getTestBusinessSettings = (): BusinessSettings => {
  return {
    monthlyRent: 12000,
    monthlyUtilities: 1500,
    fixedStaffCost: 8000,
    monthlyInsurance: 500,
    monthlyMarketingBudget: 2000,
    equipmentValue: 80000,
    equipmentDepreciationMonths: 60,
    renovationCost: 120000,
    renovationYears: 5,
    defaultPtRate: 300,  // 默认私教单价 300元/小时
    ptCommissionRate: 0.35,
    classCoachRate: 100,
    openingUnearnedRevenue: 15000,
    currency: '¥'
  }
}

export const getTestDailyEntries = (): Record<string, DailyEntry> => {
  const now = Date.now()
  return {
    '2024-01-15': {
      date: '2024-01-15',
      cashBalanceStart: 35000,
      classCount: 5,
      avgClassSize: 7,
      avgRevenuePerMember: 18,
      ptHours: 6,
      ptRate: 300,
      ptRevenue: 0,
      newMembers: 2,
      newRevenue: 2400,
      retailRevenue: 320,
      otherRevenue: 0,
      marketingSpend: 150,
      otherCashOut: 0,
      classHours: 5,
      otherCashIn: 0,
      createdAt: now,
      updatedAt: now
    },
    '2024-01-16': {
      date: '2024-01-16',
      cashBalanceStart: 37570,
      classCount: 6,
      avgClassSize: 8,
      avgRevenuePerMember: 18,
      ptHours: 5,
      ptRate: 300,
      ptRevenue: 0,
      newMembers: 1,
      newRevenue: 1200,
      retailRevenue: 280,
      otherRevenue: 0,
      marketingSpend: 100,
      otherCashOut: 0,
      classHours: 6,
      otherCashIn: 0,
      createdAt: now,
      updatedAt: now
    },
    '2024-01-17': {
      date: '2024-01-17',
      cashBalanceStart: 38950,
      classCount: 7,
      avgClassSize: 9,
      avgRevenuePerMember: 19,
      ptHours: 8,
      ptRate: 350,
      ptRevenue: 0,
      newMembers: 5,
      newRevenue: 6000,
      retailRevenue: 450,
      otherRevenue: 0,
      marketingSpend: 800,
      otherCashOut: 0,
      classHours: 7,
      otherCashIn: 0,
      createdAt: now,
      updatedAt: now
    },
    '2024-01-18': {
      date: '2024-01-18',
      cashBalanceStart: 44600,
      classCount: 5,
      avgClassSize: 7,
      avgRevenuePerMember: 18,
      ptHours: 12,
      ptRate: 400,
      ptRevenue: 0,
      newMembers: 2,
      newRevenue: 2400,
      retailRevenue: 300,
      otherRevenue: 0,
      marketingSpend: 120,
      otherCashOut: 0,
      classHours: 5,
      otherCashIn: 0,
      createdAt: now,
      updatedAt: now
    }
  }
}