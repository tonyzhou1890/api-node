const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause, isUpdateSuccess } = require('../utils/query')
const { errorMsg, strToImageFile, sizeOfBase64, formatTime, replaceValueLabelStr } = require('../utils/utils')
const { authorToBook, queryBookList } = require('../utils/advancedUtils')
const { specialListLatestSchema, specialListDiscountSchema, specialListFreeSchema, tagBookListSchema, searchBookListSchema, storeBookListSchema } = require('../schema/enjoyReading')
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
    let condition = ` WHERE parent_series = '' AND position = 2 AND status = 0`
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
    let condition = ` WHERE parent_series = '' AND position = 2 AND status = 0 AND discount = 1 AND free = 0`
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
    let condition = ` WHERE parent_series = '' AND position = 2 AND status = 0 AND free = 1`

    response = await queryBookList(params, condition)
  }
  
  return res.send(response);
}

/**
 * 标签书籍 列表
 */
async function tagBookList(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, tagBookListSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 查询标签
    const tagSql = `SELECT uuid FROM er_tag WHERE tag = '${req.body.tag}'`
    const tagResult = await query(collection, tagSql)
    if (Array.isArray(tagResult)) {
      // 如果标签不存在
      if (tagResult.length === 0) {
        response = errorMsg({ code: 24 }, `标签${req.body.tag}不存在`)
      } else {
        // 如果标签存在，继续查询
        // 查询条件
        const params = {
          page: req.body.rows && req.body.page || 1,
          rows: req.body.page && req.body.rows || limit,
          filter: req.body.filter || 1,
          tag: tagResult[0].uuid
        }

        // 从属系列为空，则代表是单本/系列名
        // 位置为2，则代表是书城书籍
        // 状态为0，则没有禁用
        let condition = ` WHERE parent_series = '' AND position = 2 AND status = 0 AND tag LIKE '%${params.tag}%'`
        // 如果需要过滤，拼接条件语句
        if (params.filter !== 1) {
          let temp = params.filter === 2 ? 1 : 0
          condition += ` AND free = '${temp}'`
        }

        condition += ` ORDER BY create_time DESC`

        response = await queryBookList(params, condition)
      }
    }
  }
  return res.send(response);
}

/**
 * 搜索书籍 列表
 */
async function searchBookList(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, searchBookListSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 查询条件
    const params = {
      page: req.body.rows && req.body.page || 1,
      rows: req.body.page && req.body.rows || limit,
      keyword: req.body.keyword
    }

    // 从属系列为空，则代表是单本/系列名
    // 位置为2，则代表是书城书籍
    // 状态为0，则没有禁用
    let condition = ` WHERE parent_series = '' AND position = 2 AND status = 0 AND name LIKE '%${params.keyword}%'`

    // 如果有关键字不为空，按照匹配度排序
    // ORDER BY LENGTH 按照 name 长度排序---按照匹配度排序
    if (params.keyword) {
      condition += ` ORDER BY LENGTH(name)`
    } else {
      // 否则按照时间排序
      condition += ` ORDER BY create_time DESC`
    }

    response = await queryBookList(params, condition)
  }
  return res.send(response);
}

/**
 * 书库书籍 列表
 */
async function storeBookList(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, storeBookListSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 查询条件
    const params = {
      page: req.body.rows && req.body.page || 1,
      rows: req.body.page && req.body.rows || limit,
      keyword: req.body.keyword,
      position: req.body.position || 0
    }

    // 计算开始位置
    const start = (params.page - 1) * params.rows

    // 从属系列为空，则代表是单本/系列名
    let condition = ` WHERE er_book.parent_series = '' AND er_book.name LIKE '%${params.keyword}%'`

    // 如果需要根据书籍位置过滤，则添加过滤条件
    if (params.position) {
      condition += ` AND er_book.position = ${params.position}`
    }

    condition += ` AND er_book.uuid = er_account_book_info.book_uuid AND er_account_book_info.account_uuid = '${req.__record.uuid}' ORDER BY er_account_book_info.create_time DESC`

    let listSql = `SELECT ${['uuid', 'name', 'type', 'author', 'front_cover_path', 'free', 'score', 'discount', 'discount_score'].map(item => 'er_book.' + item).join(',')}, er_account_book_info.create_time 
      FROM 
      er_book, er_account_book_info${condition} LIMIT ${start}, ${params.rows}`

    let totalSql = `SELECT COUNT(er_book.uuid) FROM er_book, er_account_book_info${condition}`

    response = await queryBookList(params, condition, listSql, totalSql)

    // 格式化时间
    if (response.code === 0) {
      formatTime(response.data)
    }
  }
  return res.send(response);
}

/**
 * 书架书籍 列表
 */
async function shelfBookList(req, res, next) {
  // 单本或者父系列不为空
  //  在书架上
  let condition = ` WHERE (er_book.type = 1 OR er_book.parent_series != '') AND er_book.uuid = er_account_book_info.book_uuid AND er_account_book_info.account_uuid = '${req.__record.uuid}' AND er_account_book_info.on_shelf = 1 ORDER BY er_account_book_info.update_time DESC`

  let listSql = `SELECT ${['uuid', 'name', 'type', 'author', 'front_cover_path', 'length', 'free', 'score', 'discount', 'discount_score'].map(item => 'er_book.' + item).join(',')}, ${['create_time', 'update_time', 'percent', 'point', 'reading_status'].map(item => 'er_account_book_info.' + item).join(',')} 
    FROM 
    er_book, er_account_book_info${condition}`

  let totalSql = `SELECT COUNT(er_book.uuid) FROM er_book, er_account_book_info${condition}`

  response = await queryBookList({ page: 1, rows: 10 }, condition, listSql, totalSql)

  // 格式化时间
  if (response.code === 0) {
    formatTime(response.data)
    formatTime(response.data, '', 'updateTime')
  }
  
  return res.send(response);
}

module.exports = {
  latestList,
  discountList,
  freeList,
  tagBookList,
  searchBookList,
  storeBookList,
  shelfBookList
}