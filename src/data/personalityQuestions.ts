import type { TraitKey, WorldType } from '../types/game';

export interface PersonalityOption {
  id: string;
  label: string;
  description: string;
  trait: TraitKey;
}

export interface PersonalityQuestion {
  id: string;
  prompt: string;
  options: PersonalityOption[];
}

export const PERSONALITY_QUESTIONS_BY_WORLD: Record<WorldType, PersonalityQuestion[]> = {
  武俠: [
    {
      id: 'wuxia-teahouse',
      prompt: '茶寮有人被惡霸逼債，你只係路過。',
      options: [
        { id: 'watch', label: '先睇清楚', description: '記低人、路、退路，同邊個真係驚。', trait: '觀察' },
        { id: 'talk', label: '上前講數', description: '唔出手，試下用說話拖住局面。', trait: '口才' as TraitKey },
        { id: 'leave', label: '照樣離開', description: '江湖每日都有事，你未必需要插手。', trait: '變通' },
      ],
    },
    {
      id: 'wuxia-manual',
      prompt: '你喺舊書攤見到一本似真似假嘅拳譜。',
      options: [
        { id: 'buy', label: '平價買低', description: '就算係假，都可能有線索。', trait: '執念' },
        { id: 'ask', label: '問檔主來歷', description: '書未必重要，賣書人先重要。', trait: '人情' },
        { id: 'skip', label: '唔買', description: '身上銀両有限，唔好貪。', trait: '變通' },
      ],
    },
    {
      id: 'wuxia-night',
      prompt: '夜路有刀光，你聽到有人叫救命。',
      options: [
        { id: 'rush', label: '即刻衝去', description: '慢一步可能就死人。', trait: '膽識' },
        { id: 'shadow', label: '貼牆潛近', description: '救人之前，先唔好變成第二個被救。', trait: '觀察' },
        { id: 'call', label: '叫醒附近人', description: '一個人嘅勇氣，好少夠用。', trait: '人情' },
      ],
    },
  ],
  修仙: [
    {
      id: 'xian-market',
      prompt: '坊市有人話一粒廢丹可以改命。',
      options: [
        { id: 'test', label: '細心驗丹', description: '氣味、紋路、雜質，都係答案。', trait: '觀察' },
        { id: 'risk', label: '賭一把', description: '無本錢嘅人，有時只剩膽。', trait: '膽識' },
        { id: 'walk', label: '轉身走', description: '仙途最怕心急。', trait: '變通' },
      ],
    },
    {
      id: 'xian-sect',
      prompt: '山門收雜役，人工低，規矩多。',
      options: [
        { id: 'join', label: '排隊試下', description: '門內有門內嘅消息。', trait: '執念' },
        { id: 'chat', label: '同排隊人傾計', description: '同路人都可能係資源。', trait: '人情' },
        { id: 'observe', label: '只喺遠處睇', description: '先知規矩，再決定入唔入局。', trait: '觀察' },
      ],
    },
    {
      id: 'xian-cave',
      prompt: '荒坡有靈光一閃，但天色就快黑。',
      options: [
        { id: 'dig', label: '即刻去查', description: '機緣唔會等人。', trait: '膽識' },
        { id: 'mark', label: '記低位置', description: '活到聽日，機緣先有意思。', trait: '變通' },
        { id: 'guard', label: '喺附近守夜', description: '你唔想錯過，但都唔想送命。', trait: '執念' },
      ],
    },
  ],
  末日: [
    {
      id: 'apoc-food',
      prompt: '便利店只剩幾包乾糧，門外有人望住你。',
      options: [
        { id: 'share', label: '分一半', description: '末日都要有人記得人味。', trait: '人情' },
        { id: 'hide', label: '收埋就走', description: '生存唔係考試，無人派分。', trait: '變通' },
        { id: 'trade', label: '問佢有咩交換', description: '秩序碎咗，但交易未死。', trait: '口才' as TraitKey },
      ],
    },
    {
      id: 'apoc-siren',
      prompt: '遠處警報響起，街上人開始亂跑。',
      options: [
        { id: 'high', label: '上高處觀察', description: '先知道災難向邊度流。', trait: '觀察' },
        { id: 'run', label: '跟人群跑', description: '有時群體本能比地圖快。', trait: '變通' },
        { id: 'help', label: '扶起跌低嘅人', description: '慢半步，可能換到一個同行者。', trait: '人情' },
      ],
    },
    {
      id: 'apoc-door',
      prompt: '安全屋門後有人敲門，聲音好細。',
      options: [
        { id: 'open', label: '開一條罅', description: '你唔想做冷血嘅倖存者。', trait: '膽識' },
        { id: 'question', label: '隔門盤問', description: '善意都要有程序。', trait: '觀察' },
        { id: 'silent', label: '保持安靜', description: '活人會敲門，其他嘢都會。', trait: '執念' },
      ],
    },
  ],
  無限流: [
    {
      id: 'loop-room',
      prompt: '你醒喺白色房間，牆上有五分鐘倒數。',
      options: [
        { id: 'read', label: '讀晒所有字', description: '規則通常寫得好小聲。', trait: '觀察' },
        { id: 'door', label: '即刻試門', description: '時間唔等你理解世界。', trait: '膽識' },
        { id: 'people', label: '睇其他人反應', description: '新人同老手，驚法唔同。', trait: '人情' },
      ],
    },
    {
      id: 'loop-rule',
      prompt: '廣播話：「違規者會被清除。」但無講規則。',
      options: [
        { id: 'test-small', label: '試一個細動作', description: '用最少代價探邊界。', trait: '變通' },
        { id: 'stay', label: '完全唔郁', description: '未知規則之前，靜止都係策略。', trait: '執念' },
        { id: 'ask', label: '問其他人知唔知', description: '情報唔會自己跌落嚟。', trait: '口才' as TraitKey },
      ],
    },
    {
      id: 'loop-token',
      prompt: '枱上有一枚寫住你名嘅銅牌。',
      options: [
        { id: 'take', label: '袋起佢', description: '既然寫你名，就可能有用。', trait: '膽識' },
        { id: 'inspect', label: '檢查底面', description: '物件嘅細節通常唔係裝飾。', trait: '觀察' },
        { id: 'leave', label: '暫時唔掂', description: '免費嘅嘢，可能最貴。', trait: '變通' },
      ],
    },
  ],
};
