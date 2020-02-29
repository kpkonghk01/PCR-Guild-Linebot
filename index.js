require('dotenv').config();
const line = require('@line/bot-sdk');
const {
  middleware,
  Client,
  JSONParseError,
  SignatureValidationFailed,
} = require('@line/bot-sdk');
const express = require('express');

const {
  SECRET,
  ACCESS_TOKEN,
  PORT,
} = process.env;

const config = {
  channelSecret: SECRET,
  channelAccessToken: ACCESS_TOKEN,
};

const app = express();

app.post('/webhook', middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then(result => res.json(result));
});

app.use((err, req, res, next) => {
  if (err instanceof SignatureValidationFailed) {
    res.status(401).send(err.signature);
    return;
  } else if (err instanceof JSONParseError) {
    res.status(400).send(err.raw);
    return;
  }
  next(err) // will throw default 500
});

const client = new Client(config);

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: event.message.text
  });
}

app.listen(PORT);
console.log(`PCR Listen on Port: ${PORT}`)
