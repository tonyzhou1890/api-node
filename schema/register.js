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

module.exports = {
  accountListSchema,
  accountRegisterSchema
}