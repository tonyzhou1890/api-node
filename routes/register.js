const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause } = require('../utils/query')
const { errorMsg, strToImageFile, sizeOfBase64 } = require('../utils/utils')
const { accountListSchema, accountRegisterSchema, accountUpdateSchema, accountLogin } = require('../schema/register')
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
      name: req.body.name || ''
    }
    const start = (params.page - 1) * params.rows
    const sql = `SELECT uuid, nickname, avatar, register_time FROM accounts LIMIT ${start}, ${params.rows}`
    const result = await query(collection, sql)
    if (Array.isArray(result)) {
      response = errorMsg({ code: 0 })
      response.data = result
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
      if (typeof result === 'object' && result.insertId) {
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
      const fields = ['nickname', 'pwd', 'avatar', 'gender', 'birth', 'type', 'apps', 'disabled', 'logout']
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
 * 登录
 */
router.post('/account/login', async (req, res, next) => {
  let response = {}
  const vali = Joi.validate(req.body, accountLogin, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    let sql = `SELECT * FROM accounts WHERE nickname = '${req.body.nickname}' AND pwd = '${req.body.pwd}'`
    const result = await query(collection, sql)
    if (Array.isArray(result)) {
      if (result.length) {
        const record = result[0]
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
        const lastLoginTime = record.login_time ? moment(record.login_time).format('YYYY-MM-DD HH:mm:ss') : null
        const expire = moment(moment().valueOf() + LoginExpireTime).format('YYYY-MM-DD HH:mm:ss')
        const updateSql = `UPDATE accounts SET 
          login_time = '${loginTime}',
          last_login_time = '${lastLoginTime}',
          expire = '${expire}',
          token = '${token}' 
          WHERE uuid = '${record.uuid}';`
        console.log(lastLoginTime)
        const updateResult = await query(collection, updateSql)
        if (typeof updateResult === 'object' && updateResult.affectedRows) {
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
      const updateResult = await query(collection, updateSql)
      if (typeof result === 'object' && result.affectedRows) {
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
router.post('/account/detail', async(req, res, next) => {
  let response = {}
  let sql = `SELECT * from accounts WHERE token = '${req.headers.token}';`
  const result = await query(collection, sql)
  if (Array.isArray(result) && result.length) {
    const record = result[0]
    delete record.pwd
    delete record.id

    response = errorMsg({ code: 0 })
    response.data = record
  } else {
    response = errorMsg({ code: 2 })
  }
  
  return res.send(response)
})


module.exports = router;