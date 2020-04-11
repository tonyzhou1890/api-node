const express = require('express')
const router = express.Router()

const { home, getById, authorList, poemList, getPoemsByAuthor, search } = require('../model/poem')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('诗词后端');
});

/**
 * 首页
 */
router.get('/home', home)

/**
 * 获取诗词详情
 */
router.get('/getById', getById)

/**
 * 作者列表
 */
router.get('/authorList', authorList)

/**
 * 诗词列表
 */
router.get('/poemList', poemList)

/**
 * 获取某位作者的诗词
 */
router.get('/getPoemsByAuthor', getPoemsByAuthor)

/**
 * 搜索
 */
router.get('/search', search)

module.exports = router;