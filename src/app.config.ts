export default defineAppConfig({
  pages: [
    'pages/dashboard/index',
    'pages/entry/index',
    'pages/profile/index',
    'pages/settings/index',
    'pages/pl/index',
    'pages/balance/index',
    'pages/cashflow/index',
    'pages/breakeven/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'FitFin 健身财务助手',
    navigationBarTextStyle: 'black'
  }
  // 不配置 tabBar，使用自定义组件
})