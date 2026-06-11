export default defineAppConfig({
  pages: [
    'pages/dashboard/index',
    'pages/entry/index',
    'pages/profile/index',
    'pages/settings/index',
    'pages/pl/index',
    'pages/cashflow/index',
    'pages/breakeven/index',
    'pages/cashflowAnalysis/index',
    'pages/privacy/index',
    'pages/about/index',
    'pages/terms/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'FitFin 健身财务助手',
    navigationBarTextStyle: 'black'
  },
  lazyCodeLoading: 'requiredComponents',
  style: 'v2'
})