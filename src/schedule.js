const schedule = require('node-schedule');
const R = require('ramda');

const store = require('./store');

schedule.scheduleJob('0 5 * * *', () => {
  store.queue = [[], [], [], [], []];
  store.finish = 0;
  store.watermeter = R.mapObjIndexed(
    (user) => ({
      ...user,
      finish: 0,
    }),
    store.watermeter,
  );
});

module.exports = {};