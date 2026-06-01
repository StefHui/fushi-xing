import type {
  GameState,
  HookCategory,
  HookDiscoveryMethod,
  HookOutcome,
  HookStage,
  HookUrgency,
  NpcProfile,
  StoryHook,
  WorldSeed,
} from '../types/game';

// ─── Stage ordering ───────────────────────────────────────────────────────────

const STAGE_ORDER: HookStage[] = ['醞釀中', '顯現', '升溫', '轉折', '消散', '已結束'];

// ─── Template definition ──────────────────────────────────────────────────────

interface HookTemplate {
  key: string;
  title: string;
  category: HookCategory;
  urgency: HookUrgency;
  involvedFactions: string[];
  advanceEveryNTurns: number;
  // Per stage: [醞釀中, 顯現, 升溫, 轉折, 消散] — 已結束 uses outcomeText
  stageSurface: [string, string, string, string, string];
  stageUndercurrent: [string, string, string, string, string];
  outcomeTexts: { 結束: string; 消散: string; 轉化: string };
  transformInto?: string; // key of a template to spawn on 轉化
  // Which NPC roles are involved (matched against NpcProfile.role)
  npcRoleHints: string[];
}

// ─── World type templates ─────────────────────────────────────────────────────

const WUXIA_TEMPLATES: HookTemplate[] = [
  {
    key: 'wuxia_scale_fraud',
    title: '短秤風波',
    category: '本地',
    urgency: '低',
    involvedFactions: [],
    advanceEveryNTurns: 5,
    npcRoleHints: ['跑堂', '小販'],
    stageSurface: [
      '米鋪前最近有顧客面色唔好咁離開，但冇人出聲。',
      '有街坊私下傾講糧食份量唔對，但係唔敢當面質問。',
      '有人貼出控訴，但係快被撕走，有點騷動。',
      '鋪主出面解釋，但係街坊反應冷淡，氣氛緊張。',
      '鬧劇似乎平息，但街坊對米鋪嘅態度明顯變咗。',
    ],
    stageUndercurrent: [
      '老掌柜用改過嘅秤，欺騙街坊已有數月，佢以為無人發現。',
      '有個老婆婆已發現，但唔敢獨自出頭，喺搵人聯署。',
      '街坊開始自組小圈子，討論集體投訴，掌柜有點驚。',
      '背後有人幫掌柜壓住件事，交換條件係獨家供貨。',
      '掌柜私下賠咗部份人，但刻意唔補償最低收入嘅街坊。',
    ],
    outcomeTexts: {
      結束: '事件曝光，掌柜被迫公開道歉，補償部分街坊，但老店聲譽大損。',
      消散: '街坊放棄追究，但私下流傳唔要喺呢度買米。',
      轉化: '事件牽出一個更大嘅供應鏈操控，背後有幫派介入。',
    },
    transformInto: 'wuxia_gang_tribute',
  },
  {
    key: 'wuxia_orphan_temple',
    title: '破廟孤兒',
    category: '本地',
    urgency: '低',
    involvedFactions: [],
    advanceEveryNTurns: 6,
    npcRoleHints: ['跑堂', '小販'],
    stageSurface: [
      '城外破廟住咗幾個孤兒，附近居民意見分兩派。',
      '有好心人開始偷偷送飯，但亦有人話要趕走佢哋。',
      '孤兒中有一個開始幫街坊做散工，令態度有點軟化。',
      '有人想正式安置孤兒，但地方同費用引起爭議。',
      '孤兒組成小團體，慢慢喺附近建立咗自己嘅位置。',
    ],
    stageUndercurrent: [
      '其中一個孤兒係某個鏢師嘅私生子，鏢師本人唔知道。',
      '孤兒中有個細路暗記周圍人嘅習慣，疑似係有人培訓嘅線人。',
      '想安置孤兒嘅人其實想利用孤兒做廉價勞工。',
      '那個似線人嘅孤兒其實係受驚嘅，只係習慣靠觀察維生。',
      '鏢師嘅家人開始查孤兒嘅來歷，局面漸漸複雜。',
    ],
    outcomeTexts: {
      結束: '鏢師認回孩子，其餘孤兒由慈善機構接收，情況暫時穩定。',
      消散: '孤兒在無人關心中悄然離開，各散東西。',
      轉化: '鏢師認出孩子後，引發一場舊日恩怨。',
    },
  },
  {
    key: 'wuxia_medicine_monopoly',
    title: '藥材壟斷',
    category: '經濟',
    urgency: '中',
    involvedFactions: ['藥商行'],
    advanceEveryNTurns: 4,
    npcRoleHints: ['半退休鏢師', '小販'],
    stageSurface: [
      '鎮上第二間藥鋪突然關咗門，藥材價格悄悄升。',
      '有人話藥鋪係被收購，但東家身份不明。',
      '藥材商開始要求預付款，普通人愈來愈難負擔。',
      '有郎中公開抗議，話影響到窮人睇病。',
      '另一鋪子嘗試進貨，但係被供應商婉拒。',
    ],
    stageUndercurrent: [
      '背後係同一個東家，打算壟斷鎮上藥材生意，已收購三間鋪。',
      '東家係某官員嘅親戚，用官府人脈壓制競爭。',
      '郎中已向上投訴，但文件喺途中「不見咗」。',
      '有商人從外地秘密引入藥材，東家準備動用關係阻截。',
      '部分藥材開始以次充好，但郎中不敢公開說。',
    ],
    outcomeTexts: {
      結束: '外地藥商成功打入市場，壟斷被打破，但主謀仍逍遙法外。',
      消散: '壟斷持續，百姓默默接受，只有少數人繼續抗爭。',
      轉化: '調查牽出官員貪腐，演變成一場政治風波。',
    },
    transformInto: 'wuxia_official_investigation',
  },
  {
    key: 'wuxia_gang_tribute',
    title: '幫派試水',
    category: '派系',
    urgency: '中',
    involvedFactions: ['鄰鎮幫派', '本地商家'],
    advanceEveryNTurns: 4,
    npcRoleHints: ['半退休鏢師'],
    stageSurface: [
      '碼頭最近多咗幾個陌生漢子，話係搵工，但成日喺附近打圈。',
      '有商家話收到口頭邀請去「傾生意」，語氣曖昧。',
      '有兩間鋪頭喺同一個禮拜相繼出現細小破壞。',
      '有商家主動付咗保護費，消息悄悄流傳。',
      '陌生人數目增加，行動更加明目張膽。',
    ],
    stageUndercurrent: [
      '係鄰鎮幫派嘅探路人，試探此地有冇本地保護力量。',
      '本地有個退休捕快，幫派正在評估佢仲有冇能力抵抗。',
      '幫派背後有個收買咗嘅官員，令警方不敢輕舉妄動。',
      '幫派已鎖定幾個願意合作嘅商家，開始建立據點。',
      '首領打算親自來鎮，視察有冇長期盤據嘅價值。',
    ],
    outcomeTexts: {
      結束: '本地人聯手抵制，幫派暫時撤退，但可能捲土重來。',
      消散: '幫派發現利潤不夠大，悄然放棄，轉向別處。',
      轉化: '幫派成功站穩腳跟，開始左右本地生意。',
    },
  },
  {
    key: 'wuxia_temple_mystery',
    title: '古廟異響',
    category: '神秘',
    urgency: '低',
    involvedFactions: [],
    advanceEveryNTurns: 7,
    npcRoleHints: ['小販'],
    stageSurface: [
      '鎮外古廟傳出奇怪聲響，有人話係野獸，有人話係鬼。',
      '有幾個膽大嘅少年進去探查，出來後閉口不談。',
      '古廟附近開始有人失眠，稱夢到廟裡有光。',
      '一個雲遊道士到廟前站了一個時辰，然後默默離開。',
      '聲響突然停止，古廟門口多咗一些新鮮香火灰燼。',
    ],
    stageUndercurrent: [
      '有人用古廟藏匿贓物，故意散布鬼怪傳聞。',
      '少年見到藏貨嘅人，被威脅封口。',
      '藏貨者係個逃犯，與某幫派有關。',
      '道士係受雇調查嘅人，現在知道內情但選擇沉默。',
      '贓物已被轉移，廟裡已無可查之物，但逃犯還在附近。',
    ],
    outcomeTexts: {
      結束: '逃犯被抓，古廟謎題解開，但部分贓物下落不明。',
      消散: '逃犯逃走，廟的傳說繼續流傳，無人知道真相。',
      轉化: '贓物背後牽連一宗更大的案子，牽涉地方官員。',
    },
  },
  {
    key: 'wuxia_official_investigation',
    title: '欽差暗訪',
    category: '世界',
    urgency: '高',
    involvedFactions: ['朝廷', '地方官府'],
    advanceEveryNTurns: 3,
    npcRoleHints: ['半退休鏢師'],
    stageSurface: [
      '茶寮嘅掌柜偷偷加強保安，有人話官府嘅人要來查帳。',
      '縣府門前多咗幾個陌生人，看起來不像普通百姓。',
      '某官員突然稱病閉門，不見訪客。',
      '有人出事，消息沒有外傳，但氣氛明顯緊張。',
      '外來人撤離，但地方官員面色凝重，行事低調。',
    ],
    stageUndercurrent: [
      '朝廷派人查一宗貪腐案，但欽差身邊有內鬼通風報信。',
      '地方官網絡聯手，正在銷毀帳簿和藏匿相關人員。',
      '欽差已掌握部分證據，但正被孤立，身處危險。',
      '地方官決定鋌而走險，有人傳話要「處理」欽差。',
      '欽差秘密離開，帶走了部分帳本，後果未明。',
    ],
    outcomeTexts: {
      結束: '部分官員被帶走，地方官場洗牌，但背後黑手仍未現身。',
      消散: '欽差被迫放棄調查，地方官府重新穩固，百姓繼續忍耐。',
      轉化: '事件引發民間自發調查，一個新的秘密組織悄悄成形。',
    },
  },
];

const XIANXIA_TEMPLATES: HookTemplate[] = [
  {
    key: 'xianxia_qi_imbalance',
    title: '靈氣失衡',
    category: '神秘',
    urgency: '中',
    involvedFactions: ['散修聯盟'],
    advanceEveryNTurns: 5,
    npcRoleHints: ['散修', '坊市攤主'],
    stageSurface: [
      '坊市一角嘅植物最近枯萎速度快過正常，無人知道原因。',
      '有修士反映打坐時感到靈氣波動，像有外力干擾。',
      '一個小型靈陣無緣無故失效，引起坊市恐慌。',
      '有長老秘密來訪，在附近勘察，拒絕回答任何問題。',
      '靈氣漸漸穩定，但沒有人解釋原因，氣氛仍然壓抑。',
    ],
    stageUndercurrent: [
      '有修士暗中從地脈抽取靈氣，規模已超出安全範圍。',
      '這個修士是某門派的外圍弟子，被秘密委派完成任務。',
      '任務目的是為門派建立隱藏靈石庫，供緊急使用。',
      '長老知道內情，但牽涉門派利益，選擇掩蓋。',
      '靈脈受損已是事實，後果將在數月後顯現。',
    ],
    outcomeTexts: {
      結束: '真相曝光，涉事弟子被處分，但靈脈損傷已難以修復。',
      消散: '事件被壓下，靈脈繼續被侵蝕，只有少數人察覺。',
      轉化: '靈脈失衡引發更大的異象，令整個坊市陷入騷動。',
    },
  },
  {
    key: 'xianxia_stall_dispute',
    title: '攤位之爭',
    category: '經濟',
    urgency: '低',
    involvedFactions: ['山門弟子', '散修聯盟'],
    advanceEveryNTurns: 5,
    npcRoleHints: ['坊市攤主', '雜役'],
    stageSurface: [
      '坊市一個黃金位置嘅攤位最近換咗三個主人，每個都話係自己先訂好。',
      '散修開始自發聚集，小聲商議對策，但看到陌生人就停下來。',
      '有人把投訴書貼在坊市入口，當天就被撕走。',
      '管事出面調停，態度明顯偏向其中一方。',
      '衝突暫時緩解，但位置問題根本未解決。',
    ],
    stageUndercurrent: [
      '山門弟子暗中欺壓散修，以口頭威脅奪取熱門攤位。',
      '管事收了山門弟子嘅好處，選擇性執行規則。',
      '有個散修暗中搜集證據，準備向上一級反映。',
      '山門內部有人不同意此做法，但不敢公開表態。',
      '散修找到一個舊條例，從規則層面挑戰山門弟子。',
    ],
    outcomeTexts: {
      結束: '舊條例成功援引，散修守住位置，山門弟子被迫讓步。',
      消散: '散修放棄抵抗，攤位被佔，不滿情緒在地下積累。',
      轉化: '事件引發散修聯盟集體行動，提出全面改革坊市規則。',
    },
  },
  {
    key: 'xianxia_missing_rogue',
    title: '失蹤散修',
    category: '本地',
    urgency: '高',
    involvedFactions: ['散修聯盟'],
    advanceEveryNTurns: 4,
    npcRoleHints: ['散修', '雜役'],
    stageSurface: [
      '上個月兩個散修失聯，其他散修話係出外歷練，表情唔自然。',
      '有人開始在失聯散修最後出現嘅地方留下標記，但無人認領。',
      '散修聯盟發出一份格外低調嘅通告，用詞模糊。',
      '有目擊者稱見過失蹤者被人帶走，但說完就不說了。',
      '失聯者嘅物品出現在坊市，無人知道是誰帶來嘅。',
    ],
    stageUndercurrent: [
      '失蹤者被秘密「出售」，中間人是一個普通面孔的坊市商人。',
      '買家係某個需要試驗對象嘅偏門修士，位置偏僻。',
      '散修聯盟知道一部分，但怕引發恐慌，選擇不公開。',
      '有個目擊者知道全部，但因收了好處而沉默。',
      '失聯者之一已逃出，正躲藏，試圖聯絡可信的人。',
    ],
    outcomeTexts: {
      結束: '逃出者被找到，道出真相，買家被追緝，商人落網。',
      消散: '事件不了了之，散修社群人心惶惶，很多人選擇離開。',
      轉化: '此案牽出一個更大的地下組織，在多個坊市同時運作。',
    },
  },
  {
    key: 'xianxia_sect_border',
    title: '門派界碑',
    category: '派系',
    urgency: '中',
    involvedFactions: ['東山門', '清雲宗'],
    advanceEveryNTurns: 4,
    npcRoleHints: ['雜役', '散修'],
    stageSurface: [
      '有人發現一塊界碑被移動了幾尺，但無人確定是誰動的。',
      '兩個門派的弟子在原界碑附近相遇，爭論了一個時辰。',
      '有弟子受傷，雙方各執一詞，上報了不同版本。',
      '長老級別的人出面，氣氛表面上緩和，實際上更緊繃。',
      '一個調解小組成立，但雙方態度都不誠懇。',
    ],
    stageUndercurrent: [
      '界碑係被其中一派的弟子故意移動，試探對方反應。',
      '背後是為了一塊蘊含靈脈入口的土地，雙方都清楚。',
      '受傷事件是刻意安排的，用來作為談判籌碼。',
      '長老表面緩和，私下已準備法律文書，打算用規則壓制對方。',
      '一個中立的見證者掌握了關鍵證據，雙方都在試圖接觸他。',
    ],
    outcomeTexts: {
      結束: '見證者作證，界碑恢復原位，但兩派關係進一步惡化。',
      消散: '雙方達成模糊協議，問題未解決，只是暫時冷卻。',
      轉化: '紛爭演變成公開衝突，更多門派被捲入。',
    },
  },
  {
    key: 'xianxia_ancient_relic',
    title: '古物流出',
    category: '世界',
    urgency: '高',
    involvedFactions: ['考古學者', '黑市'],
    advanceEveryNTurns: 3,
    npcRoleHints: ['坊市攤主', '散修'],
    stageSurface: [
      '坊市出現一件來歷不明的古物，賣家拒絕說明來源。',
      '有幾個陌生修士輪流在古物攤前打量，但都沒有出手買。',
      '攤主突然消失，古物不知去向。',
      '傳聞古物已轉手數次，每個持有人都出了事。',
      '有人聲稱知道古物的真實身分，但要求匿名保護。',
    ],
    stageUndercurrent: [
      '古物係從一個被封印的遺跡流出，封印已損壞，異象將陸續出現。',
      '幾個勢力都知道此物的重要性，各自在暗中追查。',
      '攤主被人以高價帶走，人安全，但被迫沉默。',
      '古物目前由某長老秘密保管，但他低估了其影響力。',
      '那個想匿名的人是遺跡的最後看守者，他在試圖找一個值得信賴的人。',
    ],
    outcomeTexts: {
      結束: '古物被正式移交相關機構，封印得到修復，但部分影響已不可逆。',
      消散: '古物下落成謎，潛在危機仍然存在，只是無人知曉。',
      轉化: '古物的力量覺醒，觸發大規模的事件，令整個修仙界關注。',
    },
  },
];

const DOOMSDAY_TEMPLATES: HookTemplate[] = [
  {
    key: 'doom_ration_corruption',
    title: '配給站蛀蟲',
    category: '本地',
    urgency: '高',
    involvedFactions: ['配給委員會'],
    advanceEveryNTurns: 4,
    npcRoleHints: ['配給員', '修理工'],
    stageSurface: [
      '配給站最近嘅份量少咗，但帳目顯示一切正常。',
      '有人喺外面私下比較各自嘅份量，發現差異明顯。',
      '一個工作人員申請調到其他崗位，態度急切。',
      '有人發現配給站後門最近多了些夜間活動。',
      '委員會宣布審查，但負責人是當事人的親屬。',
    ],
    stageUndercurrent: [
      '兩個工作人員截留物資出售黑市，持續三個月，手法越來越大膽。',
      '保安裝置有一個盲點，他們利用了這點，但另一個人也注意到了。',
      '申請調崗的人是知情者，他怕被牽連，試圖逃離現場。',
      '夜間活動是在轉移已截留的物資到另一個藏點。',
      '親屬負責人已知道真相，正在評估如何處理才最有利。',
    ],
    outcomeTexts: {
      結束: '證據確鑿，兩人被驅逐，物資歸還，但信任已難以修復。',
      消散: '審查草草結束，問題繼續，居民只能自求多福。',
      轉化: '調查發現整個配給系統存在問題，引發大規模抗議。',
    },
  },
  {
    key: 'doom_infection_cover',
    title: '隱瞞感染',
    category: '本地',
    urgency: '緊急',
    involvedFactions: ['醫療隊'],
    advanceEveryNTurns: 3,
    npcRoleHints: ['配給員', '修理工'],
    stageSurface: [
      '有家庭話隔離了個病人，但鄰居話看不出症狀。',
      '醫療隊多了例行巡查，頻率高得異常。',
      '有區域的兒童被要求留在室內，原因說是例行消毒。',
      '幾個居民深夜進行無聲遷移，帶走了大量物資。',
      '一個醫療隊成員私下向可信的人透露了一些消息。',
    ],
    stageUndercurrent: [
      '是真實感染，家人為避免強制隔離而隱瞞，病情比描述嚴重。',
      '醫療隊已知道，但在評估是否觸發全面隔離程序。',
      '兒童隔離令是委婉措施，背後是對感染規模的試探。',
      '遷移的家庭是第一批確診個案的密切接觸者，正試圖轉移風險。',
      '醫療隊成員認為程序不當，考慮以個人身份通報上級。',
    ],
    outcomeTexts: {
      結束: '疫情得到控制，但隱瞞事件引發了對整個通報系統的討論。',
      消散: '感染自然消退，事件被壓下，但相關家庭被社區排斥。',
      轉化: '疫情擴大，進入全面隔離，多個區域受到影響。',
    },
  },
  {
    key: 'doom_black_market',
    title: '黑市水漲',
    category: '經濟',
    urgency: '中',
    involvedFactions: ['黑市商人', '配給委員會'],
    advanceEveryNTurns: 5,
    npcRoleHints: ['拾荒者', '修理工'],
    stageSurface: [
      '黑市嘅特定物資在兩個星期內漲了三成，沒有明顯原因。',
      '有幾個固定買家最近消失了，替代者態度更謹慎。',
      '黑市一個老攤販突然收攤，什麼都沒說。',
      '有人傳言說黑市被一個新勢力接管，但看不出跡象。',
      '物資品種開始發生變化，部分稀有品消失，大路貨增加。',
    ],
    stageUndercurrent: [
      '新勢力正悄悄壟斷幾個核心物資的來源，推高价格試探市場。',
      '幾個固定買家是因為知道風聲而提前退出，保護自己。',
      '老攤販被新勢力施壓，被迫讓出位置。',
      '新勢力背景複雜，有前委員會成員參與，方便洗白。',
      '物資結構的變化是在測試大眾對限制選擇的容忍度。',
    ],
    outcomeTexts: {
      結束: '社群組織起反壟斷行動，分散來源，新勢力被迫退出。',
      消散: '大部分人接受了新秩序，黑市在新勢力的控制下穩定下來。',
      轉化: '新勢力與委員會之間的矛盾公開化，引發更大的政治博弈。',
    },
  },
  {
    key: 'doom_ruins_signal',
    title: '廢墟訊號',
    category: '神秘',
    urgency: '中',
    involvedFactions: [],
    advanceEveryNTurns: 6,
    npcRoleHints: ['拾荒者'],
    stageSurface: [
      '有人報告從某個廢棄建築聽到間歇性的電子聲音。',
      '幾個拾荒者進去調查，沒有找到來源，但都說氣氛很奇怪。',
      '聲音開始有了規律，有人說像是某種信號。',
      '有個老人說他認識那個節奏，臉色變得很難看。',
      '聲音突然在某一天停止，廢棄建築的入口被人堵上了。',
    ],
    stageUndercurrent: [
      '是災前某個緊急廣播系統的備用電池，在緩慢放電的過程中偶爾啟動。',
      '廢棄建築曾是一個秘密通訊站，裡面可能有可用的設備。',
      '老人是前廣播員，他認出那是舊緊急信號，意味著某個系統還在運行。',
      '有人搶先進去取走了有用的設備，但不想讓別人知道。',
      '取走設備的人試圖獨佔通訊優勢，已開始聯絡不明方向的接收者。',
    ],
    outcomeTexts: {
      結束: '老人帶路找到備用設備，社群獲得有限的通訊能力。',
      消散: '廢棄建築被封，訊號和設備的事成為傳說，無從查證。',
      轉化: '通訊聯絡成功建立，揭示外面世界的情況，改變了社群的決策。',
    },
  },
  {
    key: 'doom_faction_border',
    title: '勢力劃線',
    category: '派系',
    urgency: '高',
    involvedFactions: ['東區勢力', '舊工廠派系'],
    advanceEveryNTurns: 4,
    npcRoleHints: ['修理工', '配給員'],
    stageSurface: [
      '兩個區域的人在走廊相遇，互相打量的眼神多了。',
      '有個共用的補給點突然貼出了非正式的「使用規則」。',
      '有人在邊界處發現標記，不確定是警告還是佔地。',
      '一次補給點的排隊演變成語言衝突，沒有肢體接觸但劍拔弩張。',
      '雙方都退回各自範圍，一種沉默的緊繃感蔓延開來。',
    ],
    stageUndercurrent: [
      '東區勢力剛換了領導，新人想透過擴張確立威信。',
      '「使用規則」是試探動作，看看另一方的反應。',
      '標記是東區新領導下令放的，但他下面的人各有想法。',
      '語言衝突中有幾個人是被特意安排去測試反應的。',
      '兩派各自都有人不想衝突，但都不敢先表態，怕被認為示弱。',
    ],
    outcomeTexts: {
      結束: '兩派溫和派達成秘密協議，共用規則在談判中被接受。',
      消散: '沉默持續，雙方各自縮減活動範圍，關係凍結但未爆發。',
      轉化: '衝突終於爆發，引發全面對峙，需要第三方介入。',
    },
  },
];

const INFINITE_TEMPLATES: HookTemplate[] = [
  {
    key: 'inf_timer_anomaly',
    title: '計時器異常',
    category: '神秘',
    urgency: '高',
    involvedFactions: [],
    advanceEveryNTurns: 4,
    npcRoleHints: ['規則記錄者', '資深參與者'],
    stageSurface: [
      '有幾個人私下討論場內的計時器走得不準，但不敢公開說。',
      '有人開始記錄計時器的讀數，跟自己的估算對比。',
      '計時器有一次跳了一大截，現場有三個人看到了，都沒有說話。',
      '有人嘗試正式提出質疑，但被以「個人感覺」為由駁回。',
      '計時器恢復了正常，但那個記錄的人態度有了明顯變化。',
    ],
    stageUndercurrent: [
      '有人找到了操縱計時的方法，正在暗中測試，還沒有決定如何使用。',
      '記錄計時的人不是第一個注意到的，前一個人已失蹤。',
      '那次跳躍是一次失誤，操縱者已意識到，正在修正方法。',
      '正式提出質疑的人被人私下警告，提問者現在有點怕。',
      '操縱者已決定停止測試，轉向實際運用，時間點成謎。',
    ],
    outcomeTexts: {
      結束: '操縱被揭露，計時系統重置，操縱者失去優勢，但仍在場。',
      消散: '沒有足夠的人關注，異常被遺忘，操縱者繼續在陰影中。',
      轉化: '計時操縱被用在關鍵時刻，改變了一場重要競爭的結果。',
    },
  },
  {
    key: 'inf_memory_breach',
    title: '場外記憶',
    category: '神秘',
    urgency: '中',
    involvedFactions: [],
    advanceEveryNTurns: 6,
    npcRoleHints: ['資深參與者', '場景人員'],
    stageSurface: [
      '有個參與者話在夢裡見過一個本不該存在的地方，醒來後陰晴不定。',
      '同一個人開始在日常對話中流露不合時宜的細節。',
      '有人注意到了，但不確定這是否有意為之。',
      '那個參與者主動找人傾訴，選擇的人令人意外。',
      '傾訴的具體內容不為外人所知，但兩人的關係發生了明顯變化。',
    ],
    stageUndercurrent: [
      '那個人確實記得場與場之間本應被清除的記憶，原因不明。',
      '那些「不合時宜的細節」是前一個場景的真實資訊，有人可以核實。',
      '注意到他的人也有類似的殘碎記憶，但不確定是否真實。',
      '他選擇的傾訴對象是一個懷疑規則本質的人，這不是偶然。',
      '兩人正在秘密整合記憶碎片，試圖拼出場外的真實圖景。',
    ],
    outcomeTexts: {
      結束: '兩人的行動被察覺，記憶清除程序被提前執行，他們忘記了一切。',
      消散: '兩人決定暫時擱置，不敢輕舉妄動，秘密繼續被擱置。',
      轉化: '拼湊出的信息讓他們得出了一個令人不安的結論，開始有組織地行動。',
    },
  },
  {
    key: 'inf_rule_dispute',
    title: '規則爭議',
    category: '派系',
    urgency: '中',
    involvedFactions: ['規則執行者', '舊參與者聯盟'],
    advanceEveryNTurns: 4,
    npcRoleHints: ['規則記錄者', '資深參與者'],
    stageSurface: [
      '有人對一個規則的詮釋提出了質疑，措辭很謹慎。',
      '原本的規則執行者和一個資深參與者公開出現了分歧。',
      '其他人開始在私下選邊站，但表面上維持中立。',
      '出現了一個非正式的「聆訊」，雙方都帶了支持者。',
      '聆訊結束，沒有明確結論，雙方都聲稱自己的解讀是正確的。',
    ],
    stageUndercurrent: [
      '質疑是精心設計的，目的是為某個特定的行動鋪路，爭的不是規則本身。',
      '資深參與者知道此規則的原始版本，和現行版本不一樣。',
      '私下選邊站的人各有算計，不少人等待看風使舵。',
      '「聆訊」的組成人員是被特意挑選的，結論其實早就定了。',
      '那個特定的行動已在聆訊期間悄悄進行，爭議只是煙幕。',
    ],
    outcomeTexts: {
      結束: '煙幕被拆穿，真正的行動被曝光，規則執行者公信力受損。',
      消散: '爭議不了了之，真正的行動完成，多數人不知道發生了什麼。',
      轉化: '規則爭議演變成正式的制度改革討論，動搖了現有的結構。',
    },
  },
  {
    key: 'inf_resource_scarcity',
    title: '稀缺測試',
    category: '經濟',
    urgency: '高',
    involvedFactions: ['補給管理者'],
    advanceEveryNTurns: 3,
    npcRoleHints: ['資深參與者', '場景人員'],
    stageSurface: [
      '補給點的某種關鍵物資突然大幅減少，解釋是「例行調整」。',
      '替代物資出現了，但品質明顯較差，卻以相同稀缺度計算。',
      '有人開始囤積，引發了連鎖反應，情況加速惡化。',
      '官方出面說明，措辭刻意迴避了幾個核心問題。',
      '物資略有回升，但參與者的行為模式已發生了變化。',
    ],
    stageUndercurrent: [
      '這是一次刻意設計的壓力測試，目的是觀察參與者在壓力下的行為選擇。',
      '替代物資的低劣是故意為之，用來測試接受度。',
      '囤積行為是被暗中鼓勵的，觀察誰會合作，誰會獨善其身。',
      '官方說明的目的是進一步觀察參與者如何處理不完整資訊。',
      '行為數據已被詳細記錄，結果將影響下一輪的分組。',
    ],
    outcomeTexts: {
      結束: '測試的性質被發現，引發強烈反彈，補給短期恢復正常。',
      消散: '測試完成，大多數人不知情，生活繼續，但分組悄悄改變了。',
      轉化: '有人將測試的性質公開，引發全面不信任危機，場景秩序動搖。',
    },
  },
  {
    key: 'inf_silent_staff',
    title: '無聲工作人員',
    category: '世界',
    urgency: '中',
    involvedFactions: ['場景人員'],
    advanceEveryNTurns: 6,
    npcRoleHints: ['場景人員', '無名清潔工'],
    stageSurface: [
      '有個場景工作人員在固定時間在固定地點出現，但從不與人說話。',
      '有人嘗試搭話，工作人員只是點頭，什麼都沒說。',
      '工作人員有一次改變了路線，似乎在等什麼。',
      '有個參與者相信工作人員傳遞了某種訊息，但說不清是什麼。',
      '工作人員在某天起消失了，他原本站的地方多了一個小物件。',
    ],
    stageUndercurrent: [
      '這個工作人員是場景規則中的特殊觀察者，他的存在本身就是一個機制。',
      '他不說話是規定，但他的行動是有意義的語言，需要解讀。',
      '他等的是一個符合特定條件的參與者，條件是觀察力和不多話。',
      '那個「感受到訊息」的參與者已符合條件，工作人員在確認。',
      '留下的物件是一把鑰匙，可以開的鎖不在任何已知的地方。',
    ],
    outcomeTexts: {
      結束: '找到的鎖通向一個隱藏的資訊庫，改變了持有者對場景的認知。',
      消散: '物件丟失，機會窗口關閉，下一個觀察者不知何時出現。',
      轉化: '鑰匙揭示了場景設計者留下的真實訊息，動搖了對規則的根本假設。',
    },
  },
];

// ─── Engine functions ─────────────────────────────────────────────────────────

export function createInitialHooks(world: WorldSeed, npcs: NpcProfile[]): StoryHook[] {
  const templates = getTemplatesForWorld(world.type);
  // Pick 5 hooks for initial generation
  const selected = templates.slice(0, 5);

  return selected.map((template, index) => {
    const npcIds = resolveNpcIds(template.npcRoleHints, npcs);
    return buildHook(template, index, world, npcIds, world.startingPlace);
  });
}

export function ensureHookSystem(game: GameState): GameState {
  if (Array.isArray(game.storyHooks)) return game;
  return {
    ...game,
    storyHooks: createInitialHooks(game.world, game.npcs),
  };
}

// Called every few turns — advances hook stages, resolves outcomes
export function advanceHooks(game: GameState): GameState {
  const safe = ensureHookSystem(game);
  const now = new Date().toISOString();
  const newJournal: GameState['journal'] = [];

  const nextHooks = safe.storyHooks.map((hook) => {
    if (hook.outcome !== '進行中') return hook;

    const turnsSinceAdvance = safe.turn - hook.lastAdvancedTurn;
    if (turnsSinceAdvance < hook.advanceEveryNTurns) return hook;

    // Deterministic advancement roll
    const roll = rollFrom(`${hook.id}-${safe.turn}`);
    if (roll < 3) return hook; // 25% chance to skip advancement

    return advanceHookStage(hook, safe.turn, now);
  });

  // Auto-discover high-urgency hooks that have been active long enough
  const withAutoDiscover = nextHooks.map((hook) => {
    if (hook.discovered) return hook;
    if (hook.urgency !== '緊急' && hook.urgency !== '高') return hook;
    if (safe.turn - hook.lastAdvancedTurn < 8) return hook;
    return { ...hook, discovered: true, discoveryMethod: '觀察' as HookDiscoveryMethod, discoveredAt: now };
  });

  // Spawn transformed hooks
  const allHooks = [...withAutoDiscover];
  for (const hook of withAutoDiscover) {
    if (hook.outcome === '轉化' && hook.outcomeText && !safe.storyHooks.some((h) => h.id.startsWith(`${hook.id}-transform`))) {
      const template = getTemplatesForWorld(safe.world.type).find((t) => t.transformInto && hook.templateKey === t.key);
      if (template?.transformInto) {
        const targetTemplate = getTemplatesForWorld(safe.world.type).find((t) => t.key === template.transformInto);
        if (targetTemplate) {
          const newHook = buildHook(targetTemplate, allHooks.length, safe.world, hook.involvedNpcIds, hook.location);
          allHooks.push({ ...newHook, id: `${hook.id}-transform-${safe.turn}` });
          newJournal.push({
            id: `journal-hook-transform-${now}`,
            kind: 'world' as const,
            text: `「${hook.title}」有了新的發展，引出了另一件事：${newHook.title}。`,
            createdAt: now,
          });
        }
      }
    }
  }

  return {
    ...safe,
    storyHooks: allHooks,
    journal: newJournal.length > 0 ? [...newJournal, ...safe.journal].slice(0, 30) : safe.journal,
  };
}

// Discover hooks via NPC interaction (打探消息)
export function tryDiscoverFromNpc(game: GameState, npcId: string): GameState {
  const safe = ensureHookSystem(game);
  const now = new Date().toISOString();
  const roll = rollFrom(`${game.id}-${game.turn}-npc-${npcId}`);

  // 60% chance to discover if the NPC is involved, 30% chance for any local hook
  const nextHooks = safe.storyHooks.map((hook) => {
    if (hook.discovered) return hook;
    const isInvolved = hook.involvedNpcIds.includes(npcId);
    const threshold = isInvolved ? 4 : 8; // out of 12
    if (roll < threshold) {
      return { ...hook, discovered: true, discoveryMethod: 'NPC對話' as HookDiscoveryMethod, discoveredAt: now };
    }
    return hook;
  });

  const newlyFound = nextHooks.filter((h, i) => h.discovered && !safe.storyHooks[i]?.discovered);
  if (newlyFound.length === 0) return { ...safe, storyHooks: nextHooks };

  const entries = newlyFound.map((h) => ({
    id: `journal-hook-discover-${h.id}-${now}`,
    kind: 'system' as const,
    text: `透過傾談，你留意到一件事：${h.title}。`,
    createdAt: now,
  }));

  return {
    ...safe,
    storyHooks: nextHooks,
    journal: [...entries, ...safe.journal].slice(0, 30),
  };
}

// Discover hooks via exploration actions
export function tryDiscoverFromExploration(game: GameState): GameState {
  const safe = ensureHookSystem(game);
  const now = new Date().toISOString();
  const roll = rollFrom(`${game.id}-${game.turn}-explore`);

  if (roll < 5) return safe; // 40% chance overall

  const undiscovered = safe.storyHooks.filter(
    (h) => !h.discovered && (h.category === '本地' || h.category === '神秘'),
  );
  if (undiscovered.length === 0) return safe;

  const target = undiscovered[roll % undiscovered.length];
  const nextHooks = safe.storyHooks.map((h) =>
    h.id === target.id
      ? { ...h, discovered: true, discoveryMethod: '探索' as HookDiscoveryMethod, discoveredAt: now }
      : h,
  );

  return {
    ...safe,
    storyHooks: nextHooks,
    journal: [
      { id: `journal-hook-explore-${target.id}-${now}`, kind: 'system' as const, text: `你探索的時候，發現了一些值得留意的事：${target.title}。`, createdAt: now },
      ...safe.journal,
    ].slice(0, 30),
  };
}

// Expose discovered hooks sorted by urgency for UI
export function getVisibleHooks(storyHooks: StoryHook[]): StoryHook[] {
  const order: HookUrgency[] = ['緊急', '高', '中', '低'];
  return storyHooks
    .filter((h) => h.discovered && h.outcome === '進行中')
    .sort((a, b) => order.indexOf(a.urgency) - order.indexOf(b.urgency));
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function advanceHookStage(hook: StoryHook, turn: number, now: string): StoryHook {
  const currentIndex = STAGE_ORDER.indexOf(hook.stage);
  if (currentIndex < 0 || currentIndex >= STAGE_ORDER.length - 1) return hook;

  // At 轉折, determine outcome
  if (hook.stage === '轉折') {
    const roll = rollFrom(`${hook.id}-outcome-${turn}`);
    const outcome: HookOutcome = roll < 4 ? '結束' : roll < 7 ? '消散' : roll < 9 ? '轉化' : '進行中';

    if (outcome === '進行中') {
      // Rare case: cycle back to 升溫
      return { ...hook, stage: '升溫', stageIndex: 2, lastAdvancedTurn: turn };
    }

    const template = getTemplate(hook.templateKey);
    const outcomeText = template?.outcomeTexts[outcome === '結束' ? '結束' : outcome === '消散' ? '消散' : '轉化'] ?? '';

    return {
      ...hook,
      stage: outcome === '結束' ? '已結束' : '消散',
      stageIndex: outcome === '結束' ? 5 : 4,
      outcome,
      outcomeText,
      lastAdvancedTurn: turn,
    };
  }

  const nextStageIndex = currentIndex + 1;
  const nextStage = STAGE_ORDER[nextStageIndex];
  const template = getTemplate(hook.templateKey);

  const stageIdx = Math.min(nextStageIndex, 4);
  return {
    ...hook,
    stage: nextStage,
    stageIndex: nextStageIndex,
    surfaceText: template?.stageSurface[stageIdx] ?? hook.surfaceText,
    undercurrentText: template?.stageUndercurrent[stageIdx] ?? hook.undercurrentText,
    lastAdvancedTurn: turn,
  };
}

function buildHook(
  template: HookTemplate,
  index: number,
  world: WorldSeed,
  npcIds: string[],
  location: string,
): StoryHook {
  return {
    id: `hook-${world.seed}-${index}-${template.key}`,
    title: template.title,
    category: template.category,
    stage: '醞釀中',
    urgency: template.urgency,
    location,
    discovered: false,
    involvedNpcIds: npcIds,
    involvedFactions: template.involvedFactions,
    startDate: `第 1 日 清晨`,
    lastAdvancedTurn: 1,
    advanceEveryNTurns: template.advanceEveryNTurns,
    surfaceText: template.stageSurface[0],
    undercurrentText: template.stageUndercurrent[0],
    outcome: '進行中',
    templateKey: template.key,
    stageIndex: 0,
  };
}

function resolveNpcIds(roleHints: string[], npcs: NpcProfile[]): string[] {
  return roleHints
    .map((hint) => npcs.find((npc) => npc.role.includes(hint) || npc.name.includes(hint))?.id)
    .filter((id): id is string => id !== undefined);
}

function getTemplatesForWorld(worldType: string): HookTemplate[] {
  if (worldType === '武俠') return WUXIA_TEMPLATES;
  if (worldType === '修仙') return XIANXIA_TEMPLATES;
  if (worldType === '末日') return DOOMSDAY_TEMPLATES;
  return INFINITE_TEMPLATES;
}

function getTemplate(key: string): HookTemplate | undefined {
  return [...WUXIA_TEMPLATES, ...XIANXIA_TEMPLATES, ...DOOMSDAY_TEMPLATES, ...INFINITE_TEMPLATES].find(
    (t) => t.key === key,
  );
}

function rollFrom(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 12;
}
