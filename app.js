var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const { valiToken, valiPermission, valiEnjoyReading } = require('./middleware/middleware')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const registerRouter = require('./routes/register')
const enjoyReadingRouter = require('./routes/enjoyReading')

var app = express();

app.all("*",function(req,res,next){
  //设置允许跨域的域名，*代表允许任意域名跨域
  res.header("Access-Control-Allow-Origin","*");
  //允许的header类型
  res.header("Access-Control-Allow-Headers","content-type, token");
  //跨域允许的请求方式 
  res.header("Access-Control-Allow-Methods","DELETE,PUT,POST,GET,OPTIONS");
  if (req.method.toLowerCase() == 'options')
      res.sendStatus(200);  //让options尝试请求快速结束
  else
      next();
})

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 验证token
app.use(valiToken)
// 验证基本权限
app.use(valiPermission)
// 验证享阅权限
app.use(valiEnjoyReading)

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/register', registerRouter)
app.use('/enjoyReading', enjoyReadingRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
