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
const poemPredix = '/poem'

// 诗词白名单路由
const poemWhitelist = [
  '/home',
  '/getById',
  '/authorList',
  '/poemList',
  '/getPoemsByAuthor',
  '/search'
]

// 将前缀添上
poemWhitelist.map((item, index) => {
  poemWhitelist[index] = poemPredix + item
})

module.exports = {
  enjoyReadingWhitelist,
  poemWhitelist
}