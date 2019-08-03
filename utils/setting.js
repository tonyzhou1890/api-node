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
    path: '/register/account/updateApps',
    type: [1, 2]
  },
  {
    path: '/register/apps/create',
    type: [2]
  }
]

module.exports = {
  LoginExpireTime,
  RegisterAccountType,
  TypePermission
}