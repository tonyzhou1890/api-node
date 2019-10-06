const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause, isUpdateSuccess, isInsertSuccess } = require('../utils/query')
const { errorMsg, strToImageFile, sizeOfBase64, formatTime } = require('../utils/utils')
const { authorToBook, tagToBook, queryBookList } = require('../utils/advancedUtils')
const { bookDetailSchema, bookRecommendSchema, readingInfoUpdateSchema } = require('../schema/enjoyReading')
const { LoginExpireTime, RegisterAccountType, EnjoyReadingRole } = require('../utils/setting')

/**
 * 书籍详情
 */
async function bookDetail(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, bookDetailSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {

    let sql = `SELECT * FROM er_book WHERE uuid = '${req.body.uuid}' OR parent_series = '${req.body.uuid}' ORDER BY sequence ASC`
    let result = await query(collection, sql)
    // 查询成功并且有记录
    if (Array.isArray(result) && result.length) {
      result = humps.camelizeKeys(result)
      // 处理时间
      formatTime(result)
      // 处理作者 uuid
      result = await authorToBook(result)
      // 处理标签 uuid
      result = await tagToBook(result)
      // 添加字段是否已经拥有以及书籍阅读信息
      if (req.__enjoyReadingRecord) {
        let hasBooksSql = `SELECT * FROM er_account_book_info WHERE account_uuid = '${req.__enjoyReadingRecord.accountUuid}'`
        let books = await query(collection, hasBooksSql)
        books = humps.camelizeKeys(books)
        formatTime(books)
        formatTime(books, '', 'updateTime')
        if (Array.isArray(books)) {
          result.map(item => {
            let book = books.find(book => book.bookUuid === item.uuid)
            if (book) {
              item.has = 1
              item.readingInfo = book
            } else {
              item.has = 0
            }
          })
        } else {
          // 报错，则直接返回
          response = errorMsg({ code: 2 })
          return res.send(response)
        }
      } else {
          result.map(item => {
            item.has = 0
        })
      }
      
      // 处理书籍层级
      let parent = result.filter(item => !item.parentSeries)[0]
      let children = result.filter(item => item.parentSeries)
      response = errorMsg({ code: 0 })
      if (parent) {
        parent.children = children
        response.data = parent
      } else {
        response.data = children[0]
      }

    } else {
      // 查询成功，没有记录
      if (Array.isArray(result)) {
        response = errorMsg({ code: 40 })
      } else {
        response = errorMsg({ code: 2 })
      }
    }
  }
  return res.send(response);
}

/**
 * 书籍推荐--目前只根据作者推荐三本
 */
async function bookRecommend(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, bookRecommendSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {

    let sql = `SELECT * FROM er_book WHERE uuid = '${req.body.uuid}'`

    let result = await query(collection, sql)
    // 查询成功并且有记录
    if (Array.isArray(result) && result.length) {
      response = errorMsg({ code: 0 })
      // 查询相同作者的书籍
      let authors = result[0].author.split(',')
      if (authors.length) {
        let len = authors.length
        let recommend = []
        for (let i = 0; i < len; i++) {
          let condition = ` WHERE parent_series = '' AND position = 2 AND status = 0 AND author LIKE '%${authors[i]}%' AND uuid <> '${result[0].uuid}'`
          let sameAuthorResult = await queryBookList({ page: 1, rows: 3 }, condition)
          // 判断查询结果，如果有，则拼接到推荐结果中，并且，如果推荐结果已经大于等于三个，退出循环
          if (sameAuthorResult.code === 0 && sameAuthorResult.data.length) {
            recommend = recommend.concat(sameAuthorResult.data)
            if (recommend.length >= 3) {
              break
            }
          }
        }
        response.data = recommend
      } else {
        response.data = []
      }
    } else {
      // 查询成功，没有记录
      if (Array.isArray(result)) {
        response = errorMsg({ code: 40 })
      } else {
        response = errorMsg({ code: 2 })
      }
    }
  }
  return res.send(response);
}

/**
 * 更新 er_account_book_info 信息
 */
async function readingInfoUpdate(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, readingInfoUpdateSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    let fields = ['percent', 'point', 'readingStatus', 'onShelf', 'updateTime']
    if (req.body.percent !== undefined || req.body.point !== undefined) {
      req.body.updateTime = moment().format('YYYY-MM-DD HH:mm:ss')
    } else {
      req.body.updateTime = undefined
    }
    // 检查是否有需要更新的字段
    if (fields.some(field => req.body[field] !== undefined)) {
      let updateSql = generateUpdateClause('er_account_book_info', req.body, fields) + ` WHERE uuid = '${req.body.uuid}'`
      if (isUpdateSuccess(await query(collection, updateSql))) {
        response = errorMsg({ code: 0 })
      } else {
        response = errorMsg({ code: 4 })
      }
    } else {
      response = errorMsg({ code: 0 })
    }
  }
  return res.send(response)
}

module.exports = {
  bookDetail,
  bookRecommend,
  readingInfoUpdate
}