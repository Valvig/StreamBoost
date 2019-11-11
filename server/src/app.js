const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const morgan = require('morgan')
const session = require('express-session')
const passport = require('passport')
const cookieSession = require('cookie-session')
const OAuth2Strategy = require('passport-oauth').OAuth2Strategy

var twitch = require('./secret/index.js')
const PORT = process.env.PORT || 8081

var request = require('request')
var rp = require('request-promise')
var mysql = require('mysql')

// Initialize Express and middlewares
const app = express()
app.use(morgan('combined'))
app.use(bodyParser.json())
app.use(cors())
app.options('*', cors())

// Cookie Options
app.use(cookieSession({
  name: 'session',
  keys: ['secretcookiekey'],
  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "streamboost"
})

// Initialize Express and middlewares
app.use(session({secret: twitch.SESSION_SECRET, resave: false, saveUninitialized: false}))
app.use(express.static('public'))
app.use(passport.initialize())
app.use(passport.session())

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})

function addUserToDB (name, id, profile_image) {
  return new Promise((resolve, reject) => {
    // Add streamers to streamers DB
    var sql = "INSERT INTO users (name, twitch_id, profile_image) SELECT * FROM (SELECT '" + name + "', '" + id + "', '" + profile_image + "') AS tmp WHERE NOT EXISTS ( SELECT name FROM streamers WHERE name = '" + name + "' AND twitch_id = '" + id + "' ) LIMIT 1"

    con.query(sql, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

async function requestParsedDatas (url) {
  var options = {
    url: url,
    headers: {
      'Client-ID': '3r2ymoz8fb8hcrcvvrdffz7kvop8ii'
    }
  }

  rp(options)
  // Get the request response and parse it
  .then(function (body) {
    return(JSON.parse(body))
  })
}

// eslint-disable-next-line
async function updateEveryStreamersProfileImgInDB (idArray) {  
  var tooMuchData = false

  var urlMultipleId = 'https://api.twitch.tv/helix/users?id='
  if (idArray.length < 100) {
    for (var i = 0 ; i < 99 ; i++){
      urlMultipleId.concat('', idArray[i])
      urlMultipleId.concat('', '&id=')
    }
    // Delete the first 100 in Array
    idArray.splice(0, 100)
    tooMuchData = true
  } else {
    for (var j = 0 ; j < idArray.length ; j++){
      urlMultipleId.concat('', idArray[j])
      urlMultipleId.concat('', '&id=')
    }
  }

  const body = await requestParsedDatas(urlMultipleId)

  const updatedReponse = await updateStreamersProfileImgInDB(tooMuchData, body)

  if (updatedReponse === 'done') {
    return 
  } else {
    updateEveryStreamersProfileImgInDB (updatedReponse.idArray)
  }
}

function updateStreamersProfileImgInDB(tooMuchData, bodyJson) {
  for (var i = 0 ; i < bodyJson.data.length ; i++) {
    var sql = "UPDATE streamers SET profile_image = '" + bodyJson.data[i].profile_image_url + "' WHERE twitch_id = '" + bodyJson.data[i].id + "'";

    con.query(sql, function (err) {
      if (err) {
        return (err)
      }
    })

    if (tooMuchData === true) {
      return 'running'
    } else {
      return 'done'
    }
  }
}

// eslint-disable-next-line
function updateStreamersFollowersNbInDB() {  
  var sql = "SELECT twitch_id FROM streamers WHERE followers_nb = '0'";

  con.query(sql, function (res, err) {
    if (err) {
      return (err)
    } else {
      console.log(res)
    }
  })
}

function addStreamerToDB (name, id) {
  return new Promise((resolve, reject) => {
    // Add streamers to streamers DB
    var sql = "INSERT INTO streamers (name, twitch_id) SELECT * FROM (SELECT '" + name + "', '" + id + "') AS tmp WHERE NOT EXISTS ( SELECT name FROM streamers WHERE name = '" + name + "' ) LIMIT 1"

    con.query(sql, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function addUsersStreamersToDB (id, idStreamer) {
  return new Promise((resolve, reject) => {
    // Add id of user and his follows on DB
    var sql2 = "INSERT INTO users_streamers (users_id, streamers_id) SELECT * FROM (SELECT '" + id + "', '" + idStreamer + "') AS tmp WHERE NOT EXISTS ( SELECT users_id, streamers_id FROM users_streamers WHERE users_id = '" + id + "' AND streamers_id = '" + idStreamer + "') LIMIT 1"

    con.query(sql2, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
  var options = {
    url: 'https://api.twitch.tv/helix/users',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  } 

  request(options, function (error, response, body) {
    if (response && response.statusCode == 200) {
      done(null, JSON.parse(body))
    } else {
      done(JSON.parse(body))
    }
  })
}

passport.serializeUser(function(user, done) {
  done(null, user)
})

passport.deserializeUser(function(user, done) {
  done(null, user)
})

passport
  .use('twitch',
    new OAuth2Strategy({
      authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
      tokenURL: 'https://id.twitch.tv/oauth2/token',
      clientID: twitch.TWITCH_CLIENT_ID,
      clientSecret: twitch.TWITCH_SECRET,
      callbackURL: twitch.CALLBACK_URL,
      state: true
    },
    function(accessToken, refreshToken, profile, done) {
      profile.accessToken = accessToken
      profile.refreshToken = refreshToken

      done(null, profile)
    })
  )

// Set route to start OAuth link, this is where you define scopes to request
app.get('/auth/twitch', passport.authenticate('twitch', {scope:'user_read'}))

// Set route for OAuth redirect
app.get("/auth/twitch/callback", passport.authenticate("twitch"), async function(req,res) {
  // Successful authentication, redirect home after setting user datas into a cookie
  res.cookie('userId', req.user.data[0].id)
  res.cookie('userName', req.user.data[0].display_name)
  res.cookie('userProfileImage', req.user.data[0].profile_image_url)

  asyncCall2(req).then( (test) => {
    console.log('test vaut ' + test)
  })

  res.redirect("http://localhost:8080/")
})

async function asyncCall2(req) {
  // eslint-disable-next-line
  const userToDb = await addUserToDB(req.user.data[0].display_name, req.user.data[0].id, req.user.data[0].profile_image_url)
  // eslint-disable-next-line
  const updateDBWithFollows = await updateDBWithFollowsData(req.user.data[0].id, '', [])

  return updateDBWithFollows
  
  // var streamersProfileImgInDB = await updateEveryStreamersProfileImgInDB(followsOfUser)
  // var streamersFollowersNbInDB = await updateStreamersFollowersNbInDB()
}

app.get('/userFollows', function(req, res) {
  // Add id of user and his follows on DB
  var sql = "SELECT * FROM users_streamers WHERE users_id = " + req.query.id
  con.query(sql, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      res.send(result)
    }
  })
})

async function updateDBWithFollowsData(id, pagination, array) {
  const bodyJson = await getFollowUsingPaginationCursor(id, pagination)
  
  var datas = await useFollowData(id,bodyJson, array)

  if (datas.status === 'done') {
    return datas.arrayId
  } else {
    console.log('else , datas.status = ' + datas.status)
    return await updateDBWithFollowsData(id, bodyJson.pagination.cursor, datas.arrayId)
  }
}

function getFollowUsingPaginationCursor(id, pagination) {
  var urlData = ''

  if (pagination === '') {
    urlData = 'https://api.twitch.tv/helix/users/follows?from_id=' + id + '&first=100'
  } else {
    urlData = 'https://api.twitch.tv/helix/users/follows?from_id=' + id + '&first=100&after=' + pagination
  }

  requestParsedDatas(urlData)
}

function useFollowData(id, bodyJson, arrayId) {
  if (bodyJson.pagination.cursor === undefined) {
    var obj = {
      arrayId: arrayId,
      status: 'done'
    }
    return obj
  } else {
    for ( var i = 0 ; i < bodyJson.data.length ; i++ ) {
      addStreamerToDB(bodyJson.data[i].to_name, bodyJson.data[i].to_id)
      addUsersStreamersToDB(id, bodyJson.data[i].to_id)
      arrayId.push(bodyJson.data[i].to_id)
    }
    obj = {
      arrayId: arrayId,
      status: 'running'
    }
    return obj
  }
}

app.get('/streamers', function(req, res) {
  // Add id of user and his follows on DB
  var sql = "SELECT * FROM streamers WHERE twitch_id =" + req.query.id
  con.query(sql, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      res.send(result)
    }
  })
})

app.get ('/flush', function () {
  var sql = "DELETE FROM `users_streamers`"
  con.query(sql)

  var sql2 = "DELETE FROM `streamers`"
  con.query(sql2)

  var sql3 = "DELETE FROM `users`"
  con.query(sql3)
})

app.listen(PORT, function () {
  console.log('Twitch auth sample listening…')
})
