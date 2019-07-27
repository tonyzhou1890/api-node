const Joi = require('joi')

/**
 * 账户列表校验
 */
const accountListSchema = Joi.object().keys({
  page: Joi.number(),
  rows: Joi.number(),
  name: Joi.string()
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
  uuid: Joi.string().required()
})

/**
 * 登录校验
 */
const accountLogin = Joi.object().keys({
  nickname: Joi.string().required(),
  pwd: Joi.string().required()
})

module.exports = {
  accountListSchema,
  accountRegisterSchema,
  accountUpdateSchema,
  accountLogin
}