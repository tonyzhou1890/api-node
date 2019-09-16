const Joi = require('joi')

/**
 * 最新上架列表
 * filter: 1:全部, 2:免费，3:付费
 */
const specialListLatestSchema = Joi.object().keys({
  page: Joi.number(),
  rows: Joi.number(),
  filter: Joi.number()
})

/**
 * 打折书籍列表
 * sort: 1:默认， 2：价格由低到高，3：价格由高到低
 */
const specialListDiscountSchema = Joi.object().keys({
  page: Joi.number(),
  rows: Joi.number(),
  sort: Joi.number()
})

/**
 * 免费书籍列表
 */
const specialListFreeSchema = Joi.object().keys({
  page: Joi.number(),
  rows: Joi.number()
})

module.exports = {
  specialListLatestSchema,
  specialListDiscountSchema,
  specialListFreeSchema
}