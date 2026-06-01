import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatCurrency } from './src/engine/economyEngine';
import { getPersonalityQuestions } from './src/engine/personalityTestEngine';
import { getVisibleHooks } from './src/engine/storyHookEngine';
import { PROFESSION_DEFS } from './src/engine/skillEngine';
import { useGameStore } from './src/state/useGameStore';
import { useSettingsStore } from './src/state/useSettingsStore';
import type { BodyPart, Choice, CombatActionId, Gender, NpcInteractionId, ScreenId, WorldType } from './src/types/game';

const WORLD_TYPES: WorldType[] = ['武俠', '修仙', '末日', '無限流'];
const GENDERS: Gender[] = ['男', '女', '其他'];
const COMBAT_TARGETS: BodyPart[] = ['頭部', '眼睛', '咽喉', '胸部', '腹部', '左臂', '右臂', '左腿', '右腿'];
const NPC_INTERACTIONS: NpcInteractionId[] = ['打招呼', '幫小忙', '打探消息', '保持距離'];

const PRIMARY_COMBAT_ACTIONS: Array<{ id: CombatActionId; label: string; hint: string }> = [
  { id: '攻擊右臂', label: 'A  攻擊右臂', hint: '目標右臂，破壞出手' },
  { id: '攻擊左腿', label: 'B  攻擊左腿', hint: '目標左腿，破壞移動' },
  { id: '格擋觀察', label: 'C  格擋觀察', hint: '防守並讀取對手' },
  { id: '後退',     label: 'D  後退',     hint: '拉開距離，重整攻勢' },
  { id: '使用道具', label: 'E  使用道具', hint: '消耗背包療傷物品' },
  { id: '撤退',     label: 'F  撤退',     hint: '放棄此戰，保全性命' },
];
const GAME_TABS: Array<{ id: ScreenId; label: string }> = [
  { id: 'story', label: '故事' },
  { id: 'combat', label: '戰鬥' },
  { id: 'npcs', label: '人物' },
  { id: 'character', label: '角色' },
  { id: 'inventory', label: '背包' },
  { id: 'map', label: '地圖' },
  { id: 'log', label: '日誌' },
  { id: 'quest', label: '任務' },
  { id: 'saves', label: '存檔' },
];

export default function App() {
  const {
    activeQuestionIndex,
    combatActionDraft,
    currentScreen,
    draftCharacter,
    freeActionDraft,
    game,
    isReady,
    lastSavedAt,
    personalityAnswers,
    saves,
    selectedWorldType,
    aiNarration,
    aiDialogue,
    aiActionRejection,
    isAiLoading,
    answerPersonalityQuestion,
    executeCombatAction,
    executeCustomCombatActionWithAI,
    executeItemUse,
    initialize,
    interactWithNpcAndGenerateDialogue,
    loadSave,
    refreshSaves,
    resetRun,
    saveGame,
    selectChoice,
    selectWorldType,
    setCombatActionDraft,
    setCombatBodyPart,
    setDraftCharacter,
    setFreeActionDraft,
    setScreen,
    startNewGame,
    submitFreeActionWithAI,
    dismissAiNarration,
    acceptProfession: acceptProfessionAction,
    declineProfession: declineProfessionAction,
    buyMarketItem,
    sellInventoryItem,
    refreshMarket,
  } = useGameStore();

  const {
    provider: aiProvider,
    openaiKey,
    claudeKey,
    aiEnabled,
    lowTokenMode,
    gameMode,
    isLoaded: settingsLoaded,
    initialize: initializeSettings,
    setProvider: setAiProvider,
    setOpenaiKey,
    setClaudeKey,
    setAiEnabled,
    setLowTokenMode,
    setGameMode,
  } = useSettingsStore();

  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    initialize();
    initializeSettings();
  }, [initialize, initializeSettings]);

  const questions = selectedWorldType ? getPersonalityQuestions(selectedWorldType) : [];
  const currentQuestion = questions[activeQuestionIndex];
  const ageNumber = Number(draftCharacter.age);
  const canCreate =
    draftCharacter.name.trim().length >= 1 &&
    Boolean(draftCharacter.gender) &&
    Number.isFinite(ageNumber) &&
    ageNumber >= 10 &&
    ageNumber <= 99;

  const title = useMemo(() => {
    if (currentScreen === 'opening') return '浮世行';
    if (currentScreen === 'create') return '建立角色';
    if (currentScreen === 'personality') return `${selectedWorldType ?? ''}性格測試`;
    if (currentScreen === 'story') return game?.world.regionName ?? '故事';
    if (currentScreen === 'combat') return '戰鬥';
    if (currentScreen === 'npcs') return '人物';
    if (currentScreen === 'character') return '角色';
    if (currentScreen === 'inventory') return '背包';
    if (currentScreen === 'map') return '地圖';
    if (currentScreen === 'log') return '日誌';
    if (currentScreen === 'quest') return '任務';
    if (currentScreen === 'settings') return '設定';
    return '存檔';
  }, [currentScreen, game?.world.regionName, selectedWorldType]);

  const runBusy = async (task: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await task();
    } catch (error) {
      Alert.alert('出咗少少問題', error instanceof Error ? error.message : '請再試一次。');
    } finally {
      setIsBusy(false);
    }
  };

  if (!isReady) {
    return (
      <SafeAreaView style={styles.shell}>
        <View style={styles.centerPane}>
          <Text style={styles.brand}>浮世行</Text>
          <Text style={styles.muted}>準備本地世界...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardRoot}>
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.brand}>浮世行</Text>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          {currentScreen !== 'opening' && (
            <View style={styles.headerButtons}>
              <Pressable style={styles.headerButton} onPress={() => setScreen('saves')}>
                <Text style={styles.headerButtonText}>存檔</Text>
              </Pressable>
              <Pressable style={styles.headerButton} onPress={() => setScreen('settings')}>
                <Text style={styles.headerButtonText}>設定</Text>
              </Pressable>
            </View>
          )}
        </View>

        {currentScreen === 'opening' && (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.heroBlock}>
              <Text style={styles.heroTitle}>你唔係天選之人。</Text>
              <Text style={styles.bodyText}>
                世界唔會圍住你轉。你開局無職業、無技能、無派系、無稱號。身份、名聲、路線，全部由行動慢慢長出嚟。
              </Text>
            </View>

            <Text style={styles.subhead}>選擇世界</Text>
            <View style={styles.worldGrid}>
              {WORLD_TYPES.map((worldType) => (
                <Pressable key={worldType} style={styles.worldCard} onPress={() => selectWorldType(worldType)}>
                  <Text style={styles.worldTitle}>{worldType}</Text>
                  <Text style={styles.choiceText}>{getWorldPitch(worldType)}</Text>
                </Pressable>
              ))}
            </View>

            <SecondaryButton disabled={isBusy} label="讀取存檔" onPress={() => setScreen('saves')} />
          </ScrollView>
        )}

        {currentScreen === 'create' && (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.kicker}>{selectedWorldType}</Text>
            <Text style={styles.sectionTitle}>只需要三樣資料</Text>
            <Text style={styles.bodyText}>唔揀職業，唔揀技能，唔揀出身背景。你只係一個普通人。</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>姓名</Text>
              <TextInput
                value={draftCharacter.name}
                onChangeText={(name) => setDraftCharacter({ name })}
                placeholder="例如：阿澄"
                placeholderTextColor="#7e8796"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>性別</Text>
              <View style={styles.segmentRow}>
                {GENDERS.map((gender) => (
                  <Pressable
                    key={gender}
                    onPress={() => setDraftCharacter({ gender })}
                    style={[styles.segment, draftCharacter.gender === gender && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, draftCharacter.gender === gender && styles.segmentTextActive]}>
                      {gender}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>年齡</Text>
              <TextInput
                value={draftCharacter.age}
                onChangeText={(age) => setDraftCharacter({ age: age.replace(/[^0-9]/g, '').slice(0, 2) })}
                keyboardType="number-pad"
                placeholder="例如：23"
                placeholderTextColor="#7e8796"
                style={styles.input}
              />
            </View>

            <PrimaryButton disabled={!canCreate || isBusy} label="開始性格測試" onPress={() => setScreen('personality')} />
            <SecondaryButton disabled={isBusy} label="返回世界選擇" onPress={resetRun} />
          </ScrollView>
        )}

        {currentScreen === 'personality' && currentQuestion && (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.kicker}>
              第 {activeQuestionIndex + 1} / {questions.length} 題
            </Text>
            <Text style={styles.sectionTitle}>{currentQuestion.prompt}</Text>
            <View style={styles.choiceStack}>
              {currentQuestion.options.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => answerPersonalityQuestion(currentQuestion.id, option.id)}
                  style={[
                    styles.choiceCard,
                    personalityAnswers[currentQuestion.id] === option.id && styles.choiceCardActive,
                  ]}
                >
                  <Text style={styles.choiceTitle}>{option.label}</Text>
                  <Text style={styles.choiceText}>{option.description}</Text>
                </Pressable>
              ))}
            </View>

            {Object.keys(personalityAnswers).length === questions.length && (
              <PrimaryButton disabled={isBusy} label="生成角色同世界" onPress={() => runBusy(startNewGame)} />
            )}
          </ScrollView>
        )}

        {currentScreen === 'story' && game && (
          <ScrollView contentContainerStyle={styles.contentWithTabs}>
            <View style={styles.worldTicker}>
              <Text style={styles.kicker}>
                第 {game.worldClock.day} 日 / {game.worldClock.phase} / 緊張度 {game.worldClock.tension}
              </Text>
              <Text style={styles.choiceText}>最近世界推進：{game.worldClock.lastTickReason}</Text>
            </View>

            <View style={styles.statStrip}>
              {Object.entries(game.character.stats).map(([key, value]) => (
                <View key={key} style={styles.statPill}>
                  <Text style={styles.statValue}>{value}</Text>
                  <Text style={styles.statLabel}>{key}</Text>
                </View>
              ))}
            </View>

            <View style={styles.storyPanel}>
              <Text style={styles.kicker}>{game.world.type} / 第 {game.turn} 回合</Text>
              <Text style={styles.sectionTitle}>{game.story.title}</Text>
              <Text style={styles.bodyText}>{game.story.body}</Text>
            </View>

            {isAiLoading && (
              <View style={styles.aiLoadingRow}>
                <ActivityIndicator color="#d6f36d" size="small" />
                <Text style={styles.aiLoadingText}>AI 旁白生成中…</Text>
              </View>
            )}
            {aiNarration ? (
              <Pressable style={styles.aiNarrationCard} onPress={dismissAiNarration}>
                <Text style={styles.kicker}>AI 旁白</Text>
                <Text style={styles.bodyText}>{aiNarration}</Text>
                <Text style={styles.aiDismissHint}>點擊關閉</Text>
              </Pressable>
            ) : null}

            {(() => {
              const visible = getVisibleHooks(game.storyHooks ?? []).slice(0, 3);
              if (visible.length === 0) return null;
              return (
                <>
                  <Text style={styles.subhead}>周圍嘅事</Text>
                  <View style={styles.choiceStack}>
                    {visible.map((hook) => (
                      <View key={hook.id} style={[styles.hookCard, getUrgencyStyle(hook.urgency)]}>
                        <View style={styles.hookHeader}>
                          <Text style={styles.hookCategory}>{hook.category}</Text>
                          <Text style={styles.hookUrgency}>{hook.urgency}</Text>
                        </View>
                        <Text style={styles.choiceTitle}>{hook.title}</Text>
                        <Text style={styles.choiceText}>{hook.surfaceText}</Text>
                        <Text style={styles.hookStage}>{hook.stage} · {hook.location}</Text>
                      </View>
                    ))}
                  </View>
                </>
              );
            })()}

            <Text style={styles.subhead}>最新傳聞</Text>
            <View style={styles.choiceStack}>
              {game.rumors.slice(0, 3).map((rumor) => (
                <View key={rumor.id} style={styles.rumorCard}>
                  <Text style={styles.kicker}>{rumor.date} / {rumor.source} / {rumor.truthState}</Text>
                  <Text style={styles.choiceText}>{rumor.text}</Text>
                </View>
              ))}
              {game.rumors.length === 0 && <EmptyState text="暫時未聽到可靠傳聞。" />}
            </View>

            <Text style={styles.subhead}>A / B / C / D / E</Text>
            <View style={styles.choiceStack}>
              {game.story.choices.map((choice: Choice) => (
                <Pressable key={choice.id} style={styles.choiceCard} onPress={() => selectChoice(choice.id)}>
                  <Text style={styles.choiceTitle}>
                    {choice.key}. {choice.label}
                  </Text>
                  <Text style={styles.choiceText}>{choice.hint}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.subhead}>自訂行動</Text>
            <TextInput
              value={freeActionDraft}
              onChangeText={setFreeActionDraft}
              placeholder="例如：我去茶寮後巷聽人講嘢"
              placeholderTextColor="#7e8796"
              multiline
              style={[styles.input, styles.textArea]}
            />
            <PrimaryButton
              disabled={freeActionDraft.trim().length < 2 || isBusy}
              label={gameMode === 'ai-enhanced' && aiEnabled && aiProvider !== 'off' ? '提交行動（AI 旁白）' : '提交行動'}
              onPress={() => runBusy(submitFreeActionWithAI)}
            />
          </ScrollView>
        )}

        {currentScreen === 'combat' && game && (
          <ScrollView contentContainerStyle={styles.contentWithTabs}>

            {/* ── Environment ─────────────────────────────── */}
            <View style={styles.envStrip}>
              <EnvBadge label="距離" value={game.combat.distance} />
              <EnvBadge label="地形" value={game.combat.terrain} />
              <EnvBadge label="光線" value={game.combat.lightCondition} />
              <EnvBadge label="天氣" value={game.combat.weather} />
            </View>

            {/* ── Combatant meters ────────────────────────── */}
            <View style={styles.combatHeader}>
              <View style={styles.combatMeter}>
                <Text style={styles.kicker}>你</Text>
                <Text style={styles.combatHp}>{game.combat.playerHp} / {game.combat.playerMaxHp}</Text>
                <StaminaBar value={game.combat.playerStamina} max={game.combat.playerMaxStamina} />
                {game.combat.playerGuard > 0 && (
                  <Text style={styles.guardBadge}>防勢 {game.combat.playerGuard}</Text>
                )}
              </View>
              <View style={styles.combatMeter}>
                <Text style={styles.kicker}>{game.combat.enemy.name}</Text>
                <Text style={styles.combatHp}>{game.combat.enemy.hp} / {game.combat.enemy.maxHp}</Text>
                <StaminaBar value={game.combat.enemy.stamina} max={game.combat.enemy.maxStamina} accent="#ef767a" />
                <Text style={styles.choiceText}>{game.combat.enemy.intent}</Text>
              </View>
            </View>

            {/* ── Enemy body-part status ───────────────────── */}
            {Object.entries(game.combat.enemy.bodyParts).some(([, s]) => s !== '完好') && (
              <View style={styles.bodyPartGrid}>
                {Object.entries(game.combat.enemy.bodyParts)
                  .filter(([, status]) => status !== '完好')
                  .map(([part, status]) => (
                    <View key={part} style={[styles.bodyPartTag, getBodyPartStyle(status as string)]}>
                      <Text style={styles.bodyPartText}>{part} · {status}</Text>
                    </View>
                  ))}
              </View>
            )}

            {/* ── Round / status ───────────────────────────── */}
            <View style={styles.roundStrip}>
              <Text style={styles.kicker}>
                第 {game.combat.round} 回合 · {game.combat.status}
              </Text>
            </View>

            {/* ── Primary actions ──────────────────────────── */}
            {game.combat.status === '進行中' ? (
              <>
                <View style={styles.primaryActionGrid}>
                  {PRIMARY_COMBAT_ACTIONS.map((action) => (
                    <Pressable
                      key={action.id}
                      disabled={isBusy}
                      onPress={() =>
                        action.id === '使用道具' ? executeItemUse() : executeCombatAction(action.id)
                      }
                      style={[styles.primaryActionButton, isBusy && styles.disabled]}
                    >
                      <Text style={styles.primaryActionLabel}>{action.label}</Text>
                      <Text style={styles.primaryActionHint}>{action.hint}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* ── Custom action ─────────────────────────── */}
                <Text style={styles.subhead}>自訂行動</Text>
                <Text style={styles.muted}>目標部位（自訂行動用）</Text>
                <View style={styles.targetGrid}>
                  {COMBAT_TARGETS.map((part) => (
                    <Pressable
                      key={part}
                      onPress={() => setCombatBodyPart(part)}
                      style={[styles.targetButton, game.combat.selectedBodyPart === part && styles.segmentActive]}
                    >
                      <Text style={[styles.segmentText, game.combat.selectedBodyPart === part && styles.segmentTextActive]}>
                        {part}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  value={combatActionDraft}
                  onChangeText={setCombatActionDraft}
                  placeholder="例如：我側身踢佢右腳跟腱"
                  placeholderTextColor="#7e8796"
                  multiline
                  style={[styles.input, styles.textArea]}
                />

                {isAiLoading && (
                  <View style={styles.aiLoadingRow}>
                    <ActivityIndicator color="#d6f36d" size="small" />
                    <Text style={styles.aiLoadingText}>AI 判斷行動中…</Text>
                  </View>
                )}
                {aiActionRejection ? (
                  <View style={styles.aiRejectionCard}>
                    <Text style={styles.kicker}>行動被拒絕</Text>
                    <Text style={styles.choiceText}>{aiActionRejection}</Text>
                  </View>
                ) : null}
                {aiNarration ? (
                  <Pressable style={styles.aiNarrationCard} onPress={dismissAiNarration}>
                    <Text style={styles.kicker}>AI 旁白</Text>
                    <Text style={styles.bodyText}>{aiNarration}</Text>
                    <Text style={styles.aiDismissHint}>點擊關閉</Text>
                  </Pressable>
                ) : null}

                <PrimaryButton
                  disabled={combatActionDraft.trim().length < 2 || isBusy}
                  label={gameMode === 'ai-enhanced' && aiEnabled && aiProvider !== 'off' ? '執行自訂行動（AI 判斷）' : '執行自訂行動'}
                  onPress={() => runBusy(executeCustomCombatActionWithAI)}
                />
              </>
            ) : (
              <View style={styles.combatResultCard}>
                <Text style={styles.sectionTitle}>
                  {game.combat.status === '勝利' ? '你贏咗。' :
                   game.combat.status === '失敗' ? '你輸咗。' : '你撤退。'}
                </Text>
                <Text style={styles.bodyText}>
                  {game.combat.status === '勝利' ? '對方失去戰意。返去故事繼續。' :
                   game.combat.status === '失敗' ? '傷勢過重，只能狼狽脫身。' :
                   '你選擇離開衝突。無人會因此而宣布世界改變。'}
                </Text>
              </View>
            )}

            {/* ── Injuries ─────────────────────────────────── */}
            {game.combat.injuries.length > 0 && (
              <>
                <Text style={styles.subhead}>傷勢記錄</Text>
                {game.combat.injuries.map((injury) => (
                  <View key={injury.id} style={styles.infoCard}>
                    <Text style={styles.choiceTitle}>
                      {injury.target} · {injury.bodyPart} · {injury.severity}
                    </Text>
                    <Text style={styles.choiceText}>{injury.note}</Text>
                  </View>
                ))}
              </>
            )}

            {/* ── Combat log ───────────────────────────────── */}
            <Text style={styles.subhead}>戰鬥記錄</Text>
            <View style={styles.choiceStack}>
              {game.combat.log.map((entry) => (
                <View key={entry.id} style={[styles.logCard, getLogStyle(entry.tone)]}>
                  <Text style={styles.choiceText}>{entry.text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {currentScreen === 'npcs' && game && (
          <ScrollView contentContainerStyle={styles.contentWithTabs}>
            <Text style={styles.sectionTitle}>NPC 記憶同關係</Text>
            <Text style={styles.bodyText}>
              NPC 唔係全知。佢哋只會記住自己見過、聽過，或者同你互動過嘅事。關係會慢慢累積，唔係一個即時好感度。
            </Text>

            {game.npcs.map((npc) => (
              <View key={npc.id} style={styles.npcCard}>
                <View style={styles.npcHeader}>
                  <View style={styles.headerTextBlock}>
                    <Text style={styles.choiceTitle}>{npc.name}</Text>
                    <Text style={styles.choiceText}>
                      {npc.role} / {npc.location}
                    </Text>
                  </View>
                  <View style={styles.dispositionPill}>
                    <Text style={styles.dispositionText}>{npc.relationship.disposition}</Text>
                  </View>
                </View>

                <Text style={styles.choiceText}>{npc.mood}</Text>

                <View style={styles.relationGrid}>
                  <MiniMeter label="信任" value={npc.relationship.trust} />
                  <MiniMeter label="戒心" value={npc.relationship.caution} />
                  <MiniMeter label="敬重" value={npc.relationship.respect} />
                  <MiniMeter label="熟悉" value={npc.relationship.familiarity} />
                </View>

                <Text style={styles.kicker}>互動</Text>
                <View style={styles.actionGrid}>
                  {NPC_INTERACTIONS.map((interaction) => (
                    <Pressable
                      key={interaction}
                      disabled={isBusy}
                      onPress={() => runBusy(() => interactWithNpcAndGenerateDialogue(npc.id, interaction))}
                      style={[styles.actionButton, isBusy && styles.disabled]}
                    >
                      <Text style={styles.actionButtonText}>{interaction}</Text>
                    </Pressable>
                  ))}
                </View>
                {isAiLoading && (
                  <View style={styles.aiLoadingRow}>
                    <ActivityIndicator color="#d6f36d" size="small" />
                    <Text style={styles.aiLoadingText}>AI 生成對話中…</Text>
                  </View>
                )}
                {aiDialogue[npc.id] ? (
                  <View style={styles.aiDialogueCard}>
                    <Text style={styles.kicker}>{npc.name} 說</Text>
                    <Text style={styles.bodyText}>「{aiDialogue[npc.id]}」</Text>
                  </View>
                ) : null}

                <Text style={styles.kicker}>記憶</Text>
                <View style={styles.choiceStack}>
                  {npc.memories.map((memory) => (
                    <View key={memory.id} style={styles.memoryCard}>
                      <Text style={styles.kicker}>
                        {memory.date} / 重要度 {memory.importance} / {memory.emotionalEffect}
                      </Text>
                      <Text style={styles.choiceText}>{memory.memoryText}</Text>
                      <Text style={styles.memoryImpact}>{memory.source} / {memory.impact}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {currentScreen === 'character' && game && (
          <ScrollView contentContainerStyle={styles.contentWithTabs}>

            {/* ── Profession unlock offer ───────────────────── */}
            {game.pendingProfessionUnlock && (() => {
              const def = PROFESSION_DEFS.find((p) => p.id === game.pendingProfessionUnlock);
              return def ? (
                <View style={styles.professionOfferCard}>
                  <Text style={styles.kicker}>職業稱號</Text>
                  <Text style={styles.choiceTitle}>
                    你長時間以【{def.name}】嘅方式行事，江湖上開始有人咁稱呼你。
                  </Text>
                  <Text style={styles.choiceText}>{def.description}</Text>
                  <View style={styles.segmentRow}>
                    <Pressable style={[styles.segment, styles.segmentActive]} onPress={acceptProfessionAction}>
                      <Text style={styles.segmentTextActive}>接受【{def.name}】</Text>
                    </Pressable>
                    <Pressable style={styles.segment} onPress={declineProfessionAction}>
                      <Text style={styles.segmentText}>唔想要稱號</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null;
            })()}

            {/* ── Basic info ───────────────────────────────── */}
            <InfoRow label="姓名" value={game.character.name} />
            <InfoRow label="性別 / 年齡" value={`${game.character.gender} / ${game.character.age}`} />
            <InfoRow label="身份" value={game.character.identity} />
            <InfoRow label="稱號" value={game.character.title} />
            <InfoRow label="主職業" value={game.mainProfession
              ? (PROFESSION_DEFS.find((p) => p.id === game.mainProfession)?.name ?? game.mainProfession)
              : '未定'} />
            <InfoRow label="派系" value={game.character.faction} />
            <InfoRow label="名聲" value={game.character.reputation} />

            {/* ── Stats ────────────────────────────────────── */}
            <Text style={styles.subhead}>能力值</Text>
            <View style={styles.statStrip}>
              {Object.entries(game.character.stats).map(([key, value]) => (
                <View key={key} style={styles.statPill}>
                  <Text style={styles.statValue}>{value}</Text>
                  <Text style={styles.statLabel}>{key}</Text>
                </View>
              ))}
            </View>

            {/* ── Discovered skills ────────────────────────── */}
            <Text style={styles.subhead}>已領悟技能</Text>
            {(() => {
              const discovered = Object.values(game.skillProgress ?? {}).filter((s) => s.discovered);
              return discovered.length === 0
                ? <EmptyState text="技能只會由行動同練習慢慢出現，唔會靠升級獲得。" />
                : (
                  <View style={styles.choiceStack}>
                    {discovered.map((skill) => (
                      <View key={skill.id} style={styles.skillCard}>
                        <View style={styles.skillHeader}>
                          <Text style={styles.choiceTitle}>【{skill.name}】</Text>
                          <Text style={styles.levelBadge}>Lv.{skill.level}</Text>
                        </View>
                        <Text style={styles.choiceText}>{skill.description}</Text>
                      </View>
                    ))}
                  </View>
                );
            })()}

            {/* ── Profession tendencies ─────────────────────── */}
            <Text style={styles.subhead}>職業傾向</Text>
            {(() => {
              const visible = PROFESSION_DEFS
                .map((def) => ({ def, score: game.professionTendencies?.[def.id] ?? 0 }))
                .filter(({ score }) => score >= 3)
                .sort((a, b) => b.score - a.score);

              return visible.length === 0
                ? <EmptyState text="你嘅行動方式未顯露出明顯嘅傾向。" />
                : (
                  <View style={styles.choiceStack}>
                    {visible.map(({ def, score }) => (
                      <View key={def.id} style={styles.tendencyRow}>
                        <View style={styles.tendencyLabelRow}>
                          <Text style={styles.choiceTitle}>{def.name}</Text>
                          <Text style={styles.tendencyPct}>{score.toFixed(0)} / 100</Text>
                        </View>
                        <View style={styles.tendencyTrack}>
                          <View style={[styles.tendencyFill, { width: `${Math.min(100, score)}%` as `${number}%` }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                );
            })()}

            {/* ── Side professions ─────────────────────────── */}
            {game.sideProfessions.length > 0 && (
              <>
                <Text style={styles.subhead}>副職業</Text>
                <View style={styles.segmentRow}>
                  {game.sideProfessions.map((profId) => {
                    const def = PROFESSION_DEFS.find((p) => p.id === profId);
                    return def ? (
                      <View key={profId} style={styles.sideProfBadge}>
                        <Text style={styles.sideProfText}>{def.name}</Text>
                      </View>
                    ) : null;
                  })}
                </View>
              </>
            )}
          </ScrollView>
        )}

        {currentScreen === 'inventory' && game && (
          <ScrollView contentContainerStyle={styles.contentWithTabs}>
            <Text style={styles.sectionTitle}>背包</Text>
            <SecondaryButton label="前往市場交易" onPress={() => { refreshMarket(); setScreen('market'); }} />
            {game.inventory.length === 0 ? (
              <EmptyState text="背包係空。你開局無神器，無祖傳寶物，無系統禮包。" />
            ) : (
              game.inventory.map((item) => (
                <View key={item.id} style={styles.infoCard}>
                  <Text style={styles.choiceTitle}>{item.name} x{item.quantity}</Text>
                  <Text style={styles.choiceText}>{item.note}</Text>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {currentScreen === 'market' && game && (
          <MarketScreen
            game={game}
            isBusy={isBusy}
            onBuy={(itemId, qty) => {
              const err = buyMarketItem(itemId, qty);
              if (err) Alert.alert('交易失敗', err);
            }}
            onSell={(itemName, qty) => {
              const err = sellInventoryItem(itemName, qty);
              if (err) Alert.alert('交易失敗', err);
            }}
            onBack={() => setScreen('inventory')}
          />
        )}

        {currentScreen === 'map' && game && (
          <ScrollView contentContainerStyle={styles.contentWithTabs}>
            <Text style={styles.sectionTitle}>地圖</Text>
            <Text style={styles.bodyText}>地圖只記錄你知道嘅地方。世界其他部分仍然存在，但你未必有資格知道。</Text>
            <View style={styles.worldTicker}>
              <Text style={styles.kicker}>世界時鐘</Text>
              <Text style={styles.choiceTitle}>
                第 {game.worldClock.day} 日 / {game.worldClock.phase}
              </Text>
              <Text style={styles.choiceText}>地區緊張度：{game.worldClock.tension} / 8</Text>
              <Text style={styles.choiceText}>上次推進：{game.worldClock.lastTickReason}</Text>
            </View>

            <Text style={styles.subhead}>動態世界事件</Text>
            {game.worldEvents.filter((event) => event.visibility === '公開').map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.npcHeader}>
                  <View style={styles.headerTextBlock}>
                    <Text style={styles.choiceTitle}>{event.title}</Text>
                    <Text style={styles.choiceText}>{event.location}</Text>
                  </View>
                  <View style={styles.dispositionPill}>
                    <Text style={styles.dispositionText}>{event.status}</Text>
                  </View>
                </View>
                <View style={styles.relationGrid}>
                  <MiniMeter label="壓力" value={event.pressure} />
                  <View style={styles.infoBadge}>
                    <Text style={styles.infoLabel}>可見度</Text>
                    <Text style={styles.infoValue}>{event.visibility}</Text>
                  </View>
                </View>
                <Text style={styles.choiceText}>{event.description}</Text>
                <Text style={styles.memoryImpact}>{event.lastChange}</Text>
              </View>
            ))}
            {game.worldEvents.every((event) => event.visibility !== '公開') && (
              <EmptyState text="暫時無公開世界事件。其他變化要靠傳聞、NPC 或親身接觸。" />
            )}

            <Text style={styles.subhead}>近期傳聞</Text>
            {game.rumors.slice(0, 5).map((rumor) => (
              <View key={rumor.id} style={styles.rumorCard}>
                <Text style={styles.kicker}>{rumor.date} / {rumor.source} / {rumor.truthState}</Text>
                <Text style={styles.choiceTitle}>{rumor.location}</Text>
                <Text style={styles.choiceText}>{rumor.text}</Text>
              </View>
            ))}
            {game.rumors.length === 0 && <EmptyState text="你未聽到任何傳聞。" />}

            <Text style={styles.subhead}>已知地點</Text>
            {game.map.map((location) => (
              <View key={location.id} style={styles.infoCard}>
                <Text style={styles.choiceTitle}>{location.name}</Text>
                <Text style={styles.kicker}>{location.status}</Text>
                <Text style={styles.choiceText}>{location.note}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {currentScreen === 'log' && game && (
          <ScrollView contentContainerStyle={styles.contentWithTabs}>
            <Text style={styles.sectionTitle}>世界史</Text>
            <Text style={styles.bodyText}>
              世界史會保存每次世界事件變化。標記「未證實」嘅項目代表世界內部有變，但玩家未必已經掌握完整真相。
            </Text>

            {/* ── Story hooks ──────────────────────────── */}
            <Text style={styles.subhead}>故事鈎</Text>
            <Text style={styles.muted}>透過觀察、傳聞、打探消息或探索發現。未發現嘅事唔會顯示。</Text>
            {(() => {
              const all = (game.storyHooks ?? []).filter((h) => h.discovered);
              if (all.length === 0) return <EmptyState text="你尚未發現任何值得留意嘅事。試試同 NPC 打探消息，或者去探索。" />;
              return (
                <View style={styles.choiceStack}>
                  {all.map((hook) => (
                    <View key={hook.id} style={[styles.hookCard, getUrgencyStyle(hook.urgency)]}>
                      <View style={styles.hookHeader}>
                        <Text style={styles.hookCategory}>{hook.category}</Text>
                        <View style={styles.hookBadgeRow}>
                          <Text style={styles.hookUrgency}>{hook.urgency}</Text>
                          <Text style={styles.hookStage}>{hook.stage}</Text>
                        </View>
                      </View>
                      <Text style={styles.choiceTitle}>{hook.title}</Text>
                      <Text style={styles.kicker}>{hook.location} · 開始於 {hook.startDate}</Text>
                      <Text style={styles.choiceText}>{hook.surfaceText}</Text>
                      <Text style={[styles.choiceText, { fontStyle: 'italic', marginTop: 4 }]}>
                        {hook.undercurrentText}
                      </Text>
                      {hook.involvedFactions.length > 0 && (
                        <Text style={styles.memoryImpact}>相關派系：{hook.involvedFactions.join('、')}</Text>
                      )}
                      {hook.outcome !== '進行中' && hook.outcomeText && (
                        <View style={styles.hookOutcomeBar}>
                          <Text style={styles.hookOutcomeText}>{hook.outcome}：{hook.outcomeText}</Text>
                        </View>
                      )}
                      {hook.discoveryMethod && (
                        <Text style={styles.memoryImpact}>發現方式：{hook.discoveryMethod}</Text>
                      )}
                    </View>
                  ))}
                </View>
              );
            })()}

            <Text style={styles.subhead}>傳聞</Text>
            {game.rumors.map((rumor) => (
              <View key={rumor.id} style={styles.rumorCard}>
                <Text style={styles.kicker}>{rumor.date} / {rumor.source} / {rumor.truthState}</Text>
                <Text style={styles.choiceTitle}>{rumor.location}</Text>
                <Text style={styles.choiceText}>{rumor.text}</Text>
              </View>
            ))}
            {game.rumors.length === 0 && <EmptyState text="暫時未有傳聞。" />}

            <Text style={styles.subhead}>世界史記錄</Text>
            {game.worldHistory.map((entry) => (
              <View key={entry.id} style={styles.historyCard}>
                <Text style={styles.kicker}>
                  {entry.date} / {entry.location} / {entry.eventType}
                </Text>
                <Text style={styles.choiceTitle}>{entry.shortSummary}</Text>
                <Text style={styles.choiceText}>{entry.impactSummary}</Text>
                <Text style={styles.memoryImpact}>{entry.discovered ? '已知' : '未證實'}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {currentScreen === 'quest' && game && (
          <ScrollView contentContainerStyle={styles.contentWithTabs}>
            <Text style={styles.sectionTitle}>任務</Text>
            <Text style={styles.bodyText}>無固定主線，無世界末日倒數。呢啲只係你聽過嘅事，可以理，可以唔理。</Text>
            {game.quests.map((quest) => (
              <View key={quest.id} style={styles.infoCard}>
                <Text style={styles.choiceTitle}>{quest.title}</Text>
                <Text style={styles.kicker}>{quest.status}</Text>
                <Text style={styles.choiceText}>{quest.note}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {currentScreen === 'settings' && (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.sectionTitle}>遊戲模式</Text>

            {/* Mode selector */}
            <View style={styles.segmentRow}>
              <Pressable
                style={[styles.segment, { flex: 1 }, gameMode === 'offline' && styles.segmentActive]}
                onPress={() => runBusy(() => setGameMode('offline'))}
              >
                <Text style={[styles.segmentText, gameMode === 'offline' && styles.segmentTextActive]}>
                  離線模式
                </Text>
              </Pressable>
              <Pressable
                style={[styles.segment, { flex: 1 }, gameMode === 'ai-enhanced' && styles.segmentActive]}
                onPress={() => runBusy(() => setGameMode('ai-enhanced'))}
              >
                <Text style={[styles.segmentText, gameMode === 'ai-enhanced' && styles.segmentTextActive]}>
                  AI 增強模式
                </Text>
              </Pressable>
            </View>

            {gameMode === 'offline' && (
              <View style={styles.infoCard}>
                <Text style={styles.kicker}>離線模式（預設）</Text>
                <Text style={styles.choiceText}>• 完全唔需要 API Key，無網絡亦可暢玩</Text>
                <Text style={styles.choiceText}>• 旁白、對話、行動判斷全由本地模板引擎生成</Text>
                <Text style={styles.choiceText}>• 核心數值、世界模擬、故事鉤子照常運作</Text>
                <Text style={styles.choiceText}>• 適合離線、省電、保護私隱</Text>
              </View>
            )}

            {gameMode === 'ai-enhanced' && (
              <View style={styles.infoCard}>
                <Text style={styles.kicker}>AI 增強模式</Text>
                <Text style={styles.choiceText}>• AI 負責旁白、NPC 對話、自訂行動判斷</Text>
                <Text style={styles.choiceText}>• A/B/C/D/E 標準選擇唔呼叫 AI</Text>
                <Text style={styles.choiceText}>• 核心數值由本地引擎處理，AI 無法修改</Text>
                <Text style={styles.choiceText}>• API Key 只存本機，不上傳任何伺服器</Text>
              </View>
            )}

            {/* AI provider config — only shown in AI-Enhanced mode */}
            {gameMode === 'ai-enhanced' && (
              <>
                <Text style={styles.subhead}>AI 供應商</Text>
                <View style={styles.segmentRow}>
                  {(['openai', 'claude'] as const).map((p) => (
                    <Pressable
                      key={p}
                      style={[styles.segment, aiProvider === p && styles.segmentActive]}
                      onPress={() => runBusy(() => setAiProvider(p))}
                    >
                      <Text style={[styles.segmentText, aiProvider === p && styles.segmentTextActive]}>
                        {p === 'openai' ? 'OpenAI' : 'Claude'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {aiProvider === 'openai' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>OpenAI API Key</Text>
                    <TextInput
                      value={openaiKey}
                      onChangeText={(key) => runBusy(() => setOpenaiKey(key))}
                      placeholder="sk-..."
                      placeholderTextColor="#7e8796"
                      secureTextEntry
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                )}

                {aiProvider === 'claude' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Anthropic API Key</Text>
                    <TextInput
                      value={claudeKey}
                      onChangeText={(key) => runBusy(() => setClaudeKey(key))}
                      placeholder="sk-ant-..."
                      placeholderTextColor="#7e8796"
                      secureTextEntry
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                )}

                <Text style={styles.subhead}>進階選項</Text>
                <View style={styles.segmentRow}>
                  <Pressable
                    style={[styles.segment, aiEnabled && styles.segmentActive]}
                    onPress={() => runBusy(() => setAiEnabled(!aiEnabled))}
                  >
                    <Text style={[styles.segmentText, aiEnabled && styles.segmentTextActive]}>
                      AI 旁白：{aiEnabled ? '開' : '關'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.segment, lowTokenMode && styles.segmentActive]}
                    onPress={() => runBusy(() => setLowTokenMode(!lowTokenMode))}
                  >
                    <Text style={[styles.segmentText, lowTokenMode && styles.segmentTextActive]}>
                      省 Token 模式：{lowTokenMode ? '開' : '關'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            <SecondaryButton
              disabled={isBusy}
              label={game ? '返回故事' : '返回開始'}
              onPress={() => setScreen(game ? 'story' : 'opening')}
            />
          </ScrollView>
        )}

        {currentScreen === 'saves' && (
          <ScrollView contentContainerStyle={styles.contentWithTabs}>
            <Text style={styles.sectionTitle}>本地存檔</Text>
            <Text style={styles.bodyText}>手機版用 SQLite 儲存；browser preview 用本機暫存。無帳戶，無後端。</Text>
            <View style={styles.buttonRow}>
              <PrimaryButton disabled={!game || isBusy} label="儲存目前進度" onPress={() => runBusy(saveGame)} />
              <SecondaryButton disabled={isBusy} label="重新整理" onPress={() => runBusy(refreshSaves)} />
            </View>
            {lastSavedAt && <Text style={styles.muted}>上次儲存：{new Date(lastSavedAt).toLocaleString()}</Text>}

            <View style={styles.choiceStack}>
              {saves.length === 0 && <EmptyState text="暫時未有存檔。" />}
              {saves.map((save) => (
                <Pressable key={save.id} style={styles.saveCard} onPress={() => runBusy(() => loadSave(save.id))}>
                  <Text style={styles.choiceTitle}>{save.characterName}</Text>
                  <Text style={styles.choiceText}>
                    {save.regionName} / {new Date(save.updatedAt).toLocaleString()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <SecondaryButton disabled={isBusy} label={game ? '返回故事' : '返回開始'} onPress={() => setScreen(game ? 'story' : 'opening')} />
            <SecondaryButton disabled={isBusy} label="新遊戲" onPress={resetRun} />
          </ScrollView>
        )}

        {game && GAME_TABS.some((tab) => tab.id === currentScreen) && (
          <View style={styles.tabBar}>
            {GAME_TABS.map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setScreen(tab.id)}
                style={[styles.tabButton, currentScreen === tab.id && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, currentScreen === tab.id && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MarketScreen({
  game,
  isBusy,
  onBuy,
  onSell,
  onBack,
}: {
  game: import('./src/types/game').GameState;
  isBusy: boolean;
  onBuy: (itemId: string, qty: number) => void;
  onSell: (itemName: string, qty: number) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<{ id: string; mode: 'buy' | 'sell'; qty: number } | null>(null);

  const handleSelect = (id: string, mode: 'buy' | 'sell') => {
    setSelected((prev) => prev?.id === id && prev.mode === mode ? null : { id, mode, qty: 1 });
  };

  const market = game.market;

  return (
    <ScrollView contentContainerStyle={styles.contentWithTabs}>
      {/* ── Wallet ─────────────────────────────────────── */}
      <View style={styles.walletCard}>
        <Text style={styles.kicker}>持有錢財</Text>
        <Text style={styles.walletAmount}>{formatCurrency(game.wallet.copper)}</Text>
      </View>

      {/* ── Trade rumors ─────────────────────────────── */}
      <Text style={styles.subhead}>市場消息</Text>
      <View style={styles.choiceStack}>
        {market.tradeRumors.map((rumor, i) => (
          <View key={i} style={styles.rumorCard}>
            <Text style={styles.choiceText}>{rumor}</Text>
          </View>
        ))}
      </View>

      {/* ── Item list ─────────────────────────────────── */}
      <Text style={styles.subhead}>商品列表</Text>
      <View style={styles.choiceStack}>
        {market.items.map((item) => {
          const playerQty = game.inventory.find((i) => i.name === item.name)?.quantity ?? 0;
          const isExpanded = selected?.id === item.id;
          const canBuy = item.stock > 0;
          const canSell = playerQty > 0;

          return (
            <View key={item.id} style={styles.marketItemCard}>
              <View style={styles.marketItemRow}>
                <View style={styles.marketItemInfo}>
                  <Text style={styles.choiceTitle}>{item.name}</Text>
                  <Text style={styles.marketMeta}>{item.category} · 庫存 {item.stock} · {item.supplyLevel}</Text>
                  <Text style={styles.marketPrice}>{formatCurrency(item.currentPrice)}</Text>
                  {playerQty > 0 && <Text style={styles.marketHeld}>持有 {playerQty}</Text>}
                </View>
                <View style={styles.marketActions}>
                  <Pressable
                    disabled={!canBuy || isBusy}
                    style={[styles.marketBtn, (!canBuy || isBusy) && styles.disabled, selected?.id === item.id && selected.mode === 'buy' && styles.marketBtnActive]}
                    onPress={() => handleSelect(item.id, 'buy')}
                  >
                    <Text style={styles.marketBtnText}>買入</Text>
                  </Pressable>
                  <Pressable
                    disabled={!canSell || isBusy}
                    style={[styles.marketBtn, (!canSell || isBusy) && styles.disabled, selected?.id === item.id && selected.mode === 'sell' && styles.marketBtnActive]}
                    onPress={() => handleSelect(item.id, 'sell')}
                  >
                    <Text style={styles.marketBtnText}>賣出</Text>
                  </Pressable>
                </View>
              </View>

              {isExpanded && selected && (
                <View style={styles.marketQtyRow}>
                  <Text style={styles.choiceText}>
                    {selected.mode === 'buy'
                      ? `買入 ${selected.qty} 件 = ${formatCurrency(item.currentPrice * selected.qty)}`
                      : `賣出 ${selected.qty} 件 = ${formatCurrency(Math.floor(item.currentPrice * 0.65) * selected.qty)}`}
                  </Text>
                  <View style={styles.marketQtyControls}>
                    <Pressable style={styles.qtyBtn} onPress={() => setSelected((s) => s ? { ...s, qty: Math.max(1, s.qty - 1) } : s)}>
                      <Text style={styles.qtyBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.qtyDisplay}>{selected.qty}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => {
                        const max = selected.mode === 'buy'
                          ? Math.min(item.stock, Math.floor(game.wallet.copper / item.currentPrice))
                          : playerQty;
                        setSelected((s) => s ? { ...s, qty: Math.min(max, s.qty + 1) } : s);
                      }}
                    >
                      <Text style={styles.qtyBtnText}>＋</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.qtyBtn, styles.qtyConfirm]}
                      onPress={() => {
                        if (selected.mode === 'buy') onBuy(item.id, selected.qty);
                        else onSell(item.name, selected.qty);
                        setSelected(null);
                      }}
                    >
                      <Text style={[styles.qtyBtnText, { color: '#0f1218' }]}>確認</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <SecondaryButton label="返回背包" onPress={onBack} />
    </ScrollView>
  );
}

function StaminaBar({ value, max, accent = '#d6f36d' }: { value: number; max: number; accent?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={styles.staminaTrack}>
      <View style={[styles.staminaFill, { width: `${Math.round(pct * 100)}%` as `${number}%`, backgroundColor: accent }]} />
      <Text style={styles.staminaLabel}>{value}/{max}</Text>
    </View>
  );
}

function EnvBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.envBadge}>
      <Text style={styles.envLabel}>{label}</Text>
      <Text style={styles.envValue}>{value}</Text>
    </View>
  );
}

function getUrgencyStyle(urgency: string) {
  if (urgency === '緊急') return styles.hookUrgentBorder;
  if (urgency === '高') return styles.hookHighBorder;
  if (urgency === '中') return styles.hookMidBorder;
  return styles.hookLowBorder;
}

function getBodyPartStyle(status: string) {
  if (status === '失能') return styles.bodyPartDisabled;
  if (status === '骨折') return styles.bodyPartBroken;
  if (status === '受傷') return styles.bodyPartInjured;
  if (status === '流血') return styles.bodyPartBleeding;
  return styles.bodyPartBruised;
}

function PrimaryButton({ disabled, label, onPress }: { disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.primaryButton, disabled && styles.disabled]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ disabled, label, onPress }: { disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.secondaryButton, disabled && styles.disabled]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.choiceText}>{text}</Text>
    </View>
  );
}

function MiniMeter({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.miniMeter}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getWorldPitch(worldType: WorldType) {
  if (worldType === '武俠') return '茶寮、鏢局、江湖傳聞；你只係路過嘅無名人。';
  if (worldType === '修仙') return '坊市、山門、散修日常；機緣未必屬於你。';
  if (worldType === '末日') return '水、食物、避難所；活落去先係第一件事。';
  return '規則、房間、倒數；你唔知自己係棋子定觀眾。';
}

function getLogStyle(tone: 'info' | 'success' | 'danger' | 'rejected') {
  if (tone === 'success') return styles.logSuccess;
  if (tone === 'danger') return styles.logDanger;
  if (tone === 'rejected') return styles.logRejected;
  return styles.logInfo;
}

const CJK_FONT = Platform.select({
  ios: 'PingFang TC',
  android: 'sans-serif',
  default: 'System',
});

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#0f1218',
  },
  keyboardRoot: {
    flex: 1,
  },
  centerPane: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#262d39',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  brand: {
    color: '#d6f36d',
    fontFamily: CJK_FONT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 3,
  },
  headerButton: {
    backgroundColor: '#243149',
    borderRadius: 8,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  headerButtonText: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    gap: 18,
    padding: 18,
    paddingBottom: 36,
  },
  contentWithTabs: {
    gap: 16,
    padding: 18,
    paddingBottom: 104,
  },
  heroBlock: {
    gap: 14,
    minHeight: 180,
    justifyContent: 'flex-end',
    paddingTop: 28,
  },
  heroTitle: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 44,
  },
  kicker: {
    color: '#91e3d5',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 36,
  },
  subhead: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 17,
    fontWeight: '700',
  },
  bodyText: {
    color: '#c8cfda',
    fontFamily: CJK_FONT,
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '400',
  },
  muted: {
    color: '#9aa4b4',
    fontFamily: CJK_FONT,
    fontSize: 13,
    lineHeight: 20,
  },
  worldGrid: {
    gap: 12,
  },
  worldCard: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    minHeight: 94,
    padding: 16,
  },
  worldTitle: {
    color: '#d6f36d',
    fontSize: 22,
    fontWeight: '900',
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#f7f1e8',
    fontSize: 14,
    fontWeight: '900',
  },
  input: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    color: '#f7f1e8',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    alignItems: 'center',
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  segmentActive: {
    backgroundColor: '#d6f36d',
    borderColor: '#d6f36d',
  },
  segmentText: {
    color: '#c8cfda',
    fontSize: 14,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: '#0f1218',
  },
  choiceStack: {
    gap: 12,
  },
  choiceCard: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  choiceCardActive: {
    borderColor: '#d6f36d',
  },
  choiceTitle: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  choiceText: {
    color: '#aeb8c7',
    fontFamily: CJK_FONT,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 24,
  },
  storyPanel: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  statStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    backgroundColor: '#243149',
    borderRadius: 8,
    minWidth: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statValue: {
    color: '#d6f36d',
    fontFamily: CJK_FONT,
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: '#c8cfda',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  worldTicker: {
    backgroundColor: '#111c25',
    borderColor: '#2c4758',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  combatHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  combatMeter: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 96,
    padding: 14,
  },
  combatHp: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 24,
    fontWeight: '700',
  },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetButton: {
    alignItems: 'center',
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
    width: '31.5%',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#243149',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    width: '31.5%',
  },
  actionButtonText: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonRow: {
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#d6f36d',
    borderRadius: 8,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#0f1218',
    fontFamily: CJK_FONT,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#243149',
    borderRadius: 8,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.45,
  },
  infoRow: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  infoLabel: {
    color: '#91e3d5',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  eventCard: {
    backgroundColor: '#171d29',
    borderColor: '#3a4558',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  rumorCard: {
    backgroundColor: '#151c25',
    borderColor: '#38465a',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  historyCard: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  infoBadge: {
    backgroundColor: '#243149',
    borderRadius: 8,
    flexGrow: 1,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyState: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  saveCard: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  logCard: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 14,
  },
  logInfo: {
    backgroundColor: '#171d29',
    borderLeftColor: '#91e3d5',
  },
  logSuccess: {
    backgroundColor: '#16251d',
    borderLeftColor: '#d6f36d',
  },
  logDanger: {
    backgroundColor: '#28191b',
    borderLeftColor: '#ef767a',
  },
  logRejected: {
    backgroundColor: '#2b2118',
    borderLeftColor: '#f6bd60',
  },
  npcCard: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  npcHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  dispositionPill: {
    backgroundColor: '#243149',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dispositionText: {
    color: '#d6f36d',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '600',
  },
  relationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniMeter: {
    backgroundColor: '#243149',
    borderRadius: 8,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memoryCard: {
    backgroundColor: '#101722',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  memoryImpact: {
    color: '#91e3d5',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 20,
  },
  tabBar: {
    backgroundColor: '#0f1218',
    borderTopColor: '#262d39',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 6,
    left: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    position: 'absolute',
    right: 0,
  },
  tabButton: {
    alignItems: 'center',
    backgroundColor: '#171d29',
    borderRadius: 8,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: '#d6f36d',
  },
  tabText: {
    color: '#c8cfda',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0f1218',
    fontWeight: '700',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  aiNarrationCard: {
    backgroundColor: '#111c14',
    borderColor: '#4a7c3f',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  aiDialogueCard: {
    backgroundColor: '#12181c',
    borderColor: '#2c6080',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  aiRejectionCard: {
    backgroundColor: '#1e1208',
    borderColor: '#7c4a1e',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  aiLoadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
  },
  aiLoadingText: {
    color: '#d6f36d',
    fontFamily: CJK_FONT,
    fontSize: 13,
    fontWeight: '500',
  },
  aiDismissHint: {
    color: '#6a9e5e',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'right',
  },

  // ── Story Hooks ────────────────────────────────────────────────────────────
  hookCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 6,
    padding: 14,
    backgroundColor: '#141b24',
  },
  hookLowBorder:    { borderColor: '#30394b', borderLeftColor: '#4a5568' },
  hookMidBorder:    { borderColor: '#2d3a50', borderLeftColor: '#5a7fa6' },
  hookHighBorder:   { borderColor: '#3a2d20', borderLeftColor: '#c9820a' },
  hookUrgentBorder: { borderColor: '#3a1f20', borderLeftColor: '#c0392b' },
  hookHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hookBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  hookCategory: {
    color: '#91e3d5',
    fontFamily: CJK_FONT,
    fontSize: 11,
    fontWeight: '600',
  },
  hookUrgency: {
    color: '#c9820a',
    fontFamily: CJK_FONT,
    fontSize: 11,
    fontWeight: '600',
  },
  hookStage: {
    color: '#7e8fa6',
    fontFamily: CJK_FONT,
    fontSize: 11,
    fontWeight: '400',
  },
  hookOutcomeBar: {
    backgroundColor: '#1c2030',
    borderRadius: 6,
    marginTop: 4,
    padding: 8,
  },
  hookOutcomeText: {
    color: '#aeb8c7',
    fontFamily: CJK_FONT,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
  },

  // ── Market ─────────────────────────────────────────────────────────────────
  walletCard: {
    backgroundColor: '#1a2210',
    borderColor: '#4a6a25',
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  walletAmount: {
    color: '#d6f36d',
    fontFamily: CJK_FONT,
    fontSize: 22,
    fontWeight: '700',
  },
  marketItemCard: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  marketItemRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    alignItems: 'flex-start',
  },
  marketItemInfo: {
    flex: 1,
    gap: 3,
  },
  marketMeta: {
    color: '#7e8fa6',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '400',
  },
  marketPrice: {
    color: '#d6f36d',
    fontFamily: CJK_FONT,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  marketHeld: {
    color: '#91e3d5',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '500',
  },
  marketActions: {
    gap: 6,
  },
  marketBtn: {
    alignItems: 'center',
    backgroundColor: '#243149',
    borderRadius: 6,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  marketBtnActive: {
    backgroundColor: '#2e4a6a',
    borderColor: '#91e3d5',
    borderWidth: 1,
  },
  marketBtnText: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 13,
    fontWeight: '600',
  },
  marketQtyRow: {
    backgroundColor: '#111722',
    borderTopColor: '#262d39',
    borderTopWidth: 1,
    gap: 10,
    padding: 12,
  },
  marketQtyControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  qtyBtn: {
    alignItems: 'center',
    backgroundColor: '#243149',
    borderRadius: 6,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  qtyBtnText: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 16,
    fontWeight: '700',
  },
  qtyDisplay: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 18,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
  },
  qtyConfirm: {
    backgroundColor: '#d6f36d',
    paddingHorizontal: 14,
    width: 'auto' as unknown as number,
  },

  // ── Skill & Profession ─────────────────────────────────────────────────────
  professionOfferCard: {
    backgroundColor: '#1a2210',
    borderColor: '#5a7a30',
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  skillCard: {
    backgroundColor: '#171d29',
    borderColor: '#3a4f6a',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  skillHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelBadge: {
    backgroundColor: '#243149',
    borderRadius: 6,
    color: '#d6f36d',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  tendencyRow: {
    gap: 6,
  },
  tendencyLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tendencyPct: {
    color: '#7e8fa6',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '500',
  },
  tendencyTrack: {
    backgroundColor: '#1a2230',
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
  },
  tendencyFill: {
    backgroundColor: '#d6f36d',
    borderRadius: 4,
    height: '100%',
  },
  sideProfBadge: {
    backgroundColor: '#243149',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sideProfText: {
    color: '#91e3d5',
    fontFamily: CJK_FONT,
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Combat v2 ──────────────────────────────────────────────────────────────
  envStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  envBadge: {
    backgroundColor: '#1a2230',
    borderColor: '#2c3a50',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 70,
  },
  envLabel: {
    color: '#91e3d5',
    fontFamily: CJK_FONT,
    fontSize: 11,
    fontWeight: '500',
  },
  envValue: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  staminaTrack: {
    backgroundColor: '#1a2230',
    borderRadius: 4,
    height: 14,
    marginTop: 6,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  staminaFill: {
    borderRadius: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  staminaLabel: {
    color: '#0f1218',
    fontFamily: CJK_FONT,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    zIndex: 1,
  },
  guardBadge: {
    color: '#91e3d5',
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  bodyPartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  bodyPartTag: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bodyPartText: {
    fontFamily: CJK_FONT,
    fontSize: 12,
    fontWeight: '500',
  },
  bodyPartBruised: { backgroundColor: '#1e2530', borderColor: '#4a5568' },
  bodyPartBleeding: { backgroundColor: '#2a1520', borderColor: '#c0392b' },
  bodyPartInjured: { backgroundColor: '#2d1a10', borderColor: '#e67e22' },
  bodyPartBroken: { backgroundColor: '#280d10', borderColor: '#e74c3c' },
  bodyPartDisabled: { backgroundColor: '#200a0a', borderColor: '#922b21' },
  roundStrip: {
    backgroundColor: '#1a2230',
    borderColor: '#2c3a50',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryActionGrid: {
    gap: 10,
  },
  primaryActionButton: {
    backgroundColor: '#1a2638',
    borderColor: '#2e4260',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 64,
    justifyContent: 'center',
  },
  primaryActionLabel: {
    color: '#f7f1e8',
    fontFamily: CJK_FONT,
    fontSize: 16,
    fontWeight: '700',
  },
  primaryActionHint: {
    color: '#7e8fa6',
    fontFamily: CJK_FONT,
    fontSize: 13,
    fontWeight: '400',
    marginTop: 3,
  },
  combatResultCard: {
    backgroundColor: '#171d29',
    borderColor: '#30394b',
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
});
