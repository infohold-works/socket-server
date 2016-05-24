var io = require('socket.io')(3000);
var conf = require('./config.json');
var mongoose = require('mongoose');
var db = mongoose.connect(conf.db.uri, conf.db.options);
var User = require('./userModel');

var onlineCount = 0;

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
        onlineCount++;
        console.log('(' + obj.username + ") --login---! Online User:[" + onlineCount + ']');
        socket.name = obj.username;
        User.update({username: obj.username}, {$set: {socket_id: socket.id}}).exec();
    });

    // 接收消息并发送给指定客户端
    socket.on('private message', function(obj) {
        User.findOne({username: obj.username}, function(err, docs) {
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
        onlineCount--;
        console.log('(' + obj.username + ") --logout--! Online User:[" + onlineCount + ']');
        disconnect(obj.username);
    });

    // 断开连接
    socket.on('disconnect', function() {
        User.findOne({username: socket.name}, function(err, docs) {
            try {
                if (docs.online_stat) {
                    onlineCount--;
                    console.log('(' + socket.name + ") disconnect! online User:[" + onlineCount + ']');
                    disconnect(socket.name);
                }
            } catch (e) {
                // 异常处理
            }
        });

    });
});
