import { View, Text, Image, Button, Input } from '@tarojs/components'
import { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import CustomTabBar from '../../components/CustomTabBar'
import { exportDailyEntries, exportSettings } from '../../utils/export'
import { vibrate } from '../../utils/vibrate'
import logoUrl from '../../assets/images/logo.png'
import './index.scss'

// 默认头像（微信官方提供的灰色默认头像）
const DEFAULT_AVATAR = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

export default function Profile() {
  const [isLogin, setIsLogin] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  // 登录流程中的临时数据
  const [tempAvatar, setTempAvatar] = useState('')
  const [tempNickname, setTempNickname] = useState('')

  useEffect(() => {
    const loginStatus = Taro.getStorageSync('isLogin')
    const info = Taro.getStorageSync('userInfo')
    setIsLogin(!!loginStatus)
    setUserInfo(info)
  }, [])

  const handleLogin = () => {
    // 重置临时数据
    setTempAvatar('')
    setTempNickname('')
    setShowLoginModal(true)
  }

  // 保存用户信息到本地
  const saveUserInfo = (nickName: string, avatarUrl: string) => {
    Taro.setStorageSync('isLogin', 'true')
    Taro.setStorageSync('userInfo', { nickName, avatarUrl })
    setIsLogin(true)
    setUserInfo({ nickName, avatarUrl })
    setShowLoginModal(false)
    vibrate('light')
    Taro.showToast({ title: '登录成功', icon: 'success' })
  }

  // 完成登录（同时使用头像和昵称）
  const handleCompleteLogin = () => {
    const finalNickname = tempNickname.trim() || '健身馆主'
    const finalAvatar = tempAvatar || DEFAULT_AVATAR
    saveUserInfo(finalNickname, finalAvatar)
  }

  // 处理头像选择（登录弹窗中）
  const handleTempChooseAvatar = (e: any) => {
    const { avatarUrl } = e.detail
    if (avatarUrl) {
      setTempAvatar(avatarUrl)
    }
  }

  // 处理昵称输入（登录弹窗中）
  const handleTempNicknameChange = (e: any) => {
    setTempNickname(e.detail.value)
  }

  // 处理头像选择（已登录状态）
  const handleChooseAvatar = (e: any) => {
    const { avatarUrl } = e.detail
    if (avatarUrl) {
      const updatedUserInfo = { ...userInfo, avatarUrl }
      Taro.setStorageSync('userInfo', updatedUserInfo)
      setUserInfo(updatedUserInfo)
      Taro.showToast({ title: '头像已更新', icon: 'success' })
    }
  }

  // 处理昵称输入（已登录状态）
  const handleNicknameChange = (e: any) => {
    const nickName = e.detail.value
    if (nickName) {
      const updatedUserInfo = { ...userInfo, nickName }
      Taro.setStorageSync('userInfo', updatedUserInfo)
      setUserInfo(updatedUserInfo)
      Taro.showToast({ title: '昵称已更新', icon: 'success' })
    }
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

  const handleAbout = () => {
    vibrate('light')
    Taro.navigateTo({ url: '/pages/about/index' })
  }

  const handlePrivacy = () => {
    vibrate('light')
    Taro.navigateTo({ url: '/pages/privacy/index' })
  }

  const handleTerms = () => {
    vibrate('light')
    Taro.navigateTo({ url: '/pages/terms/index' })
  }

  // 检查是否可以完成登录
  const canCompleteLogin = () => {
    return tempNickname.trim() !== '' || true  // 昵称可为空，会用默认值
  }

  return (
    <View className="profile">
      {/* 已登录状态 */}
      {isLogin ? (
        <>
          <View className="user-info">
            <Button
              className="avatar-btn"
              openType="chooseAvatar"
              onChooseAvatar={handleChooseAvatar}
            >
              {userInfo?.avatarUrl && userInfo.avatarUrl !== DEFAULT_AVATAR ? (
                <Image className="avatar-img" src={userInfo.avatarUrl} mode="aspectFill" />
              ) : (
                <Text className="avatar">👤</Text>
              )}
            </Button>
            <View className="user-detail">
              <Input
                className="nickname-input"
                type="nickname"
                placeholder="请输入昵称"
                value={userInfo?.nickName || ''}
                onBlur={handleNicknameChange}
              />
              <Text className="logout-btn" onClick={handleLogout}>退出登录</Text>
            </View>
          </View>
          <View className="menu-list">
            <View className="menu-item" onClick={handleSettings}>
              <Text>⚙️ 固定配置</Text>
            </View>
            <View className="menu-item" onClick={handleExportData}>
              <Text>📤 数据导出</Text>
            </View>
            <View className="menu-item" onClick={handleAbout}>
              <Text>ℹ️ 关于我们</Text>
            </View>
            <View className="menu-item" onClick={handlePrivacy}>
              <Text>📄 隐私协议</Text>
            </View>
            <View className="menu-item" onClick={handleTerms}>
              <Text>📋 用户服务协议</Text>
            </View>
          </View>
        </>
      ) : (
        /* 未登录状态 - 显示登录弹窗 */
        <>
          <View className="user-info" onClick={handleLogin}>
            <Text className="avatar">👤</Text>
            <Text className="nickname">点击登录</Text>
          </View>

          <View className="menu-list">
            <View className="menu-item" onClick={handleSettings}>
              <Text>⚙️ 固定配置</Text>
            </View>
            <View className="menu-item" onClick={handleExportData}>
              <Text>📤 数据导出</Text>
            </View>
            <View className="menu-item" onClick={handleAbout}>
              <Text>ℹ️ 关于我们</Text>
            </View>
            <View className="menu-item" onClick={handlePrivacy}>
              <Text>📄 隐私协议</Text>
            </View>
            <View className="menu-item" onClick={handleTerms}>
              <Text>📋 用户服务协议</Text>
            </View>
          </View>

          {/* 登录弹窗 */}
          {showLoginModal && (
            <View className="modal-mask" onClick={() => setShowLoginModal(false)}>
              <View className="login-modal" onClick={(e) => e.stopPropagation()}>
                <View className="modal-header">
                  <Text className="modal-title">欢迎使用 FitFin</Text>
                  <Text className="modal-close" onClick={() => setShowLoginModal(false)}>✕</Text>
                </View>
                <View className="modal-body">
                  <View className="logo-area">
                    <Image className="logo-icon-img" src={logoUrl} mode="aspectFit" />
                    <Text className="logo-text">FitFin</Text>
                    <Text className="logo-sub">健身财务助手</Text>
                  </View>

                  {/* 头像选择 */}
                  <Button
                    className="avatar-selector"
                    openType="chooseAvatar"
                    onChooseAvatar={handleTempChooseAvatar}
                  >
                    {tempAvatar ? (
                      <Image className="default-avatar" src={tempAvatar} mode="aspectFill" />
                    ) : (
                      <Image
                        className="default-avatar"
                        src={DEFAULT_AVATAR}
                        mode="aspectFill"
                      />
                    )}
                    <Text className="avatar-tip">
                      {tempAvatar ? '已选择头像，可再次点击更换' : '点击选择微信头像'}
                    </Text>
                  </Button>

                  {/* 昵称输入 */}
                  <Input
                    className="nickname-input-field"
                    type="nickname"
                    placeholder="请输入昵称（必填）"
                    value={tempNickname}
                    onInput={handleTempNicknameChange}
                  />

                  {/* 完成登录按钮 */}
                  <Button
                    className="complete-login-btn"
                    onClick={handleCompleteLogin}
                  >
                    完成登录
                  </Button>

                  <Text className="guest-btn" onClick={() => setShowLoginModal(false)}>
                    暂不登录，先体验
                  </Text>
                  <Text className="privacy-note">
                    登录即表示您同意《用户服务协议》和《隐私协议》
                  </Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}

      <CustomTabBar />
    </View>
  )
}