const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause, isUpdateSuccess, isInsertSuccess } = require('../utils/query')
const { errorMsg, strToImageFile, sizeOfBase64, formatTime } = require('../utils/utils')
const { authorToBook, tagToBook, queryBookList } = require('../utils/advancedUtils')
const {  } = require('../schema/enjoyReading')
const { LoginExpireTime, RegisterAccountType, EnjoyReadingRole } = require('../utils/setting')

/**
 * tags 列表
 */
async function tagList(req, res, next) {
  let response = {}

  // 拥有有效书籍的标签
  // 单本或系列名
  // 位于书城
  // 未禁用
  const bookUuidSql = `SELECT tag from er_book WHERE parent_series = '' AND position = 2 AND status = 0`
  let uuids = await query(collection, bookUuidSql)

  if (Array.isArray(uuids) && uuids.length) {
    let tags = []
    uuids.map(item => {
      tags = tags.concat(item.tag.split(','))
    })
    uuids = [...new Set(tags)]

    const sql = `SELECT uuid, tag, create_time FROM er_tag WHERE uuid IN (${uuids.map(item => `'${item}'`).join(',')})`
    const result = await query(collection, sql)

    if (Array.isArray(result)) {
      let data = humps.camelizeKeys(result)
      formatTime(data)
      response = errorMsg({ code: 0 })
      response.data = data
    } else {
      response = errorMsg({ code: 2 })
    }
  } else {
    response = errorMsg({ code: 0 })
    response.data = []
  }
  
  return res.send(response);
}

/**
 * 账户信息
 */
async function accountDetail(req, res, next) {
  let response = {}
  // 如果有账户信息，直接返回
  if (req.__enjoyReadingRecord) {
    response = errorMsg({ code: 0 })
    response.data = Object.assign({}, req.__record, req.__enjoyReadingRecord)
  } else {  // 否则添加账户信息
    // 查询空间信息，判断是否需要分配空间
    const spaceSql = `SELECT * FROM er_app_info WHERE class = 'space'`
    let spaceArr = await query(collection, spaceSql)
    let spaceInfo = {
      allocationOfSpaceAccounts: null,
      hasSpaceAccounts: null,
      sizeOfSpace: null
    }
    let space = 0
    // 根据查询结果填充 spaceInfo
    if (Array.isArray(spaceArr) && spaceArr.length) {
      spaceArr.map(item => {
        Object.keys(spaceInfo).map(key => {
          if (key === item.key) {
            spaceInfo[key] = Number(item.value)
          }
        })
      })
    }
    // 如果数字都有效，设定 space
    if (!isNaN(spaceInfo.allocationOfSpaceAccounts) && !isNaN(spaceInfo.hasSpaceAccounts) && !isNaN(spaceInfo.sizeOfSpace)) {
      space = spaceInfo.hasSpaceAccounts < spaceInfo.allocationOfSpaceAccounts ? spaceInfo.sizeOfSpace : 0
    }
    const uuid = uuidv1()
    const createTime = moment().format('YYYY-MM-DD HH:mm:ss')
    // er_accounts 新增账户信息
    const sql = `INSERT INTO er_accounts (uuid, account_uuid, role, store_book_num, shelf_book_num, shopping_cart, total_space, private_space, store_space, create_time)
    VALUES
    ('${uuid}', '${req.__record.uuid}', '${EnjoyReadingRole.common.value}', 0, 0, '', ${space}, 0, 0, '${createTime}')`
    const result = await query(collection, sql)
    // 如果新增成功并且分配了空间，需要更新拥有空间账户数量信息
    if (isInsertSuccess(result) && space) {
      let updateSql = `UPDATE er_app_info SET 
        value = '${spaceInfo.hasSpaceAccounts + 1}' 
        WHERE \`key\` = 'hasSpaceAccounts' and class = 'space'`
      await query(collection, updateSql)
    }
    if (isInsertSuccess(result)) {
      let queryResult = await unique(collection, 'er_accounts', 'id', result.insertId)
      if (queryResult && queryResult[0]) {
        queryResult = humps.camelizeKeys(queryResult)
        formatTime(queryResult)
        response = errorMsg({ code: 0 })
        response.data = Object.assign({}, req.__record, queryResult[0])
      } else {
        response = errorMsg({ code: 2 })
      }
    } else {
      response = errorMsg({ code: 3 })
    }
  }

  return res.send(response)
}

/**
 * 登录积分奖励
 */
async function accountLoginScore(req, res, next) {
  let response = {}
  // 定义现在时间，开始查询时间，结束时间，获取积分方式，查询是否已经获取的sql
  let now = moment(),
    start = now.format('YYYY-MM-DD') + ' 00:00:00',
    end = moment().add(1, 'days').format('YYYY-MM-DD') + ' 00:00:00',
    way = '享阅登录积分奖励'
  const countSql = `SELECT count(uuid) from score_record WHERE create_time BETWEEN '${start}' AND '${end}' AND way = '${way}' AND account_uuid = '${req.__record.uuid}' AND app_uuid = '${req.__appInfo.uuid}'`
  // 查询是否已经获取
  let countResult = await query(collection, countSql)
  // console.log(countSql, countResult)
  // 如果已经获取，提示
  if (Array.isArray(countResult) && countResult[0]['count(uuid)']) {
    response = errorMsg({ code: 24 }, '今天已经获取了登录积分奖励')
  } else {
    // 如果操作失败，提示
    if (!Array.isArray(countResult)) {
      response = errorMsg({ code: 2 })
    } else {
      // 否则继续，插入积分记录
      let uuid = uuidv1(),
        score = 5,
        totalScore = req.__record.score + score
      const insertScoreSql = `INSERT INTO score_record (uuid, score, total_score, way, app_uuid, account_uuid, create_time)
      VALUES
      ('${uuid}', ${score}, ${totalScore}, '${way}', '${req.__appInfo.uuid}', '${req.__record.uuid}', '${now.format('YYYY-MM-DD HH:mm:ss')}')`

      const insertScoreResult = await query(collection, insertScoreSql)
      // 如果插入成功，更新注册中心账户积分
      if (isInsertSuccess(insertScoreResult)) {
        const updateAccountScore = `UPDATE accounts SET 
        score = ${totalScore} 
        WHERE uuid = '${req.__record.uuid}'`
        await query(collection, updateAccountScore)
        response = errorMsg({ code: 0 })
        response.data = '积分+5'
      } else {
        response = errorMsg({ code: 3 })
      }
    }
  }
  return res.send(response)
}

module.exports = {
  tagList,
  accountDetail,
  accountLoginScore
}