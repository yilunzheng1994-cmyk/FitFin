import Taro from '@tarojs/taro'

export const vibrate = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    if (type === 'light') {
      Taro.vibrateShort({ type: 'light' })
    } else {
      Taro.vibrateLong()
    }
  } catch (e) {
    // 静默失败
  }
}