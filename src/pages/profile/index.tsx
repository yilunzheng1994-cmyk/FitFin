import { View, Text } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import CustomTabBar from '../../components/CustomTabBar'
import { exportDailyEntries, exportSettings } from '../../utils/export'
import { vibrate } from '../../utils/vibrate'
import './index.scss'

export default function Profile() {
  const [isLogin, setIsLogin] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    const loginStatus = Taro.getStorageSync('isLogin')
    const info = Taro.getStorageSync('userInfo')
    setIsLogin(!!loginStatus)
    setUserInfo(info)
  }, [])

  const handleLogin = () => {
    setShowLoginModal(true)
  }

  const handleConfirmLogin = () => {
    Taro.setStorageSync('isLogin', 'true')
    Taro.setStorageSync('userInfo', {
      nickName: '健身馆主',
      avatarUrl: ''
    })
    setIsLogin(true)
    setUserInfo({ nickName: '健身馆主' })
    setShowLoginModal(false)
    vibrate('light')
    Taro.showToast({ title: '登录成功', icon: 'success' })
  }

  const handleLogout = () => {
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('isLogin')
          Taro.removeStorageSync('userInfo')
          setIsLogin(false)
          setUserInfo(null)
          vibrate('light')
          Taro.showToast({ title: '已退出', icon: 'success' })
        }
      }
    })
  }

  const handlePrivacy = () => {
    vibrate('light')
    Taro.showToast({ title: '隐私说明（开发中）', icon: 'none' })
  }

  const handleAbout = () => {
    vibrate('light')
    Taro.showToast({ title: '关于我们（开发中）', icon: 'none' })
  }

  const handleSettings = () => {
    vibrate('light')
    Taro.navigateTo({ url: '/pages/settings/index' })
  }

  const handleExportData = () => {
    vibrate('light')
    Taro.showActionSheet({
      itemList: ['导出每日数据', '导出配置数据'],
      success: (res) => {
        if (res.tapIndex === 0) {
          exportDailyEntries()
        } else {
          exportSettings()
        }
      }
    })
  }

  return (
    <View className="profile">
      <View className="user-info" onClick={isLogin ? undefined : handleLogin}>
        {isLogin ? (
          <>
            <Text className="avatar">👤</Text>
            <View>
              <Text className="nickname">{userInfo?.nickName || '健身馆主'}</Text>
              <Text className="logout-btn" onClick={handleLogout}>退出登录</Text>
            </View>
          </>
        ) : (
          <>
            <Text className="avatar">👤</Text>
            <Text className="nickname">点击登录</Text>
          </>
        )}
      </View>

      <View className="menu-list">
        <View className="menu-item" onClick={handleExportData}>
          <Text>📤 数据导出</Text>
        </View>
        <View className="menu-item" onClick={handlePrivacy}>
          <Text>隐私说明</Text>
        </View>
        <View className="menu-item" onClick={handleAbout}>
          <Text>ℹ️ 关于我们</Text>
        </View>
        <View className="menu-item" onClick={handleSettings}>
          <Text>⚙️ 固定配置</Text>
        </View>
      </View>

      {/* 底部弹窗登录 */}
      {showLoginModal && (
        <View className="modal-mask" onClick={() => setShowLoginModal(false)}>
          <View className="login-modal" onClick={(e) => e.stopPropagation()}>
            <View className="modal-header">
              <Text className="modal-title">登录</Text>
              <Text className="modal-close" onClick={() => setShowLoginModal(false)}>✕</Text>
            </View>
            <View className="modal-body">
              <View className="logo-area">
                <Text className="logo-icon">🏋️</Text>
                <Text className="logo-text">FitFin</Text>
              </View>
              <View className="login-btn" onClick={handleConfirmLogin}>
                微信一键登录
              </View>
              <Text className="guest-btn" onClick={() => setShowLoginModal(false)}>
                暂不登录，先体验
              </Text>
            </View>
          </View>
        </View>
      )}

      <CustomTabBar />
    </View>
  )
}