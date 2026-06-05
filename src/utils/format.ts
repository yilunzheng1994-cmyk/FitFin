// 格式化货币（人民币，保留两位小数）
export const formatCurrency = (value: number): string => {
    if (value === undefined || value === null) return '¥0.00'
    return `¥${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  
  // 格式化数字（保留两位小数）
  export const formatNumber = (value: number): string => {
    if (value === undefined || value === null) return '0.00'
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }