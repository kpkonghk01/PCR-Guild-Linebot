const R = require('ramda');
const {
  REGISTER,
  CHANGE_CURRENT,
  REGISTER_X_QUEUE,
  GIVEUP_X_QUEUE,
  FINISH,
  Q,
  QX,
  QS,
  S,
  REGISTER_MASTER,
  HELP,
  CANCEL_USER_CURRENT_QUEUE,
  CANCEL_USER_X_QUEUE,
  FINISH_USER_CURRENT_QUEUE,
  FINISH_USER_X_QUEUE,
  REGISTER_USER_X_QUEUE,
  DELETE_USER,
  WATERMETER,
} = require('./constants/actions');
const MANUAL = require('./constants/manual');
const store = require('./store');

const queueXToNNames = (x, N) =>
  store.queue[x]
    .slice(0, N)
    .map(
      queueUserId => `@${store.userIdDisplayNameMap[queueUserId]}`,
    );
const queueXToLength = (x) =>
  store.queue[x].length;
const isMaster = (userId) => userId == store.masterId;


module.exports = {
  // member cmd
  [REGISTER]: (userId) => () => {
    const displayName = store.userIdDisplayNameMap[userId];

    if (store.watermeter[userId]) {
      return `@${displayName} 已註冊`;
    }

    store.watermeter[userId] = {
      displayName,
      finish: 0,
    };

    return `@${displayName} 註冊成功`;
  },
  [CHANGE_CURRENT]: () => ({ x }) => {
    store.current = x;

    const inQueue = queueXToNNames(store.current, 5);

    return `${store.current + 1}王出現了${
      R.isEmpty(inQueue)
        ? ''
        : `, ${inQueue.join(', ')}, 上吧！`
      }`;
  },
  [REGISTER_X_QUEUE]: (userId) => ({ x }) => {
    store.queue[x].push(userId);

    const displayName = store.userIdDisplayNameMap[userId];

    return `@${displayName} 已報 ${x + 1}王, 前面有 ${store.queue[x].length - 1} 人`;
  },
  [GIVEUP_X_QUEUE]: (userId) => ({ x }) => {
    const toRemoveIdx = store.queue[x].indexOf(userId);
    const displayName = store.userIdDisplayNameMap[userId];

    if (toRemoveIdx === -1) {
      return `@${displayName} 沒在排 ${x + 1}王喔, 現有 ${store.queue[x].length} 人輪候`;
    }

    store.queue[x].splice(toRemoveIdx, 1);

    return `@${displayName} 已棄 ${x + 1}王, 現有 ${store.queue[x].length} 人輪候`;
  },
  [FINISH]: (userId) => () => {
    const displayName = store.userIdDisplayNameMap[userId];
    const toRemoveIdx = store.queue[store.current].indexOf(userId);

    if (toRemoveIdx === -1) {
      return `@${displayName} 沒在排 ${store.current + 1}王喔, 現有 ${store.queue[store.current].length} 人輪候`;
    }

    store.queue[store.current].splice(toRemoveIdx, 1);
    store.finish++;
    store.watermeter[userId]['finish']++;

    return `@${displayName} 已出 ${store.current + 1}王, 還有 ${store.queue[store.current].length} 人輪候`;
  },
  [Q]: () => () => {
    const inQueue = queueXToNNames(store.current, 5);

    return `${R.isEmpty(inQueue) ? '沒有人' : inQueue.join(', ')} 在排 ${store.current + 1}王`;
  },
  [QX]: () => ({ x }) => {
    const inQueue = queueXToNNames(x, 5);

    return `${R.isEmpty(inQueue) ? '沒有人' : inQueue.join(', ')} 在排 ${x + 1}王`;
  },
  [QS]: () => () => [0, 1, 2, 3, 4].map(x => `${queueXToLength(x)} 人在排 ${x + 1}王`).join('\n'),
  [S]: () => () => `今天己出 ${store.finish} 刀`,
  [REGISTER_MASTER]: (userId) => () => {
    if (R.isEmpty(store.masterId)) {
      const displayName = store.userIdDisplayNameMap[userId];
      store.masterId = userId;

      return `@${displayName}, 你就是我的 Master 嗎？`;
    }

    if (store.masterId === userId) {
      return `知道啦知道啦, 不用再說了`;
    }

    const displayName = store.userIdDisplayNameMap[store.masterId];

    return `我的 Master 只有 @${displayName}!`;
  },
  [HELP]: () => () => {
    return `${MANUAL.member.join('\n')}\n${MANUAL.master.join('\n')}\n${MANUAL.remark.join('\n')}`;
  },

  // master cmd
  [CANCEL_USER_CURRENT_QUEUE]: (userId) => ({ displayName }) => {
    if (!isMaster(userId)) {
      return `叫 Master 來跟我說`;
    }

    const toRemoveUserId = store.displayNameUserIdMap[displayName];
    const toRemoveIdx = store.queue[store.current].indexOf(toRemoveUserId);

    if (toRemoveIdx === -1) {
      return `@${displayName} 沒在排 ${store.current + 1}王喔, 現有 ${store.queue[store.current].length} 人輪候`;
    }

    store.queue[store.current].splice(toRemoveIdx, 1);

    return `@${displayName} 已棄 ${store.current + 1}王, 現有 ${store.queue[store.current].length} 人輪候`;
  },
  [CANCEL_USER_X_QUEUE]: (userId) => ({ displayName, x }) => {
    if (!isMaster(userId)) {
      return `叫 Master 來跟我說`;
    }

    const toRemoveUserId = store.displayNameUserIdMap[displayName];
    const toRemoveIdx = store.queue[x].indexOf(toRemoveUserId);

    if (toRemoveIdx === -1) {
      return `@${displayName} 沒在排 ${x + 1}王喔, 現有 ${store.queue[x].length} 人輪候`;
    }

    store.queue[x].splice(toRemoveIdx, 1);

    return `@${displayName} 已棄 ${x + 1}王, 現有 ${store.queue[x].length} 人輪候`;
  },
  [FINISH_USER_CURRENT_QUEUE]: (userId) => ({ displayName }) => {
    if (!isMaster(userId)) {
      return '叫 Master 來見我';
    }

    const toRemoveUserId = store.displayNameUserIdMap[displayName];
    const toRemoveIdx = store.queue[store.current].indexOf(toRemoveUserId);

    if (toRemoveIdx === -1) {
      return `@${displayName} 沒在排 ${x + 1}王喔, 現有 ${store.queue[x].length} 人輪候`;
    }

    store.queue[store.current].splice(toRemoveIdx, 1);
    store.finish++;
    store.watermeter[toRemoveUserId]['finish']++;

    return `@${displayName} 已出 ${store.current + 1}王, 還有 ${store.queue[store.current].length} 人輪候`;
  },
  [FINISH_USER_X_QUEUE]: (userId) => ({ displayName, x }) => {
    if (!isMaster(userId)) {
      return `叫 Master 來跟我說`;
    }

    const toRemoveUserId = store.displayNameUserIdMap[displayName];
    const toRemoveIdx = store.queue[x].indexOf(toRemoveUserId);

    if (toRemoveIdx === -1) {
      return `@${displayName} 沒在排 ${x + 1}王喔, 現有 ${store.queue[x].length} 人輪候`;
    }

    store.queue[x].splice(toRemoveIdx, 1);
    store.finish++;
    store.watermeter[toRemoveUserId]['finish']++;

    return `@${displayName} 已出 ${x + 1}王, 還有 ${store.queue[x].length} 人輪候`;
  },
  [REGISTER_USER_X_QUEUE]: (userId) => ({ displayName, x }) => {
    if (!isMaster(userId)) {
      return `叫 Master 來跟我說`;
    }

    const toAppendUserId = store.displayNameUserIdMap[displayName];

    if (R.isNil(toAppendUserId)) {
      return `@${displayName}... 是誰？ 能說一下話嗎？ 我認不出來`;
    }

    store.queue[x].push(toAppendUserId);

    return `@${displayName} 已排 ${x + 1}王, 現有 ${store.queue[x].length} 人輪候`;
  },
  [DELETE_USER]: (userId) => ({ displayName }) => {
    if (!isMaster(userId)) {
      return `叫 Master 來跟我說`;
    }

    const toRemoveUserId = store.displayNameUserIdMap[displayName];
    delete store.watermeter[toRemoveUserId];

    return `已註銷 @${displayName}`;
  },
  [WATERMETER]: (userId) => () => {
    if (!isMaster(userId)) {
      return `叫 Master 來跟我說`;
    }

    const notFinish3Memnbers = R.pipe(
      R.values,
      R.filter(({ finish }) => finish < 3),
      R.map(({ displayName, finish }) => `@${displayName} -${3 - finish}`),
    )(store.watermeter);

    if (R.isEmpty(notFinish3Memnbers)) {
      return '都完刀嘍';
    }

    return `${notFinish3Memnbers.join('\n')}`;
  },
};
