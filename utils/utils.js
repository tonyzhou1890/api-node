const fs = require('fs')
const moment = require('moment')

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
    case 32:
      obj.errorMsg = '用户名或密码错误'
      break
    case 33:
      obj.errorMsg = '账户已禁用，无法完成此操作'
      break
    case 34:
      obj.errorMsg = '账户已注销，无法完成此操作'
      break
    case 35:
      obj.errorMsg = '此账号没有相关权限'
      break
    case 40:
      obj.errorMsg = '记录不存在'
      break
    case 50:
      obj.errorMsg = '此应用订阅人数已达上限'
      break
    default:
      obj.errorMsg = '未知错误'
      break;
  }
  return obj
}

/**
 * 文件存储到磁盘
 * @param {string} path 路径
 * @param {string, Buffer} data 存储的数据 
 */
const writeFile = async (path, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, (err) => {
      if (err) {
        console.log(err)
        resolve({
          status: false,
          errorMsg: err
        })
      } else {
        resolve({
          status: true,
          path
        })
      }
    })
  })
}

/**
 * 将base64转成图片存储
 * @param {string} path
 * @param {string} base64
 */
const base64ToFile = async (path, base64) => {
  const reg = /^data:image\/\w+;base64,/
  let str = base64.replace(reg, '')
  str = str.replace(/\s/g, '+')
  let dataBuffer = new Buffer(str, 'base64')
  return writeFile(path, dataBuffer)
}

/**
 * 分析字符串，如果是base64就按照参数存储
 * @param {string} basePath 基本路径
 * @param {string} fileName 文件名，不包含后缀
 * @param {string} base64 字符串
 */
const strToImageFile = async (basePath, fileName, base64) => {
  const reg = /^data:image\/\w+;base64,/
  return new Promise( async (resolve, reject) => {
    if (reg.test(base64)) {
      const matchs = base64.match(/^(data:image\/(\w+);base64,)/)
      if (matchs) {
        const type = matchs[2]
        let path = basePath + fileName + '.' + type
        const res = await base64ToFile(path, base64)
        resolve(res)
      } else {
        resolve({
          status: false,
          errorMsg: '无效的图片格式'
        })
      }
    } else {
      resolve({
        status: true,
        path: base64
      })
    }
  })
}

/**
 * 计算base64大小，默认单位为kb，返回对象有三个属性：isBase64，size，oversize
 * @param {string} base64 字符串
 * @param {number} limit 限制大小
 */
const sizeOfBase64 = (base64, limit) => {
  const res = {
    isBase64: false,
    size: null,
    oversize: false
  }
  const reg = /^data:image\/\w+;base64,/
  if (reg.test(base64)) {
    res.isBase64 = true
    // 去除开头文件标识和最后的等号
    let str = base64.replace(/(^data:image\/\w+;base64,|=.*)/g, '')
    res.size = str.length * 3 / 4 / 1024
    if (res.size > limit) {
      res.oversize = true
    }
    return res
  } else {
    return res
  }
}

/**
 * 格式化时间
 * 没有返回值
 * @param {array} data 含有需要格式化属性的对象数组
 * @param {string} format 时间格式
 * @param {string} field 需要格式化的属性名称
 */
const formatTime = (data, format, field) => {
  let f = format || 'YYYY-MM-DD HH:mm:ss'
  let p = field || 'createTime'
  // 创建时间格式改一下
  data.map(item => {
    item[p] = item[p] ? moment(item[p]).format('YYYY-MM-DD HH:mm:ss') : ''
  })
}

/**
 * 将符号分隔的字符串替换成对应的名称
 * @param {string} str 字符串
 * @param {array} arr 替换数组，元素是 value label 组成的对象
 * @param {string} joinChar 连字符
 */
const replaceValueLabelStr = (str, arr, joinChar) => {
  let s = str || ''
  let a = arr || []
  let c = joinChar || ','
  let strs = str.split(c)
  strs.map((item, index) => {
    arr.map(rule => {
      if (rule.value === item) {
        strs[index] = rule.label
      }
    })
  })
  return strs.join(joinChar)
}

module.exports = {
  errorMsg,
  writeFile,
  base64ToFile,
  strToImageFile,
  sizeOfBase64,
  formatTime,
  replaceValueLabelStr
}