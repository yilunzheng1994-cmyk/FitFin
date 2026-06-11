import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import CustomTabBar from '../../components/CustomTabBar'
import './index.scss'

export default function Terms() {
  const handleBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className="terms-page">
      {/* 顶部导航栏 */}
      <View className="terms-nav">
        <View className="back-btn" onClick={handleBack}>
          <Text className="back-icon">←</Text>
          <Text className="back-text">返回</Text>
        </View>
        <Text className="nav-title">用户服务协议</Text>
        <View className="nav-placeholder" />
      </View>

      <View className="terms-content">
        <View className="terms-header">
          <Text className="terms-title">FitFin 用户服务协议</Text>
          <Text className="terms-date">更新日期：2026年6月11日</Text>
          <Text className="terms-date">生效日期：2026年6月11日</Text>
        </View>

        <View className="terms-section">
          <Text className="section-title">一、服务说明</Text>
          <Text className="section-text">
            FitFin 健身财务助手（以下简称「本小程序」）是一款专为健身行业小型工作室主理人设计的财务管理工具，提供数据录入、利润分析、盈亏平衡分析、现金流量分析等功能。
          </Text>
        </View>

        <View className="terms-section">
          <Text className="section-title">二、用户承诺</Text>
          <Text className="section-text">1. 用户应如实录入经营数据，并对数据的真实性、准确性、完整性负责。</Text>
          <Text className="section-text">2. 用户不得利用本小程序从事任何违法、违规或侵犯他人权益的活动。</Text>
          <Text className="section-text">3. 用户应妥善保管自己的手机设备，防止数据泄露。</Text>
        </View>

        <View className="terms-section">
          <Text className="section-title">三、数据存储与安全</Text>
          <Text className="section-text">
            所有数据均存储在用户手机本地（微信小程序缓存），开发者不会将用户数据上传至任何服务器，也不会与任何第三方共享。
          </Text>
          <Text className="section-text">
            用户可随时在小程序内查看、修改或删除自己的数据。卸载小程序或清除缓存会导致数据丢失，请用户自行备份。
          </Text>
        </View>

        <View className="terms-section">
          <Text className="section-title">四、免责声明</Text>
          <Text className="section-text">
            因以下原因导致的数据丢失或损失，开发者不承担责任：
          </Text>
          <Text className="section-text">• 用户卸载小程序或清除缓存</Text>
          <Text className="section-text">• 用户手机丢失、损坏或更换设备</Text>
          <Text className="section-text">• 微信平台故障或政策变更</Text>
          <Text className="section-text">• 不可抗力事件</Text>
        </View>

        <View className="terms-section">
          <Text className="section-title">五、知识产权</Text>
          <Text className="section-text">
            本小程序的代码、设计、Logo、名称等知识产权归开发者所有。未经许可，用户不得复制、修改、传播本小程序的任何部分。
          </Text>
        </View>

        <View className="terms-section">
          <Text className="section-title">六、协议修改</Text>
          <Text className="section-text">
            开发者有权根据法律法规或业务需要修改本协议。修改后的协议将在小程序内公示，若用户继续使用本小程序，视为同意修改后的协议。
          </Text>
        </View>

        <View className="terms-section">
          <Text className="section-title">七、联系我们</Text>
          <Text className="section-text">
            如您对本协议有任何疑问，可通过以下方式联系我们：
          </Text>
          <Text className="section-text">💬 微信号：FitFin</Text>
          <Text className="section-text">📮 邮箱：FitFin.official@outlook.com</Text>
        </View>

        {/* 免责声明 */}
        <View className="terms-disclaimer">
          <Text className="disclaimer-text">
            ⚠️ 免责声明：本小程序提供的数据分析仅供参考，不构成任何财务建议、投资建议或经营建议。决策前请咨询专业财务顾问。
          </Text>
        </View>

        <View className="terms-footer">
          <Text className="footer-text">继续使用本小程序即表示您已阅读并同意本协议。</Text>
          <Text className="footer-copyright">© 2026 FitFin 健身财务助手</Text>
        </View>
      </View>

      <CustomTabBar />
    </View>
  )
}