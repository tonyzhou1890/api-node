const Joi = require('joi')

/**
 * 获取诗词详情
 */
const getByIdSchema = Joi.object().keys({
  id: Joi.number().integer().required()
})

/**
 * 作者列表
 */
const authorListSchema = Joi.object().keys({
  page: Joi.number().integer(),
  rows: Joi.number().integer()
})

/**
 * 诗词列表
 */
const poemListSchema = Joi.object().keys({
  page: Joi.number().integer(),
  rows: Joi.number().integer(),
  author: Joi.string()
})

/**
 * 某位作者的诗词
 */
const getPoemsByAuthorSchema = Joi.object().keys({
  page: Joi.number().integer(),
  rows: Joi.number().integer(),
  author: Joi.string().required()
})

/**
 * 搜索
 */
const searchSchema = Joi.object().keys({
  page: Joi.number().integer(),
  rows: Joi.number().integer(),
  type: Joi.string().required(),
  keyword: Joi.string().required()
})

/**
 * 获取指定数量的随机诗词列表
 */
const poemListRandomSchema = Joi.object().keys({
  limit: Joi.number().integer().positive()
})

/**
 * 获取标签
 */
const tagsByTypeSchema = Joi.object().keys({
  type: Joi.string().required()
})

/**
 * 根据标签获取诗词
 */
const poemListByTagSchema = Joi.object().keys({
  field: Joi.string().required(),
  tag: Joi.string().required(),
  page: Joi.number().integer(),
  rows: Joi.number().integer()
})

module.exports = {
  getByIdSchema,
  authorListSchema,
  poemListSchema,
  getPoemsByAuthorSchema,
  searchSchema,
  poemListRandomSchema,
  tagsByTypeSchema,
  poemListByTagSchema
}