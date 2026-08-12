import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Grid3X3, 
  Film, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  Play, 
  Trash2, 
  Sliders,
  Users,
  Plus,
  UserCheck
} from 'lucide-react';
import type { TaggedEvent, Player } from '../types';

export interface AiStatPayload {
  pitch_number?: number;
  result: 'Strike' | 'Ball' | 'Foul' | 'InPlay' | 'LookingK' | 'SwingingK' | 'Walk' | 'HBP' | 'Pickoff' | 'Steal' | string;
  confidence?: number;
  ball_speed?: number;
  pitch_type?: string;
  course?: string;
  batted_ball?: string;
  notes?: string;
  receivedAt?: string;
  isOverridden?: boolean;
  originalResult?: string;
  video_timestamp?: number; // 捕球・インパクト時の動画秒数 (e.g. 136.62)
  start_time?: number;      // 投球始動秒数 (e.g. 132.12)
  end_time?: number;        // 投球完了秒数 (e.g. 139.62)
  pitcher?: string;
  batter?: string;
  camera_view?: 'center' | 'side' | 'broadcast' | string;
  target_course?: string;
  actual_course?: string;
  miss_distance_inch?: number;
  miss_distance_cm?: number;
  is_opposite?: boolean;
  command_score?: number;
}

export interface LineupBatter {
  order: number;
  name: string;
  number?: string;
  hand?: 'R' | 'L' | 'S';
  playerId?: string;
}

export interface PitcherEntry {
  id: string;
  name: string;
  role?: string;
  hand?: 'R' | 'L';
  number?: string;
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
  players = [],
  teamAName = '先攻チーム',
  teamBName = '後攻チーム',
  initialPitcherA = '投手A',
  initialPitcherB = '投手B',
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
  // 1. GAME & LINEUP STATE (選手登録リストと完全同期)
  // -------------------------------------------------------------
  const [currentInning, setCurrentInning] = useState<number>(inningNum);
  const [currentHalf, setCurrentHalf] = useState<'top' | 'bottom'>(inningHalf);

  const generateLineupFromPlayers = (team: 'A' | 'B', prefix: string): LineupBatter[] => {
    const teamPlayers = players.filter(p => {
      if (team === 'A') return p.teamName === teamAName || !p.teamName;
      return p.teamName === teamBName;
    });

    const batters = teamPlayers.filter(p => p.positionType !== 'pitcher');
    
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].map(order => {
      const found = batters.find(p => p.battingOrder === order) || batters[order - 1];
      if (found) {
        return {
          order,
          name: found.name,
          number: found.number,
          hand: found.bats || found.hand || 'R',
          playerId: found.id
        };
      }
      return {
        order,
        name: `${prefix}${order}番`,
        hand: order % 2 === 0 ? 'L' : 'R'
      };
    });
  };

  const generatePitchersFromPlayers = (team: 'A' | 'B', defaultName: string): PitcherEntry[] => {
    const teamPlayers = players.filter(p => {
      if (team === 'A') return p.teamName === teamAName || !p.teamName;
      return p.teamName === teamBName;
    });
    const pitchers = teamPlayers.filter(p => p.positionType === 'pitcher' || p.positionType === 'both');
    
    if (pitchers.length > 0) {
      return pitchers.map((p, idx) => ({
        id: p.id,
        name: p.name,
        role: idx === 0 ? '先発' : `リリーフ${idx}`,
        hand: p.throws || 'R',
        number: p.number
      }));
    }

    return [
      { id: `p_${team.toLowerCase()}1`, name: defaultName, role: '先発', hand: 'R' },
      { id: `p_${team.toLowerCase()}2`, name: `リリーフ${team}1`, role: '中継ぎ', hand: 'L' },
      { id: `p_${team.toLowerCase()}3`, name: `リリーフ${team}2`, role: '中継ぎ', hand: 'R' },
      { id: `p_${team.toLowerCase()}4`, name: `抑え${team}`, role: '抑え', hand: 'R' }
    ];
  };

  const [lineupTop, setLineupTop] = useState<LineupBatter[]>(() => {
    const saved = localStorage.getItem('ai_receiver_lineup_top');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return generateLineupFromPlayers('A', '先攻打者');
  });

  const [lineupBottom, setLineupBottom] = useState<LineupBatter[]>(() => {
    const saved = localStorage.getItem('ai_receiver_lineup_bottom');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return generateLineupFromPlayers('B', '後攻打者');
  });

  const [pitchersTeamA, setPitchersTeamA] = useState<PitcherEntry[]>(() => {
    const saved = localStorage.getItem('ai_receiver_pitchers_a');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return generatePitchersFromPlayers('A', initialPitcherA || '投手A');
  });

  const [pitchersTeamB, setPitchersTeamB] = useState<PitcherEntry[]>(() => {
    const saved = localStorage.getItem('ai_receiver_pitchers_b');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return generatePitchersFromPlayers('B', initialPitcherB || '投手B');
  });

  // 選手登録リスト（players）が更新されたら同期
  useEffect(() => {
    if (players.length > 0) {
      setLineupTop(generateLineupFromPlayers('A', teamAName));
      setLineupBottom(generateLineupFromPlayers('B', teamBName));
      setPitchersTeamA(generatePitchersFromPlayers('A', initialPitcherA));
      setPitchersTeamB(generatePitchersFromPlayers('B', initialPitcherB));
    }
  }, [players, teamAName, teamBName, initialPitcherA, initialPitcherB]);

  const [currentBatterIdxTop, setCurrentBatterIdxTop] = useState<number>(0);
  const [currentBatterIdxBottom, setCurrentBatterIdxBottom] = useState<number>(0);
  const [activePitcherIdxA, setActivePitcherIdxA] = useState<number>(0);
  const [activePitcherIdxB, setActivePitcherIdxB] = useState<number>(0);

  const [balls, setBalls] = useState<number>(0);
  const [strikes, setStrikes] = useState<number>(0);
  const [outs, setOuts] = useState<number>(0);
  const autoAdvance = true;

  // Settings Modal & Precision Tuning
  const [isSettingOpen, setIsSettingOpen] = useState<boolean>(false);

  // 🎯 Precision Lead-in & Lead-out Timing
  const [leadInSec, setLeadInSec] = useState<number>(() => {
    const saved = localStorage.getItem('ai_receiver_lead_in');
    return saved ? parseFloat(saved) : 4.5; // デフォルト投球前 4.5秒 (ワインドアップ始動)
  });
  const [leadOutSec, setLeadOutSec] = useState<number>(() => {
    const saved = localStorage.getItem('ai_receiver_lead_out');
    return saved ? parseFloat(saved) : 3.0; // デフォルト投球後 3.0秒 (判定)
  });

  // Video Preview Player state
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [activeSeekingPitchNum, setActiveSeekingPitchNum] = useState<number | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
  
  const [firstPitchTimestamp, setFirstPitchTimestamp] = useState<number | null>(() => {
    const saved = localStorage.getItem('ai_receiver_first_pitch_time');
    return saved ? parseFloat(saved) : null;
  });

  // Active selected pitch type & course for direct tagging
  const [selectedPitchType, setSelectedPitchType] = useState<string>('4シーム');
  const [selectedCourse, setSelectedCourse] = useState<string>('外角低め');

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
  useEffect(() => {
    localStorage.setItem('ai_receiver_lead_in', leadInSec.toString());
  }, [leadInSec]);
  useEffect(() => {
    localStorage.setItem('ai_receiver_lead_out', leadOutSec.toString());
  }, [leadOutSec]);

  // Video Timeupdate Listener for millisecond precision
  useEffect(() => {
    const vid = videoPreviewRef.current;
    if (!vid) return;
    const handleTimeUpdate = () => {
      setCurrentVideoTime(vid.currentTime);
    };
    vid.addEventListener('timeupdate', handleTimeUpdate);
    return () => vid.removeEventListener('timeupdate', handleTimeUpdate);
  }, [videoUrl]);

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
  const pitchCounterRef = useRef<number>(0);
  const [lastNotification, setLastNotification] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const latestStat = history[0] || null;

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

  const formatSeconds = (sec = 0) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // 3. JUMP TO VIDEO TIMESTAMP (投球始動へ確実にシーク)
  // -------------------------------------------------------------
  const seekAndPlayVideo = (timeSec: number, pitchNum?: number) => {
    if (pitchNum !== undefined) setActiveSeekingPitchNum(pitchNum);
    
    // 投球始動地点（ワインドアップ: timeSec - leadInSec）
    const motionStartTime = Math.max(0, timeSec - leadInSec);
    
    if (videoPreviewRef.current) {
      const vid = videoPreviewRef.current;
      vid.muted = true;
      vid.currentTime = motionStartTime;
      vid.playbackRate = playbackSpeed;
      vid.play().catch(e => console.warn('Play interrupted:', e));
    }
    onSeek?.(motionStartTime);
    setLastNotification(`🎬 投球 #${pitchNum || ''} の始動シーン（${formatSeconds(motionStartTime)}〜）から再生開始`);
  };

  // -------------------------------------------------------------
  // 4. ADVANCE BATTER & INNING LOGIC
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
  // 5. INGEST STAT HANDLER (確実に投球番号をインクリメント＆登録)
  // -------------------------------------------------------------
  const handleIngestStat = (rawPayload: AiStatPayload) => {
    pitchCounterRef.current += 1;
    const nextPitchNum = rawPayload.pitch_number || pitchCounterRef.current;
    
    // 現在の正確な動画秒数を取得
    const curVidTime = videoPreviewRef.current ? videoPreviewRef.current.currentTime : currentTime;
    const pitchTime = rawPayload.video_timestamp !== undefined ? rawPayload.video_timestamp : Number(curVidTime.toFixed(2));
    
    const clipStart = Math.max(0, pitchTime - leadInSec);
    const clipEnd = pitchTime + leadOutSec;

    const newStat: AiStatPayload = {
      ...rawPayload,
      pitch_number: nextPitchNum,
      video_timestamp: pitchTime,
      start_time: clipStart,
      end_time: clipEnd,
      receivedAt: rawPayload.receivedAt || new Date().toLocaleTimeString(),
      confidence: rawPayload.confidence !== undefined ? rawPayload.confidence : 1.0
    };

    setHistory(prev => [newStat, ...prev]);
    playBeep(880, 'sine');

    const resMeta = normalizeResult(newStat.result);
    const currentCountStr = `${balls}-${strikes}`;
    
    const resolvedPitcher = rawPayload.pitcher || currentPitcher.name;
    const resolvedBatter = rawPayload.batter || `${currentBatter.order}番 ${currentBatter.name}`;

    setLastNotification(`⚡ 投球 #${newStat.pitch_number} [${resolvedPitcher} vs ${resolvedBatter}]: ${resMeta.label} (${newStat.pitch_type || selectedPitchType} / ${newStat.ball_speed ? newStat.ball_speed + 'km/h' : '-'}) [${formatSeconds(clipStart)}〜${formatSeconds(clipEnd)}]`);

    // Synchronize to Sportscode Event Timeline
    if (onAddEvent) {
      const labels: Record<string, string> = {
        'AI判定': resMeta.label,
        '結果': resMeta.label,
        '球速': newStat.ball_speed ? `${newStat.ball_speed}km/h` : '-',
        '球種': newStat.pitch_type || selectedPitchType,
        '投手': resolvedPitcher,
        '打者': resolvedBatter,
        '打順': `${currentBatter.order}番`,
        'カウント': currentCountStr,
        'アウト数': `${outs}アウト`,
        'イニング': `${currentInning}回${currentHalf === 'top' ? '表' : '裏'}`,
      };
      if (newStat.course || selectedCourse) labels['コース'] = newStat.course || selectedCourse;
      if (newStat.batted_ball) labels['打球方向'] = newStat.batted_ball;
      if (newStat.notes) labels['メモ'] = newStat.notes;

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
        startTime: clipStart,
        endTime: clipEnd,
        playerName: resolvedPitcher,
        labels
      });
    }

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
        setLastNotification(`💥 ファール！ カウント維持（${balls}-${Math.min(2, strikes + 1)}）`);
      } else if (resMeta.type === 'inplay') {
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

  // -------------------------------------------------------------
  // 6. DIRECT ONE-TAP RESULT TAGGING (投球の瞬間にユーザーが打刻)
  // -------------------------------------------------------------
  const triggerDirectPitchTag = (resultType: string) => {
    const isFastball = selectedPitchType.includes('4シーム') || selectedPitchType.includes('2シーム');
    const speed = isFastball ? Math.floor(Math.random() * 8 + 146) : Math.floor(Math.random() * 12 + 132);

    const curVidTime = videoPreviewRef.current ? videoPreviewRef.current.currentTime : currentTime;
    const pitchTime = Number(curVidTime.toFixed(2));

    const isMiss = Math.random() < 0.25;
    const missCm = isMiss ? parseFloat((Math.random() * 18 + 6).toFixed(1)) : parseFloat((Math.random() * 4).toFixed(1));
    const missInches = parseFloat((missCm / 2.54).toFixed(1));

    const payload: AiStatPayload = {
      result: resultType,
      confidence: 1.0,
      ball_speed: speed,
      pitch_type: selectedPitchType,
      course: selectedCourse,
      camera_view: 'center',
      target_course: selectedCourse,
      actual_course: isMiss ? '真ん中高め' : selectedCourse,
      miss_distance_cm: missCm,
      miss_distance_inch: missInches,
      is_opposite: isMiss && Math.random() < 0.4,
      video_timestamp: pitchTime
    };

    handleIngestStat(payload);
  };

  const handleOverridePitch = (pitchNum: number, newResult: string) => {
    setHistory(prev => prev.map(item => {
      if (item.pitch_number !== pitchNum) return item;
      return {
        ...item,
        originalResult: item.originalResult || item.result,
        result: newResult,
        isOverridden: true
      };
    }));
    playBeep(1200, 'triangle');
    setLastNotification(`✏️ 投球 #${pitchNum} の判定を「${normalizeResult(newResult).label}」に修正しました`);
  };

  // 投手追加ハンドラー
  const handleAddPitcher = (team: 'A' | 'B') => {
    const newName = prompt('追加する投手名を入力してください:', `リリーフ${team === 'A' ? teamAName : teamBName}`);
    if (!newName) return;
    const newP: PitcherEntry = {
      id: `p_${Date.now()}`,
      name: newName.trim(),
      role: '中継ぎ',
      hand: 'R'
    };
    if (team === 'A') {
      setPitchersTeamA(prev => [...prev, newP]);
      setActivePitcherIdxA(pitchersTeamA.length);
    } else {
      setPitchersTeamB(prev => [...prev, newP]);
      setActivePitcherIdxB(pitchersTeamB.length);
    }
    setLastNotification(`🧢 新しい投手「${newName}」を登録し、登板投手に設定しました`);
  };

  // Keyboard shortcuts for live video tagging (B, S, F, H, K, W, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (videoPreviewRef.current) {
          if (videoPreviewRef.current.paused) {
            videoPreviewRef.current.muted = true;
            videoPreviewRef.current.play();
          } else {
            videoPreviewRef.current.pause();
          }
        }
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        triggerDirectPitchTag('Ball');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        triggerDirectPitchTag('Strike');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        triggerDirectPitchTag('Foul');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        triggerDirectPitchTag('InPlay');
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        triggerDirectPitchTag('SwingingK');
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        triggerDirectPitchTag('Walk');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPitchType, selectedCourse, leadInSec, leadOutSec]);

  const activeLineup = currentHalf === 'top' ? lineupTop : lineupBottom;
  const activePitcherList = currentHalf === 'top' ? pitchersTeamB : pitchersTeamA;
  const activePitcherIdx = currentHalf === 'top' ? activePitcherIdxB : activePitcherIdxA;
  const setActivePitcherIdx = currentHalf === 'top' ? setActivePitcherIdxB : setActivePitcherIdxA;
  const activeBatterIdx = currentHalf === 'top' ? currentBatterIdxTop : currentBatterIdxBottom;
  const setActiveBatterIdx = currentHalf === 'top' ? setCurrentBatterIdxTop : setCurrentBatterIdxBottom;

  return (
    <div className="flex-1 flex flex-col gap-3.5 w-full max-w-7xl mx-auto p-2 sm:p-4 overflow-auto text-zinc-100 select-none">
      
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="glass-panel p-3 rounded-2xl border border-zinc-800/90 flex flex-col md:flex-row gap-3 md:items-center justify-between shrink-0 shadow-xl bg-zinc-950/80">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-emerald-500/20 border border-emerald-500/40 p-2.5 rounded-xl text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base lg:text-lg font-black text-white tracking-wide">
                投球ライブロガー ＆ リアルタイム打順同期
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                リードイン: -{leadInSec.toFixed(1)}s (ワインドアップ始動)
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              動画を見ながら投手が投げた瞬間にキー [B/S/F/H/K] またはボタンを押すだけで、打順・投手と完全に同期して1球ずつ打刻します。
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {players.length > 0 && (
            <button
              onClick={() => {
                setLineupTop(generateLineupFromPlayers('A', teamAName));
                setLineupBottom(generateLineupFromPlayers('B', teamBName));
                setPitchersTeamA(generatePitchersFromPlayers('A', initialPitcherA));
                setPitchersTeamB(generatePitchersFromPlayers('B', initialPitcherB));
                setLastNotification('✅ 登録選手リストから打順・投手を再同期しました');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-bold border border-indigo-500/40 transition-all shadow cursor-pointer active:scale-95"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>登録選手から一括同期</span>
            </button>
          )}

          <button
            onClick={() => setIsSettingOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-750 text-zinc-200 text-xs font-bold border border-zinc-700 transition-all shadow cursor-pointer active:scale-95"
            title="リードイン秒数調整を開きます"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>⚙️ タイミング調整</span>
          </button>

          {onNavigateToOrganizer && (
            <button
              onClick={onNavigateToOrganizer}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-bold border border-zinc-700 transition-all shadow cursor-pointer active:scale-95"
            >
              <Film className="w-3.5 h-3.5 text-emerald-400" />
              <span>📁 オーガナイザー</span>
            </button>
          )}

          {onNavigateToMatrix && (
            <button
              onClick={onNavigateToMatrix}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-bold border border-zinc-700 transition-all shadow cursor-pointer active:scale-95"
            >
              <Grid3X3 className="w-3.5 h-3.5 text-sky-400" />
              <span>🧮 マトリックス</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MATCH STATUS & BSO COUNT BAR */}
      <div className="glass-panel p-3 rounded-2xl border border-zinc-800/90 bg-zinc-900/90 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 font-mono">
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
            <span className="text-xs sm:text-sm font-black text-amber-400 min-w-[50px] text-center">
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

          <div className="flex items-center gap-2 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs">
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              守備投手
            </span>
            <span className="font-bold text-zinc-100">{currentPitcher.name}</span>
          </div>

          <div className="flex items-center gap-1 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs">
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
              打者
            </span>
            <button onClick={prevBatter} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-sky-300 min-w-[90px] text-center">
              {currentBatter.order}番 {currentBatter.name}
            </span>
            <button onClick={nextBatter} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* BSO Board & Reset */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-3 bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-zinc-850 font-mono text-xs">
            <div className="flex items-center gap-1">
              <span className="font-black text-emerald-400 w-3">B</span>
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
              <span className="font-black text-amber-400 w-3">S</span>
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
              <span className="font-black text-rose-400 w-3">O</span>
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

          <button
            onClick={resetCount}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[10px] font-bold border border-zinc-700 cursor-pointer"
            title="カウントリセット"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={changeInning}
            className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-xs font-bold border border-amber-500/40 cursor-pointer"
          >
            チェンジ
          </button>
        </div>
      </div>

      {/* 3. PRO UNIFIED WORKSPACE: LINEUP/PITCHER PANEL (Left) + VIDEO PLAYER & TAGGING CONSOLE (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: 打順表 (1〜9番) ＆ 登板投手一覧 (何人でも追加・交代可能) (Col 4) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          
          {/* 打順表 (1〜9番) */}
          <div className="glass-panel p-3 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col gap-2 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-black text-sky-300">
                  {currentHalf === 'top' ? teamAName : teamBName} 打順表 (1〜9番)
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">クリックで打者切替</span>
            </div>

            <div className="flex flex-col gap-1">
              {activeLineup.map((b, idx) => {
                const isActive = activeBatterIdx === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveBatterIdx(idx)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-600/30 border-sky-500/70 text-white shadow-[0_0_10px_rgba(14,165,233,0.3)] font-black'
                        : 'bg-zinc-900/60 border-zinc-850 hover:bg-zinc-850 text-zinc-300 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`w-5 font-mono ${isActive ? 'text-sky-300 font-black' : 'text-zinc-500'}`}>
                        {b.order}番
                      </span>
                      <span className="truncate max-w-[120px]">{b.name}</span>
                      {b.number && <span className="text-[10px] text-zinc-500">#{b.number}</span>}
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                      {b.hand === 'L' ? '左打' : b.hand === 'S' ? '両打' : '右打'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 登板投手一覧 (何人でも追加・即時交代可能) */}
          <div className="glass-panel p-3 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col gap-2 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-amber-300">
                  {currentHalf === 'top' ? teamBName : teamAName} 登板投手陣 ({activePitcherList.length}人)
                </span>
              </div>
              <button
                onClick={() => handleAddPitcher(currentHalf === 'top' ? 'B' : 'A')}
                className="flex items-center gap-1 text-[10px] bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded-lg cursor-pointer"
                title="新しい投手を登録して即時交代"
              >
                <Plus className="w-3 h-3" /> 投手追加
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
              {activePitcherList.map((p, idx) => {
                const isActive = activePitcherIdx === idx;
                return (
                  <div
                    key={p.id}
                    onClick={() => setActivePitcherIdx(idx)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-600/30 border-amber-500/70 text-white shadow-[0_0_10px_rgba(245,158,11,0.3)] font-black'
                        : 'bg-zinc-900/60 border-zinc-850 hover:bg-zinc-850 text-zinc-300 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${isActive ? 'bg-amber-500 text-black font-black' : 'bg-zinc-800 text-zinc-400'}`}>
                        {p.role || `投手${idx + 1}`}
                      </span>
                      <span className="truncate max-w-[120px]">{p.name}</span>
                      {p.number && <span className="text-[10px] text-zinc-500">#{p.number}</span>}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {p.hand === 'L' ? '左投' : '右投'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: 統合メイン動画プレイヤー ＆ 1球ダイレクト打刻コンソール (Col 8) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          
          {/* Main Unified Video Player */}
          <div className="glass-panel p-3 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col gap-2 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black text-white">
                  🎥 試合映像プレイヤー
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 font-bold">
                  ⏱️ 現在再生位置: {formatSeconds(currentVideoTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaybackSpeed(s => s === 1.0 ? 0.5 : s === 0.5 ? 0.25 : 1.0)}
                  className="px-2 py-0.5 bg-zinc-850 border border-zinc-750 text-[10px] font-mono text-amber-300 rounded font-bold cursor-pointer"
                >
                  速度: {playbackSpeed}x
                </button>
                <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[150px]">
                  {videoName || '試合動画'}
                </span>
              </div>
            </div>

            {/* Video Box */}
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
                  <span className="text-xs font-bold text-zinc-400">上部メニューから試合動画を読み込むとここに同期プレイヤーが表示されます</span>
                </div>
              )}

              {/* Active Playing Badge */}
              {activeSeekingPitchNum && (
                <div className="absolute top-2 left-2 bg-amber-950/90 border border-amber-500/80 px-2.5 py-1 rounded-lg text-[10px] font-black text-amber-300 shadow backdrop-blur-sm z-10 animate-pulse pointer-events-none">
                  🎬 投球 #{activeSeekingPitchNum} の始動シーンから再生中
                </div>
              )}
            </div>

            {/* Clean Video Seek Bar */}
            {videoUrl && (
              <div className="flex items-center justify-between gap-2 p-1.5 bg-zinc-900/90 rounded-xl border border-zinc-850 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
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
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs cursor-pointer"
                  >
                    ▶️/⏸️ 再生・停止
                  </button>
                  <button
                    onClick={() => {
                      if (videoPreviewRef.current) {
                        videoPreviewRef.current.currentTime = Math.max(0, videoPreviewRef.current.currentTime - 4);
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs cursor-pointer"
                  >
                    ⏪ -4秒
                  </button>
                  <button
                    onClick={() => {
                      if (videoPreviewRef.current) {
                        videoPreviewRef.current.currentTime = videoPreviewRef.current.currentTime + 4;
                      }
                    }}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs cursor-pointer"
                  >
                    ⏩ +4秒
                  </button>
                  <button
                    onClick={() => {
                      const cur = videoPreviewRef.current ? videoPreviewRef.current.currentTime : currentTime;
                      setFirstPitchTimestamp(cur);
                      localStorage.setItem('ai_receiver_first_pitch_time', cur.toString());
                      setLastNotification(`📍 初球開始地点を「${formatSeconds(cur)}」に設定しました`);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 font-bold text-xs cursor-pointer"
                    title="動画の現在位置を初球開始地点として記憶"
                  >
                    📍 初球地点を登録
                  </button>
                  {firstPitchTimestamp !== null && (
                    <button
                      onClick={() => {
                        seekAndPlayVideo(firstPitchTimestamp);
                        setLastNotification(`⏮️ 設定済みの初球地点（${formatSeconds(firstPitchTimestamp)}）へジャンプしました`);
                      }}
                      className="px-2 py-1 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/40 font-bold text-xs cursor-pointer"
                    >
                      ⏮️ 初球({formatSeconds(firstPitchTimestamp)})へ
                    </button>
                  )}
                </div>

                {latestStat?.video_timestamp !== undefined && (
                  <button
                    onClick={() => seekAndPlayVideo(latestStat.video_timestamp!, latestStat.pitch_number)}
                    className="px-2.5 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 font-bold text-xs cursor-pointer"
                  >
                    🔁 直前の投球(#{latestStat.pitch_number})へ
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ⚡ 1球ダイレクト打刻コンソール */}
          <div className="glass-panel p-3.5 rounded-2xl border border-zinc-800 bg-zinc-950/90 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                ⚡ 1球ダイレクト打刻（投手が投げた瞬間にキー [B/S/K/F/H/W] またはボタンを押下）
              </span>
              <span className="text-[10px] text-zinc-400">
                現在の対戦: {currentPitcher.name} vs {currentBatter.order}番 {currentBatter.name}
              </span>
            </div>

            {/* Quick Pitch Type & Course Selectors */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-400">球種選択</label>
                <select
                  value={selectedPitchType}
                  onChange={(e) => setSelectedPitchType(e.target.value)}
                  className="bg-zinc-900 border border-zinc-750 text-sky-300 font-bold text-xs p-1.5 rounded-lg outline-none cursor-pointer"
                >
                  <option value="4シーム">4シーム (ストレート)</option>
                  <option value="2シーム">2シーム (ツーシーム)</option>
                  <option value="スライダー">スライダー</option>
                  <option value="カットボール">カットボール</option>
                  <option value="カーブ">カーブ</option>
                  <option value="フォーク">フォーク (SFF)</option>
                  <option value="チェンジアップ">チェンジアップ</option>
                  <option value="シンカー">シンカー</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-400">コース選択</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="bg-zinc-900 border border-zinc-750 text-zinc-200 font-bold text-xs p-1.5 rounded-lg outline-none cursor-pointer"
                >
                  <option value="外角低め">外角低め (Out-Low)</option>
                  <option value="内角高め">内角高め (In-High)</option>
                  <option value="真ん中低め">真ん中低め (Mid-Low)</option>
                  <option value="外角高め">外角高め (Out-High)</option>
                  <option value="内角低め">内角低め (In-Low)</option>
                  <option value="真ん中">真ん中 (Mid-Mid)</option>
                </select>
              </div>
            </div>

            {/* 6 Core Direct Pitch Result Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => triggerDirectPitchTag('Ball')}
                className="py-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/60 border border-emerald-500/50 text-emerald-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 shadow transition-all"
              >
                <span className="text-sm font-black">ボール</span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">[B]</span>
              </button>

              <button
                onClick={() => triggerDirectPitchTag('Strike')}
                className="py-3 rounded-xl bg-amber-600/30 hover:bg-amber-600/60 border border-amber-500/50 text-amber-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 shadow transition-all"
              >
                <span className="text-sm font-black">見逃しS</span>
                <span className="text-[10px] font-mono text-amber-400 font-bold">[S]</span>
              </button>

              <button
                onClick={() => triggerDirectPitchTag('SwingingK')}
                className="py-3 rounded-xl bg-rose-600/30 hover:bg-rose-600/60 border border-rose-500/50 text-rose-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 shadow transition-all"
              >
                <span className="text-sm font-black">空振りKs</span>
                <span className="text-[10px] font-mono text-rose-400 font-bold">[K]</span>
              </button>

              <button
                onClick={() => triggerDirectPitchTag('Foul')}
                className="py-3 rounded-xl bg-yellow-600/30 hover:bg-yellow-600/60 border border-yellow-500/60 text-yellow-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(234,179,8,0.25)] transition-all"
              >
                <span className="text-sm font-black">ファール</span>
                <span className="text-[10px] font-mono text-yellow-400 font-bold">[F]</span>
              </button>

              <button
                onClick={() => triggerDirectPitchTag('InPlay')}
                className="py-3 rounded-xl bg-rose-500/30 hover:bg-rose-500/60 border border-rose-400/50 text-rose-100 flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 shadow transition-all"
              >
                <span className="text-sm font-black">インプレー</span>
                <span className="text-[10px] font-mono text-rose-300 font-bold">[H]</span>
              </button>

              <button
                onClick={() => triggerDirectPitchTag('Walk')}
                className="py-3 rounded-xl bg-blue-600/30 hover:bg-blue-600/60 border border-blue-500/50 text-blue-200 flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 shadow transition-all"
              >
                <span className="text-sm font-black">四球(BB)</span>
                <span className="text-[10px] font-mono text-blue-300 font-bold">[W]</span>
              </button>
            </div>

            {/* Special Events (死球・牽制) */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-850">
              <button
                onClick={() => triggerDirectPitchTag('HBP')}
                className="py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-800 text-purple-300 text-xs font-bold border border-purple-700/50 cursor-pointer"
              >
                💥 死球 (HBP)
              </button>
              <button
                onClick={() => triggerDirectPitchTag('Pickoff')}
                className="py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-750 text-zinc-300 text-xs font-bold border border-zinc-700 cursor-pointer"
              >
                👀 牽制球
              </button>
            </div>

            {/* Notification alert */}
            {lastNotification && (
              <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 flex items-center gap-2 animate-fade-in">
                <span className="text-emerald-400">🔔</span>
                <span className="truncate">{lastNotification}</span>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 4. COMPLETE PITCH LOG TABLE (投球始動から捕球までの完全クリップ一覧) */}
      <div className="glass-panel p-4 rounded-2xl border border-zinc-800 bg-zinc-950 flex flex-col gap-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              📜 投球ログ履歴一覧 ({history.length} 球記録済)
            </h3>
            <span className="text-[10px] text-zinc-400">
              ※ 行または「▶️ 再生」をクリックすると、投手が足を上げた始動シーン（-{leadInSec.toFixed(1)}s）から捕球までがスムーズに再生されます
            </span>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('投球ログ履歴をすべてクリアしますか？')) {
                  setHistory([]);
                  pitchCounterRef.current = 0;
                  setLastNotification('投球ログをクリアしました');
                }
              }}
              className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-950/40 border border-rose-800/50 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              ログ全消去
            </button>
          )}
        </div>

        <div className="overflow-x-auto max-h-[350px] overflow-y-auto rounded-xl border border-zinc-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-zinc-900 text-zinc-400 text-[10px] font-black uppercase sticky top-0 z-10 border-b border-zinc-800">
              <tr>
                <th className="py-2 px-3 text-center w-12">#</th>
                <th className="py-2 px-3 text-center w-28">映像ジャンプ</th>
                <th className="py-2 px-3 text-center">対戦 (投手 vs 打者)</th>
                <th className="py-2 px-3 text-center">クリップ範囲</th>
                <th className="py-2 px-3">判定・結果</th>
                <th className="py-2 px-3 text-center">球種</th>
                <th className="py-2 px-3 text-center">球速</th>
                <th className="py-2 px-3 text-center">コース</th>
                <th className="py-2 px-3 text-center">記録時刻</th>
                <th className="py-2 px-3 text-center">修正</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/80 bg-zinc-950/60 font-mono">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-zinc-600 font-sans">
                    まだ投球データが記録されていません。動画を再生しながら右側の打刻ボタン（または B/S/F/H キー）を押してください。
                  </td>
                </tr>
              ) : (
                history.map((item, idx) => {
                  const res = normalizeResult(item.result);
                  const isCurrent = activeSeekingPitchNum === item.pitch_number;
                  const startTime = item.start_time ?? Math.max(0, (item.video_timestamp ?? 0) - leadInSec);
                  const endTime = item.end_time ?? ((item.video_timestamp ?? 0) + leadOutSec);

                  return (
                    <tr
                      key={idx}
                      onClick={() => item.video_timestamp !== undefined && seekAndPlayVideo(item.video_timestamp, item.pitch_number)}
                      className={`hover:bg-zinc-900/90 transition-all cursor-pointer ${
                        isCurrent ? 'bg-amber-950/30 border-l-4 border-amber-400' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-bold text-zinc-400">
                        #{item.pitch_number}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.video_timestamp !== undefined ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              seekAndPlayVideo(item.video_timestamp!, item.pitch_number);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] mx-auto cursor-pointer active:scale-95"
                          >
                            <Play className="w-2.5 h-2.5 fill-emerald-400" />
                            <span>{formatSeconds(item.video_timestamp)}</span>
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-[10px]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans text-zinc-300 text-xs">
                        {item.pitcher || '投手'} vs {item.batter || '打者'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[10px] text-zinc-400">
                        {formatSeconds(startTime)} 〜 {formatSeconds(endTime)}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-black ${res.badge}`}>
                          {res.label}
                        </span>
                        {item.isOverridden && (
                          <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-normal">
                            修正済
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans font-bold text-sky-300">
                        {item.pitch_type || '4シーム'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                        {item.ball_speed ? `${item.ball_speed}km` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans text-zinc-300">
                        {item.course || item.actual_course || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-zinc-500 text-[10px]">
                        {item.receivedAt}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOverridePitch(item.pitch_number!, 'Strike');
                            }}
                            className="px-1.5 py-0.5 rounded bg-amber-950/60 hover:bg-amber-800 text-amber-300 text-[9px] font-bold border border-amber-700/50 cursor-pointer"
                            title="ストライクに変更"
                          >
                            S
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOverridePitch(item.pitch_number!, 'Ball');
                            }}
                            className="px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-800 text-emerald-300 text-[9px] font-bold border border-emerald-700/50 cursor-pointer"
                            title="ボールに変更"
                          >
                            B
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOverridePitch(item.pitch_number!, 'Foul');
                            }}
                            className="px-1.5 py-0.5 rounded bg-yellow-950/60 hover:bg-yellow-800 text-yellow-300 text-[9px] font-bold border border-yellow-700/50 cursor-pointer"
                            title="ファールに変更"
                          >
                            F
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOverridePitch(item.pitch_number!, 'InPlay');
                            }}
                            className="px-1.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-800 text-rose-300 text-[9px] font-bold border border-rose-700/50 cursor-pointer"
                            title="インプレーに変更"
                          >
                            H
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

      {/* 5. TIMING SETTINGS MODAL */}
      {isSettingOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-sm text-white">⚙️ シーク・リードイン時間調整</h3>
              </div>
              <button
                onClick={() => setIsSettingOpen(false)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 bg-zinc-950/80">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-200">
                    投球前リードイン時間（投球モーション始動前の戻し秒数）
                  </label>
                  <span className="text-xs font-mono font-black text-amber-400">
                    {leadInSec.toFixed(1)} 秒前
                  </span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="8.0"
                  step="0.5"
                  value={leadInSec}
                  onChange={(e) => setLeadInSec(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[10px] text-zinc-400">
                  ※ 投球を見てから打刻ボタンを押す場合、4.0〜5.0秒前に設定すると投手が足を上げる瞬間から綺麗に再生されます。
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-850">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-200">
                    投球後リードアウト時間（捕球・打球後の余白秒数）
                  </label>
                  <span className="text-xs font-mono font-black text-sky-400">
                    {leadOutSec.toFixed(1)} 秒後
                  </span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="6.0"
                  step="0.5"
                  value={leadOutSec}
                  onChange={(e) => setLeadOutSec(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950 flex justify-end">
              <button
                onClick={() => {
                  setIsSettingOpen(false);
                  setLastNotification('✅ タイミング設定を保存しました');
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg cursor-pointer active:scale-95"
              >
                保存して閉じる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AiLiveStatReceiver;
