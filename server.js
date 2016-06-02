var io = require('socket.io')(3000);
var conf = require('./config.json');
var mongoose = require('mongoose');
var db = mongoose.connect(conf.db.uri, conf.db.options);
var User = require('./userModel');

function disconnect(username) {
    User.update({username: username}, {$set: {online_stat: false, socket_id: ""}}).exec();
}

// 服务端重启，重置所有用户在线状态
User.find({}, function(err, docs) {
    for (var i in docs) {
      disconnect(docs[i].username);
    }
});

io.on('connection', function(socket) {
    console.log('a user['+ socket.id +'] connected');
    // 客户端验证服务端是否启动
    socket.on('checkOnline', function() {
        io.emit('checkOnline', {
          isOnline: true
        })
    })

    // 用户登录
    socket.on('login', function(obj) {
        console.log('(' + obj.username + ") --login---! ");
        socket.name = obj.username;
        User.update({username: obj.username}, {$set: {socket_id: socket.id}}).exec();
        io.emit('onlineCountAdd',{
            username:obj.username
        });
    });

    // 接收消息并发送给指定客户端
    socket.on('private message', function(obj) {
        User.findOne({userid: obj.userid}, function(err, docs) {
            if (docs.online_stat) {
                io.sockets.connected[docs.socket_id].emit('private message', {
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
        console.log('(' + obj.username + ") --logout--! ");
        disconnect(obj.username);
    });

    // 断开连接
    socket.on('disconnect', function() {
        User.findOne({username: socket.name}, function(err, docs) {
            try {
                if (docs.online_stat) {
                    console.log('(' + socket.name + ") disconnect! ");
                    disconnect(socket.name);
                    io.emit('onlineCountDel',{
                        username:socket.name
                    });
                }
            } catch (e) {
                // 异常处理
            }
        });

    });
});
