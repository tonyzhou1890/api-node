const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause, isUpdateSuccess, isInsertSuccess } = require('../utils/query')
const { errorMsg, strToImageFile, sizeOfBase64, formatTime } = require('../utils/utils')
const { accountListSchema, accountRegisterSchema, accountUpdateSchema, accountPermissionSchema, accountLoginSchema, accountUpdateAppsSchema, appCreateSchema, appUpdateSchema, scoreListSchema } = require('../schema/register')
const { LoginExpireTime, RegisterAccountType } = require('../utils/setting')

/* GET register listing. */
/**
 * 获取账户列表
 */
router.post('/account/list', async (req, res, next) => {
  let response = {}
  const vali = Joi.validate(req.body, accountListSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const params = {
      page: req.body.rows && req.body.page || 1,
      rows: req.body.page && req.body.rows || limit,
      nickname: req.body.nickname || '',
      type: req.body.type
    }

    let condition = ''
    if (params.nickname) {
      condition += ` WHERE nickname LIKE '%${params.nickname}%'`
    }
    if (params.type) {
      if (condition) {
        condition += ' AND'
      }
      condition += ` WHERE type = ${params.type}`
    }

    const start = (params.page - 1) * params.rows
    const sql = `SELECT uuid, nickname, avatar, gender, register_time, login_time, type, disabled, logout FROM accounts${condition} LIMIT ${start}, ${params.rows}`
    const result = await query(collection, sql)

    const countSql = `SELECT COUNT(uuid) FROM accounts${condition}`
    const countResult = await query(collection, countSql)
    // console.log(countResult)
    if (Array.isArray(result) && Array.isArray(countResult) && countResult.length) {
      response = errorMsg({ code: 0 })
      response.data = humps.camelizeKeys(result)
      response.total = countResult[0]['COUNT(uuid)']
    } else {
      response = errorMsg({ code: 2 })
    }
  }
  return res.send(response);
});

/**
 * 注册账户
 */
router.post('/account/register', async (req, res, next) => {
  let response = {}
  const vali = Joi.validate(req.body, accountRegisterSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const u = await unique(collection, 'accounts', 'nickname', req.body.nickname)
    if (!u.length) {
      const uuid = uuidv1()
      const registerTime = moment().format('YYYY-MM-DD HH:mm:ss')
      const type = RegisterAccountType.common.value
      const birth = moment().format('YYYY-MM-DD')
      const sql = `INSERT INTO accounts (uuid, nickname, pwd, birth, question, answer, type, register_time)
      VALUES
      ('${uuid}', '${req.body.nickname}', '${req.body.pwd}', '${birth}', '${req.body.question}', '${req.body.answer}', '${type}', '${registerTime}')
      `
      const result = await query(collection, sql)
      if (isInsertSuccess(result)) {
        response = errorMsg({ code: 0 })
      } else {
        response = errorMsg({ code: 3 })
      }
    } else {
      response = errorMsg({ code: 24 }, '昵称重复')
    }
  }
  return res.send(response);
});

/**
 * 更新账户
 */
router.post('/account/update', async (req, res, next) => {
  let response = {}
  const vali = Joi.validate(req.body, accountUpdateSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 如果有 nickname，检查是否除自身外有重复
    if (req.body.nickname) {
      const u = await unique(collection, 'accounts', 'nickname', req.body.nickname)
      if (u.some(item => item.nickname === req.body.nickname && item.uuid !== req.body.uuid)) {
        response = errorMsg({ code: 24 }, '昵称重复')
      }
    }
    
    // 没有重复则继续
    if (response.code === undefined) {
      const fields = ['nickname', 'pwd', 'question', 'answer', 'avatar', 'gender', 'birth']
      const temp = {}
      fields.map(item => {
        if (req.body[item] !== undefined) {
          temp[item] = req.body[item]
        }
      })

      // 图片处理
      if (temp.avatar) {
        // 判断文件大小
        if (sizeOfBase64(temp.avatar, 64).oversize) {
          response = errorMsg({ code: 24 }, '头像大小不能超过64k')
          return res.send(response)
        }
        // 存储图片
        const fileName = req.body.avatarName ? req.body.avatarName + Date.now() : Date.now()
        const processImageRes = await strToImageFile('../store/images/avatar/', fileName, temp.avatar)
        if (processImageRes.status) {
          temp.avatar = processImageRes.path.replace(/^..\/store/, '')
        } else {
          response = errorMsg({ code: 24, errorData: processImageRes.errorMsg }, '后台图像处理错误')
          return res.send(response)
        }
      }

      let sql = generateUpdateClause('accounts', temp)
      sql += ` WHERE uuid = '${req.body.uuid}'`
      const result = await query(collection, sql)
      if (typeof result === 'object' && result.affectedRows) {
        response = errorMsg({ code: 0 })
      } else {
        response = errorMsg({ code: 4 })
      }
    }
  }
  return res.send(response);
});

/**
 * 更新账户权限
 */
router.post('/account/updatePermission', async (req, res, next) => {
  let response = {}
  const vali = Joi.validate(req.body, accountPermissionSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const u = await unique(collection, 'accounts', 'uuid', req.body.uuid)

    if (u.length === 0) {
      response = errorMsg({ code: 40 })
      return res.send(response)
    } else {
      let field = ''
      if (req.body.type !== null && req.body.type !== undefined) {
        field = `type = ${req.body.type}`
      } else if (req.body.disabled != null && req.body.disabled !== undefined) {
        field = `disabled = ${req.body.disabled}`
      } else if (req.body.logout != null && req.body.logout !== undefined) {
        field = `logout = ${req.body.logout}`
      }

      if (!field) {
        response = errorMsg({ code: 0 })
        return res.send(response)
      } else {
        let sql = `UPDATE accounts SET ${field} WHERE uuid = '${req.body.uuid}'`
        const result = await query(collection, sql)
        if (typeof result === 'object' && result.affectedRows) {
          response = errorMsg({ code: 0 })
        } else {
          response = errorMsg({ code: 4 })
        }
      }
    }
  }
  return res.send(response);
});

/**
 * 登录
 */
router.post('/account/login', async (req, res, next) => {
  let response = {}
  const vali = Joi.validate(req.body, accountLoginSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    let sql = `SELECT * FROM accounts WHERE nickname = '${req.body.nickname}' AND pwd = '${req.body.pwd}'`
    const result = await query(collection, sql)
    if (Array.isArray(result)) {
      if (result.length) {
        const record = humps.camelizeKeys(result[0])
        // 如果账号已经注销，结束请求
        if (record.logout) {
          response = errorMsg({ code: 34 })
          return res.send(response)
        }
        let token = uuidv1()
        // 如果是体验账户，token尽可能用原来的
        if (record.type === RegisterAccountType.experience.value) {
          token = record.token || token
        }
        const loginTime = moment().format('YYYY-MM-DD HH:mm:ss')
        const lastLoginTime = record.loginTime ? moment(record.loginTime).format('YYYY-MM-DD HH:mm:ss') : null
        const expire = moment(moment().valueOf() + LoginExpireTime).format('YYYY-MM-DD HH:mm:ss')
        const updateSql = `UPDATE accounts SET 
          login_time = '${loginTime}',
          last_login_time = '${lastLoginTime}',
          expire = '${expire}',
          token = '${token}' 
          WHERE uuid = '${record.uuid}';`
        const updateResult = await query(collection, updateSql)
        if (isUpdateSuccess(updateResult)) {
          response = errorMsg({
            code: 0,
            data: {
              token
            }
          })
        } else {
          response = errorMsg({ code: 24, param: '登录失败' })
        }
      } else {
        response = errorMsg({ code: 32 })
      }
    } else {
      response = errorMsg({ code: 2 })
    }
  }
  return res.send(response)
})

/**
 * 退出
 */
router.post('/account/logout', async (req, res, next) => {
  let response = {}
  let sql = `SELECT * from accounts WHERE token = '${req.headers.token}';`
  const result = await query(collection, sql)
  if (Array.isArray(result) && result.length) {
    const record = result[0]
    if (record.type === RegisterAccountType.experience.value) {
      response = errorMsg({ code: 0 })
    } else {
      let updateSql = `UPDATE accounts SET 
        token = '' 
        WHERE token = '${req.headers.token}';`
      if (isUpdateSuccess(await query(collection, updateSql))) {
        response = errorMsg({ code: 0 })
      } else {
        response = errorMsg({ code: 4 })
      }
    }
  } else {
    response = errorMsg({ code: 2 })
  }
  
  return res.send(response)
})

/**
 * 账户详情
 */
router.post('/account/detail', async (req, res, next) => {
  let response = {}
  let sql = `SELECT * from accounts WHERE token = '${req.headers.token}';`
  const result = await query(collection, sql)
  if (Array.isArray(result) && result.length) {
    const record = humps.camelizeKeys(result[0])
    delete record.pwd
    delete record.id

    response = errorMsg({ code: 0 })
    response.data = record
  } else {
    response = errorMsg({ code: 2 })
  }
  
  return res.send(response)
})

/**
 * 更新订阅应用
 */
router.post('/account/updateApps', async (req, res, next) => {
  let response = {}
  const vali = Joi.validate(req.body, accountUpdateAppsSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    let sql = `SELECT accounts, accounts_limit FROM apps WHERE uuid = '${req.body.app}'`
    const result = await query(collection, sql)
    if (Array.isArray(result)) {
      if (result.length) {
        const record = humps.camelizeKeys(result[0])
        let updateSql = ''
        let updateResult = ''
        // 取消订阅
        if (!req.body.type) {
          record.accounts -= 1
        } else {
          // 增加订阅
          if (record.accounts >= record.accountsLimit &&record.accountsLimit > 0) {
            response = errorMsg({ code: 50 })
            return res.send(response)
          } else {
            record.accounts += 1
          }
        }
        // 更新应用表
        updateSql = `UPDATE apps SET
          accounts = '${record.accounts}'
          WHERE uuid = '${req.body.app}'`
        // 更新应用表成功
        if (isUpdateSuccess(await query(collection, updateSql))) {
          // 更新用户表
          updateSql = `UPDATE accounts SET
            apps = '${req.body.apps}'
            WHERE uuid = '${req.__record.uuid}'`
            // 更新账户应用列表成功
          if (isUpdateSuccess(await query(collection, updateSql))) {
            response = errorMsg({ code: 0 })
          } else {
            // 更新账户应用列表失败
            response = errorMsg({ code: 4 })
          }
        } else {
          // 更新应用表失败
          response = errorMsg({ code: 4 })
        }
      } else {
        response = errorMsg({ code: 40 })
      }
    } else {
      response = errorMsg({ code: 2 })
    }
  }
  return res.send(response)
})

/**
 * 应用列表
 */
router.post('/apps/list', async (req, res, next) => {
  let response = {}
  const sql = `SELECT uuid, name, summary, link, icon, register_time, accounts, accounts_limit, related_domain, hidden FROM apps`
  const result = await query(collection, sql)
  if (Array.isArray(result)) {
    response = errorMsg({ code: 0 })
    response.data = humps.camelizeKeys(result)
  } else {
    response = errorMsg({ code: 2 })
  }
  return res.send(response);
});

/**
 * 注册应用
 */
router.post('/apps/create', async (req, res, next) => {
  let response = {}
  const vali = Joi.validate(req.body, appCreateSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const u = await unique(collection, 'apps', 'name', req.body.name)
    if (!u.length) {

      // 判断文件大小
      if (sizeOfBase64(req.body.icon, 64).oversize) {
        response = errorMsg({ code: 24 }, '图片大小不能超过64k')
        return res.send(response)
      }
      // 存储图片
      const fileName = req.body.iconName ? req.body.iconName + Date.now() : Date.now()
      const processImageRes = await strToImageFile('../store/images/apps/', fileName, req.body.icon)
      if (processImageRes.status) {
        req.body.icon = processImageRes.path.replace(/^..\/store/, '')
      } else {
        response = errorMsg({ code: 24, errorData: processImageRes.errorMsg }, '后台图像处理错误')
        return res.send(response)
      }

      const uuid = uuidv1()
      const accounts = 0
      const registerTime = moment().format('YYYY-MM-DD HH:mm:ss')
      const sql = `INSERT INTO apps (uuid, name, summary, link, icon, related_domain, register_time, accounts, accounts_limit, temp_account, hidden)
      VALUES
      ('${uuid}', '${req.body.name}', '${req.body.summary}', '${req.body.link}', '${req.body.icon}', '${req.body.relatedDomain}', '${registerTime}', '${accounts}', '${req.body.accountsLimit}', '${req.body.tempAccount}', ${req.body.hidden})
      `
      const result = await query(collection, sql)
      if (isInsertSuccess(result)) {
        response = errorMsg({ code: 0 })
      } else {
        response = errorMsg({ code: 3 })
      }
    } else {
      response = errorMsg({ code: 24 }, '应用名称重复')
    }
  }
  return res.send(response);
});

/**
 * 更新应用
 */
router.post('/apps/update', async (req, res, next) => {
  let response = {}
  const vali = Joi.validate(req.body, appUpdateSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 如果有 name，检查是否除自身外有重复
    if (req.body.name) {
      const u = await unique(collection, 'apps', 'name', req.body.name)
      if (u.some(item => item.name === req.body.name && item.uuid !== req.body.uuid)) {
        response = errorMsg({ code: 24 }, '应用名称重复')
      }
    }
    
    // 没有重复则继续
    if (response.code === undefined) {
      const fields = ['name', 'summary', 'link', 'icon', 'relatedDomain', 'accountsLimit', 'tempAccount', 'hidden']
      const temp = {}
      fields.map(item => {
        if (req.body[item] !== undefined) {
          temp[item] = req.body[item]
        }
      })

      // 图片处理
      if (temp.icon) {
        // 判断文件大小
        if (sizeOfBase64(temp.icon, 64).oversize) {
          response = errorMsg({ code: 24 }, '图片大小不能超过64k')
          return res.send(response)
        }
        // 存储图片
        const fileName = req.body.iconName ? req.body.iconName + Date.now() : Date.now()
        const processImageRes = await strToImageFile('../store/images/apps/', fileName, temp.icon)
        if (processImageRes.status) {
          temp.icon = processImageRes.path.replace(/^..\/store/, '')
        } else {
          response = errorMsg({ code: 24, errorData: processImageRes.errorMsg }, '后台图像处理错误')
          return res.send(response)
        }
      }

      let sql = generateUpdateClause('apps', temp)
      sql += ` WHERE uuid = '${req.body.uuid}'`
      const result = await query(collection, sql)
      if (typeof result === 'object' && result.affectedRows) {
        response = errorMsg({ code: 0 })
      } else {
        response = errorMsg({ code: 4 })
      }
    }
  }
  return res.send(response);
});

/**
 * 获取积分记录列表
 */
router.post('/score/list', async (req, res, next) => {
  let response = {}
  const vali = Joi.validate(req.body, scoreListSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const params = {
      page: req.body.rows && req.body.page || 1,
      rows: req.body.page && req.body.rows || limit,
      filter: req.body.filter || 1
    }

    let condition = ` WHERE account_uuid = '${req.__record.uuid}'`
    if (params.filter !== 1) {
      condition += ` AND score ${params.filter === 2 ? '> 0' : '< 0'}`
    }

    const start = (params.page - 1) * params.rows
    const sql = `SELECT uuid, score, total_score, way, create_time FROM score_record${condition} ORDER BY create_time DESC LIMIT ${start}, ${params.rows}`
    const result = await query(collection, sql)

    const countSql = `SELECT COUNT(uuid) FROM score_record${condition}`
    const countResult = await query(collection, countSql)
    // console.log(countResult)
    if (Array.isArray(result) && Array.isArray(countResult) && countResult.length) {
      response = errorMsg({ code: 0 })
      response.data = humps.camelizeKeys(result)
      formatTime(response.data)
      response.total = countResult[0]['COUNT(uuid)']
    } else {
      response = errorMsg({ code: 2 })
    }
  }
  return res.send(response);
});

module.exports = router;