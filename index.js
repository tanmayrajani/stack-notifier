'use strict';

const bodyParser = require('body-parser');
const request = require('request');
const BootBot = require('bootbot');
const express = require('express');
const app = express();
var MongoClient = require('mongodb').MongoClient;
var mydb, stackusers, userIds = [];
MongoClient.connect('mongodb://tanmayrajani:teststacknotify@ds141410.mlab.com:41410/stacknotify', function (err, db) {
    mydb = db;
    if (err) {
        console.log(err);
    } else {
        setInterval(getUserInfo, 300000)
        console.log("==== database connected whoohooo ====");
    }
})

const bot = new BootBot({
    accessToken: 'EAAXpJQaYPbsBAIPR2l7OhWoOZAhdMwOZCpCwXJCpRoYY782VZB99gLXFdaULs6qRCKEsQcEpUFndEwBmgMKYCZB97oKZBHh1J290qRdge7VnmEUX62Hiv2Snqc8FpZCZAKtIM1qTZBB87CcvWf5MTyrZAuKgruLjMEtqlaGGL5XGcUAZDZD',
    verifyToken: 'stack-unread-notifier-xo-xo',
    appSecret: '98ffd31362df1ce1042828d29db11ae8'
});

function addUserToDB(accessToken) {
    mydb.collection("stackusers").findOneAndUpdate({
        'userId': userIds.pop()
    }, {
        $set: {
            'accessToken': accessToken
        }
    }, {
        upsert: true
    }, function (err, post) {
        if (err) {
            console.log(err);
        } else {
            console.log(post);
        }
    })
}

function getUnreadInbox(user) {
    request.get({
        uri: 'https://api.stackexchange.com/2.2/me/inbox/unread?site=stackoverflow&key=0BeQ3OPnU)LJUqXsy97D*g((&page=1&pagesize=12&access_token=' + user.accessToken,
        gzip: true
    }, function (error, response, body) {
        if (error) {
            console.log(error);
            return;
        } else {
            let jsonbody = JSON.parse(body);
            if (jsonbody["items"] && jsonbody["items"].length > 0) {
                jsonbody["items"].forEach(function (item) {
                    bot.say(user.userId, {
                        text: 'You got a reply in ' + item["item_type"] + '\n\n"' + item["title"] + '"',
                        buttons: [{
                            type: 'web_url',
                            title: 'Visit post',
                            url: item["link"]
                        }]
                    });
                })
            }
        }
    })
}

function getUnreadReputationChanges(user) {
    console.log("WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW")
    request.get({
        uri: 'https://api.stackexchange.com/2.2/me/reputation?site=stackoverflow&key=0BeQ3OPnU)LJUqXsy97D*g((&access_token=' + user.accessToken,
        gzip: true
    }, function (error, response, body) {
        if (error) {
            console.log(error)
            return;
        } else {
            let jsonbody = JSON.parse(body);
            if (jsonbody["items"] && jsonbody["items"].length > 0) {
                jsonbody["items"].forEach(function (item) {
                    console.log(item["vote_type"] + " " + item["reputation_change"] + " " + item["on_date"] * 1000);
                    if (item["on_date"] * 1000 > (new Date().getTime() - 350000)) {
                        bot.say(user.userId, {
                            text: "+" + item["reputation_change"] + ", " + item["vote_type"].replace(/_/g, " "),
                            buttons: [{
                                type: 'web_url',
                                title: 'Visit post',
                                url: 'https://stackoverflow.com/q/' + item["post_id"]
                            }]
                        });
                    }
                })
            }
        }
    })
}

function getUserInfo() {
    mydb.collection("stackusers").find().toArray(function (err, items) {
        items.forEach(function (user) {
            getUnreadInbox(user)
            getUnreadReputationChanges(user)
        })
    })
}

function getAccessToken(code) {
    request.post({
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        url: 'https://stackexchange.com/oauth/access_token',
        form: {
            code: code,
            client_id: 9261,
            client_secret: 'YR46sPC1OpdSnltaDIMj9w((',
            redirect_uri: 'https://stack-unread-notifier.herokuapp.com/register'
        }
    }, function (error, response, body) {
        console.log(body.substr(body.indexOf("=") + 1));
        const accessToken = body.substr(body.indexOf("=") + 1);
        addUserToDB(accessToken);
    });
}

bot.app.get('/register', function (req, res) {
    res.sendFile('register.html', {
        root: __dirname
    });
});

bot.app.get('/registered-code', function (req, res) {
    console.log(req.query);
    if (req.query.code) {
        res.send("OK");
        getAccessToken(req.query.code)
    }
})

bot.app.get('/privacy', function (req, res) {
    res.send('<h2 style="padding: 30px; font-family: consolas; text-decoration:underline">The StackBot</h2><p style="font-family: consolas; font-size: 18px; padding: 10px 30px">This is built solely for learning purposes and is not intended for any kind of commercial activity and hence we do not collect any kind of user\'s personal information at all. We honor user\'s privacy and do not track anything at all. It is not developed in order to attract anyone under 13.</p>');
});

bot.hear([/.*/], (payload, chat) => {
    mydb.collection("stackusers").findOne({
        'userId': payload.sender.id
    }, function (err, post) {
        if (err) {
            console.log(err);
        } else {
            console.log(post)
            if (post) {
                chat.say("Doesn't look like anything to me!");
            } else {
                userIds.push(payload.sender.id);
                chat.say({
                    text: "Hey... you're new.. not much of a rind on you! :D \n\nI'm the StackBot! \nI send your StackOverflow notifications/inbox here! :D",
                    buttons: [{
                        type: 'web_url',
                        title: 'Let\'s get started!',
                        url: 'https://stackexchange.com/oauth?client_id=9261&scope=read_inbox,no_expiry&redirect_uri=https://stack-unread-notifier.herokuapp.com/register'
                    }]
                });
            }
        }
    })
});

bot.start(process.env.PORT || 3000);