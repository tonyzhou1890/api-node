const mysql = require('mysql')
const Joi = require('joi')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const humps = require('humps')

const { dbOptions, collection } = require('../utils/database')
const { query, limit, unique, generateUpdateClause, isUpdateSuccess, isInsertSuccess } = require('../utils/query')
const { errorMsg, writeFile, strToImageFile, sizeOfBase64, formatTime, replaceValueLabelStr } = require('../utils/utils')
const { tagToBook, authorToBook, queryBookList, getAuthorsOrTags, generateInsertRows } = require('../utils/advancedUtils')
const { spaceBookListSchema, spaceBookCreateSchema, spaceBookUpdateSchema } = require('../schema/enjoyReading')
const { LoginExpireTime, RegisterAccountType, EnjoyReadingRole } = require('../utils/setting')

/**
 * 书库书籍 列表
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
        console.log(children)
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

    // 如果是编辑，需要查询原来的书籍信息，以及一些检查
    let oldBook = null 
    if (temp.uuid) {
      // 查询原书籍信息
      oldBook = await unique(collection, 'er_book', 'uuid', )
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
      // 出版社需要 ISBN 号
      if (ERRecord.role === EnjoyReadingRole.publisher.value && !temp.ISBN) {
        response = errorMsg({ code: 24 }, 'ISBN 不能为空')
        return res.send(response)
      }
    }

    // 如果是单本或者系列子册，需要处理封面，封底，内容
    if (temp.type === 1 || temp.parentSeries) {
      response = await dealBookContent(temp, oldBook, ERRecord) || {}
      if (response.code !== undefined && response.code !== 0) {
        return res.send(response)
      }
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

    // 如果单本，确保 parentSeries 为空
    if (temp.type ==== 1) {
      temp.parentSeries = ''
    }

    // 如果是新增
    if (!temp.uuid) {
      response = await dealBookInsert(req, res, next, temp)
    } else {
      response = await dealBookUpdate(req, res, next, temp)
    }

    if (!(response.constructor === '{}' && response.code)) {
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
  if (!temp.uuid && temp.text.length > 300000) {
    return errorMsg({ code: 24 }, '内容不能超过30万个字符')
  }

  // 保存封面
  // 封面文件名
  temp.frontCoverName = typeof temp.frontCoverName === 'string' ? temp.frontCoverName + Date.now() + '' : Date.now() + ''
  // 保存封面
  const processedFrontCover = await strToImageFile('../store/images/enjoy_reading/bookImg/', temp.frontCoverName, temp.frontCover || '')
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
  const processedBackCover = await strToImageFile('../store/images/enjoy_reading/bookImg/', temp.backCoverName, temp.backCover || '')
  if (processedBackCover.status) {
    temp.backCoverPath = processedBackCover.path.replace(/^..\/store/, '')
    temp.backCoverSize = Math.ceil(backCoverInfo.size || 0)
  } else {
    return errorMsg({ code: 24 }, '封底保存失败')
  }

  // 新增，保存内容
  if (temp.uuid) {
    // 文本内容文件名
    let textName = ''
    const u = await unique(collection, 'er_book', 'name', temp.name)
    if (u.length) {
      textName = temp.name + Date.now() + ''
    } else {
      textName = temp.name + ''
    }
    // 保存 txt 文件
    const processedText = await writeFile(textName + '.txt', temp.text)
    // 保存成功
    if (processedText.status) {
      temp.textPath = processedText.path.replace(/^..\/store/, '')
      temp.textSize = Math.ceil(temp.text.length * 3 / 1024)
    } else {
      return errorMsg({ code: 24 }, '正文内容失败')
    }
  }

  // 计算 bookSize
  if (temp.uuid) {
    temp.frontCoverSize = temp.frontCoverPath === oldBook.frontCoverPath ? oldBook.frontCoverSize : temp.frontCoverSize
    temp.backCoverSize = temp.backCoverPath === oldBook.backCoverPath ? oldBook.backCoverPath : temp.backCoverPath
    temp.textSize = oldBook.textSize
  }
  temp.bookSize = temp.textSize + temp.frontCoverSize + temp.backCoverSize

  // 计算使用空间大小增量
  temp.incrementSize = temp.uuid ? temp.bookSize - oldBook.bookSize : temp.bookSize
  temp.incrementSize = (temp.bookSize / 1024).toFixed(3)

  // 检查空间大小是否足够
  if (temp.incrementSize > (ERRecord.totalSpace - ERRecord.privateSpace - ERRecord.storeSpace)) {
    return errorMsg({ code: 24 }, '空间不足')
  }
}

/**
 * 处理新增
 */
async function addBook(req, res, next, temp) {
  dealDefault(temp)
  let fields = ['uuid', 'uploadAccountUuid', 'name', 'type', 'parentSeries', 'position', 'author', 'frontCoverPath', 'backCoverPath', 'frontCoverSize', 'backCoverSize', 'textPath', 'textSize', 'bookSize', 'summary', 'free', 'score', 'discount', 'discountScore', 'status', 'tag', 'sequence', 'createTime']

  let insertBookSql = generateInsertRows('er_book', [temp], fields)
  let insertBookResult = await query(collection, insertBookSql)
  if (isInsertSuccess(insertBookResult)) {
    // 如果分册定价，要更新系列定价
    if (temp.type === 2) {
      let parentSql = `SELECT * FROM er_book WHERE status = 0 && parent_series = '${temp.parentSeries}'`
      await rows = await query(collection, parentSql)
      if (Array.isArray(rows) && rows.length) {
        let updateObj = {}
        updateObj.discount = rows.some(item => item.discount && item.) ? 1 : 0
        updateObj.score = 0
        updateObj.discountScore = 0
        rows.map(item => {
          if (item.free === 0) {
            updateObj.score += item.score
            if (item.discount) {
              updateObj.discountScore += item.discountScore
            } else {
              updateObj.discountScore += item.score
            }
          }
        })
      }
      let updateParentSql = `UPDATE er_book SET 
        score = ${updateObj.score},
        discount = ${updateObj.discount},
        discount_score = ${updateObj.discountScore} 
        WHERE uuid = '${temp.parentSeries}'
      `
      let updateParentResult = await query(collection, updateParentSql)
      if (!isUpdateSuccess(updateParentResult)) {
        return errorMsg({code: 24}, '更新父系列失败')
      }
    }
    // 插入 er_account_book_info 记录
    let accountBookObj = {
      uuid: uuidv1(),
      bookUuid: temp.uuid,
      account: req.__record.uuid,
      percent: 0,
      point: 0,
      length: temp.text ? temp.text.length || 0,
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
    if (!temp.parentSeries) {
      accountObj.storeBookNum = req.__enjoyReadingRecord.storeBookNum + 1
    }
    let accountSql = generateUpdateClause('er_account', accountObj) + ` WHERE uuid = '${req.__enjoyReadingRecord.uuid}'`
    let accountResult = await query(accountSql)
    if (!isUpdateSuccess(accountResult)) {
      return errorMsg({code: 4})
    }
  } else {
    return errorMsg({code: 3})
  }
}

/**
 * 处理默认值
 */
function dealDefault(temp) {
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

module.exports = {
  spaceBookList,
  spaceBookCreateOrUpdate
}