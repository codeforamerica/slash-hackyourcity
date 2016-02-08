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
  if (!message.text || message.text == "help") {
    bot.replyPublic(message,{
     "text": "How to /hackyourcity",
     "attachments":[
         {
            "text": "To get an open civic issue that someone has asked for help on, just type `/hackyourcity issue`.\nTo find issues from a specific group, use `/hackyourcity issue <groupname>` like `/hackyourcity issues Code for San Francisco`\nTo find a civic project that is interesting to you, use `/hackyourcity project`.\nYou can also search for projects like `/hackyourcity project schools, javascript`"
         }
     ]
    });
  }

  // Civic Issue
  if (message.text.includes("issue")) {

    var organization_name = message.text.replace("issue","").trim().replace(" ","-");
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

      }
    })

  }

  // Project Search
  if (message.text.includes("project")) {

    var search = message.text.replace("project","");
    var url = 'https://codeforamerica.org/api/projects?per_page=1&q=' + search;

    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        response = JSON.parse(body);
        project = response.objects[0];

        var languages = [];
        for (language of project.languages) {
          languages.push(language);
        }
        project.languages = languages.join(", ");

        bot.replyPublic(message,{
          attachments: [
              {
                  "fallback": project.name + " " + project.code_url,

                  "color": "good",

                  "pretext": "I found a civic tech project for you. :robot_face:",

                  "title": project.name,
                  "title_link": project.code_url,

                  "text" : project.description,

                  "fields": [
                      {
                          "title": "Organization",
                          "value": project.organization_name,
                          "short": true
                      },
                      {
                          "title": "Laguages",
                          "value": project.languages,
                          "short": true
                      },
                  ],

              }
            ]
        });

      }
    });

  }

});
