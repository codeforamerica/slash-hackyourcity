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

  // help!
  if (message.text.includes("help")) {
    bot.replyPublic(message,{
     "text": "How to /hackyourcity",
     "attachments":[
         {
            "text": "To get an open civic issue that someone has asked for help on, just type `/hackyourcity`.\nTo find issues from a specific group, use `/hackyourcity <groupname>` like `/hackyourcity Code for San Francisco`."
         }
     ]
    });
  }

  var organization_name = message.text.trim().replace(" ","-");
  if (organization_name){
    var url = 'https://codeforamerica.org/api/organizations/'+organization_name+'/issues/labels/help wanted?per_page=1'
  }
  else {
    var url = 'https://codeforamerica.org/api/issues/labels/help wanted?per_page=1'
  }
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      response = JSON.parse(body);
      civicIssue = response.objects[0];

      var labels = [];
      for (label of civicIssue.labels) {
        labels.push(label.name);
      }
      civicIssue.labelString = labels.join(", ");

      var languages = [];
      for (language of civicIssue.project.languages) {
        languages.push(language);
      }
      civicIssue.languages = languages.join(", ");

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
                    },
                    {
                        "title": "Labels",
                        "value": civicIssue.labelString,
                        "short": true
                    },
                    {
                        "title": "Laguages",
                        "value": civicIssue.languages,
                        "short": true
                    },
                ],

            }
          ]
      });

    } else {
      if (response.statusCode == 404) {
        bot.replyPublic(message,"Organization not found. Its case sensitive. You can see the full list at https://github.com/codeforamerica/brigade-information/blob/master/organizations.json");
      }
    }
  });
});
