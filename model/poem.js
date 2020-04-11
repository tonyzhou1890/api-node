const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')
const axios = require('axios')

const { localhost } = require('../utils/setting')
const { dbOptions, poem } = require('../utils/database')
const { query, limit } = require('../utils/query')
const { errorMsg, count } = require('../utils/utils')
const { getByIdSchema, authorListSchema, poemListSchema, getPoemsByAuthorSchema, searchSchema } = require('../schema/poem')

const poemsLimit = 20
const authorsLimit = 200

/**
 * 首页
 */
async function home(req, res, next) {
  let response = {}
  const poemSql = `SELECT _id, mingcheng, zuozhe, zhaiyao FROM poem LIMIT ${limit}`
  const poemResult = await query(poem, poemSql)
  if (Array.isArray(poemResult)) {
    const authorSql = `SELECT xingming FROM author LIMIT 20`
    const authorResult = await query(poem, authorSql)
    if (Array.isArray(authorResult)) {
      response = errorMsg({ code: 0 })
      response.data = {
        poems: poemResult,
        authors: authorResult
      }
    }
  } else {
    response = errorMsg({ code: 2 })
  }
  return res.send(response)
}

/**
 * 获取诗词详情
 */
async function getById(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.query, getByIdSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const sql = `SELECT _id, mingcheng, zuozhe, yuanwen FROM poem WHERE _id = ${req.query.id}`
    const result = await query(poem, sql)
    if (Array.isArray(result)) {
      if (result.length) {
        response = errorMsg({ code: 0 })
        response.data = result[0]
      } else {
        response = errorMsg({ code: 40 })
      }
    } else {
      response = errorMsg({ code: 2 })
    }
  }
  return res.send(response)
}

/**
 * 获取作者列表
 */
async function authorList(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.query, authorListSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const params = {
      page: req.query.page || 1,
      rows: req.query.rows || authorsLimit
    }
    const start = (params.page - 1) * params.rows
    const sql = `SELECT xingming FROM author ORDER BY _id LIMIT ${start}, ${params.rows}`
    const result = await query(poem, sql)
    const total = await count(poem, 'author', '_id')
    if (Array.isArray(result) && total !== false) {
      response = errorMsg({ code: 0 })
      response.data = {
        data: result,
        total,
        limit: params.rows
      }
    } else {
      response = errorMsg({ code: 2 })
    }
  }
  return res.send(response)
}

/**
 * 获取诗词列表
 */
async function poemList(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.query, poemListSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const params = {
      page: req.query.page || 1,
      rows: req.query.rows || poemsLimit,
      author: req.query.author
    }
    const start = (params.page - 1) * params.rows
    const condition = params.author ? ` WHERE zuozhe = '${params.author}'` : ''
    const sql = `SELECT _id, mingcheng, zuozhe, zhaiyao FROM poem${condition} ORDER BY _id LIMIT ${start}, ${params.rows}`
    const result = await query(poem, sql)
    const total = await count(poem, 'poem', '_id', condition)
    if (Array.isArray(result) && total !== false) {
      response = errorMsg({ code: 0 })
      response.data = {
        data: result,
        total,
        limit: params.rows
      }
    } else {
      response = errorMsg({ code: 2 })
    }
  }
  return res.send(response)
}

/**
 * 获取某位作者的诗词
 */
async function getPoemsByAuthor(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.query, getPoemsByAuthorSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const params = {
      author: req.query.author,
      page: req.query.page || 1,
      rows: req.query.rows || poemsLimit
    }
    try {
      const res = await axios.get(`${localhost}/poem/poemList`, {
        params: {...JSON.parse(JSON.stringify(req.query))}
      })
      if (res && res.data && res.data.code === 0) {
        const authorSql = `SELECT * FROM author WHERE xingming = '${params.author}'`
        const result = await query(poem, authorSql)
        if (Array.isArray(result) && result.length) {
          response = res.data || {}
          response.data.authorInfo = result[0]
        }
      } else {
        throw new Error(res)
      }
    } catch (e) {
      response = errorMsg({ code: 2 })
    }
  }
  return res.send(response)
}

/**
 * 搜索
 */
async function search(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.query, searchSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const params = {
      type: req.query.type,
      keyword: req.query.keyword,
      page: req.query.page || 1,
      rows: req.query.rows || poemsLimit
    }
    const start = (params.page - 1) * params.rows
    response = errorMsg({ code: 0 })
    // 搜索全部或作者
    if (params.type === 'all' || params.type === 'author') {
      response.author = await searchInField({ start, field: 'zuozhe', ...params })
    }
    // 搜索全部或标题
    if (params.type === 'all' || params.type === 'title') {
      response.title = await searchInField({ start, field: 'mingcheng', ...params })
    }
    // 搜索全部或内容
    if (params.type === 'all' || params.type === 'content') {
      response.content = await searchInField({ start, field: 'yuanwen', ...params })
    }
    // 检查是否查询成功
    if (response.author === false || response.title === false || response.content === false) {
      response = errorMsg({ code: 2 })
    }
  }
  return res.send(response)
}

/**
 * 根据字段搜索
 */
async function searchInField(params) {
  const s = Date.now()
  let response = {}
  const sql = `SELECT _id, mingcheng, zuozhe, zhaiyao FROM poem WHERE ${params.field} LIKE '%${params.keyword}%' LIMIT ${params.start}, ${params.rows}`
  const result = await query(poem, sql)
  const condition = ` WHERE ${params.field} LIKE '%${params.keyword}%'`
  const total = await count(poem, 'poem', '_id', condition)
  if (Array.isArray(result) && total !== false) {
    response.data = result
    response.total = total
    response.limit = params.rows
  } else {
    response = false
  }
  return response
}

module.exports = {
  home,
  getById,
  authorList,
  poemList,
  getPoemsByAuthor,
  search
}