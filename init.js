// 需要新建好数据库后和相关表后再执行
const { query, generateInsertRows, isInsertSuccess } = require('./utils/query')
const uuidv1 = require('uuid/v1')
const { collection } = require('./utils/database')

let erAppInfoInitRows = [
  {
    uuid: uuidv1(),
    key: 'allocationOfSpaceAccounts',
    value: 30,
    class: 'space',
    memo: '可分配空间的账户数量'
  },
  {
    uuid: uuidv1(),
    key: 'hasSpaceAccounts',
    value: 0,
    class: 'space',
    memo: '已经分配空间账户数量，不包括管理员'
  },
  {
    uuid: uuidv1(),
    key: 'sizeOfSpace',
    value: 100,
    class: 'space',
    memo: '每个账户分配的空间大小，单位M，不包括管理员'
  }
]

// 初始化 er_app_info 函数
async function initErAppInfo() {
  let erAppInfoInitResult = await query(collection, generateInsertRows('er_app_info', erAppInfoInitRows))

  if (isInsertSuccess(erAppInfoInitResult)) {
    console.log('er_app_info 初始化成功')
  } else {
    console.log('er_app_info 初始化失败')
  }
  
  process.exit()
}

initErAppInfo()