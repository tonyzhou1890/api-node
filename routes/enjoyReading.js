const express = require('express')
const router = express.Router()

const { homeBannerList } = require('../model/enjoyReadingBanner')
const { tagList, accountDetail, accountLoginScore } = require('../model/enjoyReadingCommon')
const { latestList, discountList, freeList, tagBookList, searchBookList, storeBookList, shelfBookList } = require('../model/enjoyReadingBookList')
const { bookDetail, bookRecommend } = require('../model/enjoyReadingBook')
const { spaceBookList } = require('../model/enjoyReadingSpace')

/**
 * 首页 banner 列表
 */
router.post('/banner/homeList', homeBannerList)

/**
 * 标签列表
 */
router.post('/tag/list', tagList)

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
 * 空间管理书籍列表
 */
router.post('/space/book/list', spaceBookList)

module.exports = router