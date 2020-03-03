const member = [
  '一般指令:',
  '到{x}王/{x}王上線',
  '排{x}王/報{x}王',
  '棄{x}王',
  '完刀',
  'Q',
  'Q{x}',
  'Qs',
  'S',
  'I am Master!',
  'help',
  '',
];

const master = [
  '會長指令:',
  '取消 @{username}',
  '取消 @{username} {x}王',
  '@{username}完刀 ',
  '@{username} {x}王完刀',
  '@{username} 排{x}王',
  '註銷 @{username}',
  '查水錶',
  '',
];

const remark = [
  '{x} = 1-5',
  '每朝5時重置排刀和水錶',
];

module.exports = {
  member,
  master,
  remark,
}
