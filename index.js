require('./src/schedule');

const {
  middleware,
  JSONParseError,
  SignatureValidationFailed,
} = require('@line/bot-sdk');
const express = require('express');

const { config } = require('./src/client');
const handleEvent = require('./src/handleEvent');

const { PORT } = process.env;

const app = express();

app.post('/webhook', middleware(config), (req, res) => {
  // FIXME: Error handling
  Promise
    .all(req.body.events.map(handleEvent))
    .then(result => res.json(result));
});

app.use((err, req, res, next) => {
  if (err instanceof SignatureValidationFailed) {
    res.status(401).send(err.signature);
    return;
  }

  if (err instanceof JSONParseError) {
    res.status(400).send(err.raw);
    return;
  }
  next(err) // will throw default 500
});

app.listen(PORT);
console.log(`PCR Listen on Port: ${PORT}`);
