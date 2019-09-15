const express = require('express')
const router = express.Router()

const { homeBannerList } = require('../model/enjoyReadingBanner')
const { tagList } = require('../model/enjoyReadingCommon')
const { latestList, discountList } = require('../model/enjoyReadingSpecialList')

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

module.exports = router