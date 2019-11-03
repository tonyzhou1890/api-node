const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause, generateInsertRows, isUpdateSuccess, isInsertSuccess, isDeleteSuccess } = require('../utils/query')
const { errorMsg, writeFile, deleteFile, strToImageFile, sizeOfBase64, formatTime, replaceValueLabelStr } = require('../utils/utils')
const { tagToBook, authorToBook, queryBookList, getAuthorsOrTags, updateScore } = require('../utils/advancedUtils')
const { spaceBookListSchema, spaceBookCreateSchema, spaceBookUpdateSchema, spaceBookDeleteSchema } = require('../schema/enjoyReading')
const { LoginExpireTime, RegisterAccountType, EnjoyReadingRole } = require('../utils/setting')

/**
 * 空间管理书籍 列表
 */
async function spaceBookList(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, spaceBookListSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 查询条件
    const params = {
      page: req.body.rows && req.body.page || 1,
      rows: req.body.page && req.body.rows || limit,
      keyword: req.body.keyword,
      position: req.body.position || 0
    }

    // 计算开始位置
    const start = (params.page - 1) * params.rows

    // 从属系列为空，则代表是单本/系列名
    let condition = ` WHERE parent_series = '' AND name LIKE '%${params.keyword}%' AND upload_account_uuid = '${req.__record.uuid}'`

    // 如果需要根据书籍位置过滤，则添加过滤条件
    if (params.position) {
      condition += ` AND position = ${params.position}`
    }

    condition += ` ORDER BY create_time DESC`

    let listSql = `SELECT * 
      FROM 
      er_book${condition} LIMIT ${start}, ${params.rows}`

    let totalSql = `SELECT COUNT(uuid) FROM er_book${condition}`

    response = await queryBookList(params, condition, listSql, totalSql)

    // 格式化时间
    if (response.code === 0) {
      formatTime(response.data)
      response.data = await tagToBook(response.data)
      // 提取系列的 uuid
      const bookUuids = []
      response.data.map(item => {
        // 类型为2 或 3 则为系列
        if (item.type === 2 || item.type === 3) {
          bookUuids.push(item.uuid)
        }
      })
      // 如果有系列，查询子册
      if (bookUuids.length) {
        let temp = bookUuids.map(item => `'${item}'`).join(',')
        // 查询子册
        let childrenSql = `SELECT * FROM er_book WHERE parent_series IN (${temp})`
        // 统计子册，无意义，只是为了使用 queryBookList 这个方法
        let countChildrenSql = `SELECT COUNT(uuid) FROM er_book WHERE parent_series IN (${temp})`
        let children = await queryBookList({}, condition, childrenSql, countChildrenSql)
        // 如果没有报错
        if (children.code === 0) {
          // 如果有子册，则分类排序
          if (children.data.length) {
            // 首先时间格式化，以及标签转换
            formatTime(children.data)
            children.data = await tagToBook(children.data)
            // 整体排序
            children.data = children.data.sort((a, b) => a.sequence - b.sequence)
            children.data.map(item => {
              response.data.map(parent => {
                if (parent.uuid === item.parentSeries) {
                  if (!Array.isArray(parent.children)) {
                    parent.children = []
                  }
                  parent.children.push(item)
                }
              })
            })
          }
        } else {
          response = errorMsg({ code: 2, data: undefined })
        }
      }
    }
  }
  return res.send(response);
}

/**
 * 空间管理书籍新增/编辑
 */
async function spaceBookCreateOrUpdate(req, res, next) {
  let response = {}
  // 指定 schema
  let schema = spaceBookCreateSchema
  if (req.body.uuid) {
    schema = spaceBookUpdateSchema
  }
  const vali = Joi.validate(req.body, schema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    let temp = {}, ERRecord = req.__enjoyReadingRecord
    const fields = ['uuid', 'name', 'type', 'parentSeries', 'position', 'ISBN', 'author', 'frontCover', 'frontCoverName', 'backCover', 'backCoverName', 'text', 'summary', 'free', 'score', 'discount', 'discountScore', 'status', 'tag', 'sequence']
    fields.map(key => {
      if (req.body[key] !== undefined) {
        temp[key] = req.body[key]
      }
    })

    // 只能新增单本
    if (temp.type !== 1) {
      response = errorMsg({ code: 24 }, '只能新增单本')
      return res.send(response)
    }

    // 如果是编辑，需要查询原来的书籍信息，以及一些检查
    let oldBook = null 
    if (temp.uuid) {
      // 查询原书籍信息
      oldBook = await unique(collection, 'er_book', 'uuid', temp.uuid)
      if (oldBook.length) {
        oldBook = humps.camelizeKeys(oldBook[0])
      } else {
        response = errorMsg({ code: 40 })
        return res.send(response)
      }
      // 不能将书城书籍移到个人空间
      if (oldBook.position === 2 && temp.position === 1) {
        response = errorMsg({ code: 24 }, '不能将书城书籍移到个人空间')
        return res.send(response)
      }
    }

    // 如果需要存储到书城，检查是否可以存储到书城
    if (temp.position === 2) {
      // 普通角色无法存储到书城
      if (ERRecord.role === EnjoyReadingRole.common.value) {
        response = errorMsg({ code: 24 }, '该账户无法添加书籍到书城')
        return res.send(response)
      }
      // 出版社需要 ISBN 号，
      // ISBN 改成非必填，并且可以重复
      // if (ERRecord.role === EnjoyReadingRole.publisher.value && !temp.ISBN) {
      //   response = errorMsg({ code: 24 }, 'ISBN 不能为空')
      //   return res.send(response)
      // }
    }

    // 处理封面，封底，内容
    response = await dealBookContent(temp, oldBook, ERRecord) || {}
    if (response.code !== undefined && response.code !== 0) {
      return res.send(response)
    }

    // 处理作者
    let processedAuthors = await getAuthorsOrTags('er_author', 'name', temp.author)
    if (!Array.isArray(processedAuthors)) {
      return res.send(processedAuthors)
    }
    temp.author = processedAuthors.map(item => item.uuid).join(',')
    // 处理标签
    let processedTags = await getAuthorsOrTags('er_tag', 'tag', temp.tag)
    if (!Array.isArray(processedTags)) {
      return res.send(processedTags)
    }
    temp.tag = processedTags.map(item => item.uuid).join(',')

    // 确保 parentSeries 为空
    temp.parentSeries = ''

    // 如果是新增
    if (!temp.uuid) {
      response = await dealBookInsert(req, res, next, temp)
    } else {
      // 否则是编辑
      response = await dealBookUpdate(req, res, next, temp)
    }

    if (response === undefined || !(response.constructor === '{}' && response.code)) {
      response = errorMsg({code: 0})
    }
  }
  return res.send(response);
}

/**
 * 处理封面，封底，内容
 */
async function dealBookContent(temp, oldBook, ERRecord) {
  // 判断封面大小
  let frontCoverInfo = sizeOfBase64(temp.frontCover, 128)
  if (frontCoverInfo.oversize) {
    return errorMsg({ code: 24 }, '封面大小不能超过128k')
  }
  // 判断封底大小
  let backCoverInfo = sizeOfBase64(temp.backCover, 128)
  if (backCoverInfo.oversize) {
    return errorMsg({ code: 24 }, '封底大小不能超过128k')
  }
  // 新增，判断内容大小
  if (!temp.uuid && !temp.text) {
    return errorMsg({ code: 24 }, '内容不能为空')
  }
  if (!temp.uuid && temp.text.length > 3000000) {
    return errorMsg({ code: 24 }, '内容不能超过300万个字符')
  }

  // 保存封面
  // 封面文件名
  temp.frontCoverName = typeof temp.frontCoverName === 'string' ? temp.frontCoverName + Date.now() + '' : Date.now() + ''
  // 保存封面
  const processedFrontCover = await strToImageFile('../store/enjoy_reading/bookImg/', temp.frontCoverName, temp.frontCover || '')
  if (processedFrontCover.status) {
    temp.frontCoverPath = processedFrontCover.path.replace(/^..\/store/, '')
    temp.frontCoverSize = Math.ceil(frontCoverInfo.size || 0)
  } else {
    return errorMsg({ code: 24 }, '封面保存失败')
  }

  // 保存封底
  // 封底文件名
  temp.backCoverName = typeof temp.backCoverName === 'string' ? temp.backCoverName + Date.now() + '' : Date.now() + ''
  // 保存封面
  const processedBackCover = await strToImageFile('../store/enjoy_reading//bookImg/', temp.backCoverName, temp.backCover || '')
  if (processedBackCover.status) {
    temp.backCoverPath = processedBackCover.path.replace(/^..\/store/, '')
    temp.backCoverSize = Math.ceil(backCoverInfo.size || 0)
  } else {
    return errorMsg({ code: 24 }, '封底保存失败')
  }

  // 新增，保存内容
  if (!temp.uuid) {
    // 文本内容文件名
    let textName = ''
    const u = await unique(collection, 'er_book', 'name', temp.name)
    if (u.length) {
      textName = temp.name + Date.now() + ''
    } else {
      textName = temp.name + ''
    }
    // 保存 txt 文件
    const processedText = await writeFile('../store/enjoy_reading/book/' + textName + '.txt', temp.text)
    // 保存成功
    if (processedText.status) {
      temp.length = temp.text.length
      temp.textPath = processedText.path.replace(/^..\/store/, '')
      temp.textSize = Math.ceil(temp.length * 3 / 1024)
    } else {
      return errorMsg({ code: 24 }, '正文内容失败')
    }
  }

  // 计算 bookSize
  if (temp.uuid) {
    temp.frontCoverSize = temp.frontCoverPath === oldBook.frontCoverPath ? oldBook.frontCoverSize : temp.frontCoverSize
    temp.backCoverSize = temp.backCoverPath === oldBook.backCoverPath ? oldBook.backCoverSize : temp.backCoverSize
    temp.textSize = oldBook.textSize
  }
  temp.bookSize = temp.textSize + temp.frontCoverSize + temp.backCoverSize

  // 计算使用空间大小增量
  temp.incrementSize = temp.uuid ? temp.bookSize - oldBook.bookSize : temp.bookSize
  temp.incrementSize = Number((temp.incrementSize / 1024).toFixed(3))
  // 检查空间大小是否足够
  if (temp.incrementSize > (ERRecord.totalSpace - ERRecord.privateSpace - ERRecord.storeSpace)) {
    return errorMsg({ code: 24 }, '空间不足')
  }
}

/**
 * 处理新增
 */
async function dealBookInsert(req, res, next, temp) {
  dealDefault(req, temp)
  let fields = ['uuid', 'uploadAccountUuid', 'name', 'type', 'ISBN', 'parentSeries', 'position', 'author', 'frontCoverPath', 'backCoverPath', 'frontCoverSize', 'backCoverSize', 'textPath', 'textSize', 'bookSize', 'length', 'summary', 'free', 'score', 'discount', 'discountScore', 'status', 'tag', 'sequence', 'createTime']

  let insertBookSql = generateInsertRows('er_book', [temp], fields)
  let insertBookResult = await query(collection, insertBookSql)
  if (isInsertSuccess(insertBookResult)) {
    // 插入 er_account_book_info 记录
    let accountBookObj = {
      uuid: uuidv1(),
      bookUuid: temp.uuid,
      accountUuid: req.__record.uuid,
      percent: 0,
      point: 0,
      readingStatus: 0,
      onShelf: 0,
      updateTime: moment().format('YYYY-MM-DD HH:mm:ss'),
      createTime: moment().format('YYYY-MM-DD HH:mm:ss')
    }
    let accountBookSql = generateInsertRows('er_account_book_info', [accountBookObj])
    let accountBookResult = await query(collection, accountBookSql)
    if (!isInsertSuccess(accountBookResult)) {
      return errorMsg({code: 3})
    }
    // 更新账户信息
    let accountObj = {}
    if (temp.position === 1) {
      accountObj.privateSpace = (temp.incrementSize || 0) + req.__enjoyReadingRecord.privateSpace
    } else {
      accountObj.storeSpace = (temp.incrementSize || 0) + req.__enjoyReadingRecord.storeSpace
    }
    
    let accountSql = generateUpdateClause('er_accounts', accountObj) + ` WHERE uuid = '${req.__enjoyReadingRecord.uuid}'`
    let accountResult = await query(collection, accountSql)
    if (!isUpdateSuccess(accountResult)) {
      return errorMsg({code: 4})
    } else {
      // 更新积分记录
      let params = {
        score: '+10',
        totalSql: req.__record + 10,
        way: '上传书籍' + `《${temp.name}》`,
        appUuid: req.__appInfo.uuid,
        accountUuid: req.__record.uuid
      }
      let scoreResponse = await updateScore(params)
      if (scoreResponse.code) {
        return scoreResponse
      }
    }
  } else {
    return errorMsg({code: 3})
  }
}

/**
 * 处理更新
 */
async function dealBookUpdate(req, res, next, temp, oldBook) {
  dealDefault(req, temp)
  let fields = ['name', 'type', 'ISBN', 'position', 'author', 'frontCoverPath', 'backCoverPath', 'frontCoverSize', 'backCoverSize', 'bookSize', 'summary', 'free', 'score', 'discount', 'discountScore', 'status', 'tag']

  let updateBookSql = generateUpdateClause('er_book', temp, fields) + ` WHERE uuid = '${temp.uuid}'`
  let updateBookResult = await query(collection, updateBookSql)
  if (isUpdateSuccess(updateBookResult)) {
    if (temp.incrementSize) {
      // 更新账户信息
      let accountObj = {}
      if (temp.position === 1) {
        accountObj.privateSpace = (temp.incrementSize || 0) + req.__enjoyReadingRecord.privateSpace
      } else {
        accountObj.storeSpace = (temp.incrementSize || 0) + req.__enjoyReadingRecord.storeSpace
      }
      
      let accountSql = generateUpdateClause('er_accounts', accountObj) + ` WHERE uuid = '${req.__enjoyReadingRecord.uuid}'`
      let accountResult = await query(collection, accountSql)
      if (!isUpdateSuccess(accountResult)) {
        return errorMsg({code: 4})
      }
    }
  } else {
    return errorMsg({ code: 4 })
  }
}

/**
 * 处理默认值
 */
function dealDefault(req, temp) {
  temp.uuid = temp.uuid || uuidv1()
  temp.uploadAccountUuid = temp.upload_account_uuid || req.__record.uuid
  temp.ISBN = temp.ISBN || ''
  temp.summary = temp.summary || ''
  temp.free = temp.free === undefined || temp.free === null ? 1 : temp.free
  temp.score = temp.score || 0
  temp.discount = temp.discount || 0
  temp.discountScore = temp.discountScore || 0
  temp.status = temp.status || 0
  temp.sequence = temp.sequence || 0
  temp.createTime = moment().format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 空间管理书籍删除
 */
async function spaceBookDelete(req, res, next) {
  let response = {}
  const vali = Joi.validate(req.body, spaceBookDeleteSchema, {allowUnknown: true})
  if (vali.error) {
    response = errorMsg({ code: 24 }, vali.error.details[0].message)
  } else {
    // 查询记录
    let book = await unique(collection, 'er_book', 'uuid', req.body.uuid)
    if (book.length) {
      let bookRecord = humps.camelizeKeys(book[0])
      // 如果是书城的书，直接禁用
      if (bookRecord.position === 2) {
        let disableSql = generateUpdateClause('er_book', { status: 1 }) + ` WHERE uuid = '${bookRecord.uuid}'`
        let disableResult = await query(collection, disableSql)
        if (isUpdateSuccess(disableResult)) {
          response = errorMsg({ code: 0 })
        } else {
          response = errorMsg({ code: 5 })
        }
      } else {
        // 个人空间里的书籍是真删除--记录、图片、文本
        // 删除 er_book 记录
        let deleteSql = `DELETE FROM er_book WHERE uuid = '${bookRecord.uuid}'`
        let deleteResult = await query(collection, deleteSql)
        if (isDeleteSuccess(deleteResult)) {
          // 更新个人账户空间大小
          let decreasedSpace = Number((bookRecord.bookSize / 1024).toFixed(3))
          let updateObj = {}
          if (bookRecord.position === 1) {
            updateObj.privateSpace = req.__enjoyReadingRecord.privateSpace - decreasedSpace
            if (updateObj.privateSpace < 0) updateObj.privateSpace = 0
            else updateObj.privateSpace = Number(updateObj.privateSpace.toFixed(3))
          } else {
            updateObj.storeSpace = req.__enjoyReadingRecord.storeSpace - decreasedSpace
            if (updateObj.storeSpace < 0) updateObj.storeSpace = 0
            else updateObj.storeSpace = Number(updateObj.storeSpace.toFixed(3))
          }
          let updateAccountSql = generateUpdateClause('er_accounts', updateObj) + ` WHERE uuid = '${req.__enjoyReadingRecord.uuid}'`
          if (isUpdateSuccess(await query(collection, updateAccountSql))) {
            // 删除 er_account_book_info 记录
            let deleteAccountBookSql = `DELETE FROM er_account_book_info WHERE book_uuid = '${bookRecord.uuid}'`
            if (isDeleteSuccess(await query(collection, deleteAccountBookSql))) {
              // 删除相关文件
              // 删除封面文件
              if (bookRecord.frontCoverPath && bookRecord.frontCoverPath.includes('enjoy_reading')) {
                let deleteFrontCoverResult = await deleteFile('../store' + bookRecord.frontCoverPath)
                if (!deleteFrontCoverResult.status) {
                  response = errorMsg({ code: 24 }, '删除封面失败')
                  return res.send(response)
                }
              }
              // 删除封底文件
              if (bookRecord.backCoverPath && bookRecord.backCoverPath.includes('enjoy_reading')) {
                let deleteBackCoverResult = await deleteFile('../store' + bookRecord.backCoverPath)
                if (!deleteBackCoverResult.status) {
                  response = errorMsg({ code: 24 }, '删除封底失败')
                  return res.send(response)
                }
              }
              // 删除文本
              if (bookRecord.textPath && bookRecord.textPath.includes('enjoy_reading')) {
                let deleteTextResult = await deleteFile('../store' + bookRecord.textPath)
                if (!deleteTextResult.status) {
                  response = errorMsg({ code: 24 }, '删除文本失败')
                  return res.send(response)
                }
              }

              // 如果都没有问题，则代表成功删除
              response = errorMsg({ code: 0 })
            } else {
              response = errorMsg({ code: 5 })
            }
          } else {
            response = errorMsg({ code: 4 })
          }
        } else {
          response = errorMsg({ code: 5 })
        }
      }
    } else {
      response = errorMsg({ code: 40 })
    }
  }
  return res.send(response)
}

module.exports = {
  spaceBookList,
  spaceBookCreateOrUpdate,
  spaceBookDelete
}