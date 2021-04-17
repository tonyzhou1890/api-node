const Joi = require('joi')

/**
 * 获取单词详情
 */
const querySchema = Joi.object().keys({
  words: Joi.string().required()
})


module.exports = {
  querySchema
}