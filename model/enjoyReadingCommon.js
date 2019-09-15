const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause, isUpdateSuccess } = require('../utils/query')
const { errorMsg, strToImageFile, sizeOfBase64, formatTime } = require('../utils/utils')
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

module.exports = {
  tagList
}