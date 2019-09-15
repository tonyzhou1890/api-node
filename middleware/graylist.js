// 享阅路由前缀
const enjoyReadingPrefix = '/enjoyReading'

// 享阅灰名单路由
const enjoyReadingGraylist = [
  '/banner/homeList',
  '/tag/list',
  '/latest/list',
  '/discount/list'
]

// 将前缀添上
enjoyReadingGraylist.map((item, index) => {
  enjoyReadingGraylist[index] = enjoyReadingPrefix + item
})

module.exports = {
  enjoyReadingGraylist
}