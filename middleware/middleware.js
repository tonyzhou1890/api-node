const express = require('express')
const url = require('url')
const { collection } = require('../utils/database')
const { query } = require('../utils/query')
const { errorMsg } = require('../utils/utils')
const { TypePermission } = require('../utils/setting')
const { enjoyReadingGraylist } = require('./graylist')
const humps = require('humps')

/**
 * token验证白名单
 */
const whitelist = [
  '/register/account/register',
  '/register/account/login'
]

/**
 * token 验证灰名单，如果有token，检测 token，如果 token 有效，一般操作，查询用户信息，如果 token 无效，record 字段为 ‘invalid’，如果没有 token，record 字段为 null
 */
const graylist = [...enjoyReadingGraylist]

/**
 * 验证token
 */
const valiToken = async (req, res, next) => {
  req.__transUrl = url.parse(req.url, true)
  // 如果在白名单内，直接next
  if (whitelist.includes(req.__transUrl.pathname)) {
    return next()
  }
  let r = {}
  // 如果没有token
  if (!req.headers.token) {
    // 如果不在灰名单，code 31
    if (!graylist.includes(req.__transUrl.pathname)) {
      r.code = 31
      r = errorMsg(r)
    } else {
      // 在灰名单里面，进入下一步
      req.__record = null
      return next()
    }
  } else {
    // 否则查询是否登录
    const sql = 'SELECT * FROM accounts WHERE token = ?'
    const result = await query(collection, sql, req.headers.token)
    if (Array.isArray(result) && result.length) {
      req.__record = humps.camelizeKeys(result[0])
      return next()
    } else {
      // 如果在灰名单里面，并且查询没有报错，__record 设为 ‘invalid’
      if (Array.isArray(result) && graylist.includes(req.__transUrl.pathname)) {
        req.__record = 'invalid'
        return next()
      } else {
        // 否则 code 31
        r.code = 31
        r = errorMsg(r)
      }
    }
  }
  
  return res.send(r)
}

/**
 * 类型/禁用/注销权限校验
 */
const valiPermission = async (req, res, next) => {
  let response = {}
  // 如果在白名单/灰名单内，直接next
  if (whitelist.includes(req.__transUrl.pathname) || graylist.includes(req.__transUrl.pathname)) {
    return next()
  }
  // 如果账号已经注销，直接返回结束请求
  if (req.__record.logout) {
    response = errorMsg({ code: 34 })
    return res.send(response)
  } else {
    // 检查权限名单
    const length = TypePermission.length
    let permission = null
    for (let i = 0; i < length; i++) {
      if (req.__transUrl.pathname === TypePermission[i].path) {
        permission = TypePermission[i]
        break
      }
    }

    // 如果在权限名单，继续
    if (permission) {
      // 如果名单说明禁用账号不可操作，并且此账号确实禁用，结束请求
      if (!permission.disabled && req.__record.disabled) {
        response = errorMsg({ code: 33 })
        return res.send(response)
      } else {
        // 否则继续检查类型权限
        if (Array.isArray(permission.type)) {
          if (permission.type.includes(req.__record.type)) {
            return next()
          } else {
            response = errorMsg({ code: 35 })
            return res.send(response)
          }
        } else {
          return next()
        }
      }
    } else {
      // 如果不在，直接下一步
      return next()
    }
  }
}

module.exports = {
  valiToken,
  valiPermission
}