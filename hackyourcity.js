/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

var Botkit = require('botkit');
var request = require('request');
require('dotenv').config();

var Redis_Store = require('./redis_storage.js');
var redis_url = process.env.REDIS_URL
var redis_store = new Redis_Store({url: redis_url});

var controller = Botkit.slackbot({
    storage: redis_store,
  }).configureSlackApp({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    scopes: ['commands']
  });

controller.setupWebserver(process.env.PORT,function(err,webserver) {

  controller.createWebhookEndpoints(controller.webserver);

  controller.createOauthEndpoints(controller.webserver,function(err,req,res) {
    if (err) {
      res.status(500).send('ERROR: ' + err);
    } else {
      res.send('Success!');
    }
  });
});

controller.on('slash_command',function(bot,message) {

  request('https://codeforamerica.org/api/issues?per_page=1', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      response = JSON.parse(body);
      civicIssue = response.objects[0];
      
      bot.replyPublic(message,{
        attachments: [
            {
                "fallback": civicIssue.title + " " + civicIssue.html_url,

                "color": "good",

                "pretext": "I found a civic issue for you. :robot_face:",

                "title": civicIssue.title,
                "title_link": civicIssue.html_url,

                "text" : civicIssue.body,

                "fields": [
                    {
                        "title": "Organization",
                        "value": civicIssue.project.organization_name,
                        "short": true
                    },
                    {
                        "title": "Project",
                        "value": civicIssue.project.name,
                        "short": true
                    }
                ],

            }
          ]
      });

    }
  })

});
