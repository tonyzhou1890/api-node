const Joi = require('joi')

/**
 * 最新上架列表
 * filter: 1:全部, 2:免费，3:付费
 */
const specialListLatestSchema = Joi.object().keys({
  page: Joi.number().integer(),
  rows: Joi.number().integer(),
  filter: Joi.number().integer()
})

/**
 * 打折书籍列表
 * sort: 1:默认， 2：价格由低到高，3：价格由高到低
 */
const specialListDiscountSchema = Joi.object().keys({
  page: Joi.number().integer(),
  rows: Joi.number().integer(),
  sort: Joi.number().integer()
})

/**
 * 免费书籍列表
 */
const specialListFreeSchema = Joi.object().keys({
  page: Joi.number().integer(),
  rows: Joi.number().integer()
})

/**
 * 标签书籍列表
 */
const tagBookListSchema = Joi.object().keys({
  page: Joi.number().integer(),
  rows: Joi.number().integer(),
  tag: Joi.string().required(),
  filter: Joi.number().integer()
})

/**
 * 搜索书籍列表
 */
const searchBookListSchema = Joi.object().keys({
  page: Joi.number().integer(),
  rows: Joi.number().integer(),
  keyword: Joi.string().required().allow(''),
})

/**
 * 书库书籍列表
 */
const storeBookListSchema = Joi.object().keys({
  page: Joi.number().integer(),
  rows: Joi.number().integer(),
  keyword: Joi.string().required().allow(''),
  position: Joi.number().integer()
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

/**
 * 空间管理书籍列表
 */
const spaceBookListSchema = Joi.object().keys({
  page: Joi.number().integer(),
  rows: Joi.number().integer(),
  keyword: Joi.string().required().allow(''),
  position: Joi.number().integer()
})

/**
 * 空间管理书籍新增
 */
const spaceBookCreateSchema = Joi.object().keys({
  name: Joi.string().max(40).required(),
  type: Joi.number().integer().min(1).max(3).required(),
  parentSeries: Joi.string().max(40),
  position: Joi.number().integer().min(1).max(2).required(),
  ISBN: Joi.string().max(40),
  author: Joi.array().min(1).max(5).items(Joi.string().max(20).required()),
  frontCover: Joi.string().base64(),
  backCover: Joi.string().base64(),
  text: Joi.string(),
  summary: Joi.string().max(1024),
  free: Joi.number().integer().min(0).max(1),
  score: Joi.number().integer().min(0),
  discount: Joi.number().integer().min(0).max(0),
  discountScore: Joi.number().integer().min(0),
  status: Joi.number().integer().min(0).max(1),
  tag: Joi.array().min(1).max(5).items(Joi.string().max(20).required()),
  sequence: Joi.number()
})

/**
 * 空间管理书籍编辑
 */
const spaceBookUpdateSchema = Joi.object().keys({
  uuid: Joi.string().max(40).required(),
  name: Joi.string().max(40).required(),
  type: Joi.number().integer().min(1).max(3).required(),
  parentSeries: Joi.string().max(40),
  position: Joi.number().integer().min(1).max(2).required(),
  ISBN: Joi.string().max(40),
  author: Joi.array().min(1).max(5).items(Joi.string().max(20).required()),
  frontCover: Joi.string(),
  backCover: Joi.string(),
  summary: Joi.string().max(1024),
  free: Joi.number().integer().min(0).max(1),
  score: Joi.number().integer().min(0),
  discount: Joi.number().integer().min(0).max(0),
  discountScore: Joi.number().integer().min(0),
  status: Joi.number().integer().min(0).max(1),
  tag: Joi.array().min(1).max(5).items(Joi.string().max(20).required()),
  sequence: Joi.number()
})

module.exports = {
  specialListLatestSchema,
  specialListDiscountSchema,
  specialListFreeSchema,
  tagBookListSchema,
  searchBookListSchema,
  storeBookListSchema,
  bookDetailSchema,
  bookRecommendSchema,
  spaceBookListSchema,
  spaceBookCreateSchema,
  spaceBookUpdateSchema
}