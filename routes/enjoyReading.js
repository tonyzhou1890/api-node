const express = require('express')
const router = express.Router()

const { homeBannerList } = require('../model/enjoyReadingBanner')
const { tagList, authorList, accountDetail, accountLoginScore } = require('../model/enjoyReadingCommon')
const { latestList, discountList, freeList, tagBookList, searchBookList, storeBookList, shelfBookList } = require('../model/enjoyReadingBookList')
const { bookDetail, bookRecommend, readingInfoUpdate, readingInfo } = require('../model/enjoyReadingBook')
const { spaceBookList, spaceBookCreateOrUpdate, spaceBookDelete, spaceBookUse } = require('../model/enjoyReadingSpace')
const { shoppingCartList, shoppingCartAdd, shoppingCartSubtract, shoppingCartSettle } = require('../model/enjoyReadingShoppingCart')

/**
 * 首页 banner 列表
 */
router.post('/banner/homeList', homeBannerList)

/**
 * 标签列表
 */
router.post('/tag/list', tagList)

/**
 * 作者列表
 */
router.post('/author/list', authorList)

/**
 * 最新上架列表
 */
router.post('/latest/list', latestList)

/**
 * 打折书籍列表
 */
router.post('/discount/list', discountList)

/**
 * 免费书籍列表
 */
router.post('/free/list', freeList)

/**
 * 标签书籍列表
 */
router.post('/tagBook/list', tagBookList)

/**
 * 搜索书籍列表
 */
router.post('/searchBook/list', searchBookList)

/**
 * 书库书籍列表
 */
router.post('/account/storeBookList', storeBookList)

/**
 * 书架书籍列表
 */
router.post('/account/shelfBookList', shelfBookList)

/**
 * 获取用户信息
 */
router.post('/account/detail', accountDetail)

/**
 * 享阅登录积分奖励
 */
router.post('/account/loginScore', accountLoginScore)

/**
 * 书籍详情
 */
router.post('/book/detail', bookDetail)

/**
 * 书籍推荐
 */
router.post('/book/recommend', bookRecommend)

/**
 * 书籍阅读信息更新
 */
router.post('/book/readingInfoUpdate', readingInfoUpdate)

/**
 * 书籍阅读信息
 */
router.post('/book/readingInfo', readingInfo)

/**
 * 空间管理书籍列表
 */
router.post('/space/book/list', spaceBookList)

/**
 * 空间管理书籍新增/编辑
 */
router.post('/space/book/createOrUpdate', spaceBookCreateOrUpdate)

/**
 * 空间管理书籍删除
 */
router.post('/space/book/delete', spaceBookDelete)

/**
 * 空间管理书籍启用
 */
router.post('/space/book/use', spaceBookUse)

/**
 * 购物车列表
 */
router.post('/shoppingCart/list', shoppingCartList)

/**
 * 购物车新增
 */
router.post('/shoppingCart/add', shoppingCartAdd)

/**
 * 购物车移除
 */
router.post('/shoppingCart/subtract', shoppingCartSubtract)

/**
 * 购物车结算
 */
router.post('/shoppingCart/settle', shoppingCartSettle)

module.exports = router