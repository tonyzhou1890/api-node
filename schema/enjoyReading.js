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

/**
 * 标签书籍列表
 */
const tagBookListSchema = Joi.object().keys({
  page: Joi.number(),
  rows: Joi.number(),
  tag: Joi.string().required(),
  filter: Joi.number()
})

/**
 * 搜索书籍列表
 */
const searchBookListSchema = Joi.object().keys({
  page: Joi.number(),
  rows: Joi.number(),
  keyword: Joi.string().required().allow(''),
})

/**
 * 书库书籍列表
 */
const storeBookListSchema = Joi.object().keys({
  page: Joi.number(),
  rows: Joi.number(),
  keyword: Joi.string().required().allow(''),
  position: Joi.number()
})

/**
 * 书籍详情
 */
const bookDetailSchema = Joi.object().keys({
  uuid: Joi.string().required()
})

/**
 * 书籍推荐
 */
const bookRecommendSchema = Joi.object().keys({
  uuid: Joi.string().required()
})

module.exports = {
  specialListLatestSchema,
  specialListDiscountSchema,
  specialListFreeSchema,
  tagBookListSchema,
  searchBookListSchema,
  storeBookListSchema,
  bookDetailSchema,
  bookRecommendSchema
}