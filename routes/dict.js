const express = require('express')
const router = express.Router()

const { query } = require('../model/dict')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('词典后端');
});

/**
 * 查询单词
 */
router.get('/query', query)
router.post('/query', query)

module.exports = router;