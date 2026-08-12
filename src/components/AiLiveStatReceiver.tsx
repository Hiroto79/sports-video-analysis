import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RotateCcw, 
  Sparkles, 
  Zap, 
  Activity, 
  Send, 
  Copy, 
  Check, 
  Database,
  Grid3X3,
  Film,
  Flame,
  Clock,
  Users,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Plus,
  Trash2
} from 'lucide-react';
import type { TaggedEvent, Player } from '../types';

export interface AiStatPayload {
  pitch_number?: number;
  result: 'Strike' | 'Ball' | 'Foul' | 'InPlay' | string;
  confidence?: number; // 0.0 ~ 1.0
  ball_speed?: number; // km/h
  pitch_type?: string;
  course?: string;
  batted_ball?: string;
  notes?: string;
  receivedAt?: string;
  isOverridden?: boolean;
  originalResult?: string;
  video_timestamp?: number; // 動画内の該当シーン秒数 (e.g. 45.3)
  pitcher?: string;         // 送信元指定の投手名 (任意)
  batter?: string;          // 送信元指定の打者名 (任意)
  // OpenCommand Center Camera Vision Tracking Attributes
  camera_view?: 'center' | 'side' | 'broadcast' | string; // 'center' センターカメラ映像
  target_course?: string;       // 構えコース (e.g. "Out-Low", "In-High")
  actual_course?: string;       // 着弾コース (e.g. "Out-Low", "Mid-Mid")
  target_x?: number;            // 構えX (0-100%)
  target_y?: number;            // 構えY (0-100%)
  actual_x?: number;            // 着弾X (0-100%)
  actual_y?: number;            // 着弾Y (0-100%)
  miss_distance_inch?: number;  // ズレ誤差 (inch, e.g. 1.8)
  miss_distance_cm?: number;    // ズレ誤差 (cm, e.g. 4.6)
  is_opposite?: boolean;        // 逆球フラグ
  command_score?: number;       // コマンドスコア (0-100)
}

export interface LineupBatter {
  order: number;
  name: string;
  number?: string;
  hand?: 'R' | 'L' | 'S';
}

export interface PitcherEntry {
  id: string;
  name: string;
  role: '先発' | '中継ぎ' | '抑え';
  hand?: 'R' | 'L';
}

interface AiLiveStatReceiverProps {
  events: TaggedEvent[];
  players?: Player[];
  teamAName?: string;
  teamBName?: string;
  initialPitcherA?: string;
  initialPitcherB?: string;
  onAddEvent?: (event: Partial<TaggedEvent>) => void;
  onUpdateEvent?: (eventId: string, updates: Partial<TaggedEvent>) => void;
  onNavigateToMatrix?: () => void;
  onNavigateToOrganizer?: () => void;
  currentTime?: number;
  inningNum?: number;
  inningHalf?: 'top' | 'bottom';
}

export const AiLiveStatReceiver: React.FC<AiLiveStatReceiverProps> = ({
  players = [],
  teamAName = '先攻チーム',
  teamBName = '後攻チーム',
  initialPitcherA = '投手A (先発)',
  initialPitcherB = '投手B (先発)',
  onAddEvent,
  onNavigateToMatrix,
  onNavigateToOrganizer,
  currentTime = 0,
  inningNum = 1,
  inningHalf = 'top',
}) => {
  // -------------------------------------------------------------
  // 1. GAME & LINEUP STATE
  // -------------------------------------------------------------
  const [currentInning, setCurrentInning] = useState<number>(inningNum);
  const [currentHalf, setCurrentHalf] = useState<'top' | 'bottom'>(inningHalf);

  // Batting Lineups (1-9)
  const defaultLineup = (prefix: string): LineupBatter[] => [
    { order: 1, name: `${prefix}1番`, hand: 'R' },
    { order: 2, name: `${prefix}2番`, hand: 'L' },
    { order: 3, name: `${prefix}3番`, hand: 'R' },
    { order: 4, name: `${prefix}4番`, hand: 'R' },
    { order: 5, name: `${prefix}5番`, hand: 'L' },
    { order: 6, name: `${prefix}6番`, hand: 'R' },
    { order: 7, name: `${prefix}7番`, hand: 'R' },
    { order: 8, name: `${prefix}8番`, hand: 'R' },
    { order: 9, name: `${prefix}9番`, hand: 'L' },
  ];

  const [lineupTop, setLineupTop] = useState<LineupBatter[]>(() => {
    const saved = localStorage.getItem('ai_receiver_lineup_top');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return defaultLineup('先攻打者');
  });

  const [lineupBottom, setLineupBottom] = useState<LineupBatter[]>(() => {
    const saved = localStorage.getItem('ai_receiver_lineup_bottom');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return defaultLineup('後攻打者');
  });

  // Pitchers Rotation List
  const [pitchersTeamA, setPitchersTeamA] = useState<PitcherEntry[]>(() => {
    const saved = localStorage.getItem('ai_receiver_pitchers_a');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return [
      { id: 'p_a1', name: initialPitcherA || '先発投手A', role: '先発', hand: 'R' },
      { id: 'p_a2', name: 'リリーフA1', role: '中継ぎ', hand: 'R' },
      { id: 'p_a3', name: 'クローザーA', role: '抑え', hand: 'R' }
    ];
  });

  const [pitchersTeamB, setPitchersTeamB] = useState<PitcherEntry[]>(() => {
    const saved = localStorage.getItem('ai_receiver_pitchers_b');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return [
      { id: 'p_b1', name: initialPitcherB || '先発投手B', role: '先発', hand: 'R' },
      { id: 'p_b2', name: 'リリーフB1', role: '中継ぎ', hand: 'L' },
      { id: 'p_b3', name: 'クローザーB', role: '抑え', hand: 'R' }
    ];
  });

  // Active indices
  const [currentBatterIdxTop, setCurrentBatterIdxTop] = useState<number>(0);
  const [currentBatterIdxBottom, setCurrentBatterIdxBottom] = useState<number>(0);
  const [activePitcherIdxA, setActivePitcherIdxA] = useState<number>(0);
  const [activePitcherIdxB, setActivePitcherIdxB] = useState<number>(0);

  // Ball-Strike-Out Count State
  const [balls, setBalls] = useState<number>(0);
  const [strikes, setStrikes] = useState<number>(0);
  const [outs, setOuts] = useState<number>(0);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true); // 自動打者送り

  // UI Modal / Panel toggles
  const [isSettingOpen, setIsSettingOpen] = useState<boolean>(false);
  const [activeSettingTab, setActiveSettingTab] = useState<'lineup' | 'pitchers' | 'rule'>('lineup');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('ai_receiver_lineup_top', JSON.stringify(lineupTop));
  }, [lineupTop]);
  useEffect(() => {
    localStorage.setItem('ai_receiver_lineup_bottom', JSON.stringify(lineupBottom));
  }, [lineupBottom]);
  useEffect(() => {
    localStorage.setItem('ai_receiver_pitchers_a', JSON.stringify(pitchersTeamA));
  }, [pitchersTeamA]);
  useEffect(() => {
    localStorage.setItem('ai_receiver_pitchers_b', JSON.stringify(pitchersTeamB));
  }, [pitchersTeamB]);

  // Current active batter & pitcher depending on top/bottom
  // 表（top）: チームAが攻撃（打者=lineupTop）、チームBが守備（投手=pitchersTeamB）
  // 裏（bottom）: チームBが攻撃（打者=lineupBottom）、チームAが守備（投手=pitchersTeamA）
  const currentBatter = currentHalf === 'top'
    ? lineupTop[currentBatterIdxTop] || { order: currentBatterIdxTop + 1, name: `打者${currentBatterIdxTop + 1}` }
    : lineupBottom[currentBatterIdxBottom] || { order: currentBatterIdxBottom + 1, name: `打者${currentBatterIdxBottom + 1}` };

  const currentPitcher = currentHalf === 'top'
    ? pitchersTeamB[activePitcherIdxB] || { name: '投手B', role: '先発' }
    : pitchersTeamA[activePitcherIdxA] || { name: '投手A', role: '先発' };

  // -------------------------------------------------------------
  // 2. RECEIVER & HISTORY STATE
  // -------------------------------------------------------------
  const [history, setHistory] = useState<AiStatPayload[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [serverStatus, setServerStatus] = useState<'connected' | 'checking' | 'offline'>('connected');
  const [lastNotification, setLastNotification] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Latest pitch data (history[0])
  const latestStat = history[0] || null;

  // Sound feedback
  const playBeep = (freq = 880, type: OscillatorType = 'sine') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (_) {}
  };

  // Helper to normalize result names
  const normalizeResult = (res: string): { label: string; color: string; bg: string; border: string; badge: string; type: 'strike' | 'ball' | 'foul' | 'inplay' | 'other' } => {
    const r = (res || '').toLowerCase();
    if (r.includes('strike') || r.includes('ストライク')) {
      return { label: 'ストライク', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/40', badge: 'bg-amber-500 text-black', type: 'strike' };
    }
    if (r.includes('ball') || r.includes('ボール')) {
      return { label: 'ボール', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', badge: 'bg-emerald-500 text-black', type: 'ball' };
    }
    if (r.includes('foul') || r.includes('ファール')) {
      return { label: 'ファール', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', badge: 'bg-yellow-400 text-black', type: 'foul' };
    }
    if (r.includes('inplay') || r.includes('hit') || r.includes('out') || r.includes('インプレー')) {
      return { label: 'インプレー', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/40', badge: 'bg-rose-500 text-white', type: 'inplay' };
    }
    return { label: res || '不明', color: 'text-zinc-300', bg: 'bg-zinc-800', border: 'border-zinc-700', badge: 'bg-zinc-600 text-white', type: 'other' };
  };

  // Helper for confidence assessment
  const getConfidenceInfo = (conf = 1.0) => {
    const p = Math.round(conf * 100);
    if (p >= 80) {
      return { percent: p, level: 'HIGH', label: '高確信度', color: 'text-emerald-400', border: 'border-emerald-500/60', bg: 'bg-emerald-950/30', icon: CheckCircle2 };
    }
    if (p >= 60) {
      return { percent: p, level: 'MEDIUM', label: '要確認（遮蔽疑い）', color: 'text-yellow-400', border: 'border-yellow-500/80', bg: 'bg-yellow-950/40', icon: AlertTriangle };
    }
    return { percent: p, level: 'LOW', label: '低確信度（誤判定警戒）', color: 'text-rose-400', border: 'border-rose-500/90 animate-pulse', bg: 'bg-rose-950/50', icon: XCircle };
  };

  // -------------------------------------------------------------
  // 3. ADVANCE BATTER & COUNT LOGIC
  // -------------------------------------------------------------
  const nextBatter = () => {
    if (currentHalf === 'top') {
      setCurrentBatterIdxTop(prev => (prev + 1) % 9);
    } else {
      setCurrentBatterIdxBottom(prev => (prev + 1) % 9);
    }
    setBalls(0);
    setStrikes(0);
  };

  const prevBatter = () => {
    if (currentHalf === 'top') {
      setCurrentBatterIdxTop(prev => (prev - 1 + 9) % 9);
    } else {
      setCurrentBatterIdxBottom(prev => (prev - 1 + 9) % 9);
    }
    setBalls(0);
    setStrikes(0);
  };

  const changeInning = () => {
    setBalls(0);
    setStrikes(0);
    setOuts(0);
    if (currentHalf === 'top') {
      setCurrentHalf('bottom');
      setLastNotification(`🔄 ${currentInning}回裏に交代しました（投手: ${pitchersTeamA[activePitcherIdxA]?.name} vs 打者: ${lineupBottom[currentBatterIdxBottom]?.name}）`);
    } else {
      setCurrentHalf('top');
      setCurrentInning(prev => prev + 1);
      setLastNotification(`🔄 ${currentInning + 1}回表に交代しました（投手: ${pitchersTeamB[activePitcherIdxB]?.name} vs 打者: ${lineupTop[currentBatterIdxTop]?.name}）`);
    }
    playBeep(600, 'triangle');
  };

  const resetCount = () => {
    setBalls(0);
    setStrikes(0);
    setLastNotification('カウントを 0-0 にリセットしました');
  };

  // -------------------------------------------------------------
  // 4. INGEST STAT HANDLER (With intelligent baseball rule tracking)
  // -------------------------------------------------------------
  const handleIngestStat = (rawPayload: AiStatPayload) => {
    const nextPitchNum = rawPayload.pitch_number || (history.length + 1);
    const newStat: AiStatPayload = {
      ...rawPayload,
      pitch_number: nextPitchNum,
      receivedAt: rawPayload.receivedAt || new Date().toLocaleTimeString(),
      confidence: rawPayload.confidence !== undefined ? rawPayload.confidence : 0.85
    };

    setHistory(prev => [newStat, ...prev]);
    playBeep(880, 'sine');

    const resMeta = normalizeResult(newStat.result);
    const currentCountStr = `${balls}-${strikes}`;
    
    // Determine active Pitcher and Batter names
    const resolvedPitcher = rawPayload.pitcher || currentPitcher.name;
    const resolvedBatter = rawPayload.batter || `${currentBatter.order}番 ${currentBatter.name}`;

    setLastNotification(`⚡ 投球 #${newStat.pitch_number} [${resolvedPitcher} vs ${resolvedBatter}]: ${resMeta.label} (${Math.round((newStat.confidence || 0.85) * 100)}%)`);

    // Synchronize to Sportscode Event Timeline
    if (onAddEvent) {
      const pitchTime = newStat.video_timestamp ?? currentTime;
      const leadIn = 2;
      const leadOut = 3;
      const labels: Record<string, string> = {
        'AI判定': resMeta.label,
        '結果': resMeta.label,
        '確信度': `${Math.round((newStat.confidence || 0.85) * 100)}%`,
        '球速': newStat.ball_speed ? `${newStat.ball_speed}km/h` : '-',
        '球種': newStat.pitch_type || 'ストレート',
        '投手': resolvedPitcher,
        '打者': resolvedBatter,
        '打順': `${currentBatter.order}番`,
        'カウント': currentCountStr,
        'アウト数': `${outs}アウト`,
        'イニング': `${currentInning}回${currentHalf === 'top' ? '表' : '裏'}`,
      };
      if (newStat.course) labels['コース'] = newStat.course;
      if (newStat.batted_ball) labels['打球方向'] = newStat.batted_ball;
      if (newStat.notes) labels['メモ'] = newStat.notes;

      // 🎯 OpenCommand センターカメラ制球力データの自動付与
      if (newStat.camera_view === 'center' || newStat.target_course || newStat.miss_distance_cm !== undefined) {
        if (newStat.target_course) labels['構え(Target)'] = newStat.target_course;
        if (newStat.actual_course) labels['着弾(Actual)'] = newStat.actual_course;
        if (newStat.miss_distance_cm !== undefined) labels['ズレ(cm)'] = `${newStat.miss_distance_cm}cm`;
        if (newStat.miss_distance_inch !== undefined) labels['ズレ(in)'] = `${newStat.miss_distance_inch}in`;
        if (newStat.is_opposite !== undefined) labels['逆球'] = newStat.is_opposite ? 'YES' : 'NO';
        
        // 自動コマンド評価判定
        const miss = newStat.miss_distance_cm ?? 10;
        const grade = newStat.is_opposite 
          ? 'Opposite (逆球)' 
          : miss <= 6.0 
            ? 'Dot (完璧)' 
            : miss <= 15.0 
              ? 'Good (許容内)' 
              : 'Miss (失投)';
        labels['コマンド判定'] = grade;
      }

      onAddEvent({
        id: `ai_pitch_${Date.now()}_${nextPitchNum}`,
        actionName: `投球 #${nextPitchNum}`,
        timestamp: pitchTime,
        startTime: Math.max(0, pitchTime - leadIn),
        endTime: pitchTime + leadOut,
        playerName: resolvedPitcher,
        labels
      });
    }

    // Auto-advance count and batter if enabled
    if (autoAdvance) {
      if (resMeta.type === 'ball') {
        if (balls + 1 >= 4) {
          // 四球 (Walk) -> 打席完了、次打者へ
          nextBatter();
          setLastNotification(`🚶‍♂️ 四球！ カウントリセット → 次打者（${(currentBatter.order % 9) + 1}番）へ自動進行`);
        } else {
          setBalls(prev => prev + 1);
        }
      } else if (resMeta.type === 'strike') {
        if (strikes + 1 >= 3) {
          // 三振 (Strikeout) -> アウト+1、打席完了、次打者へ
          if (outs + 1 >= 3) {
            changeInning();
          } else {
            setOuts(prev => prev + 1);
            nextBatter();
            setLastNotification(`🎯 三振！ ${outs + 1}アウト → 次打者へ自動進行`);
          }
        } else {
          setStrikes(prev => prev + 1);
        }
      } else if (resMeta.type === 'foul') {
        // ファール: 2ストライクまでは+1、2ストライク時は維持
        setStrikes(prev => (prev < 2 ? prev + 1 : prev));
      } else if (resMeta.type === 'inplay') {
        // インプレー: 打球発生により打席完了 -> 次打者へ
        nextBatter();
        setLastNotification(`💥 インプレー（打席完了） → 次打者へ自動進行`);
      }
    }
  };

  // 1-Tap Manual Override Handler
  const handleOverrideLatest = (newResult: string) => {
    if (history.length === 0) return;

    setHistory(prev => {
      const [latest, ...rest] = prev;
      const updated: AiStatPayload = {
        ...latest,
        originalResult: latest.originalResult || latest.result,
        result: newResult,
        isOverridden: true
      };
      return [updated, ...rest];
    });

    playBeep(1200, 'triangle');
    setLastNotification(`✏️ 投球 #${latestStat?.pitch_number} の判定を「${normalizeResult(newResult).label}」に修正しました`);
  };

  // Add detail tag (Pitch Type / Course) to latest pitch
  const handleAddDetailTag = (key: 'pitch_type' | 'course', val: string) => {
    if (history.length === 0) return;
    setHistory(prev => {
      const [latest, ...rest] = prev;
      const updated: AiStatPayload = {
        ...latest,
        [key]: val,
        isOverridden: true
      };
      return [updated, ...rest];
    });
    playBeep(1000, 'sine');
    setLastNotification(`🏷️ 投球 #${latestStat?.pitch_number} に [${val}] を追加しました`);
  };

  // Cancel latest pitch
  const handleUndoLatest = () => {
    if (history.length === 0) return;
    const removed = history[0];
    setHistory(prev => prev.slice(1));
    setLastNotification(`🗑️ 投球 #${removed.pitch_number} を取り消しました`);
  };

  // -------------------------------------------------------------
  // 5. SSE & IPC EVENT LISTENERS
  // -------------------------------------------------------------
  useEffect(() => {
    const electronAPI = (window as unknown as { electronAPI?: {
      onAiStatReceived?: (cb: (data: AiStatPayload) => void) => void;
      removeAiStatListener?: () => void;
    }}).electronAPI;

    if (electronAPI?.onAiStatReceived) {
      setServerStatus('connected');
      electronAPI.onAiStatReceived((data) => {
        handleIngestStat(data);
      });

      return () => {
        electronAPI.removeAiStatListener?.();
      };
    } else {
      try {
        const eventSource = new EventSource('/api/ai-events-stream');
        eventSource.onopen = () => {
          setServerStatus('connected');
        };
        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data || '{}');
            if (parsed.type === 'AI_STAT' && parsed.data) {
              handleIngestStat(parsed.data);
            }
          } catch (_) {}
        };
        eventSource.onerror = () => {
          setServerStatus('offline');
        };

        return () => {
          eventSource.close();
        };
      } catch (_) {
        setServerStatus('offline');
      }
    }
  }, [balls, strikes, outs, currentBatterIdxTop, currentBatterIdxBottom, activePitcherIdxA, activePitcherIdxB, currentInning, currentHalf, autoAdvance]);

  const pythonSnippet = `import requests

# Web版ローカルサーバー (ポート 5173 または 3001)
API_URL = "http://localhost:5173/api/add-stat"

# 投球ごとにAI判定結果をPOST送信
data = {
    "pitch_number": 1,
    "result": "Strike",        # "Strike", "Ball", "Foul", "InPlay"
    "confidence": 0.88,        # 0.0 ~ 1.0
    "ball_speed": 142,         # km/h (任意)
    "pitch_type": "ストレート",  # 球種 (任意)
    "course": "外角低め",       # コース (任意)
    "video_timestamp": 45.3,   # ★ 動画の何秒地点か (frame_no / fps)
    "pitcher": "山本由伸",     # (任意: 送信元から直接指定も可)
    "batter": "大谷翔平"       # (任意: 送信元から直接指定も可)
}

response = requests.post(API_URL, json=data)
print("送信結果:", response.json())`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pythonSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 w-full max-w-7xl mx-auto p-3 lg:p-6 overflow-auto text-zinc-100 select-none">
      
      {/* 1. TOP STATUS & NAV BAR */}
      <div className="glass-panel p-3.5 sm:p-4.5 rounded-2xl border border-zinc-800/90 flex flex-col md:flex-row gap-3 md:items-center justify-between shrink-0 shadow-xl bg-zinc-950/70">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-emerald-500/20 border border-emerald-500/40 p-2.5 rounded-xl text-emerald-400">
              <Radio className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base lg:text-lg font-black text-white tracking-wide">
                AI投球自動受信 ＆ ラインナップ自動進行
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                serverStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {serverStatus === 'connected' ? 'Port 5173/3001 待機中' : 'オフライン'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              動画解析AIから届く投球データを受信し、打順・カウント・投手を自動追従してタグ付けします。
            </p>
          </div>
        </div>

        {/* Action badges & Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSettingOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/40 text-indigo-300 text-xs font-bold transition-all shadow cursor-pointer active:scale-95"
            title="打順表（1〜9番）や投手ローテーションの事前設定を開きます"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>📋 打順・投手事前登録</span>
          </button>

          {onNavigateToOrganizer && (
            <button
              onClick={onNavigateToOrganizer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold transition-all shadow cursor-pointer active:scale-95"
              title="上部に動画プレビュー、下部に1球ごとのタグ情報が横並びで表示される画面を開きます"
            >
              <Film className="w-3.5 h-3.5" />
              <span>📁 動画＆タグ一覧 (オーガナイザー)</span>
            </button>
          )}

          {onNavigateToMatrix && (
            <button
              onClick={onNavigateToMatrix}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600/20 border border-sky-500/30 hover:bg-sky-600/30 text-sky-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="クロス集計マトリックス画面を開きます"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>🧮 マトリックス集計</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. LIVE MATCH STATUS & BSO COUNT CONTROL BAR */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-zinc-800/90 bg-zinc-900/90 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Left: Inning & Pitcher vs Batter Matchup */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          {/* Inning Badge */}
          <div className="flex items-center gap-1 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
            <button
              onClick={() => setCurrentInning(prev => Math.max(1, prev - 1))}
              className="text-zinc-500 hover:text-zinc-200 px-1 text-xs font-bold"
              title="前の回"
            >
              -
            </button>
            <span className="text-sm font-black text-amber-400 min-w-[50px] text-center font-mono">
              {currentInning}回{currentHalf === 'top' ? '表' : '裏'}
            </span>
            <button
              onClick={() => setCurrentInning(prev => prev + 1)}
              className="text-zinc-500 hover:text-zinc-200 px-1 text-xs font-bold"
              title="次の回"
            >
              +
            </button>
            <button
              onClick={() => setCurrentHalf(prev => prev === 'top' ? 'bottom' : 'top')}
              className="ml-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 cursor-pointer"
              title="表裏切り替え"
            >
              {currentHalf === 'top' ? '表' : '裏'}
            </button>
          </div>

          {/* Pitcher Info & Quick Switcher */}
          <div className="flex items-center gap-2 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800">
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              投
            </span>
            <span className="text-xs font-black text-zinc-100 max-w-[120px] truncate">
              {currentPitcher.name}
            </span>
            <select
              value={currentHalf === 'top' ? activePitcherIdxB : activePitcherIdxA}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                if (currentHalf === 'top') setActivePitcherIdxB(idx);
                else setActivePitcherIdxA(idx);
                setLastNotification(`🧢 投手を交代しました: ${e.target.options[e.target.selectedIndex].text}`);
              }}
              className="bg-zinc-900 border border-zinc-750 text-zinc-300 text-[10px] font-bold rounded px-1.5 py-0.5 outline-none cursor-pointer"
            >
              {(currentHalf === 'top' ? pitchersTeamB : pitchersTeamA).map((p, idx) => (
                <option key={p.id} value={idx}>
                  {p.role}: {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Batter Info & Stepper */}
          <div className="flex items-center gap-1.5 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800">
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
              打
            </span>
            <button
              onClick={prevBatter}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer"
              title="前の打者へ"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black text-sky-300 min-w-[90px] text-center truncate">
              {currentBatter.order}番 {currentBatter.name}
            </span>
            <button
              onClick={nextBatter}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer"
              title="次の打者へ"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: BSO Indicator & Quick Actions */}
        <div className="flex items-center gap-4">
          {/* BSO Board */}
          <div className="flex items-center gap-3 bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-zinc-850 font-mono">
            {/* Balls (B) */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-black text-emerald-400 w-3">B</span>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    onClick={() => setBalls(i + 1 === balls ? i : i + 1)}
                    className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${
                      i < balls ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Strikes (S) */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-black text-amber-400 w-3">S</span>
              <div className="flex gap-1">
                {[0, 1].map(i => (
                  <span
                    key={i}
                    onClick={() => setStrikes(i + 1 === strikes ? i : i + 1)}
                    className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${
                      i < strikes ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Outs (O) */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-black text-rose-400 w-3">O</span>
              <div className="flex gap-1">
                {[0, 1].map(i => (
                  <span
                    key={i}
                    onClick={() => setOuts(i + 1 === outs ? i : i + 1)}
                    className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all ${
                      i < outs ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Quick Control Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={resetCount}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold border border-zinc-700 cursor-pointer"
              title="カウントを0-0にリセット"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={changeInning}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 cursor-pointer active:scale-95"
              title="3アウトチェンジ・イニング交代"
            >
              🔄 チェンジ
            </button>
            <button
              onClick={() => setAutoAdvance(prev => !prev)}
              className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                autoAdvance
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-inner'
                  : 'bg-zinc-850 text-zinc-500 border-zinc-750'
              }`}
              title="四球・三振・インプレー時に自動で打者を次に送る機能"
            >
              打順自動送り: {autoAdvance ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Notification Toast Banner */}
      {lastNotification && (
        <div className="bg-sky-950/50 border border-sky-500/40 px-4 py-2 rounded-xl text-xs text-sky-200 flex items-center justify-between animate-fadeIn">
          <span className="font-bold">{lastNotification}</span>
          <button onClick={() => setLastNotification(null)} className="text-sky-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* 4. HERO: Latest Pitch AI Result & 1-Tap Manual Override Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-zinc-800/90 shadow-2xl bg-zinc-900/90 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-5">
          <Sparkles className="w-48 h-48 text-white" />
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              最新の投球判定（リアルタイム受信）
            </span>
            {latestStat && (
              <button
                onClick={handleUndoLatest}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-400 font-bold transition-colors bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-zinc-700/50 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>この球を取り消す</span>
              </button>
            )}
          </div>

          {/* Large Result Box */}
          {latestStat ? (
            (() => {
              const res = normalizeResult(latestStat.result);
              const conf = getConfidenceInfo(latestStat.confidence);
              const ConfIcon = conf.icon;

              return (
                <div className={`p-4 sm:p-4.5 rounded-2xl border ${conf.border} ${conf.bg} flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-300 shadow-inner`}>
                  {/* Left: Pitch Result Badge */}
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center font-black ${res.badge} shadow-lg shrink-0`}>
                      <span className="text-[9px] uppercase tracking-tighter opacity-80">Pitch</span>
                      <span className="text-lg sm:text-xl">#{latestStat.pitch_number}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl sm:text-3xl font-black tracking-tight ${res.color}`}>
                          {res.label}
                        </span>
                        {latestStat.isOverridden && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            手動修正済み（元: {latestStat.originalResult}）
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-300 mt-1">
                        {latestStat.ball_speed && (
                          <span className="font-extrabold text-amber-300 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5" />
                            {latestStat.ball_speed} km/h
                          </span>
                        )}
                        {latestStat.pitch_type && (
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-[11px]">
                            {latestStat.pitch_type}
                          </span>
                        )}
                        {latestStat.course && (
                          <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-sky-300 border border-zinc-700 font-bold text-[11px]">
                            {latestStat.course}
                          </span>
                        )}
                        <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3" />
                          {latestStat.receivedAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Confidence Score */}
                  <div className="flex items-center gap-3 bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-zinc-800/80">
                    <ConfIcon className={`w-6 h-6 ${conf.color}`} />
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase text-zinc-400">AI 確信度</div>
                      <div className={`text-base sm:text-lg font-black ${conf.color}`}>
                        {conf.percent}% <span className="text-xs font-normal text-zinc-400">({conf.label})</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="p-6 sm:p-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
              <Activity className="w-8 h-8 text-zinc-600 animate-pulse" />
              <p className="text-sm font-bold text-zinc-400">Python解析AIからの投球データを待機中...</p>
              <p className="text-xs text-zinc-500">（右下の「シミュレーター」でテスト投球を送信できます）</p>
            </div>
          )}

          {/* 1-Tap Instant Manual Override Buttons */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800/80">
            <span className="text-xs font-black text-zinc-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              【ワンタップ上書き】誤判定時はボタンを1回押すだけで即座に修正されます：
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleOverrideLatest('Strike')}
                className="py-2.5 sm:py-3 px-3 rounded-xl font-black text-xs sm:text-sm bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500 hover:text-black text-amber-300 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⚾</span>
                <span>ストライクに修正</span>
              </button>

              <button
                onClick={() => handleOverrideLatest('Ball')}
                className="py-2.5 sm:py-3 px-3 rounded-xl font-black text-xs sm:text-sm bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black text-emerald-300 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🟢</span>
                <span>ボールに修正</span>
              </button>

              <button
                onClick={() => handleOverrideLatest('Foul')}
                className="py-2.5 sm:py-3 px-3 rounded-xl font-black text-xs sm:text-sm bg-yellow-500/15 border border-yellow-500/40 hover:bg-yellow-500 hover:text-black text-yellow-300 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🟡</span>
                <span>ファールに修正</span>
              </button>

              <button
                onClick={() => handleOverrideLatest('InPlay')}
                className="py-2.5 sm:py-3 px-3 rounded-xl font-black text-xs sm:text-sm bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500 hover:text-white text-rose-300 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🔴</span>
                <span>インプレーに修正</span>
              </button>
            </div>
          </div>

          {/* Quick Detail Tagging (Pitch Type & Course) */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80 text-xs">
            <span className="text-[11px] font-bold text-zinc-400 mr-1">クイック球種付加:</span>
            {['ストレート', 'スライダー', 'カーブ', 'フォーク', 'チェンジアップ', 'カットボール', 'ツーシーム'].map(pt => (
              <button
                key={pt}
                onClick={() => handleAddDetailTag('pitch_type', pt)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-sky-600 hover:text-white text-zinc-300 border border-zinc-700 font-bold transition-all text-[11px] cursor-pointer"
              >
                {pt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 5. TWO-COLUMN LAYOUT: HISTORY TABLE & SIMULATOR/CODE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left 2 Cols: Real-time Pitch History Table */}
        <div className="lg:col-span-2 glass-panel p-4 rounded-2xl border border-zinc-800/80 flex flex-col gap-3 bg-zinc-950/60">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-zinc-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              投球スタッツ履歴一覧 ({history.length} 球)
            </h3>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-[10px] text-zinc-500 hover:text-rose-400 transition-colors font-bold cursor-pointer"
              >
                履歴をクリア
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-zinc-850 rounded-xl max-h-[360px] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase text-[9.5px] sticky top-0 z-10 border-b border-zinc-800">
                <tr>
                  <th className="p-2.5 text-center w-12">球数</th>
                  <th className="p-2.5">判定</th>
                  <th className="p-2.5 text-center">確信度</th>
                  <th className="p-2.5 text-center">球速</th>
                  <th className="p-2.5">球種</th>
                  <th className="p-2.5 text-center">時間</th>
                  <th className="p-2.5 text-center w-24">修正</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/70">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-zinc-600 text-xs">
                      まだ投球データが記録されていません
                    </td>
                  </tr>
                ) : (
                  history.map((stat, idx) => {
                    const res = normalizeResult(stat.result);
                    const conf = getConfidenceInfo(stat.confidence);

                    return (
                      <tr key={idx} className={`hover:bg-zinc-850/50 transition-colors ${idx === 0 ? 'bg-sky-950/15' : ''}`}>
                        <td className="p-2.5 text-center font-bold text-zinc-400 font-mono">
                          #{stat.pitch_number}
                        </td>
                        <td className="p-2.5">
                          <span className={`font-black ${res.color} flex items-center gap-1.5`}>
                            {res.label}
                            {stat.isOverridden && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-normal">
                                修正済
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`font-bold ${conf.color}`}>
                            {conf.percent}%
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-bold text-amber-300 font-mono">
                          {stat.ball_speed ? `${stat.ball_speed}km/h` : '-'}
                        </td>
                        <td className="p-2.5 text-zinc-300 font-medium">
                          {stat.pitch_type || '-'}
                        </td>
                        <td className="p-2.5 text-center text-[10px] text-zinc-500">
                          {stat.receivedAt}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                const nextResult = stat.result === 'Strike' ? 'Ball' : 'Strike';
                                setHistory(prev => prev.map((item, i) => i === idx ? { ...item, result: nextResult, isOverridden: true } : item));
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer"
                            >
                              変更
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Simulator + Python Code */}
        <div className="flex flex-col gap-4">
          {/* Simulator Box */}
          <div className="glass-panel p-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 flex flex-col gap-2.5">
            <h3 className="text-xs font-black uppercase text-zinc-300 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              動作テスト・シミュレーター
            </h3>
            <p className="text-[11px] text-zinc-400">
              ボタンを押すと、現在の打者・投手・カウントに合わせて自動記録＆打順進行します：
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleIngestStat({
                  result: 'Strike',
                  confidence: 0.88,
                  ball_speed: 142,
                  pitch_type: 'ストレート',
                  course: '外角低め',
                  video_timestamp: currentTime > 0 ? currentTime : 12.5,
                })}
                className="w-full py-2 px-3 rounded-xl bg-zinc-850 hover:bg-amber-500/20 text-amber-300 border border-zinc-700 hover:border-amber-500/40 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
              >
                <span>🎯 ストライク送信 (88% / 142km)</span>
                <span className="text-[10px] text-zinc-500">高確信度</span>
              </button>
              <button
                onClick={() => handleIngestStat({
                  result: 'Ball',
                  confidence: 0.55,
                  ball_speed: 132,
                  pitch_type: 'スライダー',
                  video_timestamp: currentTime > 0 ? currentTime + 18 : 28.2,
                })}
                className="w-full py-2 px-3 rounded-xl bg-zinc-850 hover:bg-yellow-500/20 text-yellow-300 border border-zinc-700 hover:border-yellow-500/40 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
              >
                <span>⚠️ ボール送信 (55% / 132km)</span>
                <span className="text-[10px] text-yellow-500">遮蔽疑い</span>
              </button>
              <button
                onClick={() => handleIngestStat({
                  result: 'InPlay',
                  confidence: 0.94,
                  ball_speed: 139,
                  pitch_type: 'カットボール',
                  batted_ball: 'センター',
                  video_timestamp: currentTime > 0 ? currentTime + 36 : 45.0,
                })}
                className="w-full py-2 px-3 rounded-xl bg-zinc-850 hover:bg-rose-500/20 text-rose-300 border border-zinc-700 hover:border-rose-500/40 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
              >
                <span>🔴 インプレー送信 (94% / 139km)</span>
                <span className="text-[10px] text-zinc-500">高確信度</span>
              </button>
            </div>
          </div>

          {/* Python Code Snippet Box */}
          <div className="glass-panel p-4 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-zinc-400">Python 送信コード</span>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'コピー完了' : 'コードをコピー'}</span>
              </button>
            </div>
            <pre className="bg-zinc-900 p-2.5 rounded-lg text-[9.5px] font-mono text-zinc-300 overflow-x-auto border border-zinc-800 leading-relaxed">
              {pythonSnippet}
            </pre>
          </div>
        </div>
      </div>

      {/* 6. MODAL: LINEUP & PITCHER REGISTRATION SETTINGS */}
      {isSettingOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-750 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    試合前 打順・投手事前登録
                  </h3>
                  <p className="text-xs text-zinc-400">
                    両チームの打順（1〜9番）および登板投手リストを登録・編集します。
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-5 py-2.5 bg-zinc-950/50 border-b border-zinc-800 flex items-center gap-2">
              <button
                onClick={() => setActiveSettingTab('lineup')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSettingTab === 'lineup'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ⚾ 打順表（1〜9番）
              </button>
              <button
                onClick={() => setActiveSettingTab('pitchers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSettingTab === 'pitchers'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🧢 投手ローテーション
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5">
              {activeSettingTab === 'lineup' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Top Lineup */}
                  <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        先攻チーム打順 ({teamAName})
                      </h4>
                      {players.length > 0 && (
                        <button
                          onClick={() => {
                            const newTop = lineupTop.map((b, i) => ({
                              ...b,
                              name: players[i]?.name || b.name
                            }));
                            setLineupTop(newTop);
                          }}
                          className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                        >
                          チーム名簿から自動挿入
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {lineupTop.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800 text-xs">
                          <span className="w-6 text-center font-bold text-zinc-500 font-mono">
                            {idx + 1}番
                          </span>
                          <input
                            type="text"
                            value={b.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLineupTop(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                            }}
                            className="flex-1 bg-zinc-950 border border-zinc-750 px-2 py-1 rounded text-zinc-100 font-bold text-xs outline-none focus:border-amber-500"
                            placeholder={`打者${idx + 1}の名前`}
                          />
                          <select
                            value={b.hand || 'R'}
                            onChange={(e) => {
                              const val = e.target.value as 'R' | 'L' | 'S';
                              setLineupTop(prev => prev.map((item, i) => i === idx ? { ...item, hand: val } : item));
                            }}
                            className="bg-zinc-950 border border-zinc-750 text-zinc-300 text-[10px] px-1 py-1 rounded outline-none"
                          >
                            <option value="R">右打</option>
                            <option value="L">左打</option>
                            <option value="S">両打</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Lineup */}
                  <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-sky-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                        後攻チーム打順 ({teamBName})
                      </h4>
                      {players.length > 9 && (
                        <button
                          onClick={() => {
                            const newBottom = lineupBottom.map((b, i) => ({
                              ...b,
                              name: players[i + 9]?.name || b.name
                            }));
                            setLineupBottom(newBottom);
                          }}
                          className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                        >
                          チーム名簿から自動挿入
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {lineupBottom.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800 text-xs">
                          <span className="w-6 text-center font-bold text-zinc-500 font-mono">
                            {idx + 1}番
                          </span>
                          <input
                            type="text"
                            value={b.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLineupBottom(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                            }}
                            className="flex-1 bg-zinc-950 border border-zinc-750 px-2 py-1 rounded text-zinc-100 font-bold text-xs outline-none focus:border-sky-500"
                            placeholder={`打者${idx + 1}の名前`}
                          />
                          <select
                            value={b.hand || 'R'}
                            onChange={(e) => {
                              const val = e.target.value as 'R' | 'L' | 'S';
                              setLineupBottom(prev => prev.map((item, i) => i === idx ? { ...item, hand: val } : item));
                            }}
                            className="bg-zinc-950 border border-zinc-750 text-zinc-300 text-[10px] px-1 py-1 rounded outline-none"
                          >
                            <option value="R">右打</option>
                            <option value="L">左打</option>
                            <option value="S">両打</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Pitchers Tab */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Team A Pitchers */}
                  <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-amber-400">
                        {teamAName} 投手ローテーション
                      </h4>
                      <button
                        onClick={() => {
                          setPitchersTeamA(prev => [
                            ...prev,
                            { id: `p_a_${Date.now()}`, name: `リリーフA${prev.length}`, role: '中継ぎ', hand: 'R' }
                          ]);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-amber-300 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> 投手追加
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {pitchersTeamA.map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-2 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800 text-xs">
                          <select
                            value={p.role}
                            onChange={(e) => {
                              const val = e.target.value as '先発' | '中継ぎ' | '抑え';
                              setPitchersTeamA(prev => prev.map((item, i) => i === idx ? { ...item, role: val } : item));
                            }}
                            className="bg-zinc-950 border border-zinc-750 text-amber-300 text-[10px] font-bold px-1.5 py-1 rounded outline-none"
                          >
                            <option value="先発">先発</option>
                            <option value="中継ぎ">中継ぎ</option>
                            <option value="抑え">抑え</option>
                          </select>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPitchersTeamA(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                            }}
                            className="flex-1 bg-zinc-950 border border-zinc-750 px-2 py-1 rounded text-zinc-100 font-bold text-xs outline-none focus:border-amber-500"
                            placeholder="投手名"
                          />
                          <select
                            value={p.hand || 'R'}
                            onChange={(e) => {
                              const val = e.target.value as 'R' | 'L';
                              setPitchersTeamA(prev => prev.map((item, i) => i === idx ? { ...item, hand: val } : item));
                            }}
                            className="bg-zinc-950 border border-zinc-750 text-zinc-300 text-[10px] px-1 py-1 rounded outline-none"
                          >
                            <option value="R">右投</option>
                            <option value="L">左投</option>
                          </select>
                          {pitchersTeamA.length > 1 && (
                            <button
                              onClick={() => setPitchersTeamA(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team B Pitchers */}
                  <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-sky-400">
                        {teamBName} 投手ローテーション
                      </h4>
                      <button
                        onClick={() => {
                          setPitchersTeamB(prev => [
                            ...prev,
                            { id: `p_b_${Date.now()}`, name: `リリーフB${prev.length}`, role: '中継ぎ', hand: 'L' }
                          ]);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded text-sky-300 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> 投手追加
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {pitchersTeamB.map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-2 bg-zinc-900/80 p-2 rounded-lg border border-zinc-800 text-xs">
                          <select
                            value={p.role}
                            onChange={(e) => {
                              const val = e.target.value as '先発' | '中継ぎ' | '抑え';
                              setPitchersTeamB(prev => prev.map((item, i) => i === idx ? { ...item, role: val } : item));
                            }}
                            className="bg-zinc-950 border border-zinc-750 text-sky-300 text-[10px] font-bold px-1.5 py-1 rounded outline-none"
                          >
                            <option value="先発">先発</option>
                            <option value="中継ぎ">中継ぎ</option>
                            <option value="抑え">抑え</option>
                          </select>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPitchersTeamB(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                            }}
                            className="flex-1 bg-zinc-950 border border-zinc-750 px-2 py-1 rounded text-zinc-100 font-bold text-xs outline-none focus:border-sky-500"
                            placeholder="投手名"
                          />
                          <select
                            value={p.hand || 'R'}
                            onChange={(e) => {
                              const val = e.target.value as 'R' | 'L';
                              setPitchersTeamB(prev => prev.map((item, i) => i === idx ? { ...item, hand: val } : item));
                            }}
                            className="bg-zinc-950 border border-zinc-750 text-zinc-300 text-[10px] px-1 py-1 rounded outline-none"
                          >
                            <option value="R">右投</option>
                            <option value="L">左投</option>
                          </select>
                          {pitchersTeamB.length > 1 && (
                            <button
                              onClick={() => setPitchersTeamB(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-end">
              <button
                onClick={() => {
                  setIsSettingOpen(false);
                  setLastNotification('✅ 打順表・投手ローテーションの設定を保存しました');
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg cursor-pointer active:scale-95"
              >
                設定を適用して閉じる
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
export default AiLiveStatReceiver;
