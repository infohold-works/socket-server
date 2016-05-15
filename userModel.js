var mongoose = require('mongoose')

var Schema = mongoose.Schema

var userSchema = new Schema({
  id: Number,
  userid: String,
  username: String,
  password: String,
  online_stat: Boolean,
  login_time: String,
  last_login_time: String,
  socket_id: String
})

var User = mongoose.model('Mb_user', userSchema)

module.exports = User
