const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause, generateInsertRows, isUpdateSuccess, isInsertSuccess, isDeleteSuccess } = require('../utils/query')
const { errorMsg, writeFile, deleteFile, strToImageFile, sizeOfBase64, formatTime, replaceValueLabelStr } = require('../utils/utils')
const { authorToBook, queryBookList } = require('../utils/advancedUtils')
const { shoppingCartAddSchema, shoppingCartSubtractSchema, shoppingCartSettleSchema } = require('../schema/enjoyReading')
const { LoginExpireTime, RegisterAccountType, EnjoyReadingRole } = require('../utils/setting')
const { updateScore } = require('../utils/advancedUtils')

/**
 * 购物车列表
 */
async function shoppingCartList(req, res, next) {
  let response = {}
  let uuids = req.__enjoyReadingRecord.shoppingCart.split(',').map(item => `'${item}'`).join(',')
  if (uuids) {
    let condition = ` WHERE uuid IN (${uuids})`
    let listSql = `SELECT * FROM er_book${condition}`

    let totalSql = `SELECT COUNT(uuid) FROM er_book${condition}`

    // let books = await query(collection, sql)
    let response = await queryBookList({ page: 1, rows: 999 }, condition, listSql, totalSql)
    if (response.code === 0) {
      formatTime(response.data)
    }
    return res.send(response);
    // if (Array.isArray(books)) {
    //   books = humps.camelizeKeys(books)
    //   formatTime(books)
    //   response = errorMsg({ code: 0, data: books, total: books.length })
    // } else {
    //   response = errorMsg({ code: 2 })
    // }
  } else {
    response = errorMsg({ code: 0, data: [], total: 0 })
  }
  
  return res.send(response);
}

/**
 * 购物车新增
 */
async function shoppingCartAdd(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, shoppingCartAddSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    let newShoppingCart = req.__enjoyReadingRecord.shoppingCart
    // 检查购物车中是否已存在
    if (newShoppingCart) {
      if (newShoppingCart.includes(req.body.uuid)) {
        response = errorMsg({ code: 24 }, '请不要重复添加')
        return res.send(response)
      } else if (newShoppingCart.split(',').length >= 50) {
        // 购物车达到上限
        response = errorMsg({ code: 24 }, '购物车已达上限')
        return res.send(response)
      } else {
        newShoppingCart += `,${req.body.uuid}`
      }
    } else {
      newShoppingCart = req.body.uuid
    }
    let sql = generateUpdateClause('er_accounts', { shoppingCart: newShoppingCart }) + ` WHERE uuid = '${req.__enjoyReadingRecord.uuid}'`
    if (isUpdateSuccess(await query(collection, sql))) {
      response = errorMsg({ code: 0 })
    } else {
      response = errorMsg({ code: 4 })
    }
  }
  return res.send(response);
}

/**
 * 购物车移除
 */
async function shoppingCartSubtract(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, shoppingCartSubtractSchema, { allowUnknown: true })
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    let oldShoppingCart = req.__enjoyReadingRecord.shoppingCart
    // 如果购物车有商品，则移除指定商品，否则直接成功
    if (typeof oldShoppingCart === 'string' && oldShoppingCart) {
      oldShoppingCart = oldShoppingCart.split(',')
      let newShoppingCart = []
      // 处理请求数据
      let reqUuid = Array.isArray(req.body.uuid) ? req.body.uuid : [req.body.uuid]
      // 过滤商品
      newShoppingCart = oldShoppingCart.filter(uuid => !reqUuid.includes(uuid)).join(',')
      let updateSql = generateUpdateClause('er_accounts', {shoppingCart: newShoppingCart}) + ` WHERE uuid = '${req.__enjoyReadingRecord.uuid}'`
      if (!isUpdateSuccess(await query(collection, updateSql))) {
        response = errorMsg({ code: 3 })
        return res.send(response)
      }
    }
    response = errorMsg({ code: 0 })
  }
  return res.send(response)
}

/**
 * 购物车结算
 */
async function shoppingCartSettle(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, shoppingCartSettleSchema, { allowUnknown: true })
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 处理请求数据
    let reqUuid = Array.isArray(req.body.uuid) ? req.body.uuid : [req.body.uuid]
    let bookSql = `SELECT * FROM er_book WHERE uuid IN (${reqUuid.map(item => `'${item}'`).join(',')})`
    let books = await query(collection, bookSql)
    // 如果有需要结算的书籍
    if (Array.isArray(books) && books.length) {
      books = humps.camelizeKeys(books)
      // 如果不是立即购买
      // 去除购物车中不存在的书籍
      if (!req.body.buy) {
        let shoppingCart = req.__enjoyReadingRecord.shoppingCart.split(',')
        books = books.filter(item => shoppingCart.includes(item.uuid))
      }
      
      if (!books.length) {
        response = errorMsg({ code: 24 }, '没有需要结算的书籍')
      } else {
        // 计算结算总积分
        let totalScore = 0
        let booksNames = []
        books.map(book => {
          if (!book.free) {
            totalScore += book.discount ? book.discountScore : book.score
            booksNames.push(book.name)
          }
        })
        // 检查结算总积分是否小于等于账户拥有积分
        if (totalScore <= req.__record.score) {
          // 如果需要支付积分，则生成积分记录
          if (totalScore) {
            let params = {
              score: '-' + totalScore,
              totalScore: req.__record.score - totalScore,
              way: '购买书籍' + booksNames.map(item => `《${item}》`).join('，'),
              appUuid: req.__appInfo.uuid,
              accountUuid: req.__record.uuid
            }
            let scoreResponse = await updateScore(params)
            response = scoreResponse
          }
          
          // 如果更新积分成功/不需要积分
          // 需要将书籍插入 er_account_book_info 
          if (response.code === 0 || totalScore === 0) {
            // 初始信息
            let initAccountBookObj = {
              accountUuid: req.__record.uuid,
              percent: 0,
              point: 0,
              readingStatus: 0,
              onShelf: 0,
              updateTime: moment().format('YYYY-MM-DD HH:mm:ss'),
              createTime: moment().format('YYYY-MM-DD HH:mm:ss')
            }
            let bookRows = []
            books.map(book => {
              bookRows.push(Object.assign({}, initAccountBookObj, { bookUuid: book.uuid, uuid: uuidv1() }))
            })
            let insertRowsSql = generateInsertRows('er_account_book_info', bookRows)
            let insertRowsResult = await query(collection, insertRowsSql)
            if (isInsertSuccess(insertRowsResult)) {
              response = errorMsg({ code: 0 })
              // 从购物车移除已购买书籍
              let shoppingCart = req.__enjoyReadingRecord.shoppingCart.split(',')
              let bookUuids = books.map(item => item.uuid)
              shoppingCart = shoppingCart.filter(uuid => !bookUuids.includes(uuid)).join(',')
              let updateSql = generateUpdateClause('er_accounts', {shoppingCart}) + ` WHERE uuid = '${req.__enjoyReadingRecord.uuid}'`
              if (!isUpdateSuccess(await query(collection, updateSql))) {
                response = errorMsg({ code: 3 })
              }
            } else {
              response = errorMsg({ code: 3 })
            }
          }
        } else {
          response = errorMsg({ code: 24 }, '拥有的积分不足')
        }
      }
    } else {
      if (Array.isArray(books)) {
        response = errorMsg({ code: 24 }, '需要结算的书籍不存在')
      } else {
        response = errorMsg({ code: 2 })
      }
    }
  }
  return res.send(response)
}

module.exports = {
  shoppingCartList,
  shoppingCartAdd,
  shoppingCartSubtract,
  shoppingCartSettle
}