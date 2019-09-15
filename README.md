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