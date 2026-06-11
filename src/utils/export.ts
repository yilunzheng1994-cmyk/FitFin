import Taro from '@tarojs/taro'

// 导出数据为 CSV 文件
export const exportToCSV = (data: any[], filename: string = 'export') => {
  if (!data || data.length === 0) {
    Taro.showToast({ title: '暂无数据可导出', icon: 'none' })
    return
  }

  // 获取所有列名
  const headers = Object.keys(data[0])
  
  // 构建 CSV 内容
  const csvRows = []
  csvRows.push(headers.join(','))
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] !== undefined ? row[header] : ''
      // 处理包含逗号或换行的内容
      if (typeof value === 'string' && (value.includes(',') || value.includes('\n'))) {
        return `"${value}"`
      }
      return value
    })
    csvRows.push(values.join(','))
  }
  
  const csvContent = csvRows.join('\n')
  
  // 在微信小程序中保存文件
  const filePath = `${Taro.env.USER_DATA_PATH}/${filename}.csv`
  const fs = Taro.getFileSystemManager()
  
  fs.writeFile({
    filePath,
    data: csvContent,
    encoding: 'utf8',
    success: () => {
      // 使用 openDocument 代替 shareFile
      Taro.openDocument({
        filePath: filePath,
        success: () => {
          Taro.showToast({ title: '导出成功', icon: 'success' })
        },
        fail: () => {
          // 如果 openDocument 失败，提示文件位置
          Taro.showModal({
            title: '导出成功',
            content: `文件已保存到临时目录，路径：${filePath}`,
            showCancel: false
          })
        }
      })
    },
    fail: (err) => {
      console.error('写入失败:', err)
      Taro.showToast({ title: '导出失败', icon: 'none' })
    }
  })
}

// 导出每日数据
export const exportDailyEntries = () => {
  const entries = Taro.getStorageSync('daily_entries')
  if (!entries) {
    Taro.showToast({ title: '暂无数据', icon: 'none' })
    return
  }
  
  const parsed = typeof entries === 'string' ? JSON.parse(entries) : entries
  const dataList = Object.values(parsed)
  
  if (dataList.length === 0) {
    Taro.showToast({ title: '暂无数据', icon: 'none' })
    return
  }
  
  exportToCSV(dataList, `finance_data_${new Date().toISOString().slice(0, 10)}`)
}

// 导出业务配置
export const exportSettings = () => {
  const settings = Taro.getStorageSync('business_settings')
  if (!settings) {
    Taro.showToast({ title: '暂无配置数据', icon: 'none' })
    return
  }
  
  const parsed = typeof settings === 'string' ? JSON.parse(settings) : settings
  exportToCSV([parsed], `settings_${new Date().toISOString().slice(0, 10)}`)
}