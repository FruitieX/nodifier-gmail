/**
 * Copyright 2012 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Fetch an Oauth2 token for gmail-nodifier, save to ~/.gmailOauth2Token.json
 *
 * Adapted from the google-api-nodejs-client/examples/oauth2.js example in
 * https://github.com/google/google-api-nodejs-client
 */

var readline = require('readline');
var fs =  require('fs');

var google = require('googleapis');
var OAuth2Client = google.auth.OAuth2;

// Client ID and client secret are available at
// https://code.google.com/apis/console
var CLIENT_ID = '301862269671-kp5lmqk7q3t3mgt6tls7vhb4h26q9mh5.apps.googleusercontent.com';
var CLIENT_SECRET = 'kRhDQVkPWLwlzkt02RmzkGVV';
var REDIRECT_URL = 'urn:ietf:wg:oauth:2.0:oob';

var oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL);

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// generate consent page url
var url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // will return a refresh token
    scope: 'https://www.googleapis.com/auth/gmail.modify' // can be a space-delimited string or an array of scopes
});

console.log('Visit the url:\n' + url);
rl.question('Enter the code here followed by return:\n', function(code) {
    // request access token
    oauth2Client.getToken(code, function(err, tokens) {
        // write token to file and quit
        fs.writeFile(process.env.HOME + '/.gmailOauth2Token.json', JSON.stringify(tokens));
        console.log('Wrote file ~/.gmailOauth2Token.json');
        process.exit();
    });
});
