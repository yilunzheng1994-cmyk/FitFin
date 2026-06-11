import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import CustomTabBar from '../../components/CustomTabBar'
import './index.scss'

export default function Privacy() {
  // 返回上一页
  const handleBack = () => {
    Taro.navigateBack()
  }

  return (
    <View className="privacy-page">
      {/* 顶部导航栏 */}
      <View className="privacy-nav">
        <View className="back-btn" onClick={handleBack}>
          <Text className="back-icon">←</Text>
          <Text className="back-text">返回</Text>
        </View>
        <Text className="nav-title">隐私政策</Text>
        <View className="nav-placeholder" />
      </View>

      <View className="privacy-content">
        <View className="privacy-header">
          <Text className="privacy-title">FitFin 健身财务助手</Text>
          <Text className="privacy-update">更新日期：2026年6月10日</Text>
          <Text className="privacy-effective">生效日期：2026年6月10日</Text>
        </View>

        <View className="privacy-section">
          <Text className="section-title">引言</Text>
          <Text className="section-text">
            FitFin 健身财务助手（以下简称「本小程序」）非常重视您的隐私。
            本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的信息。
          </Text>
          <Text className="section-text">
            使用本小程序前，请您仔细阅读并充分理解本隐私政策。
          </Text>
        </View>

        <View className="privacy-section">
          <Text className="section-title">一、我们收集的信息</Text>
          <Text className="section-text">
            本小程序仅收集您主动录入的经营数据，包括但不限于：
          </Text>
          <Text className="section-text bullet">• 每日经营数据：收入、支出、课时、会员数等</Text>
          <Text className="section-text bullet">• 固定成本设置：房租、人力成本、设备折旧、装修摊销等</Text>
          <Text className="section-text bullet">• 私教设置：私教单价、佣金比例等</Text>
          <Text className="section-text bullet">• 团课设置：教练课时费等</Text>
          <Text className="section-text highlight">
            ⚠️ 我们不会收集任何个人身份信息（如姓名、手机号、身份证号等）。
          </Text>
        </View>

        <View className="privacy-section">
          <Text className="section-title">二、信息存储</Text>
          <Text className="section-text">
            所有数据均存储在您自己的手机本地（微信小程序缓存）。
          </Text>
          <Text className="section-text">
            我们不会将您的数据上传至任何服务器，也不会与任何第三方共享。
          </Text>
          <Text className="section-text highlight">
            💡 数据仅保存在您的设备上，卸载小程序会导致数据丢失。
          </Text>
        </View>

        <View className="privacy-section">
          <Text className="section-title">三、信息使用</Text>
          <Text className="section-text">
            我们使用您录入的数据仅用于以下目的：
          </Text>
          <Text className="section-text bullet">• 计算每日收入、成本和利润</Text>
          <Text className="section-text bullet">• 计算盈亏平衡点</Text>
          <Text className="section-text bullet">• 计算获客成本（CAC）</Text>
          <Text className="section-text bullet">• 生成现金流量表</Text>
          <Text className="section-text bullet">• 提供数据趋势图表</Text>
        </View>

        <View className="privacy-section">
          <Text className="section-title">四、数据安全</Text>
          <Text className="section-text">
            由于数据仅存储在您的手机本地，数据安全由您自行负责。
            我们建议您：
          </Text>
          <Text className="section-text bullet">• 定期备份重要数据</Text>
          <Text className="section-text bullet">• 不要将手机借给他人使用</Text>
          <Text className="section-text bullet">• 卸载小程序前请确认数据已导出</Text>
        </View>

        <View className="privacy-section">
          <Text className="section-title">五、您的权利</Text>
          <Text className="section-text">
            您可以随时在小程序内：
          </Text>
          <Text className="section-text bullet">• 查看所有录入的数据</Text>
          <Text className="section-text bullet">• 修改已录入的数据</Text>
          <Text className="section-text bullet">• 删除单条或全部数据</Text>
          <Text className="section-text bullet">• 清除小程序缓存以删除所有数据</Text>
        </View>

        <View className="privacy-section">
          <Text className="section-title">六、数据导出</Text>
          <Text className="section-text">
            目前本小程序暂不支持数据导出功能。
            我们将在后续版本中提供数据导出（如Excel格式）功能，方便您备份数据。
          </Text>
        </View>

        <View className="privacy-section">
          <Text className="section-title">七、未成年人保护</Text>
          <Text className="section-text">
            本小程序仅供成年经营主理人使用。
            如您是未成年人，请在监护人指导下使用。
          </Text>
        </View>

        <View className="privacy-section">
          <Text className="section-title">八、隐私政策的更新</Text>
          <Text className="section-text">
            我们可能会适时更新本隐私政策。
            重大更新时，我们会通过小程序内弹窗或公告的方式提醒您。
          </Text>
        </View>

        <View className="privacy-section">
          <Text className="section-title">九、联系我们</Text>
          <Text className="section-text">
            如您对本隐私政策有任何疑问或建议，可通过以下方式联系我们：
          </Text>
          <Text className="section-text bullet">• 💬 微信号 FitFin 📮 FitFin.official@outlook.com</Text>
          <Text className="section-text bullet">• 小程序内「意见反馈」功能（即将上线）</Text>
        </View>

        <View className="privacy-footer">
          <Text className="footer-text">
            继续使用本小程序即表示您已阅读并同意本隐私政策。
          </Text>
          <Text className="footer-date">© 2026 FitFin 健身财务助手</Text>
        </View>
      </View>

      <CustomTabBar />
    </View>
  )
}