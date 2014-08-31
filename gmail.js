var google = require('googleapis');
var fs = require('fs');

var OAuth2Client = google.auth.OAuth2;
var gmail = google.gmail('v1');

// Client ID and client secret are available at
// https://code.google.com/apis/console
var CLIENT_ID = '301862269671-kp5lmqk7q3t3mgt6tls7vhb4h26q9mh5.apps.googleusercontent.com';
var CLIENT_SECRET = 'kRhDQVkPWLwlzkt02RmzkGVV';
var REDIRECT_URL = 'urn:ietf:wg:oauth:2.0:oob';
var oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);
var credentials = fs.readFileSync(process.env.HOME + '/.gmailOauth2Token.json').toString('utf8');
oauth2Client.setCredentials(JSON.parse(credentials));

var nodifierConnect = require('nodifier_connect');
var socket = new nodifierConnect();

// keep track of which messages we've seen before
var unread = {};

var refreshGmail = function() {
    gmail.users.messages.list({
        userId: 'me',
        auth: oauth2Client,
        q: 'is:unread in:inbox'
    }, function(err, response) {
        if(err) {
            console.log('ERROR in refreshGmail()');
            console.log(err);
        } else {
            var gmailUnread = response.messages;

            if(gmailUnread) {
                for(var i = 0; i < gmailUnread.length; i++) {
                    // new unread mail
                    if(!unread[gmailUnread[i].id]) {
                        unread[gmailUnread[i].id] = true;
                        console.log('refreshGmail(): synced unread mail ' + gmailUnread[i].id);

                        // get message subject and send notification to nodifier server
                        getShortMessage(gmailUnread[i].id, function(shortMessage, id) {
                            var notification = {
                                'uid': id,
                                'text': shortMessage,
                                'openwith': 'browser',
                                'url': 'https://mail.google.com/mail/u/0/#inbox/' + id,
                                'source': 'mail',
                                'sourcebg': 'blackBright',
                                'sourcefg': 'whiteBright',
                                'context': 'gmail',
                                'contextbg': 'red',
                                'contextfg': 'black'
                            };

                            socket.send('newNotification', notification);
                        });
                    }
                }
            }

            // look for messages in 'unread' that were marked as read in gmail
            for(var id in unread) {
                var match;
                if(gmailUnread) {
                    match = gmailUnread.filter(function(msg) {
                        return msg.id === id;
                    });
                }

                if(!gmailUnread || !match.length) {
                    delete(unread[id]);
                    console.log('refreshGmail(): synced read mail ' + id);

                    // mark id as read in nodifier
                    socket.send('markAs', {
                        'read': true,
                        'uid': id,
                        'source': 'mail'
                    });
                }
            }
        }
    });
};

var gmailSetRead = function(id, read) {
    var resource;
    if(read) {
        resource = {
            "removeLabelIds": [ 'UNREAD' ]
        }
    } else {
        resource = {
            "addLabelIds": [ 'UNREAD' ]
        }
    }

    gmail.users.messages.modify({
        userId: 'me',
        auth: oauth2Client,
        id: id,
        resource: resource
    }, function(err, response) {
        if(err) {
            console.log('ERROR in gmailSetRead() while setting read status of ' + id + ' to ' + read);
            console.log(err);
        } else {
            console.log('gmailSetRead(): ' + id + ' read status set to ' + read);
            delete(unread[id]);
        }
    });
};

var getShortMessage = function(id, callback) {
    gmail.users.messages.get({
        userId: 'me',
        auth: oauth2Client,
        id: id,
        format: 'full'
    }, function(err, response) {
        if(err) {
            console.log('ERROR in getMessage()')
            console.log(err);
        } else {
            var headers = response.payload.headers;

            var subject = headers.filter(function(element) {
                return element.name === 'Subject';
            })[0].value;

            var from = headers.filter(function(element) {
                return element.name === 'From';
            })[0].value;
            from = from.replace(/\s<\S+@\S+>/, '');

            var shortMessage = from + ': ' + subject;

            //console.log(require('util').inspect(response, { depth: null, colors: true }));

            callback(shortMessage, id);
        }
    });
};

socket.on('markAs', function(notifications) {
    for (var i = notifications.length - 1; i >= 0; i--) {
        // TODO: more precise checking
        if(notifications[i].source === 'mail') {
            if(notifications[i].read)
                gmailSetRead(notifications[i].uid, true);
            else
                gmailSetRead(notifications[i].uid, false);
        }
    }
});

socket.once('open', function() {
    refreshGmail();
    setInterval(refreshGmail, 5000);
});

process.on('uncaughtException', function (err) {
    console.error(err.stack);
    console.log("ERROR! Node not exiting.");
});
