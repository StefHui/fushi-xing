import type { CharacterDraft, TraitScores, WorldSeed, WorldType } from '../types/game';

const WORLD_DATA: Record<
  WorldType,
  {
    regions: string[];
    pressures: string[];
    events: string[];
    rumors: string[];
    places: string[];
  }
> = {
  武俠: {
    regions: ['青瓦鎮', '渡鴉渡口', '碎碑官道', '落雨鏢局外街'],
    pressures: ['米價升咗三成', '幾間武館搶徒弟', '官差查路引查得好密'],
    events: ['有鏢車失咗件普通貨', '茶寮換咗掌櫃', '附近山賊突然收手'],
    rumors: ['有人話城南井底有舊刀聲', '一個瘸腿書生喺搵失散師兄'],
    places: ['平安客棧後巷', '舊茶寮', '渡口木棚'],
  },
  修仙: {
    regions: ['白石坊市', '眠雲山腳', '無名藥田', '灰鶴驛站'],
    pressures: ['下品靈石短缺', '散修入城要交新稅', '山門雜役位俾人炒高'],
    events: ['一批靈草失收', '有外門弟子被罰落山', '坊市禁飛三日'],
    rumors: ['荒坡夜晚有微弱靈光', '舊丹房有人偷賣廢丹'],
    places: ['坊市西棚', '山門石階下', '破丹爐旁'],
  },
  末日: {
    regions: ['三號避難街區', '斷電商場', '雨水收集站', '舊地鐵月台'],
    pressures: ['乾淨水開始配給', '收音機訊號愈來愈弱', '夜晚有人失蹤'],
    events: ['巡邏隊少咗兩個人', '倉庫門鎖被撬過', '遠處警報無故響咗一次'],
    rumors: ['北面天橋下有人交換藥物', '地鐵深處有未熄嘅燈'],
    places: ['便利店後門', '避難所樓梯間', '天橋底'],
  },
  無限流: {
    regions: ['第七候車室', '無窗宿舍', '白燈走廊', '倒數廣場'],
    pressures: ['規則牌每小時會改一行', '新人之間互相猜疑', '廣播從不回答問題'],
    events: ['有人被傳送走但鞋留低', '牆上多咗一個陌生名字', '倒數停過三秒'],
    rumors: ['集齊三張票可以換房間', '唔望鏡可能活得耐啲'],
    places: ['長椅旁', '販賣機前', '規則牌下面'],
  },
};

export function generateWorldSeed(worldType: WorldType, draft: CharacterDraft, traits: TraitScores): WorldSeed {
  const rawSeed = `${worldType}|${draft.name}|${draft.gender}|${draft.age}|${traits.膽識}.${traits.人情}.${traits.觀察}.${traits.執念}.${traits.變通}.${traits.口才}`;
  const random = mulberry32(hashString(rawSeed));
  const data = WORLD_DATA[worldType];

  return {
    seed: hashString(rawSeed).toString(16),
    type: worldType,
    regionName: pick(data.regions, random),
    ordinaryPressure: pick(data.pressures, random),
    backgroundEvent: pick(data.events, random),
    localRumor: pick(data.rumors, random),
    startingPlace: pick(data.places, random),
  };
}

function pick<T>(items: T[], random: () => number) {
  return items[Math.floor(random() * items.length)];
}

function hashString(value: string) {
  let hash = 1779033703 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
