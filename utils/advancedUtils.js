const { dbOptions, collection } = require('./database')
const { query } = require('./query')
const { replaceValueLabelStr } = require('./utils')

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
    let len = authors.length
    for (let index = 0 ; index < len ; index++) {
      let item = authors[index]
      let authorSql = `SELECT name from er_author WHERE uuid = '${item}'`
      let authorResult = await query(collection, authorSql)
      if (Array.isArray(authorResult) && authorResult.length) {
        authors[index] = {
          value: item,
          label: authorResult[0].name
        }
      }
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

module.exports = {
  authorToBook
}