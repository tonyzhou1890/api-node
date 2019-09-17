const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause, isUpdateSuccess } = require('../utils/query')
const { errorMsg, strToImageFile, sizeOfBase64 } = require('../utils/utils')
const { accountListSchema, accountRegisterSchema, accountUpdateSchema, accountPermissionSchema, accountLoginSchema, accountUpdateAppsSchema, appCreateSchema, appUpdateSchema } = require('../schema/register')
const { LoginExpireTime, RegisterAccountType, EnjoyReadingRole } = require('../utils/setting')

/**
 * 首页 banner 列表
 */
async function homeBannerList(req, res, next) {
  let response = {}
  
  const sql = `SELECT uuid, title, image, href FROM er_banner WHERE active = 1 ORDER BY sequence`
  // console.log(sql)
  const result = await query(collection, sql)

  if (Array.isArray(result)) {
    response = errorMsg({ code: 0 })
    response.data = humps.camelizeKeys(result)
  } else {
    response = errorMsg({ code: 2 })
  }
  return res.send(response);
}

module.exports = {
  homeBannerList
}