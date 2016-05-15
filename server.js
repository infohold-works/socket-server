var io = require('socket.io')(3000);
var conf = require('./config.json');
var mongoose = require('mongoose');
var db = mongoose.connect(conf.db.uri, conf.db.options);
var User = require('./userModel');

var onlineCount = 0;

// 服务端重启，重置所有用户在线状态
User.find({}, function(err, docs) {
    for (var i in docs) {
      User.update({username: docs[i].username}, {$set: {online_stat: false, socket_id: ""}}).exec();
    }
});

io.on('connection', function(socket) {
    console.log(socket.id);
    console.log('a user connected');
    // 客户端验证服务端是否启动
    socket.on('checkOnline', function() {
        io.emit('checkOnline', {
          isOnline: true
        })
    })

    // 用户登录
    socket.on('login', function(obj) {
        onlineCount++;
        console.log(obj.username + "加入! 当前在线人数:" + onlineCount)
        socket.name = obj.username;
    });

    // 设置socket.id
    socket.on('socketSync', function(obj) {
      User.update({username: obj.username}, {$set: {socket_id: socket.id}}).exec();
    });

    // 接收消息并发送给指定客户端
    socket.on('private message', function(obj) {
        User.findOne({username: obj.username}, function(err, docs) {
            if (docs.online_stat) {
                io.connected[docs[0].socket_id].emit('private message', {
                    title: obj.title,
                    desc: obj.desc,
                    typeid: obj.typeid
                });
            }
        });
    });

    // 推送给所有客户端
    socket.on('public message', function(obj) {
        io.emit('public message', {
            title: obj.title,
            desc: obj.desc,
            typeid: obj.typeid
        });
    });

    // 用户登出
    socket.on('logout', function(obj) {
        onlineCount--;
        User.update({username: obj.username}, {$set: {online_stat: false}}).exec();
        console.log(obj.username + "退出! 当前在线人数:" + onlineCount);
        socket.leave(obj.socketid);
    });

    // 断开连接
    socket.on('disconnect', function() {
        User.findOne({username: socket.name}, function(err, docs) {
            try {
                if (docs.online_stat) {
                    onlineCount--;
                    User.update({username: socket.name}, {$set: {online_stat: false, socket_id: ""}}).exec();
                    console.log(socket.name + "退出! 当前在线人数:" + onlineCount);
                }
            } catch (e) {
                // 异常处理
            }
        });

    });
});
