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
 * 书籍阅读信息更新
 */
const readingInfoUpdateSchema = Joi.object().keys({
  uuid: Joi.string().required(),
  percent: Joi.number().precision(2),
  point: Joi.number(),
  onShelf: Joi.number().min(0).max(1),
  readingStatus: Joi.number().min(0).max(1)
})

/**
 * 书籍阅读信息
 */
const readingInfoSchema = Joi.object().keys({
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
  parentSeries: Joi.string().max(40).allow(''),
  position: Joi.number().integer().min(1).max(2).required(),
  ISBN: Joi.string().max(40).allow(''),
  author: Joi.array().min(1).max(5).items(Joi.string().max(20).required()).required(),
  frontCover: Joi.string().allow(''),
  backCover: Joi.string().allow(''),
  text: Joi.string(),
  summary: Joi.string().max(1024),
  free: Joi.number().integer().min(0).max(1),
  score: Joi.number().integer().min(0),
  discount: Joi.number().integer().min(0).max(1),
  discountScore: Joi.number().integer().min(0),
  status: Joi.number().integer().min(0).max(1),
  tag: Joi.array().min(1).max(5).items(Joi.string().max(20).required()).required(),
  sequence: Joi.number()
})

/**
 * 空间管理书籍编辑
 */
const spaceBookUpdateSchema = Joi.object().keys({
  uuid: Joi.string().max(40).required(),
  name: Joi.string().max(40).required(),
  type: Joi.number().integer().min(1).max(3).required(),
  parentSeries: Joi.string().max(40).allow(''),
  position: Joi.number().integer().min(1).max(2).required(),
  ISBN: Joi.string().max(40).allow(''),
  author: Joi.array().min(1).max(5).items(Joi.string().max(20).required()).required(),
  frontCover: Joi.string().allow(''),
  backCover: Joi.string().allow(''),
  summary: Joi.string().max(1024),
  free: Joi.number().integer().min(0).max(1),
  score: Joi.number().integer().min(0),
  discount: Joi.number().integer().min(0).max(1),
  discountScore: Joi.number().integer().min(0),
  status: Joi.number().integer().min(0).max(1),
  tag: Joi.array().min(1).max(5).items(Joi.string().max(20).required()).required(),
  sequence: Joi.number()
})

/**
 * 空间管理书籍删除/禁用
 */
const spaceBookDeleteSchema = Joi.object().keys({
  uuid: Joi.string().max(40).required()
})

/**
 * 空间管理书籍启用
 */
const spaceBookUseSchema = Joi.object().keys({
  uuid: Joi.string().max(40).required()
})

/**
 * 购物车添加
 */
const shoppingCartAddSchema = Joi.object().keys({
  uuid: Joi.string().max(40).required()
})

/**
 * 购物车移除
 */
const shoppingCartSubtractSchema = Joi.object().keys({
  uuid: [Joi.string().max(40).required(), Joi.array().items(Joi.string().max(40)).required()]
})

/**
 * 购物车结算
 */
const shoppingCartSettleSchema = Joi.object().keys({
  uuid: [Joi.string().max(40).required(), Joi.array().items(Joi.string().max(40)).required()]
})

/**
 * 积分更新
 */
const updateScoreSchema = Joi.object().keys({
  score: Joi.string().required(),
  totalScore: Joi.number().required(),
  way: Joi.string().required(),
  appUuid: Joi.string().max(40).required(),
  accountUuid: Joi.string().max(40).required()
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
  readingInfoUpdateSchema,
  readingInfoSchema,
  spaceBookListSchema,
  spaceBookCreateSchema,
  spaceBookUpdateSchema,
  spaceBookDeleteSchema,
  spaceBookUseSchema,
  shoppingCartAddSchema,
  shoppingCartSubtractSchema,
  shoppingCartSettleSchema,
  updateScoreSchema
}