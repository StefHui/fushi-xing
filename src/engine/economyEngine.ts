import type {
  Currency,
  GameState,
  Market,
  MarketItem,
  ResourceCategory,
  TradeRecord,
  WorldEvent,
  WorldSeed,
} from '../types/game';

// ─── Currency helpers ─────────────────────────────────────────────────────────

export function totalCopper(wallet: Currency): number {
  return wallet.copper;
}

export function addCopper(wallet: Currency, amount: number): Currency {
  return { copper: wallet.copper + amount };
}

// Returns null if insufficient funds
export function deductCopper(wallet: Currency, amount: number): Currency | null {
  if (wallet.copper < amount) return null;
  return { copper: wallet.copper - amount };
}

export function formatCurrency(copper: number): string {
  if (copper <= 0) return '身無分文';
  const gold = Math.floor(copper / 10000);
  const silver = Math.floor((copper % 10000) / 100);
  const remainCopper = copper % 100;
  const parts: string[] = [];
  if (gold > 0) parts.push(`${gold}金兩`);
  if (silver > 0) parts.push(`${silver}銀兩`);
  if (remainCopper > 0 || parts.length === 0) parts.push(`${remainCopper}銅錢`);
  return parts.join(' ');
}

// Sell price is 65% of current market price (market takes a cut)
export function calcSellPrice(currentPrice: number): number {
  return Math.max(1, Math.floor(currentPrice * 0.65));
}

// ─── Initial state builders ───────────────────────────────────────────────────

export function createInitialWallet(world: WorldSeed): Currency {
  const startingCopper: Record<string, number> = {
    '武俠': 500,
    '修仙': 320,
    '末日': 250,
    '無限流': 400,
  };
  return { copper: startingCopper[world.type] ?? 400 };
}

export function createInitialMarket(world: WorldSeed): Market {
  const items = getMarketItems(world);
  return {
    id: `market-${world.seed}`,
    locationName: world.startingPlace,
    items,
    tradeRumors: generateTradeRumors(world.type, items, []),
    lastRestockTurn: 1,
  };
}

export function ensureEconomy(game: GameState): GameState {
  const hasEconomy = game.wallet !== undefined && game.market !== undefined;
  if (hasEconomy) return game;
  return {
    ...game,
    wallet: game.wallet ?? createInitialWallet(game.world),
    market: game.market ?? createInitialMarket(game.world),
    tradeHistory: game.tradeHistory ?? [],
  };
}

// ─── Buy / Sell ───────────────────────────────────────────────────────────────

export function buyItem(
  game: GameState,
  itemId: string,
  quantity: number,
): { game: GameState; error?: string } {
  const safe = ensureEconomy(game);
  const item = safe.market.items.find((i) => i.id === itemId);
  if (!item) return { game: safe, error: '搵唔到呢個商品。' };
  if (item.stock < quantity) return { game: safe, error: `庫存唔夠，只剩 ${item.stock} 件。` };

  const totalCost = item.currentPrice * quantity;
  const nextWallet = deductCopper(safe.wallet, totalCost);
  if (!nextWallet) {
    return { game: safe, error: `錢唔夠，需要 ${formatCurrency(totalCost)}，你只有 ${formatCurrency(safe.wallet.copper)}。` };
  }

  const now = new Date().toISOString();
  const record: TradeRecord = {
    id: `trade-${now}-${Math.random().toString(36).slice(2, 7)}`,
    type: '買入',
    itemName: item.name,
    category: item.category,
    quantity,
    pricePerUnit: item.currentPrice,
    totalCopper: totalCost,
    gameTurn: safe.turn,
    createdAt: now,
  };

  // Add to inventory
  const existingIndex = safe.inventory.findIndex((inv) => inv.name === item.name);
  const nextInventory = existingIndex >= 0
    ? safe.inventory.map((inv, i) =>
        i === existingIndex ? { ...inv, quantity: inv.quantity + quantity } : inv,
      )
    : [
        ...safe.inventory,
        {
          id: `inv-${item.id}-${now}`,
          name: item.name,
          note: item.description,
          quantity,
        },
      ];

  // Reduce market stock
  const nextItems = safe.market.items.map((i) =>
    i.id === itemId
      ? { ...i, stock: i.stock - quantity, ...recalcLevels(i.stock - quantity, i.maxStock) }
      : i,
  );

  return {
    game: {
      ...safe,
      wallet: nextWallet,
      inventory: nextInventory,
      market: { ...safe.market, items: nextItems },
      tradeHistory: [record, ...safe.tradeHistory].slice(0, 50),
    },
  };
}

export function sellItem(
  game: GameState,
  inventoryItemName: string,
  quantity: number,
): { game: GameState; error?: string } {
  const safe = ensureEconomy(game);
  const invItem = safe.inventory.find((i) => i.name === inventoryItemName);
  if (!invItem) return { game: safe, error: '背包裡搵唔到呢件物品。' };
  if (invItem.quantity < quantity) return { game: safe, error: `你只有 ${invItem.quantity} 件，唔夠賣。` };

  // Match to market item for price reference
  const marketItem = safe.market.items.find((m) => m.name === inventoryItemName);
  const category: ResourceCategory = marketItem?.category ?? '雜貨';
  const pricePerUnit = marketItem
    ? calcSellPrice(marketItem.currentPrice)
    : 5; // generic sell price for unrecognised items
  const totalEarned = pricePerUnit * quantity;

  const now = new Date().toISOString();
  const record: TradeRecord = {
    id: `trade-${now}-${Math.random().toString(36).slice(2, 7)}`,
    type: '賣出',
    itemName: inventoryItemName,
    category,
    quantity,
    pricePerUnit,
    totalCopper: totalEarned,
    gameTurn: safe.turn,
    createdAt: now,
  };

  // Remove from inventory
  const nextInventory = safe.inventory
    .map((inv) => inv.name === inventoryItemName
      ? { ...inv, quantity: inv.quantity - quantity }
      : inv)
    .filter((inv) => inv.quantity > 0);

  // Replenish market stock if item matches a market item
  const nextItems = safe.market.items.map((m) =>
    m.name === inventoryItemName
      ? {
          ...m,
          stock: Math.min(m.maxStock, m.stock + quantity),
          ...recalcLevels(Math.min(m.maxStock, m.stock + quantity), m.maxStock),
        }
      : m,
  );

  return {
    game: {
      ...safe,
      wallet: addCopper(safe.wallet, totalEarned),
      inventory: nextInventory,
      market: { ...safe.market, items: nextItems },
      tradeHistory: [record, ...safe.tradeHistory].slice(0, 50),
    },
  };
}

// ─── Dynamic pricing ──────────────────────────────────────────────────────────

// Call after world ticks or when player opens market
export function updateMarketPrices(
  market: Market,
  worldEvents: WorldEvent[],
  turn: number,
): Market {
  // Restock a little each 5 turns
  const shouldRestock = turn - market.lastRestockTurn >= 5;

  const items = market.items.map((item) => {
    let price = item.basePrice;

    // Apply world-event modifiers
    for (const event of worldEvents) {
      const text = `${event.title} ${event.description} ${event.lastChange}`.toLowerCase();
      price = applyEventModifier(price, item.category, text, event.pressure);
    }

    // Apply demand/supply adjustments
    const stockRatio = item.stock / item.maxStock;
    const supplyMod = stockRatio < 0.15 ? 1.4 : stockRatio < 0.35 ? 1.15 : stockRatio > 0.85 ? 0.9 : 1;
    price = Math.max(1, Math.round(price * supplyMod));

    // Small deterministic drift per turn (±5% variation)
    const drift = 1 + (rollPct(`${market.id}-${item.id}-${Math.floor(turn / 3)}`) - 50) / 1000;
    price = Math.max(1, Math.round(price * drift));

    // Restock
    const nextStock = shouldRestock
      ? Math.min(item.maxStock, item.stock + Math.ceil(item.maxStock * 0.1))
      : item.stock;

    return {
      ...item,
      currentPrice: price,
      stock: nextStock,
      ...recalcLevels(nextStock, item.maxStock),
    };
  });

  return {
    ...market,
    items,
    tradeRumors: generateTradeRumors(
      items[0]?.category === '糧食' ? '武俠' : '武俠', // simplified — always regenerate
      items,
      worldEvents,
    ),
    lastRestockTurn: shouldRestock ? turn : market.lastRestockTurn,
  };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function applyEventModifier(
  price: number,
  category: ResourceCategory,
  eventText: string,
  pressure: number,
): number {
  const pressureMod = 1 + pressure * 0.05; // higher pressure = bigger impact
  const has = (kw: string) => eventText.includes(kw);

  if ((has('戰') || has('亂') || has('衝突')) && (category === '武器' || category === '糧食')) {
    return Math.round(price * 1.25 * pressureMod);
  }
  if ((has('瘟') || has('疫') || has('病')) && (category === '藥材' || category === '丹藥')) {
    return Math.round(price * 1.4 * pressureMod);
  }
  if ((has('豐收') || has('豐盛')) && category === '糧食') {
    return Math.round(price * 0.75);
  }
  if (has('礦') && category === '礦石') {
    return Math.round(price * 0.8);
  }
  if ((has('短缺') || has('飢荒') || has('斷糧')) && category === '糧食') {
    return Math.round(price * 1.5 * pressureMod);
  }
  if (has('木') && category === '木材') {
    return Math.round(price * 0.85);
  }
  return price;
}

function recalcLevels(
  stock: number,
  maxStock: number,
): { demandLevel: MarketItem['demandLevel']; supplyLevel: MarketItem['supplyLevel'] } {
  const ratio = maxStock > 0 ? stock / maxStock : 0;
  const supplyLevel: MarketItem['supplyLevel'] =
    ratio <= 0 ? '斷貨' : ratio < 0.2 ? '缺乏' : ratio < 0.6 ? '正常' : '充裕';
  const demandLevel: MarketItem['demandLevel'] =
    ratio <= 0.1 ? '緊缺' : ratio < 0.3 ? '高' : ratio < 0.7 ? '正常' : '低';
  return { demandLevel, supplyLevel };
}

function rollPct(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

function generateTradeRumors(
  _worldType: string,
  items: MarketItem[],
  worldEvents: WorldEvent[],
): string[] {
  const rumors: string[] = [];

  // Event-driven rumors
  for (const event of worldEvents.slice(0, 2)) {
    const text = `${event.title} ${event.description}`.toLowerCase();
    if (text.includes('戰') || text.includes('亂')) {
      rumors.push('「最近商路唔穩，武器同糧食都貴咗，小心為上。」');
    }
    if (text.includes('瘟') || text.includes('疫')) {
      rumors.push('「聽講附近有疫情，藥材同丹藥供不應求。」');
    }
  }

  // Stock-driven rumors
  const scarce = items.find((i) => i.supplyLevel === '缺乏' || i.supplyLevel === '斷貨');
  if (scarce) {
    rumors.push(`「聽講${scarce.name}最近缺貨，有人囤積居奇。」`);
  }

  const abundant = items.find((i) => i.supplyLevel === '充裕' && i.currentPrice < i.basePrice);
  if (abundant) {
    rumors.push(`「${abundant.name}最近貨源充足，趁機入貨唔錯。」`);
  }

  // Generic filler
  if (rumors.length === 0) {
    rumors.push('「市面平靜，暫時無特別消息。」');
  }

  return rumors.slice(0, 3);
}

// ─── Market item templates ────────────────────────────────────────────────────

function getMarketItems(world: WorldSeed): MarketItem[] {
  const templates = getTemplates(world.type);
  return templates.map((t, i) => ({
    ...t,
    id: `market-item-${world.seed}-${i}`,
    currentPrice: t.basePrice,
    ...recalcLevels(t.stock, t.maxStock),
  }));
}

type ItemTemplate = Omit<MarketItem, 'id' | 'currentPrice' | 'demandLevel' | 'supplyLevel'>;

function getTemplates(worldType: string): ItemTemplate[] {
  if (worldType === '武俠') {
    return [
      { name: '糙米',     category: '糧食', description: '普通白米，果腹之物。',         basePrice: 5,   stock: 30, maxStock: 40 },
      { name: '醬肉',     category: '糧食', description: '醃製肉類，耐儲存。',           basePrice: 18,  stock: 20, maxStock: 25 },
      { name: '草藥包',   category: '藥材', description: '常見草藥雜混，可用於基礎療傷。', basePrice: 30,  stock: 15, maxStock: 20 },
      { name: '金瘡藥',   category: '丹藥', description: '處理刀傷外用藥。',             basePrice: 55,  stock: 10, maxStock: 15 },
      { name: '麻布',     category: '布料', description: '粗紡麻布，用途廣泛。',         basePrice: 20,  stock: 18, maxStock: 25 },
      { name: '鐵礦石',   category: '礦石', description: '粗煉鐵礦，打鐵原料。',         basePrice: 40,  stock: 12, maxStock: 18 },
      { name: '木材',     category: '木材', description: '整根原木，建材或燃料。',       basePrice: 25,  stock: 20, maxStock: 30 },
      { name: '短刀',     category: '武器', description: '輕便短刀，易於攜帶。',         basePrice: 120, stock: 5,  maxStock: 8  },
      { name: '鐵劍',     category: '武器', description: '普通長劍，鋒利尚可。',         basePrice: 200, stock: 3,  maxStock: 5  },
      { name: '雜貨布袋', category: '雜貨', description: '簡單麻袋，收納用。',           basePrice: 12,  stock: 25, maxStock: 30 },
    ];
  }
  if (worldType === '修仙') {
    return [
      { name: '靈草',     category: '藥材', description: '含少量靈氣嘅草藥。',             basePrice: 50,  stock: 12, maxStock: 18 },
      { name: '回氣丹',   category: '丹藥', description: '恢復基礎氣力嘅低階丹藥。',       basePrice: 100, stock: 8,  maxStock: 12 },
      { name: '靈石碎片', category: '礦石', description: '靈力殘留嘅礦石碎片。',           basePrice: 80,  stock: 10, maxStock: 15 },
      { name: '鐵礦石',   category: '礦石', description: '普通鐵礦，打造器具用。',         basePrice: 40,  stock: 15, maxStock: 20 },
      { name: '紫竹',     category: '木材', description: '帶靈氣嘅竹材，用途特殊。',       basePrice: 60,  stock: 10, maxStock: 15 },
      { name: '符紙',     category: '雜貨', description: '繪製符籙嘅基礎材料。',           basePrice: 30,  stock: 20, maxStock: 30 },
      { name: '乾糧',     category: '糧食', description: '普通乾糧，供基本果腹。',         basePrice: 10,  stock: 25, maxStock: 35 },
      { name: '靈棉布',   category: '布料', description: '吸靈氣製成嘅布料。',             basePrice: 45,  stock: 10, maxStock: 15 },
      { name: '儲物袋',   category: '雜貨', description: '小型儲物袋，旅行必備。',         basePrice: 300, stock: 3,  maxStock: 5  },
      { name: '基礎藥膏', category: '丹藥', description: '外傷處理基礎藥品。',             basePrice: 40,  stock: 12, maxStock: 18 },
    ];
  }
  if (worldType === '末日') {
    return [
      { name: '罐頭食物', category: '糧食', description: '密封罐頭，保質期長。',           basePrice: 20,  stock: 20, maxStock: 30 },
      { name: '清水',     category: '糧食', description: '淨化過嘅飲用水。',               basePrice: 15,  stock: 15, maxStock: 25 },
      { name: '繃帶',     category: '丹藥', description: '處理外傷用，簡單急救。',         basePrice: 25,  stock: 15, maxStock: 20 },
      { name: '止痛藥',   category: '丹藥', description: '緩解疼痛嘅藥片。',               basePrice: 40,  stock: 10, maxStock: 15 },
      { name: '鐵片',     category: '礦石', description: '廢舊建築拆卸嘅鋼鐵。',           basePrice: 35,  stock: 18, maxStock: 25 },
      { name: '廢舊布料', category: '布料', description: '勉強可用嘅二手布料。',           basePrice: 10,  stock: 20, maxStock: 30 },
      { name: '木板',     category: '木材', description: '建造臨時庇護所嘅材料。',         basePrice: 20,  stock: 15, maxStock: 22 },
      { name: '電池',     category: '雜貨', description: '仍有電量嘅舊電池。',             basePrice: 50,  stock: 8,  maxStock: 12 },
      { name: '求生刀',   category: '武器', description: '多用途求生刀具。',               basePrice: 150, stock: 4,  maxStock: 6  },
      { name: '草藥碎',   category: '藥材', description: '野外採集嘅雜草藥材。',           basePrice: 20,  stock: 12, maxStock: 18 },
    ];
  }
  // 無限流
  return [
    { name: '補給糧食',   category: '糧食', description: '標準化配給糧食。',               basePrice: 15,  stock: 22, maxStock: 30 },
    { name: '急救包',     category: '丹藥', description: '標準急救套裝。',                 basePrice: 50,  stock: 10, maxStock: 15 },
    { name: '信息碎片',   category: '雜貨', description: '記錄規則碎片嘅媒介。',           basePrice: 80,  stock: 8,  maxStock: 12 },
    { name: '武器零件',   category: '武器', description: '可組裝成武器嘅零件。',           basePrice: 100, stock: 5,  maxStock: 8  },
    { name: '防護布料',   category: '布料', description: '帶有防護性能嘅特殊布料。',       basePrice: 35,  stock: 12, maxStock: 18 },
    { name: '礦石原料',   category: '礦石', description: '用於製作裝備嘅原材料。',         basePrice: 45,  stock: 14, maxStock: 20 },
    { name: '木質建材',   category: '木材', description: '製作臨時庇護或工具嘅木材。',     basePrice: 22,  stock: 16, maxStock: 22 },
    { name: '草藥儲備',   category: '藥材', description: '用於療傷嘅草藥備品。',           basePrice: 30,  stock: 12, maxStock: 18 },
    { name: '特殊丹藥',   category: '丹藥', description: '功效不明嘅場景提供丹藥。',       basePrice: 120, stock: 4,  maxStock: 6  },
    { name: '雜項材料',   category: '雜貨', description: '難以分類嘅雜用物品。',           basePrice: 25,  stock: 18, maxStock: 25 },
  ];
}
