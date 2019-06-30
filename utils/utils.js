/**
 * 插入错误信息
 */
const errorMsg = (obj, param) => {
  switch (obj.code) {
    case 0:
      obj.errorMsg = ''
      break;
    case 1:
      obj.errorMsg = '数据库连接错误'
      break
    case 2:
      obj.errorMsg = '查询错误'
      break
    case 3:
      obj.errorMsg = '插入错误'
      break
    case 4:
      obj.errorMsg = '更新错误'
      break
    case 5:
      obj.errorMsg = '删除错误'
      break
    case 20:
      obj.errorMsg = `参数${param}错误`
      break
    case 21:
      obj.errorMsg = `参数${param}不能为空`
      break
    case 22:
      obj.errorMsg = `参数${param}类型错误`
      break
    case 23:
      obj.errorMsg = `参数错误`
      break
    case 24:
      obj.errorMsg = param
      break
    case 30:
      obj.errorMsg = '用户不存在'
      break
    case 31:
      obj.errorMsg = '用户未登录'
      break
    default:
      obj.errorMsg = '未知错误'
      break;
  }
  return obj
}

module.exports = {
  errorMsg
}