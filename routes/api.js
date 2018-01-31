var express = require('express');
var router = express.Router();
var models = require('../models/models');

var mongoose = require('../config/mongoose');
//图片上传api
var multiparty = require('multiparty');
var images = require("images");
var uuid = require('uuid/v4'); //生成唯一字符串
//流程控制函数
var async = require("async");

var User = models.User;
var Record = models.Record;
var FriendList = models.FriendList;
var ChatList = models.ChatList;

//注册用户
router.post('/register', function(req, res) {
	var user = new User(req.body);
	//查询数据库
	User.find({
		'tel': req.body.tel
	}, function(err, users) {
		if(err) {
			console.log(err);
			return;
		}
		if(users.length) {
			res.status(200).json({
				status: false,
				message: "账号已存在！"
			});
			return;
		}
		//储存数据
		user.nickname = user.tel;
		user.save(function(err, data) {
			if(err) {
				console.log(err);
				return;
			}
			if(!data) {
				res.status(200).json({
					status: false,
					message: "注册失败！"
				});
				return;
			}
			//创建好友列表
			var friendList = new FriendList({
				account: data._id
			});
			friendList.save(function(err, flist) {
				if(err) {
					console.log(err);
					return;
				}
				if(!flist) {
					res.status(200).json({
						status: false,
						message: "创建好友列表失败！",
					});
					return;
				}
				//创建消息列表
				var chatList = new ChatList({
					account: data._id
				});
				chatList.save(function(err, clist) {
					if(err) {
						console.log(err);
						return;
					}
					if(!clist) {
						res.status(200).json({
							status: false,
							message: "创建消息列表失败！",
						});
						return;
					}
					res.status(200).json({
						status: true,
						message: "注册成功！",
						data: user._id
					});
				});
			});
		});
	});
});
//登录用户
router.post('/login', function(req, res) {
	User.findOne({
		'tel': req.body.tel,
		'password': req.body.password
	}, function(err, user) {
		if(err) {
			console.log(err);
			return;
		}
		//登录成功
		if(user) {
			res.status(200).json({
				status: true,
				message: '登陆成功！',
				data: user._id
			});
			return;
		}
		//登录失败
		res.status(200).json({
			status: false,
			message: '账号或者密码错误！'
		});
	});
});
//获取个人中心信息
router.get('/getAccount', function(req, res) {
	User
		.findOne({
			"tel": req.query.tel
		})
		.select('tel nickName sex avator sign email age address')
		.exec(function(err, user) {
			if(err) {
				console.log(err);
				return;
			}
			if(user) {
				res.status(200).json({
					status: true,
					message: '获取成功！',
					data: user
				});
			} else {
				res.status(200).json({
					status: false,
					message: '此账户未注册！'
				});
			}
		});
});
// 修改用户信息
router.post("/updateInfo/", function(req, res) {
    // 修改数据
    User.update({
        _id: req.body._id
    }, req.body, function(error, writeOpResult) {
        if (error) {
            console.log(error);
            return;
        }
        if (writeOpResult.ok != 1) {
            res.json({
                status: false,
                msg: "修改失败"
            });
        } else {
            res.json({
                status: true,
                msg: "修改成功"
            });
        }

        console.log(writeOpResult);
    });




})

//头像上传
router.post("/upload/avator/", function(req, res) {
	var form = new multiparty.Form();
	var fileFolder = "/images/avatar/";
	form.parse(req, function(err, fields, files) {
		var aFile = files.avatar;
		if(aFile.length <= 0) {
			return;
		}
		var size = aFile[0].size;
		var path = aFile[0].path;

		var originalFilename = aFile[0].originalFilename;
		//选择相册的时候，文件名会附带？时间戳，提前裁掉
		if(originalFilename.lastIndexOf('?') > -1) {
			originalFilename = originalFilename.substring(0, originalFilename.lastIndexOf('?'))
		}
		//生成文件名，防止重名
		var formate = originalFilename.split('.');
		var filename = uuid() + '.' + formate[formate.length - 1];
		var type = aFile[0].headers["content-type"];

		//判断是否是图片
		if(type.indexOf("image") < 0) {
			res.status(200).json({
				status: false,
				message: originalFilename + "格式不正确，请重新选择！"
			});
			return;
		}
		//判断图片小于2MB
		if(size > 2 * 1024 * 1024) {
			res.status(200).json({
				status: false,
				message: originalFilename + "体积过大，请重新选择！"
			});
			return;
		}
		//存储图片
		images(path) //Load image from file 
			//加载图像文件
			.save("public" + fileFolder + filename, 'jpg');
		//返回图片地址
		res.status(200).json({
			status: true,
			message: "上传成功！",
			imgPath: req.protocol + "://" + req.headers.host + fileFolder + filename
		});
	});
});
//搜索账户
router.get('/searchAccount/', function(req, res) {
	User
		.findOne({
			"tel": req.query.tel
		})
		.select('tel nickName')
		.exec(function(err, user) {
			if(err) {
				console.log(err)
				return;
			}
			if(!user) {
				res.status(200).json({
					status: false,
					message: '没有找到此账户！'
				});
				return;
			}
			res.status(200).json({
				status: true,
				message: '获取成功！',
				data: user
			});
		})
});
//获取用户信息
router.get('/getUserInfo', function(req, res) {
	FriendList
		.findOne({
			"account": req.query._id
		})
		.populate("account", "nickName sex avator sign")
		.exec(function(err, result) {
			if(err) {
				console.log(err)
				return;
			}
			if(!result) {
				res.status(200).json({
					status: false,
					message: '没有找到此账户！'
				});
				return;
			}
			//判断当前账户与查找账户之前的关系
			//后期需要将friends、request数组删除掉，不要返回给前台
			result = result.toObject();
			result.account.isFriends = true;
			result.account.isRequest = false;
			//判断是不是查找自己
			if(req.query.count == req.query.from) {
				res.status(200).json({
					status: true,
					message: '获取成功！',
					data: result.account
				});
				return;
			}
			//判断是不是好友
			for(var i = 0; i < result.friends.length; i++) {
				if(result.friends[i] == req.query.from) {
					res.status(200).json({
						status: true,
						message: '获取成功！',
						data: result.account
					});
					return;
				}
			}
			//判断是否正在申请加为好友
			result.account.isFriends = false;
			FriendList
				.findOne({
					'account': req.query.from
				})
				.exec(function(err, data) {
					if(err) {
						console.log(err)
						return;
					}
					for(var j = 0; j < data.request.length; j++) {
						if(data.request[j] == req.query.count) {
							result.account.isRequest = true;
							res.status(200).json({
								status: true,
								message: '获取成功！',
								data: result.account
							});
							return;
						}
					}
					//排除前面的结果
					res.status(200).json({
						status: true,
						message: '获取成功！',
						data: result.account
					});
				});
		});

});
//获取请求列表
router.get("/getRequestList", function(req, res) {
	//连表查询
	FriendList
		.findOne({
			"account": req.query.account
		})
		.populate("request", "nickName sign avator")
		.exec(function(err, result) {
			if(err) {
				console.log(err);
				return;
			}
			if(result.request.length==0) {
				//请求列表为空
				res.json({
					status: false,
					message: '请求列表为空！'
				});
				return;
			}
			res.json({
				status: true,
				message: '获取成功！',
				data: result.request
			});
		});
});
//获取好友列表
router.get("/getFriendsList", function(req, res) {
	FriendList
		.findOne({
			"account": req.query.account
		})
		.populate("friends", "nickName sex avator sign")
		.exec(function(err, result) {
			if(err) {
				console.log(err);
				return;
			}
			if(!result.friends.length) {
				//好友列表为空
				res.json({
					status: false,
					message: '暂无好友！'
				});
				return;
			}
			res.json({
				status: true,
				message: '获取成功！',
				data: result.friends
			});
		});
});
//获取聊天记录,
router.get("/getMsgRecords", function(req, res) {
	//连表查询
	Record
		.findOne({
			users: {
				$all: req.query.users
			}
		})
		.populate('users')
		.exec(function(err, record) {
			if(err) {
				console.log(err);
				return;
			}
			if(record) {
				res.json({
					status: true,
					msg: "获取成功！",
					data: record.history
				});
				return;
			}
			res.json({
				status: false,
				msg: "查找失败！"
			});
		});
});
//获取消息列表
router.get("/getChatList", function(req, res) {
	ChatList
		.findOne({
			account: req.query.count
		})
		.populate('list.user', "nickname avator")
		.exec(function(err, result) {
			res.json({
				status: true,
				msg: "获取成功！",
				data: result.list
			});
		})
});
// socket.io接口API
router.setSocket = function(server) {
	var io = require('socket.io')(server);
	io.on('connection', function(socket) {
		//接入-自己独立room-保证唯一性
		socket.on('online', function(data) {
			socket.join(data.count);
			console.log("加入room:" + data.count)
		});
		//一对一消息
		socket.on('private', function(data, callback) {
			console.log(data)
			data.from = mongoose.Types.ObjectId(data.from);
			data.to = mongoose.Types.ObjectId(data.to);
			Record
				.update({
					users: {
						$all: [data.from, data.to]
					}
				}, {
					'$push': {
						'history': data
					}
				})
				.exec()
				.then(function(result) {
					//添加聊天记录成功
					if(result.n > 0) {
						//更新账户的消息列表
						ChatList.update({
								account: data.from,
								'list.user': data.to
							}, {
								'$set': {
									'list.$.lastMsg': data.msg
								}
							})
							.exec()
							.then(function() {
								//更新对方的消息列表
								return ChatList.update({
										account: data.to,
										'list.user': data.from
									}, {
										'$set': {
											'list.$.lastMsg': data.msg
										}
									})
									.exec()
							})
							.then(function() {
								socket.to(data.to).emit('private', data);
								callback("success");
							})
							.catch(function(err) {
								console.log(err);
							})
						return;
					}
					//没有2人聊天记录，则创建记录
					var record = new Record({
						users: [data.from, data.to],
						history: [data]
					});
					console.log(record)
					record.save()
						.then(function() {
							//添加账户与此人的消息列表
							return ChatList.update({
									account: data.from
								}, {
									$addToSet: {
										list: {
											user: data.to,
											lastMsg: data.msg
										}
									}
								})
								.exec();
						})
						.then(function() {
							//对方也添加消息列表
							return ChatList.update({
									account: data.to
								}, {
									$addToSet: {
										list: {
											user: data.from,
											lastMsg: data.msg
										}
									}
								})
								.exec()
						})
						.then(function() {
							socket.to(data.to).emit('private', data);
							callback("success");
						})
						.catch(function(err) {
							console.log(err);
						})
				})

		});
		//广播事件
		socket.on('broadcast', function(data, callback) {
			socket.broadcast.emit('broadcast', data);
			callback("success");
		});
		//请求好友api
		socket.on('reqFriends', function(data, callback) {
			FriendList.update({
				"account": data.to
			}, {
				$addToSet: {
					request: data.from
				}
			}, function(err, result) {
				if(err) {
					console.log(err);
					return;
				}
				if(result.nModified > 0) {
					//将请求者推送给前台
					User
						.findOne({
							"_id": data.from
						})
						.select("tel nickname sex avator")
						.exec(function(err, user) {
							if(err) {
								console.log(err);
								return;
							}
							socket.to(data.to).emit("newReqFriends", user);
						});
				}
				//添加成功
//				callback("success");
			})
		});
		//同意好友api
		socket.on('agreeFriends', function(data, callback) {
			FriendList.update({
				"account": data.from
			}, {
				'$addToSet': {
					'friends': data.to
				},
				'$pull': {
					'request': data.to
				}
			}, function(err, results) {
				if(err) {
					console.log(err);
					return;
				}
				//添加好友第2次
				FriendList.update({
					"account": data.to
				}, {
					'$addToSet': {
						'friends': data.from
					}
				}, function(err, result) {
					if(err) {
						console.log(err);
						return;
					}
//					callback("success");
				});
			})
		})
		//删除好友api
		socket.on('delFriends', function(data, callback) {
			// 删除2次，删除互为好友的账号friends数组里面的账号
			FriendList.update({
				"account": data.from
			}, {
				$pull: {
					'friends': data.to
				}
			}, function(err, result) {
				if(err) {
					console.log(err);
					return;
				}
				//删除第2次
				FriendList.update({
					"account": data.to
				}, {
					$pull: {
						'friends': data.from
					}
				}, function(err, result) {
					if(err) {
						console.log(err);
						return;
					}
//					callback("success");
				});
			});

		})

	});
};
module.exports = router;