const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause, isUpdateSuccess, isInsertSuccess } = require('../utils/query')
const { errorMsg, strToImageFile, sizeOfBase64, formatTime } = require('../utils/utils')
const { authorToBook, tagToBook, queryBookList } = require('../utils/advancedUtils')
const { accountListSchema, accountRegisterSchema, accountUpdateSchema, accountPermissionSchema, accountLoginSchema, accountUpdateAppsSchema, appCreateSchema, appUpdateSchema } = require('../schema/register')
const { LoginExpireTime, RegisterAccountType, EnjoyReadingRole } = require('../utils/setting')

/**
 * tags 列表
 */
async function tagList(req, res, next) {
  let response = {}
  
  const sql = `SELECT uuid, tag, create_time FROM er_tag`
  const result = await query(collection, sql)

  if (Array.isArray(result)) {
    let data = humps.camelizeKeys(result)
    formatTime(data)
    response = errorMsg({ code: 0 })
    response.data = data
  } else {
    response = errorMsg({ code: 2 })
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

module.exports = {
  tagList,
  accountDetail
}