const mysql = require('mysql')
const humps = require('humps')
const { dbOptions } = require('./database')

// 接收一个sql语句 以及所需的values
// 这里接收第二参数values的原因是可以使用mysql的占位符 '?'
// 比如 query(`select * from my_database where id = ?`, [1])

let query = function(db, sql, values ) {
  const dbOptionsTemp = JSON.parse(JSON.stringify(dbOptions))
  dbOptionsTemp.database = db
  const pool = mysql.createPool(dbOptionsTemp)
  // 返回一个 Promise
  return new Promise(( resolve, reject ) => {
    pool.getConnection(function(err, connection) {
      if (err) {
        reject( err )
      } else {
        connection.query(sql, values, ( err, rows) => {

          if ( err ) {
            reject( err )
          } else {
            resolve( rows )
          }
          // 结束会话
          connection.release()
        })
      }
    })
  })
}

/**
 * 根据某个字段判断数据库数据唯一性
 */
let unique = async function(db, table, field, param) {
  const sql = `SELECT * FROM ${table} WHERE ${field} = ?`
  return new Promise(async (resolve, reject) => {
    const result = await query(db, sql, [param])
    if (Array.isArray(result)) {
      resolve(result)
    } else {
      reject(false)
    }
  })
}

/**
 * 生成更新语句
 * @param {string} table 表名
 * @param {object} obj 需要更新的对象
 * @param {array} fields 需要更新的字段，驼峰式，可选
 */
let generateUpdateClause = function(table, obj, fields) {
  let sql = `UPDATE ${table} SET `
  let clause = ''
  // 如果 fields 是数组，则生成更新对象
  let temp = null
  if (Array.isArray(fields)) {
    temp = {}
    fields.map(key => {
      if (obj[key] !== undefined) {
        temp[key] = obj[key]
      }
    })
  } else {
    temp = obj
  }
  Object.keys(temp).map(item => {
    if (typeof temp[item] === 'string') {
      clause += `${humps.decamelize(item)}='${temp[item]}', `
    } else {
      clause += `${humps.decamelize(item)}=${temp[item]}, `
    }
  })
  clause = clause.slice(0, -2)
  return sql + clause
}

/**
 * 更新是否成功
 */
let isUpdateSuccess = function(result) {
  return typeof result === 'object' && result.affectedRows
}

/**
 * 更新插入成功
 */
let isInsertSuccess = function(result) {
  return typeof result === 'object' && result.insertId
}

module.exports =  {
  query,
  limit: 10,
  unique,
  generateUpdateClause,
  isUpdateSuccess,
  isInsertSuccess
}