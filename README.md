# 应用后端 api-node
> 基本的 express 框架 + MySQL 搭建的 node 后端。开发使用的进程守护是 pm2

## pm2
```
// 启动
pm2 start ./bin/www --watch
// 日志
pm2 log
// 进程列表
pm2 list
// 停止所有
pm2 stop all
```

## 版本说明
### v0.2.1--2020.04.16
1. 修复`app.use('*', middleware)`导致真实路径丢失的问题

### v0.2.0--2020.04.11
1. 删除`views`和`public`两个文件夹的内容
2. 新增诗词应用的接口

### v0.1.2--2020.04.08
1. 新增启用书籍`/enjoyReading/space/book/use`接口