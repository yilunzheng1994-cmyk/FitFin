import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import CustomTabBar from '../../components/CustomTabBar'
import './index.scss'

export default function Profile() {
  const handleLogin = () => {
    Taro.showToast({ title: '登录功能（开发中）', icon: 'none' })
  }

  const handlePrivacy = () => {
    Taro.showToast({ title: '隐私说明（开发中）', icon: 'none' })
  }

  const handleAbout = () => {
    Taro.showToast({ title: '关于我们（开发中）', icon: 'none' })
  }

  const handleSettings = () => {
    Taro.navigateTo({ url: '/pages/settings/index' })
  }

  return (
    <View className="profile">
      <View className="user-info" onClick={handleLogin}>
        <Text className="avatar">👤</Text>
        <Text className="nickname">点击登录</Text>
      </View>

      <View className="menu-list">
        <View className="menu-item" onClick={handlePrivacy}>
          <Text>隐私说明</Text>
        </View>
        <View className="menu-item" onClick={handleAbout}>
          <Text>关于我们</Text>
        </View>
        <View className="menu-item" onClick={handleSettings}>
          <Text>⚙️ 固定配置</Text>
        </View>
      </View>

      {/* 自定义 TabBar */}
      <CustomTabBar />
    </View>
  )
}