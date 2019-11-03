const Joi = require('joi')

/**
 * 账户列表校验
 */
const accountListSchema = Joi.object().keys({
  page: Joi.number(),
  rows: Joi.number(),
  nickname: Joi.string().allow('')
})

/**
 * 注册账户校验
 */
const accountRegisterSchema = Joi.object().keys({
  nickname: Joi.string().required(),
  pwd: Joi.string().required(),
  question: Joi.string().required(),
  answer: Joi.string().required()
})

/**
 * 更新账户校验
 */
const accountUpdateSchema = Joi.object().keys({
  uuid: Joi.string().required(),
  nickname: Joi.string(),
  pwd: Joi.string(),
  question: Joi.string(),
  answer: Joi.string(),
  gender: Joi.number().integer().min(0).max(1),
  birth: Joi.date()
})

/**
 * 更新账户权限
 */
const accountPermissionSchema = Joi.object().keys({
  uuid: Joi.string().required(),
  type: Joi.number().integer().min(1).max(3),
  disabled: Joi.number().integer().min(0).max(1),
  logout: Joi.number().integer().min(0).max(1)
})

/**
 * 登录校验
 */
const accountLoginSchema = Joi.object().keys({
  nickname: Joi.string().required(),
  pwd: Joi.string().required()
})

/**
 * 更新订阅应用
 */
const accountUpdateAppsSchema = Joi.object().keys({
  apps: Joi.string().required().allow(''),
  app: Joi.string().required(),
  type: Joi.boolean().required()
})

/**
 * 注册应用
 */
const appCreateSchema = Joi.object().keys({
  name: Joi.string().required(),
  summary: Joi.string().required(),
  link: Joi.string().uri().required(),
  icon: Joi.string().required(),
  relatedDomain: Joi.string().required(),
  accountsLimit: Joi.number().required(),
  tempAccount: Joi.string().allow(''),
  hidden: Joi.number().integer().min(0).max(1).required()
})

/**
 * 更新应用
 */
const appUpdateSchema = Joi.object().keys({
  uuid: Joi.string().required(),
  name: Joi.string().min(1).max(8),
  summary: Joi.string().min(0).max(30),
  link: Joi.string().uri(),
  icon: Joi.string(),
  relatedDomain: Joi.string(),
  accountsLimit: Joi.number(),
  tempAccount: Joi.string().allow(),
  hidden: Joi.number().integer().min(0).max(1)
})

/**
 * 积分列表校验
 * filter 1: 全部，2：获取，3：消费
 */
const scoreListSchema = Joi.object().keys({
  page: Joi.number(),
  rows: Joi.number(),
  filter: Joi.number()
})

module.exports = {
  accountListSchema,
  accountRegisterSchema,
  accountUpdateSchema,
  accountPermissionSchema,
  accountLoginSchema,
  accountUpdateAppsSchema,
  appCreateSchema,
  appUpdateSchema,
  scoreListSchema
}