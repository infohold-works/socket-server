var io = require('socket.io')(3000);
var conf = require('./config.json');
var connect = require('./db').connect(conf.db.uri, conf.db.options);

connect(function(db) {
    var collection = db.collection('mb_users');
    var socketid;
    var onlineCount = 0;

    // 设置socketid
    function setSocketId(username, socketid) {
        collection.update({
            username: username
        }, {
            $set: {
                socket_id: socketid
            }
        });
    }

    // 登出事件
    function logout(username) {
        collection.update({
            username: username
        }, {
            $set: {
                online_stat: false,
                socket_id: ""
            }
        });
    }

    collection.find({}).toArray(function(err, docs) {
        for (var i = 0; i < docs.length; i++) {
            logout(docs[i].username);
        }
    });

    io.on('connection', function(socket) {
        console.log("a user connection");
        socket.on('login', function(obj) {
            onlineCount++;
            console.log(obj.username + "加入! 当前在线人数:" + onlineCount)
            socket.name = obj.username;
            setSocketId(obj.username, socket.id);
        });

        // 客户端验证服务端是否启动
        socket.on('checkOnline', function() {
            io.emit('checkOnline', {
                isOnline: true
            })
        })

        // 接收消息并发送给指定客户端
        socket.on('private message', function(obj) {
            collection.find({
                username: obj.username
            }).toArray(function(err, docs) {
                if (docs[0].online_stat) {
                    socketid = docs[0].socket_id;
                    io.sockets.connected[socketid].emit('private message', {
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

        // 监测登录成功的用户退出
        socket.on('disconnect', function() {
            collection.find({
                username: socket.name
            }).toArray(function(err, docs) {
                try {
                    if (docs[0].online_stat) {
                        onlineCount--;
                        logout(socket.name);
                        console.log(socket.name + "退出! 当前在线人数:" + onlineCount);
                    }
                } catch (e) {
                    // 异常处理
                }
            });
        });

        // 用户退出
        socket.on('logout', function(obj) {
            onlineCount--;
            logout(obj.username);
            console.log(obj.username + "退出! 当前在线人数:" + onlineCount);
        });
    });
});
