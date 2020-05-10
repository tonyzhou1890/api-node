const express = require('express')
const createError = require('http-errors')
const url = require('url')
const { collection } = require('../utils/database')
const { query, unique } = require('../utils/query')
const { errorMsg, formatTime } = require('../utils/utils')
const { TypePermission, EnjoyReadingPermission } = require('../utils/setting')
const { enjoyReadingGraylist } = require('./graylist')
const { enjoyReadingWhitelist, poemWhitelist } = require('./whitelist')
const humps = require('humps')

/**
 * token验证白名单
 */
const whitelist = [
  '/',
  '/register/account/register',
  '/register/account/login',
  ...enjoyReadingWhitelist,
  '/poem',
  ...poemWhitelist
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
  // 检查路径是否存在
  if (global.routes.find(item => item.method === req.method && item.path === req.__transUrl.pathname) === undefined) {
    return next(createError(404))
  }
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
    let result = await query(collection, sql, req.headers.token)
    if (Array.isArray(result) && result.length) {
      result = humps.camelizeKeys(result)
      formatTime(result, null, 'registerTime')
      formatTime(result, null, 'loginTime')
      formatTime(result, null, 'lastLoginTime')
      formatTime(result, null, 'expire')
      req.__record = result[0]
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

/**
 * 享阅验证中间件
 */
const valiEnjoyReading = async (req, res, next) => {
  // 如果不是享阅路径的请求，或者在白名单，直接next
  if (req.__transUrl.pathname.indexOf('/enjoyReading') !== 0 || whitelist.includes(req.__transUrl.pathname)) {
    return next()
  }
  let response = {}

  // 如果有注册中心的账户信息，则尝试获取享阅账号信息
  if (req.__record !== null && req.__record !== 'invalid') {
    let u = await unique(collection, 'er_accounts', 'account_uuid', req.__record.uuid)
    // 如果查到了，则说明账户有该应用的信息
    if (u && u[0]) {
      u = humps.camelizeKeys(u)
      formatTime(u)
      req.__enjoyReadingRecord = u[0]
    }
  }

  // 检查账户有没有订阅享阅应用，如果没有订阅，__record 改为 null，__enjoyReadingRecord 也要改成 null
  // 改成 null 后，需要权限的接口会拦截请求，灰名单接口会将请求当成一般请求处理
  if (req.__record !== null && req.__record !== 'invalid') {
    let appSql = `SELECT * FROM apps WHERE related_domain LIKE '%enjoy-reading%'`
    let appResult = await query(collection, appSql)
    if (!(Array.isArray(appResult) && appResult[0] && req.__record.apps.includes(appResult[0].uuid))) {
      req.__record = null
      req.__enjoyReadingRecord = null
    } else {
      req.__appInfo = humps.camelizeKeys(appResult)[0]
    }
  }

  // 如果在灰名单中，直接next，不需要权限检查
  if (graylist.includes(req.__transUrl.pathname)) {
    return next()
  }

  // 检查角色权限名单
  const length = EnjoyReadingPermission.length
  let permission = null
  for (let i = 0; i < length; i++) {
    if (req.__transUrl.pathname === EnjoyReadingPermission[i].path) {
      permission = EnjoyReadingPermission[i]
      break
    }
  }

  // 如果在权限名单，检查注册中心账户记录和应用账户记录，并且需要检查角色
  if (permission) {
    // 检查注册中心账户记录和应用账户记录
    if (req.__record && req.__enjoyReadingRecord !== null) {
      // 是否需要角色检查
      if (Array.isArray(permission.roles)) {
        // 是否符合角色要求
        if (permission.roles.includes(req.__enjoyReadingRecord.role)) {
          return next()
        } else {
          response = errorMsg({ code: 35 })
          return res.send(response)
        }
      } else {
        return next()
      }
    } else {
      response = errorMsg({ code: 35 })
      return res.send(response)
    }
    
  } else {
    // 否则直接下一步
    return next()
  }
  
}

module.exports = {
  valiToken,
  valiPermission,
  valiEnjoyReading
}