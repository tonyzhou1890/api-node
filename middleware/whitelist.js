// 享阅路由前缀
const enjoyReadingPrefix = '/enjoyReading'

// 享阅灰名单路由
const enjoyReadingWhitelist = [
  '/banner/homeList',
  '/tag/list',
  '/latest/list',
  '/discount/list',
  '/free/list',
  '/tagBook/list',
  '/searchBook/list'
]

// 将前缀添上
enjoyReadingWhitelist.map((item, index) => {
  enjoyReadingWhitelist[index] = enjoyReadingPrefix + item
})

module.exports = {
  enjoyReadingWhitelist
}