const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause, isUpdateSuccess } = require('../utils/query')
const { errorMsg, strToImageFile, sizeOfBase64, formatTime, replaceValueLabelStr } = require('../utils/utils')
const { authorToBook, queryBookList } = require('../utils/advancedUtils')
const { specialListLatestSchema, specialListDiscountSchema, specialListFreeSchema } = require('../schema/enjoyReading')
const { LoginExpireTime, RegisterAccountType, EnjoyReadingRole } = require('../utils/setting')

/**
 * 最新上架 列表
 */
async function latestList(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, specialListLatestSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 查询条件
    const params = {
      page: req.body.rows && req.body.page || 1,
      rows: req.body.page && req.body.rows || limit,
      filter: req.body.filter || 1,
    }

    // 从属系列为空，则代表是单本/系列名
    // 位置为2，则代表是书城书籍
    let condition = ` WHERE subordinate_series = '' AND position = 2 AND status = 0`
    // 如果需要过滤，拼接条件语句
    if (params.filter !== 1) {
      let temp = params.filter === 2 ? 1 : 0
      condition += ` AND free = '${temp}'`
    }

    condition += ` ORDER BY create_time DESC`

    response = await queryBookList(params, condition)
  }
  
  return res.send(response);
}

/**
 * 打折书籍 列表
 */
async function discountList(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, specialListDiscountSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 查询条件
    const params = {
      page: req.body.rows && req.body.page || 1,
      rows: req.body.page && req.body.rows || limit,
      sort: req.body.sort || 1,
    }

    // 从属系列为空，则代表是单本/系列名
    // 位置为2，则代表是书城书籍
    let condition = ` WHERE subordinate_series = '' AND position = 2 AND status = 0 AND discount = 1 AND free = 0`
    // 如果需要过滤，拼接条件语句
    if (params.sort !== 1) {
      condition += ` ORDER BY discount_score ${params.sort === 2 ? 'ASC' : 'DESC'}`
    }

    response = await queryBookList(params, condition)
  }
  
  return res.send(response);
}

/**
 * 免费书籍 列表
 */
async function freeList(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, specialListFreeSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 查询条件
    const params = {
      page: req.body.rows && req.body.page || 1,
      rows: req.body.page && req.body.rows || limit
    }

    // 从属系列为空，则代表是单本/系列名
    // 位置为2，则代表是书城书籍
    let condition = ` WHERE subordinate_series = '' AND position = 2 AND status = 0 AND free = 1`

    response = await queryBookList(params, condition)
  }
  
  return res.send(response);
}

module.exports = {
  latestList,
  discountList,
  freeList
}