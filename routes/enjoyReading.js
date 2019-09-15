const express = require('express')
const router = express.Router()

const { homeBannerList } = require('../model/enjoyReadingBanner')
const { tagList } = require('../model/enjoyReadingCommon')

/**
 * 首页 banner 列表
 */
router.post('/banner/homeList', homeBannerList)

/**
 * 标签列表
 */
router.post('/tag/list', tagList)

module.exports = router