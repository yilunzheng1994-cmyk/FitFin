import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import './index.scss'

interface TabItem {
  pagePath: string
  text: string
  icon: string
  selectedIcon: string
}

export default function CustomTabBar() {
  const [selected, setSelected] = useState(0)

  const tabList: TabItem[] = [
    { pagePath: '/pages/dashboard/index', text: '看板', icon: '📊', selectedIcon: '📊' },
    { pagePath: '/pages/entry/index', text: '录入', icon: '✏️', selectedIcon: '✏️' },
    { pagePath: '/pages/profile/index', text: '我的', icon: '👤', selectedIcon: '👤' }
  ]

  useEffect(() => {
    const pages = Taro.getCurrentPages()
    const currentPath = '/' + pages[pages.length - 1]?.route
    const index = tabList.findIndex(item => item.pagePath === currentPath)
    if (index !== -1) {
      setSelected(index)
    }
  }, [])

  const switchTab = (index: number, pagePath: string) => {
    setSelected(index)
    // 使用 reLaunch 而不是 switchTab，确保页面跳转
    Taro.reLaunch({ url: pagePath })
  }

  return (
    <View className="custom-tabbar">
      {tabList.map((item, index) => (
        <View
          key={index}
          className={`tab-item ${selected === index ? 'active' : ''}`}
          onClick={() => switchTab(index, item.pagePath)}
        >
          <Text className="tab-icon">
            {selected === index ? item.selectedIcon : item.icon}
          </Text>
          <Text className={`tab-text ${selected === index ? 'active-text' : ''}`}>
            {item.text}
          </Text>
        </View>
      ))}
    </View>
  )
}