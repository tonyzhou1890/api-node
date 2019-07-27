const express = require('express')
const url = require('url')
const { collection } = require('../utils/database')
const { query } = require('../utils/query')
const { errorMsg } = require('../utils/utils')
const { TypePermission } = require('../utils/setting')

/**
 * token验证白名单
 */
const whitelist = [
  '/register/account/register',
  '/register/account/login'
]

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
  // 如果没有token，code 31
  if (!req.headers.token) {
    r.code = 31
    r = errorMsg(r)
  } else {
    // 否则查询是否登录
    const sql = 'SELECT * FROM accounts WHERE token = ?'
    const result = await query(collection, sql, req.headers.token)
    if (Array.isArray(result) && result.length) {
      req.__record = result[0]
      return next()
    } else {
      r.code = 31
      r = errorMsg(r)
    }
  }
  
  return res.send(r)
}

/**
 * 类型/禁用/注销权限校验
 */
const valiPermission = async (req, res, next) => {
  let response = {}
  // 如果在白名单内，直接next
  if (whitelist.includes(req.__transUrl.pathname)) {
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