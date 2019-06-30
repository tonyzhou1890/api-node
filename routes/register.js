const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique } = require('../utils/query')
const { errorMsg } = require('../utils/utils')
const { accountListSchema, accountRegisterSchema } = require('../schema/register')

/* GET register listing. */
/**
 * 获取账户列表
 */
router.post('/account/list', async (req, res, next) => {
  let response = {}
  const vali = Joi.validate(req.body, accountListSchema)
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const params = {
      page: req.body.rows && req.body.page || 1,
      rows: req.body.page && req.body.rows || limit,
      name: req.body.name || ''
    }
    const start = (params.page - 1) * params.rows
    const sql = `SELECT uuid, nickname, register_time FROM accounts LIMIT ${start}, ${params.rows}`
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
  const vali = Joi.validate(req.body, accountRegisterSchema)
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const u = await unique(collection, 'accounts', 'nickname', req.body.nickname)
    if (!u) {
      const uuid = uuidv1()
      const sql = `INSERT INTO accounts (uuid, nickname, pwd, question, answer)
      VALUES
      ('${uuid}', '${req.body.nickname}', '${req.body.pwd}', '${req.body.question}', '${req.body.answer}')
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
  const vali = Joi.validate(req.body, accountRegisterSchema)
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    const u = await unique(collection, 'accounts', 'nickname', req.body.nickname)
    if (!u) {
      const uuid = uuidv1()
      const sql = `INSERT INTO accounts (uuid, nickname, pwd, question, answer)
      VALUES
      ('${uuid}', '${req.body.nickname}', '${req.body.pwd}', '${req.body.question}', '${req.body.answer}')
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

module.exports = router;