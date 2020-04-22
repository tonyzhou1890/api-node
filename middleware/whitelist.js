// 享阅路由前缀
const enjoyReadingPrefix = '/enjoyReading'

// 享阅白名单路由
const enjoyReadingWhitelist = [
  '/banner/homeList',
  '/tag/list',
  '/author/list',
  '/latest/list',
  '/discount/list',
  '/free/list',
  '/tagBook/list',
  '/searchBook/list',
  '/book/recommend'
]

// 将前缀添上
enjoyReadingWhitelist.map((item, index) => {
  enjoyReadingWhitelist[index] = enjoyReadingPrefix + item
})

// 诗词路由前缀
const poemPrefix = '/poem'

// 诗词白名单路由
const poemWhitelist = [
  '/home',
  '/getById',
  '/authorList',
  '/poemList',
  '/getPoemsByAuthor',
  '/search',
  '/poemListRandom',
  '/tagsByType',
  '/poemListByTag'
]

// 将前缀添上
poemWhitelist.map((item, index) => {
  poemWhitelist[index] = poemPrefix + item
})

module.exports = {
  enjoyReadingWhitelist,
  poemWhitelist
}