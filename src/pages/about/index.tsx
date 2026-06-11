import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import CustomTabBar from '../../components/CustomTabBar'
import logoUrl from '../../assets/images/logo.png'
import './index.scss'

export default function About() {
  const handleBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className="about-page">
      {/* 顶部导航栏 */}
      <View className="about-nav">
        <View className="back-btn" onClick={handleBack}>
          <Text className="back-icon">←</Text>
          <Text className="back-text">返回</Text>
        </View>
        <Text className="nav-title">关于我们</Text>
        <View className="nav-placeholder" />
      </View>

      <View className="about-content">
        {/* Logo 区域 */}
        <View className="logo-section">
          <Image className="logo-image" src={logoUrl} mode="aspectFit" />
          <Text className="logo-text">FitFin</Text>
          <Text className="logo-sub">健身财务助手</Text>
        </View>

        {/* 我们的故事 */}
        <View className="info-section">
          <Text className="section-title">📖 About FitFin</Text>
          <Text className="section-text">
            FitFin = Fitness * Finance
          </Text>
          <Text className="section-text">
            去年，我几乎每天都去的那家 CrossFit box突然关门了。
          </Text>
          <Text className="section-text">
            那里的场地和设施至今仍是我去过的最好的场馆，有我很多快乐的回忆。
            看着一份热爱被现实打败，是一件非常难过的事情。
          </Text>
          <Text className="section-text">
            我发现，很多“小生意”不会配备财务分析资源 - 专职的CFO太贵，而市面上的SaaS基本上都只展示基础财务报表，而不是一些对决策有意义的分析。
          </Text>
          <Text className="section-text">
            你知道账面现金这么多，但你知道其中有多少是预收会员款（负债），有多少是真正可以用来扩张的现金吗？
          </Text>
          <Text className="section-text">
            你知道你今天收了多少钱，但你知道里面多少能算作收入，多少扣除成本之后是多少利润，哪个课程/服务利润率最高吗？
          </Text>
          <Text className="section-text">
            FitFin 就是从这里开始的。看懂你的数字，才能做出更聪明的决策。一起守护我们的热爱。
          </Text>
        </View>

        {/* 联系我们 */}
        <View className="info-section">
          <Text className="section-title">☎️ 联系我们</Text>
          <Text className="section-text">💬 微信号 FitFin</Text>
          <Text className="section-text">📮 FitFin.official@outlook.com</Text>
          <Text className="section-text">版本号：v1.0.0</Text>
        </View>

        {/* 技术支持 */}
        <View className="info-section">
          <Text className="section-title">📄 关于数据安全</Text>
          <Text className="section-text">所有数据均存储在手机本地，不上传任何服务器。</Text>
          <Text className="section-text">你可以随时查看、修改或删除自己的数据。</Text>
          <Text className="section-text">卸载小程序会导致数据丢失，建议定期通过「数据导出」功能备份。</Text>
        </View>

        {/* 免责声明 */}
        <View className="about-disclaimer">
          <Text className="disclaimer-text">
            ⚠️ 免责声明：本小程序提供的数据分析仅供参考，不构成任何财务建议、投资建议或经营建议。决策前请咨询专业财务顾问。
          </Text>
        </View>

        {/* 版权信息 */}
        <View className="about-footer">
          <Text className="footer-text">© 2026 FitFin 健身财务助手</Text>
          <Text className="footer-sub">让每一份热爱，都能算清楚账</Text>
        </View>
      </View>

      <CustomTabBar />
    </View>
  )
}