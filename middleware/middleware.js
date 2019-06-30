const express = require('express')
const { collection } = require('../utils/database')
const { query } = require('../utils/query')
const { errorMsg } = require('../utils/utils')

/**
 * token验证白名单
 */
const whitelist = [
  '/register/account/register',
  '/register/account/login',
  '/register/account/update'
]

/**
 * 验证token
 */
const valiToken = async (req, res, next) => {
  // 如果在白名单内，直接next
  for(item of whitelist) {
    if (req.url.indexOf(item) > -1) {
      return next()
    }
  }
  let r = {}
  // 如果没有token，code 31
  if (!req.headers.token) {
    r.code = 31
    r = errorMsg(r)
  } else {
    // 否则查询是否登录
    const sql = 'SELECT * FROM accounts WHERE token = ?'
    const result = await query(collection, sql, req.headers.token)
    if (Array.isArray(result) && result.length) {
      return next()
    } else {
      r.code = 31
      r = errorMsg(r)
    }
  }
  
  return res.send(r)
}

module.exports = {
  valiToken
}