const humps = require('humps')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const Joi = require('joi')

const { dbOptions, collection } = require('./database')
const { query, generateInsertRows, generateUpdateClause, isInsertSuccess, isUpdateSuccess } = require('./query')
const { errorMsg, replaceValueLabelStr } = require('./utils')
const { updateScoreSchema } = require('../schema/enjoyReading')

/**
 * 查询书本的作者并替换author的值
 * @param {array} books 书籍列表
 */
async function authorToBook(books) {
  let data = JSON.parse(JSON.stringify(books))
  let authors = []
  // 将所有的作者放到一个数组里
  data.map(item => {
    if (item.author) {
      authors.push(...item.author.split(','))
    }
  })
  // 数组去重
  authors = [...new Set(authors)]
  // 如果有需要查询的作者，则查询
  if (authors.length) {
    // let len = authors.length
    // for (let index = 0 ; index < len ; index++) {
    //   let item = authors[index]
    //   let authorSql = `SELECT name from er_author WHERE uuid = '${item}'`
    //   let authorResult = await query(collection, authorSql)
    //   if (Array.isArray(authorResult) && authorResult.length) {
    //     authors[index] = {
    //       value: item,
    //       label: authorResult[0].name
    //     }
    //   }
    // }
    let authorStr = authors.map(item => `'${item}'`).join(',')
    let authorSql = `SELECT name, uuid from er_author WHERE uuid IN (${authorStr})`
    let authorResult = await query(collection, authorSql)
    if (Array.isArray(authorResult) && authorResult.length) {
      authorResult.map(item => {
        let index = authors.indexOf(item.uuid)
        authors[index] = {
          value: item.uuid,
          label: item.name
        }
      })
    }
  }
  // 作者查询完成后，将所有书籍的作者 uuid 替换为作者名字
  data.map(item => {
    if (item.author) {
      // 替换字符串
      item.author = replaceValueLabelStr(item.author, authors)
    }
  })
  return data
}

/**
 * 查询书本的标签并替换 tags 的值
 * @param {array} books 书籍列表
 */
async function tagToBook(books) {
  let data = JSON.parse(JSON.stringify(books))
  let tags = []
  // 将所有的标签放到一个数组里
  data.map(item => {
    if (item.tag) {
      tags.push(...item.tag.split(','))
    }
  })
  // 数组去重
  tags = [...new Set(tags)]
  // 如果有需要查询的标签，则查询
  if (tags.length) {
    let tagStr = tags.map(item => `'${item}'`).join(',')
    let tagSql = `SELECT tag, uuid from er_tag WHERE uuid IN (${tagStr})`
    let tagResult = await query(collection, tagSql)
    if (Array.isArray(tagResult) && tagResult.length) {
      tagResult.map(item => {
        let index = tags.indexOf(item.uuid)
        tags[index] = {
          value: item.uuid,
          label: item.tag
        }
      })
    }
  }
  // 标签查询完成后，将所有书籍的标签 uuid 替换为标签文字
  data.map(item => {
    if (item.tag) {
      // 替换字符串
      item.tag = replaceValueLabelStr(item.tag, tags)
    }
  })
  return data
}

/**
 * 查询书籍列表
 * @param {object} params 页码条件，page 和 rows
 * @param {string} condition 查询条件
 */
async function queryBookList(params, condition, listSql, totalSql) {
  let response = {}
  // 计算开始位置
  const start = (params.page - 1) * params.rows
  // 查询语句
  const sql = listSql || `SELECT uuid, name, type, author, front_cover_path, free, score, discount, discount_score FROM er_book${condition} LIMIT ${start}, ${params.rows}`
  // 查询结果
  const result = await query(collection, sql)

  // 统计结果数量
  const countSql = totalSql || `SELECT COUNT(uuid) FROM er_book${condition}`
  const countResult = await query(collection, countSql)
  // 如果一切顺利，进入下一步
  if (Array.isArray(result) && Array.isArray(countResult) && countResult.length) {
    let data = humps.camelizeKeys(result)
    // 查询作者
    if (data.length) {
      data = await authorToBook(data)
    }
    response = errorMsg({ code: 0 })
    response.data = data
    response.total = Object.values(countResult[0])[0]
  } else {
    response = errorMsg({ code: 2 })
  }
  return response
}

/**
 * 获取作者/标签信息，如果不存在，会新增
 * @param {string} table 要操作的表
 * @param {string} field 列表元素对应的字段名称
 * @param {array} list 作者/标签名称数组
 */
async function getAuthorsOrTags(table, field, list) {
  // 查询已有作者
  let querySql = `SELECT * FROM ${table} WHERE ${field} IN (${list.map(item => `"${item}"`).join(',')})`
  let res = await query(collection, querySql)
  if (Array.isArray(res)) {
    let hasRows = res.map(item => item[field])
    // 过滤出未有的元素
    noRows = list.map(item => {
      if (hasRows.includes(item)) return null
      return item
    }).filter(item => item !== null)
    // 如果有未录入的元素，则插入
    if (noRows.length) {
      let rows = noRows.map(item => ({
        uuid: uuidv1(),
        [field]: item,
        createTime: moment().format('YYYY-MM-DD HH:mm:ss')
      }))
      // 生成 sql
      let insertSql = generateInsertRows(table, rows)
      let insertResult = await query(collection, insertSql)
      console.log(insertSql, insertResult)
      // 重新查询
      res = await query(collection, querySql)
      if (!Array.isArray(res)) return errorMsg({ code: 2 })
      res = humps.camelizeKeys(res)
    }
    // 生成详情列表
    return list.map(row => {
      return res.find(item => item[field] === row)
    })
  } else {
    return errorMsg({ code: 2 })
  }
}

/**
 * 更新积分--插入积分记录，更新账户积分
 * @param {object} params 相关信息
 */
async function updateScore(params) {
  let response = {}
  const vali = Joi.validate(params, updateScoreSchema, { allowUnknown: true })
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 添加 uuid 和 createTime 字段
    params.uuid = uuidv1(),
    params.createTime = moment().format('YYYY-MM-DD HH:mm:ss')
    // 插入积分记录
    const insertSql = generateInsertRows('score_record', [params])
    if (isInsertSuccess(await query(collection, insertSql))) {
      // 更新账户积分
      const updateSql = generateUpdateClause('accounts', { score: params.totalScore}) + ` WHERE uuid = '${params.accountUuid}'`
      if(isUpdateSuccess(await query(collection, updateSql))) {
        response = errorMsg({ code: 0 })
      } else {
        response = errorMsg({ code: 4 })
      }
    } else {
      response = errorMsg({ code: 3 })
    }
  }
  return response
}

module.exports = {
  authorToBook,
  tagToBook,
  queryBookList,
  getAuthorsOrTags,
  updateScore
}