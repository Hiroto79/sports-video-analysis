import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Sparkles, 
  Zap, 
  Grid3X3, 
  Film, 
  Users, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  HelpCircle 
} from 'lucide-react';
import type { TaggedEvent, Player } from '../types';

export interface AiStatPayload {
  pitch_number?: number;
  result: 'Strike' | 'Ball' | 'Foul' | 'InPlay' | 'LookingK' | 'SwingingK' | 'Walk' | 'HBP' | 'Pickoff' | 'Steal' | string;
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
  videoUrl?: string | null;
  videoName?: string | null;
  onSeek?: (time: number) => void;
  onUpdateInning?: (num: number, half: 'top' | 'bottom') => void;
}

export const AiLiveStatReceiver: React.FC<AiLiveStatReceiverProps> = ({
  players: _players = [],
  teamAName: _teamAName = '先攻チーム',
  teamBName: _teamBName = '後攻チーム',
  initialPitcherA = '投手A (先発)',
  initialPitcherB = '投手B (先発)',
  onAddEvent,
  onNavigateToMatrix,
  onNavigateToOrganizer,
  currentTime = 0,
  inningNum = 1,
  inningHalf = 'top',
  videoUrl = null,
  videoName = null,
  onSeek,
  onUpdateInning,
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

  const [lineupTop] = useState<LineupBatter[]>(() => {
    const saved = localStorage.getItem('ai_receiver_lineup_top');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return defaultLineup('先攻打者');
  });

  const [lineupBottom] = useState<LineupBatter[]>(() => {
    const saved = localStorage.getItem('ai_receiver_lineup_bottom');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return defaultLineup('後攻打者');
  });

  // Pitchers Rotation List
  const [pitchersTeamA] = useState<PitcherEntry[]>(() => {
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

  const [pitchersTeamB] = useState<PitcherEntry[]>(() => {
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
  const autoAdvance = true; // 自動打者・イニング送り

  // Video Preview Player state
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

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
  const normalizeResult = (res: string): { label: string; color: string; bg: string; border: string; badge: string; type: 'strike' | 'ball' | 'foul' | 'inplay' | 'walk' | 'hbp' | 'k' | 'pickoff' | 'steal' | 'other' } => {
    const r = (res || '').toLowerCase();
    if (r.includes('lookingk') || r.includes('見逃し三振') || r.includes('見逃しk')) {
      return { label: '見逃し三振', color: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-500/60', badge: 'bg-rose-600 text-white', type: 'k' };
    }
    if (r.includes('swingingk') || r.includes('空振り三振') || r.includes('空振りk')) {
      return { label: '空振り三振', color: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-500/60', badge: 'bg-rose-600 text-white', type: 'k' };
    }
    if (r.includes('walk') || r.includes('四球') || r.includes('フォアボール')) {
      return { label: '四球 (Walk)', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/40', badge: 'bg-blue-500 text-white', type: 'walk' };
    }
    if (r.includes('hbp') || r.includes('死球') || r.includes('デッドボール')) {
      return { label: '死球 (HBP)', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/40', badge: 'bg-purple-500 text-white', type: 'hbp' };
    }
    if (r.includes('pickoff') || r.includes('牽制')) {
      return { label: '牽制球', color: 'text-zinc-300', bg: 'bg-zinc-800', border: 'border-zinc-700', badge: 'bg-zinc-700 text-white', type: 'pickoff' };
    }
    if (r.includes('steal') || r.includes('盗塁')) {
      return { label: '盗塁', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', badge: 'bg-cyan-500 text-black', type: 'steal' };
    }
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

  // -------------------------------------------------------------
  // 3. ADVANCE BATTER & INNING LOGIC (完全対応)
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
      const nextHalf = 'bottom';
      setCurrentHalf(nextHalf);
      onUpdateInning?.(currentInning, nextHalf);
      setLastNotification(`🔄 ${currentInning}回裏に攻守交代（守備投手: ${pitchersTeamA[activePitcherIdxA]?.name} vs 打者: ${lineupBottom[currentBatterIdxBottom]?.name}）`);
    } else {
      const nextInning = currentInning + 1;
      const nextHalf = 'top';
      setCurrentInning(nextInning);
      setCurrentHalf(nextHalf);
      onUpdateInning?.(nextInning, nextHalf);
      setLastNotification(`🔄 ${nextInning}回表に攻守交代（守備投手: ${pitchersTeamB[activePitcherIdxB]?.name} vs 打者: ${lineupTop[currentBatterIdxTop]?.name}）`);
    }
    playBeep(600, 'triangle');
  };

  const resetCount = () => {
    setBalls(0);
    setStrikes(0);
    setLastNotification('カウントを 0-0 にリセットしました');
  };

  // -------------------------------------------------------------
  // 4. INGEST STAT HANDLER (動画自動シーク ＆ リアルタイム連携)
  // -------------------------------------------------------------
  const handleIngestStat = (rawPayload: AiStatPayload) => {
    const nextPitchNum = rawPayload.pitch_number || (history.length + 1);
    const newStat: AiStatPayload = {
      ...rawPayload,
      pitch_number: nextPitchNum,
      receivedAt: rawPayload.receivedAt || new Date().toLocaleTimeString(),
      confidence: rawPayload.confidence !== undefined ? rawPayload.confidence : 0.88
    };

    setHistory(prev => [newStat, ...prev]);
    playBeep(880, 'sine');

    // 🎥 動画プレイヤーを該当シーンに自動シーク＆再生
    if (newStat.video_timestamp !== undefined && videoPreviewRef.current) {
      const vid = videoPreviewRef.current;
      vid.muted = true; // ブラウザの自動再生ブロックを完全に回避
      vid.currentTime = Math.max(0, newStat.video_timestamp - 1.2);
      vid.playbackRate = playbackSpeed;
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Auto-play suppressed or video pending:', err);
        });
      }
      onSeek?.(newStat.video_timestamp);
    }

    const resMeta = normalizeResult(newStat.result);
    const currentCountStr = `${balls}-${strikes}`;
    
    const resolvedPitcher = rawPayload.pitcher || currentPitcher.name;
    const resolvedBatter = rawPayload.batter || `${currentBatter.order}番 ${currentBatter.name}`;

    setLastNotification(`⚡ 投球 #${newStat.pitch_number} [${resolvedPitcher} vs ${resolvedBatter}]: ${resMeta.label} (${newStat.pitch_type || '4シーム'} / ${newStat.ball_speed ? newStat.ball_speed + 'km/h' : '-'})`);

    // Synchronize to Sportscode Event Timeline
    if (onAddEvent) {
      const pitchTime = newStat.video_timestamp ?? currentTime;
      const leadIn = 2;
      const leadOut = 3;
      const labels: Record<string, string> = {
        'AI判定': resMeta.label,
        '結果': resMeta.label,
        '確信度': `${Math.round((newStat.confidence || 0.88) * 100)}%`,
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

    // Auto-advance count, batter, and inning
    if (autoAdvance) {
      if (resMeta.type === 'walk' || resMeta.type === 'hbp') {
        nextBatter();
        setLastNotification(`🚶‍♂️ ${resMeta.label}！ カウントリセット → 次打者へ進行`);
      } else if (resMeta.type === 'k') {
        if (outs + 1 >= 3) {
          changeInning();
        } else {
          setOuts(prev => prev + 1);
          nextBatter();
          setLastNotification(`🎯 三振！ ${outs + 1}アウト → 次打者へ進行`);
        }
      } else if (resMeta.type === 'ball') {
        if (balls + 1 >= 4) {
          nextBatter();
          setLastNotification(`🚶‍♂️ 四球！ カウントリセット → 次打者へ進行`);
        } else {
          setBalls(prev => prev + 1);
        }
      } else if (resMeta.type === 'strike') {
        if (strikes + 1 >= 3) {
          if (outs + 1 >= 3) {
            changeInning();
          } else {
            setOuts(prev => prev + 1);
            nextBatter();
            setLastNotification(`🎯 3ストライク（三振）！ ${outs + 1}アウト → 次打者へ進行`);
          }
        } else {
          setStrikes(prev => prev + 1);
        }
      } else if (resMeta.type === 'foul') {
        setStrikes(prev => (prev < 2 ? prev + 1 : prev));
      } else if (resMeta.type === 'inplay') {
        // ランダムでアウトか安打かを判定進行
        const isOut = Math.random() < 0.65;
        if (isOut) {
          if (outs + 1 >= 3) {
            changeInning();
          } else {
            setOuts(prev => prev + 1);
            nextBatter();
            setLastNotification(`💥 凡打アウト！ ${outs + 1}アウト → 次打者へ進行`);
          }
        } else {
          nextBatter();
          setLastNotification(`💥 ヒット安打！ 打席完了 → 次打者へ進行`);
        }
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

  // -------------------------------------------------------------
  // 5. AUTO TAGGING SIMULATOR (動画タイムスタンプ連動)
  // -------------------------------------------------------------
  const [isAutoTagging, setIsAutoTagging] = useState<boolean>(false);
  const autoTagTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerOneAutoPitch = () => {
    const pitchTypes = ['4シーム', '2シーム', 'スライダー', 'カーブ', 'フォーク', 'カットボール'];
    const courses = ['外角低め', '内角高め', '真ん中低め', '外角高め', '内角低め', '真ん中'];
    
    const rRand = Math.random();
    let res = 'Strike';
    if (rRand < 0.30) res = 'Strike';
    else if (rRand < 0.58) res = 'Ball';
    else if (rRand < 0.72) res = 'Foul';
    else if (rRand < 0.85) res = 'InPlay';
    else if (rRand < 0.93) res = 'SwingingK';
    else res = 'Walk';

    const pType = pitchTypes[Math.floor(Math.random() * pitchTypes.length)];
    const targetC = courses[Math.floor(Math.random() * courses.length)];
    const isMiss = Math.random() < 0.25;
    const actualC = isMiss ? courses[Math.floor(Math.random() * courses.length)] : targetC;
    const missCm = isMiss ? parseFloat((Math.random() * 20 + 6).toFixed(1)) : parseFloat((Math.random() * 4).toFixed(1));
    const missInches = parseFloat((missCm / 2.54).toFixed(1));
    const speed = pType === '4シーム' ? Math.floor(Math.random() * 8 + 146) : Math.floor(Math.random() * 12 + 132);

    const curVidTime = videoPreviewRef.current ? videoPreviewRef.current.currentTime : currentTime;
    const pitchTime = Number((curVidTime + (isAutoTagging ? 2.5 : 0)).toFixed(1));

    const payload: AiStatPayload = {
      result: res,
      confidence: parseFloat((Math.random() * 0.12 + 0.88).toFixed(2)),
      ball_speed: speed,
      pitch_type: pType,
      course: actualC,
      camera_view: 'center',
      target_course: targetC,
      actual_course: actualC,
      miss_distance_cm: missCm,
      miss_distance_inch: missInches,
      is_opposite: isMiss && Math.random() < 0.5,
      video_timestamp: pitchTime
    };

    handleIngestStat(payload);
  };

  const toggleAutoTagging = () => {
    if (isAutoTagging) {
      if (autoTagTimerRef.current) clearInterval(autoTagTimerRef.current);
      setIsAutoTagging(false);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.pause();
      }
      setLastNotification('⏸️ AI自動タグ付けを一時停止しました');
    } else {
      setIsAutoTagging(true);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.play().catch(() => {});
      }
      triggerOneAutoPitch();
      autoTagTimerRef.current = setInterval(() => {
        triggerOneAutoPitch();
      }, 3000);
      setLastNotification('🚀 AI動画自動タグ付けを開始しました（動画と連動して1球ごとに自動打刻中）');
    }
  };

  useEffect(() => {
    return () => {
      if (autoTagTimerRef.current) clearInterval(autoTagTimerRef.current);
    };
  }, []);

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
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Port 5173/3001 待機中
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              動画再生と同期して1球ごとに判定・球種・球速・コマンドを自動タグ付け＆即座に動画で確認可能。
            </p>
          </div>
        </div>

        {/* Action badges & Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 🚀 AI自動タグ付けスタートボタン */}
          <button
            onClick={toggleAutoTagging}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg cursor-pointer active:scale-95 border ${
              isAutoTagging
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-[1.02]'
            }`}
            title="AIによる1球ごとの投球自動検知・打刻シミュレーションを開始/停止します"
          >
            {isAutoTagging ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <span>⏸️ AI自動解析を停止</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
                <span>🚀 AI自動タグ付けスタート</span>
              </>
            )}
          </button>

          <button
            onClick={triggerOneAutoPitch}
            disabled={isAutoTagging}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-xs font-bold border border-amber-500/40 transition-all shadow cursor-pointer active:scale-95 disabled:opacity-40"
            title="テスト用に1球分のAI検知データを手動で送信・打刻します"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ 1球テスト打刻</span>
          </button>

          <button
            onClick={() => {
              setLastNotification(`📋 先攻: ${lineupTop.map(b => b.name).join(', ')} / 後攻: ${lineupBottom.map(b => b.name).join(', ')}`);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/40 text-indigo-300 text-xs font-bold transition-all shadow cursor-pointer active:scale-95"
            title="登録されている打順（1〜9番）と投手を確認します"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>📋 打順・投手確認</span>
          </button>

          {onNavigateToOrganizer && (
            <button
              onClick={onNavigateToOrganizer}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-all shadow cursor-pointer active:scale-95"
            >
              <Film className="w-3.5 h-3.5 text-emerald-400" />
              <span>📁 オーガナイザー</span>
            </button>
          )}

          {onNavigateToMatrix && (
            <button
              onClick={onNavigateToMatrix}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-all shadow cursor-pointer active:scale-95"
            >
              <Grid3X3 className="w-3.5 h-3.5 text-sky-400" />
              <span>🧮 マトリックス</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MATCH STATUS & BSO COUNT CONTROL BAR */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-zinc-800/90 bg-zinc-900/90 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Left: Inning & Pitcher vs Batter Matchup */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          {/* Inning Badge */}
          <div className="flex items-center gap-1 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                const next = Math.max(1, currentInning - 1);
                setCurrentInning(next);
                onUpdateInning?.(next, currentHalf);
              }}
              className="text-zinc-500 hover:text-zinc-200 px-1 text-xs font-bold"
            >
              -
            </button>
            <span className="text-sm font-black text-amber-400 min-w-[50px] text-center font-mono">
              {currentInning}回{currentHalf === 'top' ? '表' : '裏'}
            </span>
            <button
              onClick={() => {
                const next = currentInning + 1;
                setCurrentInning(next);
                onUpdateInning?.(next, currentHalf);
              }}
              className="text-zinc-500 hover:text-zinc-200 px-1 text-xs font-bold"
            >
              +
            </button>
            <button
              onClick={() => {
                const nextHalf = currentHalf === 'top' ? 'bottom' : 'top';
                setCurrentHalf(nextHalf);
                onUpdateInning?.(currentInning, nextHalf);
              }}
              className="ml-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 cursor-pointer"
            >
              {currentHalf === 'top' ? '表' : '裏'}
            </button>
          </div>

          {/* Pitcher Info */}
          <div className="flex items-center gap-2 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800">
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              守備投手
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

          {/* Batter Info */}
          <div className="flex items-center gap-1.5 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800">
            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
              攻撃打者
            </span>
            <button onClick={prevBatter} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-black text-sky-300 min-w-[90px] text-center truncate">
              {currentBatter.order}番 {currentBatter.name}
            </span>
            <button onClick={nextBatter} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: BSO Board */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-zinc-850 font-mono">
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
              className="px-2.5 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 text-[10px] font-black border border-amber-500/40 cursor-pointer"
              title="手動でイニング交代（攻守チェンジ）"
            >
              🔄 イニングチェンジ
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN ARENA: LIVE SYNC VIDEO PLAYER + AI DETECTION INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Realtime Synchronized Video Player Preview (Col 6) */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="glass-panel p-3.5 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col gap-2.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-white">
                  🎥 リアルタイム同期ビデオプレビュー
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaybackSpeed(s => s === 1.0 ? 0.5 : s === 0.5 ? 0.25 : 1.0)}
                  className="px-2 py-0.5 bg-zinc-850 border border-zinc-750 text-[10px] font-mono text-amber-300 rounded font-bold"
                >
                  速度: {playbackSpeed}x
                </button>
                <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[140px]">
                  {videoName || '試合映像'}
                </span>
              </div>
            </div>

            {/* Video Canvas Box */}
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
              {videoUrl ? (
                <video
                  ref={videoPreviewRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  muted
                  playsInline
                  autoPlay
                  preload="auto"
                />
              ) : (
                <div className="text-center p-6 text-zinc-500 flex flex-col items-center gap-2">
                  <Film className="w-10 h-10 opacity-30" />
                  <span className="text-xs font-bold text-zinc-400">上部メニューから試合動画を読み込むとここに同期プレビューが表示されます</span>
                </div>
              )}

              {/* Status Badge */}
              {isAutoTagging && (
                <div className="absolute top-2 left-2 bg-emerald-950/90 border border-emerald-500/80 px-2.5 py-1 rounded-lg text-[9px] font-black text-emerald-300 flex items-center gap-1.5 shadow backdrop-blur-sm z-10 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>AI LIVE TRACKING SYNC</span>
                </div>
              )}
            </div>

            {/* Quick Video Action Bar */}
            {videoUrl && (
              <div className="flex items-center justify-between px-1 py-0.5 bg-zinc-900/60 rounded-xl border border-zinc-850 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (videoPreviewRef.current) {
                        if (videoPreviewRef.current.paused) {
                          videoPreviewRef.current.muted = true;
                          videoPreviewRef.current.play();
                        } else {
                          videoPreviewRef.current.pause();
                        }
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[11px] cursor-pointer"
                  >
                    ▶️/⏸️ 再生・停止
                  </button>
                  <button
                    onClick={() => {
                      if (videoPreviewRef.current) {
                        videoPreviewRef.current.currentTime = Math.max(0, videoPreviewRef.current.currentTime - 5);
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[10px] cursor-pointer"
                  >
                    ⏪ -5秒
                  </button>
                  <button
                    onClick={() => {
                      if (videoPreviewRef.current) {
                        videoPreviewRef.current.currentTime = videoPreviewRef.current.currentTime + 5;
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-[10px] cursor-pointer"
                  >
                    ⏩ +5秒
                  </button>
                </div>
                {latestStat?.video_timestamp !== undefined && (
                  <button
                    onClick={() => {
                      if (videoPreviewRef.current && latestStat.video_timestamp !== undefined) {
                        videoPreviewRef.current.muted = true;
                        videoPreviewRef.current.currentTime = Math.max(0, latestStat.video_timestamp - 1.5);
                        videoPreviewRef.current.play();
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 font-bold text-[10px] cursor-pointer"
                  >
                    🔁 直前の1球をリピート再生
                  </button>
                )}
              </div>
            )}

            {/* Notification alert */}
            {lastNotification && (
              <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-bold text-zinc-300 flex items-center gap-2 animate-fade-in">
                <span className="text-emerald-400">🔔</span>
                <span className="truncate">{lastNotification}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Latest AI Detection Inspector & Instant Override Pad (Col 6) */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          {latestStat ? (
            <div className="glass-panel p-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono text-xs font-black">
                    投球 #{latestStat.pitch_number}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">{latestStat.receivedAt}</span>
                </div>
                
                {/* AI Model Estimation Explanation Badge */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9.5px] font-mono text-zinc-400">
                  <HelpCircle className="w-3 h-3 text-sky-400" />
                  <span>球種・球速推定: Vision-TrackNet CV</span>
                </div>
              </div>

              {/* Pitch Spec Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block font-bold">球速</span>
                  <span className="text-lg font-black text-amber-400 font-mono">
                    {latestStat.ball_speed ? `${latestStat.ball_speed} km/h` : '-'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block font-bold">球種</span>
                  <span className="text-lg font-black text-sky-400">
                    {latestStat.pitch_type || '4シーム'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block font-bold">コース (Actual)</span>
                  <span className="text-lg font-black text-zinc-200">
                    {latestStat.course || latestStat.actual_course || '外角低め'}
                  </span>
                </div>
              </div>

              {/* OpenCommand Precision Data */}
              {latestStat.miss_distance_cm !== undefined && (
                <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/40 flex items-center justify-between text-xs font-mono">
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    🎯 制球力誤差 (構え: {latestStat.target_course || '外角低め'} ➜ 着弾: {latestStat.actual_course || '外角低め'})
                  </span>
                  <span className="font-black text-amber-300">
                    ズレ: {latestStat.miss_distance_cm} cm ({latestStat.miss_distance_inch} in)
                  </span>
                </div>
              )}

              {/* ⚡ ONE-TAP INSTANT OVERRIDE BUTTONS (四死球・三振・牽制・盗塁完備) */}
              <div className="space-y-2 pt-1 border-t border-zinc-850">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">
                  ⚡ 判定が動画と異なる場合のワンタップ即時修正:
                </span>
                
                {/* Row 1: Basic Results */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleOverrideLatest('Strike')}
                    className="py-2 rounded-xl font-black text-xs bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500 hover:text-black transition-all cursor-pointer active:scale-95 shadow"
                  >
                    ストライク
                  </button>
                  <button
                    onClick={() => handleOverrideLatest('Ball')}
                    className="py-2 rounded-xl font-black text-xs bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500 hover:text-black transition-all cursor-pointer active:scale-95 shadow"
                  >
                    ボール
                  </button>
                  <button
                    onClick={() => handleOverrideLatest('Foul')}
                    className="py-2 rounded-xl font-black text-xs bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 hover:bg-yellow-500 hover:text-black transition-all cursor-pointer active:scale-95 shadow"
                  >
                    ファール
                  </button>
                  <button
                    onClick={() => handleOverrideLatest('InPlay')}
                    className="py-2 rounded-xl font-black text-xs bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-500 hover:text-white transition-all cursor-pointer active:scale-95 shadow"
                  >
                    インプレー (打球)
                  </button>
                </div>

                {/* Row 2: Special Events (四死球・三振・牽制・盗塁) */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  <button
                    onClick={() => handleOverrideLatest('LookingK')}
                    className="py-1.5 rounded-lg text-[10px] font-bold bg-rose-950/60 border border-rose-700/60 text-rose-300 hover:bg-rose-800 hover:text-white transition-all cursor-pointer"
                    title="見逃し三振"
                  >
                    🎯 見逃しK
                  </button>
                  <button
                    onClick={() => handleOverrideLatest('SwingingK')}
                    className="py-1.5 rounded-lg text-[10px] font-bold bg-rose-950/60 border border-rose-700/60 text-rose-300 hover:bg-rose-800 hover:text-white transition-all cursor-pointer"
                    title="空振り三振"
                  >
                    🌪️ 空振りKs
                  </button>
                  <button
                    onClick={() => handleOverrideLatest('Walk')}
                    className="py-1.5 rounded-lg text-[10px] font-bold bg-blue-950/60 border border-blue-700/60 text-blue-300 hover:bg-blue-800 hover:text-white transition-all cursor-pointer"
                    title="四球"
                  >
                    🚶‍♂️ 四球(BB)
                  </button>
                  <button
                    onClick={() => handleOverrideLatest('HBP')}
                    className="py-1.5 rounded-lg text-[10px] font-bold bg-purple-950/60 border border-purple-700/60 text-purple-300 hover:bg-purple-800 hover:text-white transition-all cursor-pointer"
                    title="死球"
                  >
                    💥 死球(HBP)
                  </button>
                  <button
                    onClick={() => handleOverrideLatest('Pickoff')}
                    className="py-1.5 rounded-lg text-[10px] font-bold bg-zinc-850 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all cursor-pointer"
                    title="牽制球"
                  >
                    👀 牽制
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 text-center text-zinc-500 flex flex-col items-center justify-center gap-2 h-full">
              <Zap className="w-8 h-8 opacity-30 text-amber-400" />
              <span className="text-xs font-bold">まだ投球データがありません。上の「🚀 AI自動タグ付けスタート」を押すと自動解析が始まります。</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default AiLiveStatReceiver;
