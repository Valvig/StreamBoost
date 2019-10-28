module.exports = {

  con: mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "streamboost"
  }),
  insertStreamersIntoDB: function insertStreamersIntoDB(info, i) {
    return new Promise(function(resolve) {
      console.log('Dans insertStreamersIntoDB info = ' + JSON.stringify(info.data[i].to_id))
      console.log('Dans insertStreamersIntoDB i = ' + i)
      var name = info.data[i].to_name
      var twitch_id = JSON.stringify(info.data[i].to_id)
      
      var sql = "INSERT IGNORE INTO streamers (name, twitch_id) VALUES ('" + name + "','" + twitch_id + "')";
      con.query(sql, function (err) {
        if (err) {
        console.log('err ' + err)
        } else {
        resolve()
        }
      })
    })
  },
  insertUsersStreamersIntoDB: function insertUsersStreamersIntoDB(userId, streamerId) {  
    var sql = "INSERT IGNORE INTO users_streamers (users_id, streamers_id) VALUES ('" + userId + "','" + streamerId + "')";
    con.query(sql, function (err) {
      if (err) {
      console.log('err ' + err)
      }
    })
  },
  getUserId: function getUserId(id) {
    return new Promise(function(resolve) {
      var sql = "SELECT * FROM users WHERE twitch_id='" + id + "'"
      con.query(sql, function (err, result) {
      if (err) {
        console.log('err ' + err)
      }
      resolve(JSON.stringify(result[0].id))
      })
    })
  },
  getStreamerId: function getStreamerId(id) {
    return new Promise(function(resolve) {
      var sql = "SELECT * FROM streamers WHERE twitch_id='" + id + "'"
      con.query(sql, function (err, result) {
      if (err) {
        console.log('err ' + err)
      }
      resolve(JSON.stringify(result[0].id))
      })
    })
  }
}  
