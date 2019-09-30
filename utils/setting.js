// 登录有效时间
const LoginExpireTime = 3 * 3600 * 1000

// 登录中心账户类型
const RegisterAccountType = {
  common: {
    value: 1,
    label: '普通账户'
  },
  admin: {
    value: 2,
    label: '管理员账户'
  },
  experience: {
    value: 3,
    label: '体验账户'
  }
}

// 账户类型/禁用权限
// path: 需要校验的请求
// type: [] 只有在数组中的类型才可以操作，如果不写，则都可以操作
// disabled：true代表可以操作，默认禁用是不可操作
const TypePermission = [
  {
    path: '/register/account/update',
    type: [1, 2]
  },
  {
    path: '/register/account/list',
    type: [2]
  },
  {
    path: '/register/account/updatePermission',
    type: [2]
  },
  {
    path: '/register/account/updateApps',
    type: [1, 2]
  },
  {
    path: '/register/apps/create',
    type: [2]
  }
]

// 享阅角色
const EnjoyReadingRole = {
  common: {
    value: 1,
    label: '普通账户'
  },
  admin: {
    value: 2,
    label: '管理员'
  },
  publisher: {
    value: 3,
    label: '出版社'
  }
}

// 享阅权限
// path: 需要校验的请求
// type: [] 只有在数组中的类型才可以操作，如果不写，则都可以操作
// roles: [] 只有在数组中的角色才可以操作，如果不写，则都可以操作
const EnjoyReadingPermission = [
  {
    path: '/enjoyReading/account/detail'
  },
  {
    path: '/enjoyReading/account/loginScore'
  },
  {
    path: '/enjoyReading/account/storeBookList'
  },
  {
    path: '/enjoyReading/account/shelfBookList'
  },
  {
    path: '/enjoyReading/space/book/list'
  }
]

module.exports = {
  LoginExpireTime,
  RegisterAccountType,
  TypePermission: TypePermission.concat(EnjoyReadingPermission),
  EnjoyReadingRole,
  EnjoyReadingPermission
}