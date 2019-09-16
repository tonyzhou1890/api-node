const humps = require('humps')

const { dbOptions, collection } = require('./database')
const { query } = require('./query')
const { errorMsg, replaceValueLabelStr } = require('./utils')

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
 * 查询书籍列表
 * @param {object} params 页码条件，page 和 rows
 * @param {string} condition 查询条件
 */
async function queryBookList(params, condition) {
  let response = {}
  // 计算开始位置
  const start = (params.page - 1) * params.rows
  // 查询语句
  const sql = `SELECT uuid, name, type, author, front_cover_path, free, score, discount, discount_score FROM er_book${condition} LIMIT ${start}, ${params.rows}`
  // 查询结果
  const result = await query(collection, sql)

  // 统计结果数量
  const countSql = `SELECT COUNT(uuid) FROM er_book${condition}`
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
    response.total = countResult[0]['COUNT(uuid)']
  } else {
    response = errorMsg({ code: 2 })
  }
  return response
}

module.exports = {
  authorToBook,
  queryBookList
}