require('dotenv').config();
const {
  middleware,
  Client,
  JSONParseError,
  SignatureValidationFailed,
} = require('@line/bot-sdk');
const express = require('express');
const R = require('ramda');

const {
  SECRET,
  ACCESS_TOKEN,
  PORT,
} = process.env;

const manual = {
  member: [
    '一般指令:',
    '到x王/{x}王上線',
    '排x王',
    '棄x王',
    '完刀',
    'Q',
    'Qx',
    'Qs',
    'S',
    'I am Master!',
    'help',
    '',
  ],
  master: [
    '會長指令:',
    '取消{username}',
    '取消{username} {x}王',
    '{username}完刀 ',
    '{username} {x}王完刀',
    '{username}排{x}王',
    '註銷{username}',
    '查水錶',
    '',
  ],
  remark: [
    '每朝5時重置排刀和水錶',
  ]
};

const REGISTER = 'register';
const CHANGE_CURRENT = 'changeCurrent';
const REGISTER_X_QUEUE = 'registerXQueue';
const GIVEUP_X_QUEUE = 'giveupXQueue';
const FINISH = 'finish';
const Q = 'q';
const QX = 'qx';
const QS = 'qs';
const S = 's';
const REGISTER_MASTER = 'registerMaster';
const HELP = 'help';
const CANCEL_USER_CURRENT_QUEUE = 'cancelUserCurrentQueue';
const CANCEL_USER_X_QUEUE = 'cancelUserXQueue';
const FINISH_USER_CURRENT_QUEUE = 'finishUserCurrentQueue';
const FINISH_USER_X_QUEUE = 'finishUserXQueue';
const REGISTER_USER_X_QUEUE = 'registerUserXQueue';
const DELETE_USER = 'deleteUser';
const WATERMETER = 'watermeter';

const ACTIONS = {
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
};

const config = {
  channelSecret: SECRET,
  channelAccessToken: ACCESS_TOKEN,
};

let current = 0;
let finish = 0
let queue = [
  // [userId1, userId2, userId3]
  [],
  [],
  [],
  [],
  [],
];

// TODO: handle change displayName
let watermeter = {
  // [userId]: {
  //   displayName,
  //   finish,
  // }
};

let masterId = '';

const userIdDisplayNameMap = {
  // [userId]: displayName,
};

const displayNameUserIdMap = {
  // [displayName]: userId,
};

const queueXToNNames = (x, N) => queue[x].slice(0, N)
  .map(queueUserId => `@${userIdDisplayNameMap[queueUserId]}`);
const queueXToLength = x => queue[x].length;

const extractor = {
  // member cmd
  [REGISTER]: text => !R.isNil(text.match(/^註冊$/)),
  [CHANGE_CURRENT]: text => {
    const [, x] = (text.match(/^到([1-5])王$/) || text.match(/^([1-5])王上線$/) || []);
    return x
      ? { x: ~~x - 1 }
      : false;
  },
  [REGISTER_X_QUEUE]: text => {
    const [, x] = (text.match(/^(?:排|報)([1-5])王$/) || []);
    return x
      ? { x: ~~x - 1 }
      : false;
  },
  [GIVEUP_X_QUEUE]: text => {
    const [, x] = (text.match(/^棄([1-5])王$/) || []);
    return x
      ? { x: ~~x - 1 }
      : false;
  },
  [FINISH]: text => !R.isNil(text.match(/^完刀$/)),
  [Q]: text => !R.isNil(text.match(/^Q$/i)),
  [QX]: text => {
    const [, x] = (text.match(/^Q([1-5])$/i) || []);
    return x
      ? { x: ~~x - 1 }
      : false;
  },
  [QS]: text => !R.isNil(text.match(/^Qs$/i)),
  [S]: text => !R.isNil(text.match(/^S$/i)),
  [REGISTER_MASTER]: text => !R.isNil(text.match(/^I am Master!$/i)),
  [HELP]: text => !R.isNil(text.match(/^help$/i)),

  // master cmd
  [CANCEL_USER_CURRENT_QUEUE]: text => {
    const [, displayName] = (text.match(/^取消@([^1-5]+)$/) || []);
    return displayName
      ? { displayName: R.trim(displayName) }
      : false;
  },
  [CANCEL_USER_X_QUEUE]: text => {
    const [, displayName, x] = (text.match(/^取消@([^1-5]+)([1-5])王$/) || []);
    return displayName
      ? { displayName: R.trim(displayName), x: ~~x - 1 }
      : false;
  },
  [FINISH_USER_CURRENT_QUEUE]: text => {
    const [, displayName] = (text.match(/^@([^1-5]+)完刀$/) || []);
    return displayName
      ? { displayName: R.trim(displayName) }
      : false;
  },
  [FINISH_USER_X_QUEUE]: text => {
    const [, displayName, x] = (text.match(/^@([^1-5]+)([1-5])王完刀$/) || []);
    return displayName
      ? { displayName: R.trim(displayName), x: ~~x - 1 }
      : false;
  },
  [REGISTER_USER_X_QUEUE]: text => {
    const [, displayName, x] = (text.match(/^@([^1-5排報]+)(?:排|報)([1-5])王$/) || []);
    return displayName
      ? { displayName: R.trim(displayName), x: ~~x - 1 }
      : false;
  },
  [DELETE_USER]: text => {
    const [, displayName] = (text.match(/^註銷@([^@]+)$/) || []);
    return displayName
      ? { displayName: R.trim(displayName) }
      : false;
  },
  [WATERMETER]: text => !R.isNil(text.match(/^查水錶$/i)),
};

const cmdHandler = {
  // member cmd
  [REGISTER]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      const displayName = userIdDisplayNameMap[userId];

      if (watermeter[userId]) {
        return R.isNil(client)
          ? null
          : client.replyMessage(replyToken, {
            type: 'text',
            text: `@${displayName} 已註冊`,
          });
      }

      watermeter[userId] = {
        displayName,
        finish: 0,
      };

      return R.isNil(client)
        ? null
        : client.replyMessage(replyToken, {
          type: 'text',
          text: `@${displayName} 註冊成功`,
        });
    }
    return null;
  },
  [CHANGE_CURRENT]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      const { x } = extracted;
      current = x;

      const inQueue = queueXToNNames(x, 5);

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `${x + 1}王出現了${
          R.isEmpty(inQueue)
            ? ''
            : `, ${inQueue.join(', ')}, 上吧！`
          }`,
      });
    }

    return null;
  },
  [REGISTER_X_QUEUE]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      const { x } = extracted;
      queue[x].push(userId);

      const displayName = userIdDisplayNameMap[userId];

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `@${displayName} 已報 ${x + 1}王, 前面有 ${queue[x].length - 1} 人`,
      });
    }

    return null;
  },
  [GIVEUP_X_QUEUE]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      const { x } = extracted;
      const toRemoveIdx = queue[x].indexOf(userId);
      const displayName = userIdDisplayNameMap[userId];

      if (toRemoveIdx === -1) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `@${displayName} 沒在排 ${x + 1}王喔, 現有 ${queue[x].length} 人輪候`,
        });
      }

      queue[x].splice(toRemoveIdx, 1);

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `@${displayName} 已棄 ${x + 1}王, 現有 ${queue[x].length} 人輪候`,
      });
    }

    return null;
  },
  [FINISH]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      const displayName = userIdDisplayNameMap[userId];
      const toRemoveIdx = queue[current].indexOf(userId);

      if (toRemoveIdx === -1) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `@${displayName} 沒在排 ${current + 1}王喔, 現有 ${queue[current].length} 人輪候`,
        });
      }

      queue[current].splice(toRemoveIdx, 1);
      finish++;
      watermeter[userId]['finish']++;

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `@${displayName} 已出 ${current + 1}王, 還有 ${queue[current].length} 人輪候`,
      });
    }

    return null;
  },
  [Q]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      const inQueue = queueXToNNames(current, 5);

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `${R.isEmpty(inQueue) ? '沒有人' : inQueue.join(', ')} 在排 ${current + 1}王`,
      });
    }

    return null;
  },
  [QX]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      const { x } = extracted;
      const inQueue = queueXToNNames(x, 5);

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `${R.isEmpty(inQueue) ? '沒有人' : inQueue.join(', ')} 在排 ${x + 1}王`,
      });
    }

    return null;
  },
  [QS]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      return client.replyMessage(replyToken, {
        type: 'text',
        text: [0, 1, 2, 3, 4].map(x => `${queueXToLength(x)} 人在排 ${x + 1}王`).join('\n'),
      });
    }

    return null;
  },
  [S]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      return client.replyMessage(replyToken, {
        type: 'text',
        text: `今天己出 ${finish} 刀`,
      });
    }

    return null;
  },
  [REGISTER_MASTER]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      if (R.isEmpty(masterId)) {
        const displayName = userIdDisplayNameMap[userId];
        masterId = userId;

        return client.replyMessage(replyToken, {
          type: 'text',
          text: `@${displayName}, 你就是我的 Master 嗎？`,
        });
      }

      if (masterId === userId) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `知道啦知道啦, 不用再說了`,
        });
      }

      const displayName = userIdDisplayNameMap[masterId];

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `我的 Master 只有 @${displayName}!`,
      });
    }

    return null;
  },
  [HELP]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      return client.replyMessage(replyToken, {
        type: 'text',
        text: `${manual.member.join('\n')}\n${manual.master.join('\n')}\n${manual.remark.join('\n')}`,
      });
    }

    return null;
  },

  // master cmd
  [CANCEL_USER_CURRENT_QUEUE]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      if (userId !== masterId) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `叫 Master 來跟我說`,
        });
      }

      const { displayName } = extracted;
      const toRemoveUserId = displayNameUserIdMap[displayName];
      const toRemoveIdx = queue[current].indexOf(toRemoveUserId);

      if (toRemoveIdx === -1) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `@${displayName} 沒在排 ${current + 1}王喔, 現有 ${queue[current].length} 人輪候`,
        });
      }

      queue[current].splice(toRemoveIdx, 1);

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `@${displayName} 已棄 ${current + 1}王, 現有 ${queue[x].length} 人輪候`,
      });
    }

    return null;
  },
  [CANCEL_USER_X_QUEUE]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      if (userId !== masterId) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `叫 Master 來跟我說`,
        });
      }

      const { displayName, x } = extracted;
      const toRemoveUserId = displayNameUserIdMap[displayName];
      const toRemoveIdx = queue[x].indexOf(toRemoveUserId);

      if (toRemoveIdx === -1) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `@${displayName} 沒在排 ${x + 1}王喔, 現有 ${queue[x].length} 人輪候`,
        });
      }

      queue[x].splice(toRemoveIdx, 1);

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `@${displayName} 已棄 ${x + 1}王, 現有 ${queue[x].length} 人輪候`,
      });
    }

    return null;
  },
  [FINISH_USER_CURRENT_QUEUE]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      if (userId !== masterId) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `叫 Master 來跟我說`,
        });
      }

      const { displayName } = extracted;
      const toRemoveUserId = displayNameUserIdMap[displayName];
      const toRemoveIdx = queue[current].indexOf(toRemoveUserId);

      if (toRemoveIdx === -1) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `@${displayName} 沒在排 ${x + 1}王喔, 現有 ${queue[x].length} 人輪候`,
        });
      }

      queue[current].splice(toRemoveIdx, 1);
      finish++;
      watermeter[toRemoveUserId]['finish']++;

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `@${displayName} 已出 ${current + 1}王, 還有 ${queue[current].length} 人輪候`,
      });
    }

    return null;
  },
  [FINISH_USER_X_QUEUE]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      if (userId !== masterId) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `叫 Master 來跟我說`,
        });
      }

      const { displayName, x } = extracted;
      const toRemoveUserId = displayNameUserIdMap[displayName];
      const toRemoveIdx = queue[x].indexOf(toRemoveUserId);

      if (toRemoveIdx === -1) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `@${displayName} 沒在排 ${x + 1}王喔, 現有 ${queue[x].length} 人輪候`,
        });
      }

      queue[x].splice(toRemoveIdx, 1);

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `@${displayName} 已出 ${x + 1}王, 還有 ${queue[x].length} 人輪候`,
      });
    }

    return null;
  },
  [REGISTER_USER_X_QUEUE]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      if (userId !== masterId) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `叫 Master 來跟我說`,
        });
      }

      const { displayName, x } = extracted;
      const toAppendUserId = displayNameUserIdMap[displayName];

      if (R.isNil(toAppendUserId)) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `@${displayName}... 是誰？ 能說一下話嗎？ 我認不出來`,
        });
      }

      queue[x].push(toAppendUserId);

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `@${displayName} 已排 ${x + 1}王, 現有 ${queue[x].length} 人輪候`,
      });
    }

    return null;
  },
  [DELETE_USER]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      if (userId !== masterId) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `叫 Master 來跟我說`,
        });
      }

      const { displayName } = extracted;
      const toRemoveUserId = displayNameUserIdMap[displayName];
      delete watermeter[toRemoveUserId];

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `已註銷 @${displayName}`,
      });
    }

    return null;
  },
  [WATERMETER]: ({
    userId,
    client,
    replyToken,
  }) => extracted => {
    if (extracted) {
      if (userId !== masterId) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: `叫 Master 來跟我說`,
        });
      }

      const notFinish3Memnbers = R.pipe(
        R.values,
        R.filter(({ finish }) => finish < 3),
        R.map(({ displayName, finish }) => `@${displayName} -${3 - finish}`),
      )(watermeter);

      if (R.isEmpty(notFinish3Memnbers)) {
        return client.replyMessage(replyToken, {
          type: 'text',
          text: '都完刀嘍',
        });
      }

      return client.replyMessage(replyToken, {
        type: 'text',
        text: `${notFinish3Memnbers.join('\n')}`,
      });
    }

    return null;
  },
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

const handleEvent = async (event) => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const {
    source: {
      userId,
      groupId,
    },
  } = event;

  if (!userIdDisplayNameMap[userId]) {
    const {
      displayName,
      // pictureUrl,
    } = await client.getGroupMemberProfile(
      groupId,
      userId,
    );

    userIdDisplayNameMap[userId] = displayName;
    displayNameUserIdMap[displayName] = userId;
    await cmdHandler[REGISTER]({
      userId,
    })(true);
  }

  return R.reduce(
    (result, action) => result || R.pipe(
      extractor[action],
      cmdHandler[action]({
        userId,
        client,
        replyToken: event.replyToken,
      }),
    )(event.message.text),
    null,
    R.values(ACTIONS)
  );
}

app.listen(PORT);
console.log(`PCR Listen on Port: ${PORT}`);

const schedule = require('node-schedule');

const clearQueue = schedule.scheduleJob('0 5 * * *', () => {
  queue = [
    [],
    [],
    [],
    [],
    [],
  ];
  watermeter = R.mapObjIndexed(
    (user) => ({
      ...user,
      finish: 0,
    }),
    watermeter,
  );
});
