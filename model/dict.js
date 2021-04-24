const mysql = require('mysql')
const Joi = require('joi')

const { dict } = require('../utils/database')
const { query } = require('../utils/query')
const { errorMsg } = require('../utils/utils')
const { querySchema } = require('../schema/dict')

/**
 * 查询单词（精确匹配）
 */
async function _query(req, res, next) {
  let response = {}
  let params = {}
  if (Object.keys(req.query).length) {
    params = req.query
  } else {
    params = req.body
  }
  const vali = Joi.validate(params, querySchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    let words = params.words.split(',')
    let inStr = ''
    for (let i = 0, len = words.length; i < len; i++) {
      inStr += `'${words[i]}',`
    }
    inStr = inStr.substr(0, inStr.length - 1)
    const sql = `SELECT word, phonetic, word_explain FROM 40000_words WHERE word IN (${inStr})`
    const result = await query(dict, sql)
    if (Array.isArray(result)) {
      let temp = []
      let mapList = new Map()
      // 将结果转为 map
      for (let i = 0, len = result.length; i < len; i++) {
        mapList.set(result[i].word, {
          word: result[i].word,
          phonetic: result[i].phonetic,
          explain: result[i].word_explain
        })
      }
      // 设置返回结果
      for (let i = 0, j = 0, len = words.length; i < len; i++) {
        temp.push(mapList.get(words[i]) || null)
      }
      response = errorMsg({ code: 0 })
      response.data = temp
    } else {
      response = errorMsg({ code: 2 })
    }
  }
  
  return res.send(response)
}

module.exports = {
  query: _query
}