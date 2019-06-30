/**
 * 连接数据库配置
 */
const dbOptions = {
  host: 'localhost',
  user: 'root',
  password: 'pwd',
  port: '3306'
}

const collection = 'collection'

module.exports = {
  dbOptions,
  collection
}