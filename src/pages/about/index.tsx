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
            那里的场地和设施至今仍是我去过的最好的场馆，教练也专业，氛围也不错。
            如果不是运营的问题 - 作为一个财务专业从业者，我有时候会忍不住想 - 会不会是财务效率的问题？
          </Text>
          <Text className="section-text">
            我发现，与大型连锁健身房不同，小型CF馆/瑜伽馆/普拉提馆/拳击馆/私教工作室等通常不具备配备专业财务分析的资源
            “算上房租、水电物业、资产折旧、装修摊销、教练成本，今天赚钱了吗？”“哪类课程赚钱最多？”“现在账上有多少钱，其中多少是预收会员款，多少是可用来扩张的现金？”
          </Text>
          <Text className="section-text">
            FitFin 就是从这里开始的。我用自己十多年的财务经验，做了这个小工具。
            它帮你算清每日盈亏、看懂现金流、控制获客成本，让你少一点财务焦虑，多一份精力投入热爱的事业。
          </Text>
        </View>

        {/* 核心功能 */}
        <View className="info-section">
          <Text className="section-title">✨ 核心功能</Text>
          <Text className="section-text bullet">• 每日经营数据快捷录入</Text>
          <Text className="section-text bullet">• 利润表与盈亏平衡分析</Text>
          <Text className="section-text bullet">• 现金流量表与预收账款分析</Text>
          <Text className="section-text bullet">• 获客成本（CAC）分析</Text>
          <Text className="section-text bullet">• 收入与利润趋势图表</Text>
        </View>

        {/* 开发者信息 */}
        <View className="info-section">
          <Text className="section-title">🛠️ 开发者信息</Text>
          <Text className="section-text">Elan ·中国注册会计师 · 美国注册会计师 · 大厂财务建模分析</Text>
          <Text className="section-text">意见反馈/财务咨询：微信号 FitFin / Elaine.zyl@hotmail.com</Text>
          <Text className="section-text">版本号：v1.0.0</Text>
        </View>

        {/* 技术支持 */}
        <View className="info-section">
          <Text className="section-title">📄 关于数据安全</Text>
          <Text className="section-text">所有数据均存储在手机本地，不上传任何服务器。</Text>
          <Text className="section-text">你可以随时查看、修改或删除自己的数据。</Text>
          <Text className="section-text">卸载小程序会导致数据丢失，建议定期通过「数据导出」功能备份。</Text>
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