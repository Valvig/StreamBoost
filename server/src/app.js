const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const morgan = require('morgan')
const session = require('express-session')
const passport = require('passport')
const OAuth2Strategy = require('passport-oauth').OAuth2Strategy
const handlebars = require('handlebars')

var twitch = require('./secret/index.js')
const PORT = process.env.PORT || 8081

var request = require('request')

var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "streamboost"
});
 
// Initialize Express and middlewares
const app = express()
app.use(morgan('combined'))
app.use(bodyParser.json())
app.use(cors())
app.options('*', cors())

app.get('/test', () => {
  
  var name = 'LesSoyeux'
  con.connect(function(err) {
    if (err) {
      console.log(err)
    }
    console.log("Connected!");
    var sql = "INSERT INTO users (name) VALUES ('" + name + "')";
    con.query(sql, function (err) {
      if (err) {
        console.log('user already exists')
      }
      console.log("1 record inserted");
    })
  })
})

app.post('/follows', () => {
  var pagination = ' '
  var id = '119638588'
  var options = {
    url: 'https://api.twitch.tv/helix/users/follows?from_id=' + id + '&first=100&after=' + pagination,
    headers: {
      'Client-ID': '3r2ymoz8fb8hcrcvvrdffz7kvop8ii'
    }
  }

  function loop() {
    if (pagination !== '') {
      request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var info = JSON.parse(body)
          if (pagination !== '') {
            console.log(pagination)
            pagination = info.pagination.cursor

            for (var i = 0; i < info.data.length; i++){
              var userId = ''
              var streamerId = ''
              var x = i

              getUserId(id)
              .then(function(value) {
                userId = value
              })

              insertStreamersIntoDB(info, x).then(function() {
                getStreamerId(info.data[x].to_id)
                .then(function(value) {
                  streamerId = value
                }).then(function () {
                  console.log('userId, streamerId : ' + userId + ', ' + streamerId)
                  insertUsersStreamersIntoDB(userId, streamerId)
                })
              })
            }


            options = {
              url: 'https://api.twitch.tv/helix/users/follows?from_id=' + id + '&first=100&after=' + pagination,
              headers: {
                'Client-ID': '3r2ymoz8fb8hcrcvvrdffz7kvop8ii'
              }
            }
            loop()
          }
        } else {
          console.log('error ' + error)
        }
      })
    }
  }

  con.connect(function(err) {
    if (err) {
      console.log(err)
    }
    console.log("Connected!")
    loop()
  })
})



app.post('/followers', () => {
  var pagination = ' '
  var id = '27802643'
  var options = {
    url: 'https://api.twitch.tv/helix/users/follows?to_id=' + id + '&first=100&after=' + pagination,
    headers: {
      'Client-ID': '3r2ymoz8fb8hcrcvvrdffz7kvop8ii'
    }
  }
  
  function loop() {
    if (pagination !== '') {
      request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var info = JSON.parse(body)
          if (pagination !== '') {
            console.log(pagination)
            pagination = info.pagination.cursor
            options = {
              url: 'https://api.twitch.tv/helix/users/follows?to_id=' + id + '&first=100&after=' + pagination,
              headers: {
                'Client-ID': '3r2ymoz8fb8hcrcvvrdffz7kvop8ii'
              }
            }
            loop()
          }
        } else {
          console.log('error ' + error)
        }
      })
    }
  }

  loop()
})

// Initialize Express and middlewares
app.use(session({secret: twitch.SESSION_SECRET, resave: false, saveUninitialized: false}))
app.use(express.static('public'))
app.use(passport.initialize())
app.use(passport.session())

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
      console.log('OK')
      done(null, JSON.parse(body))
    } else {
      console.log('KO')
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
app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/' }))


// Define a simple template to safely generate HTML with values from user's profile
var template = handlebars.compile(`
  Twitch Auth Sample
  <table>
    <tbody>
      <tr>
        <th>Access Token</th>
        <td>{{accessToken}}</td>
      </tr>
      <tr>
        <th>Refresh Token</th>
        <td>{{refreshToken}}</td>
      </tr>
      <tr>
        <th>Display Name</th>
        <td>{{display_name}}</td>
      </tr>
      <tr>
        <th>Bio</th>
        <td>{{bio}}</td>
      </tr>
      <tr>
        <th>Image</th>
        <td>{{logo}}</td>
      </tr>
    </tbody>
  </table>
`)

// If user has an authenticated session, display it, otherwise display link to authenticate
app.get('/', function (req, res) {
  if(req.session && req.session.passport && req.session.passport.user) {
    console.log(req.session.passport.user)
    res.send(template(req.session.passport.user))
  } else {
    res.send(
      'Twitch Auth Sample<a href="/auth/twitch"><img src="//discuss.dev.twitch.tv/uploads/default/original/2X/0/05c21e05a37ee1291c69a747959359dab90c0af3.png" width="170" height="32"></a>'
    )
  }
})

app.listen(PORT, function () {
  console.log('Twitch auth sample listening…')
})