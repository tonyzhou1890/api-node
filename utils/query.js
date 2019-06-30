const mysql = require('mysql')
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
  console.log(result.length)
      resolve(result.length)
    } else {
      reject(1)
    }
  })
}

module.exports =  {
  query,
  limit: 10,
  unique
}