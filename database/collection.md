# 数据库 collection 相关表

## 全局账户表 accounts
```
CREATE TABLE IF NOT EXISTS `accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id字段',
  `uuid` varchar(40) NOT NULL COMMENT '程序生成的uuid',
  `nickname` varchar(40) NOT NULL COMMENT '账号-用户名',
  `pwd` varchar(40) NOT NULL COMMENT '密码6-20位',
  `avatar` varchar(128) DEFAULT NULL COMMENT '头像地址',
  `gender` tinyint(1) DEFAULT '1' COMMENT '性别-真男假女',
  `birth` date DEFAULT NULL COMMENT '出生年月-1993-01-01',
  `question` varchar(100) NOT NULL COMMENT '验证问题',
  `answer` varchar(100) NOT NULL COMMENT '验证答案',
  `type` int(1) DEFAULT NULL COMMENT '账户类型：1-普通，2-管理员，3-体验',
  `register_time` datetime NOT NULL COMMENT '注册时间',
  `login_time` datetime DEFAULT NULL COMMENT '登录时间',
  `last_login_time` datetime DEFAULT NULL COMMENT '上次登录时间',
  `expire` datetime DEFAULT NULL COMMENT 'token过期时间',
  `token` varchar(40) DEFAULT NULL COMMENT 'token',
  `apps` varchar(1000) DEFAULT NULL COMMENT '应用列表-逗号分隔的uuid字符串',
  `score` int(11) DEFAULT '0' COMMENT '用户积分',
  `disabled` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否禁用-1禁0否-可登录',
  `logout` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否删除-1禁0否-不可登录',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账户表，只保存账户基本信息';
```

## 全局应用信息表 apps
```
CREATE TABLE IF NOT EXISTS `apps` (
  `id` int(11) NOT NULL COMMENT '自增id字段',
  `uuid` varchar(40) NOT NULL COMMENT '程序生成的32位uuid',
  `name` varchar(40) NOT NULL COMMENT '应用名称',
  `summary` varchar(1000) NOT NULL COMMENT '应用简介',
  `link` varchar(256) NOT NULL COMMENT '应用链接',
  `icon` varchar(256) NOT NULL COMMENT '应用图标链接',
  `related_domain` varchar(256) NOT NULL COMMENT '关联域名，逗号分隔',
  `register_time` datetime NOT NULL COMMENT '应用注册时间',
  `accounts` int(11) DEFAULT NULL COMMENT '账号数量',
  `accounts_limit` int(11) NOT NULL COMMENT '账号数量上限',
  `temp_account` varchar(32) DEFAULT NULL COMMENT '体验账号uuid',
  `hidden` tinyint(1) NOT NULL COMMENT '1隐藏，0显示'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 积分记录表 score_record
```
CREATE TABLE IF NOT EXISTS `score_record` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id字段',
  `uuid` varchar(40) NOT NULL COMMENT '程序生成的uuid',
  `score` int(11) NOT NULL COMMENT '变动积分',
  `total_score` int(11) NOT NULL COMMENT '变动后的总积分',
  `way` varchar(128) DEFAULT '' COMMENT '积分获取/消费方式/备注',
  `app_uuid` varchar(40) DEFAULT NULL COMMENT '关联uuid',
  `account_uuid` varchar(40) NOT NULL COMMENT '关联账号',
  `create_time` datetime NOT NULL COMMENT '记录时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分记录';
```

## 享阅应用信息表 er_app_info
```
CREATE TABLE IF NOT EXISTS `er_app_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id字段',
  `uuid` varchar(40) NOT NULL COMMENT '程序生成的uuid',
  `key` varchar(40) NOT NULL COMMENT '信息项的键',
  `value` varchar(128) NOT NULL COMMENT '信息项的值',
  `class` varchar(40) DEFAULT '' COMMENT '信息项类型',
  `memo` varchar(128) DEFAULT '' COMMENT '备注',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='享阅应用的基本信息';
```

## 享悦用户表 er_accounts
```
CREATE TABLE IF NOT EXISTS `er_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id字段',
  `uuid` varchar(40) NOT NULL COMMENT '程序生成的uuid',
  `account_uuid` varchar(40) NOT NULL COMMENT 'accounts 表关联账户 uuid',
  `role` int(1) DEFAULT NULL COMMENT '享阅账户角色：1-普通，2-管理员，3-出版社',
  `shopping_cart` varchar(2000) DEFAULT '' COMMENT '购物车书籍 uuid，包含子册',
  `total_space` int(11) DEFAULT 0 COMMENT '账户拥有的空间，单位M',
  `private_space` float(11) DEFAULT 0 COMMENT '私有空间已用容量，单位M，最多三位小数',
  `store_space` float(11) DEFAULT 0 COMMENT '书城空间已用容量，单位M，最多三位小数',
  `create_time` datetime NOT NULL COMMENT '入住时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='享悦用户表';
```

## 享阅用户书籍信息表 er_account_book_info
```
CREATE TABLE IF NOT EXISTS `er_account_book_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id字段',
  `uuid` varchar(40) NOT NULL COMMENT '程序生成的uuid',
  `book_uuid` varchar(40) NOT NULL COMMENT 'er_book 表关联书籍 uuid',
  `account_uuid` varchar(40) NOT NULL COMMENT 'accounts 表关联账户 uuid',
  `percent` float(11) DEFAULT 0 COMMENT '阅读进度百分比，两位小数',
  `point` int(11) DEFAULT 0 COMMENT '阅读进度字符位置',
  `length` int(11) DEFAULT 0 COMMENT '书籍字符串长度',
  `reading_status` tinyint(1) DEFAULT 0 COMMENT '书籍阅读状态，0：未阅读，1：阅读中',
  `on_shelf` tinyint(1) DEFAULT 0 COMMENT '书籍是否在书架，0：不在，1：在',
  `update_time` datetime NOT NULL COMMENT '上一次阅读时间',
  `create_time` datetime NOT NULL COMMENT '购买/创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='享阅用户书籍信息表';
```

## 享阅书籍表 er_book
```
CREATE TABLE IF NOT EXISTS `er_book` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id字段',
  `uuid` varchar(40) NOT NULL COMMENT '程序生成的uuid',
  `upload_account_uuid` varchar(40) NOT NULL COMMENT '上传书籍的账户的 account_uuid',
  `name` varchar(40) NOT NULL COMMENT '书名/系列名',
  `type` tinyint(1) DEFAULT 1 COMMENT '书籍类型，1-单本，2-系列/分册定价，3-系列/整体定价',
  `parent_series` varchar(40) DEFAULT '' COMMENT '所属系列的 uuid',
  `position` tinyint(1) DEFAULT '1' COMMENT '书籍空间位置，1-个人空间，2-书城',
  `ISBN` varchar(40) DEFAULT '' COMMENT '书籍 ISBN 号',
  `author` varchar(256) NOT NULL COMMENT '半角逗号分隔的作者 uuid',
  `front_cover_path` varchar(128) DEFAULT '' COMMENT '封面图片路径',
  `back_cover_path` varchar(128) DEFAULT '' COMMENT '封底图片路径',
  `front_cover_size` int(11) DEFAULT 0 COMMENT '封面图片大小，单位K',
  `back_cover_size` int(11) DEFAULT 0 COMMENT '封底图片大小，单位K',
  `text_path` varchar(128) DEFAULT '' COMMENT '文本路径',
  `text_size` int(11) DEFAULT 0 COMMENT '封底图片大小，单位K',
  `book_size` int(11) DEFAULT 0 COMMENT '书籍/系列大小，单位K',
  `summary` varchar(1024) DEFAULT '' COMMENT '书籍/系列概要',
  `free` tinyint(1) DEFAULT '1' COMMENT '是否免费',
  `score` int(11) NOT NULL DEFAULT 0 COMMENT '积分',
  `discount` tinyint(1) DEFAULT '0' COMMENT '是否打折',
  `discount_score` int(11) NOT NULL DEFAULT 0 COMMENT '折扣后积分',
  `status` tinyint(1) DEFAULT '0' COMMENT '是否禁用',
  `tag` varchar(256) NOT NULL COMMENT '半角逗号分隔的标签 uuid',
  `sequence` tinyint(1) DEFAULT '0' COMMENT '系列内书籍排序',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='享阅书籍表';
```

## 享阅 banner 表 er_banner
```
CREATE TABLE IF NOT EXISTS `er_banner` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id字段',
  `uuid` varchar(40) NOT NULL COMMENT '程序生成的uuid',
  `title` varchar(40) NOT NULL COMMENT 'banner 标题',
  `image` varchar(128) NOT NULL COMMENT 'banner 图片路径',
  `href` varchar(128) DEFAULT '' COMMENT 'banner 点击跳转链接',
  `memo` varchar(128) DEFAULT '' COMMENT 'banner 说明/备注',
  `active` tinyint(1) DEFAULT '1' COMMENT 'banner 是否活动状态/是否显示',
  `sequence` tinyint(1) DEFAULT '0' COMMENT 'banner 显示的顺序',
  `create_time` datetime NOT NULL COMMENT 'banner 创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='享阅 banner 表';
```

## 享阅标签表 er_tag
```
CREATE TABLE IF NOT EXISTS `er_tag` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id字段',
  `uuid` varchar(40) NOT NULL COMMENT '程序生成的uuid',
  `tag` varchar(8) NOT NULL COMMENT '标签名称',
  `create_time` datetime NOT NULL COMMENT 'tag 创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='享阅标签表';
```

## 享阅作者表 er_author
```
CREATE TABLE IF NOT EXISTS `er_author` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id字段',
  `uuid` varchar(40) NOT NULL COMMENT '程序生成的uuid',
  `name` varchar(20) NOT NULL COMMENT '作者名字',
  `create_time` datetime NOT NULL COMMENT 'author 创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='享阅作者表';
```