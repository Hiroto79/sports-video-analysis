import React, { useState, useMemo } from 'react';
import type { TaggedEvent, Player } from '../types';
import { BarChart3, Upload, Target, Activity, Flame, TrendingUp, Award, Shield, Calendar, Users } from 'lucide-react';

export const getLabelValueByKeywords = (labels: Record<string, any> | undefined, keywords: string[], defaultVal = ''): string => {
  if (!labels) return defaultVal;
  for (const key of Object.keys(labels)) {
    const lowerKey = key.toLowerCase().trim();
    if (keywords.some(kw => lowerKey === kw)) {
      return (labels[key] || '').toString();
    }
  }
  for (const key of Object.keys(labels)) {
    const lowerKey = key.toLowerCase().trim();
    if (keywords.some(kw => lowerKey.includes(kw))) {
      return (labels[key] || '').toString();
    }
  }
  return defaultVal;
};

export const parsePitchSpeedNumber = (speedStr: string | undefined): number | null => {
  if (!speedStr) return null;
  const match = speedStr.toString().match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    if (num >= 80 && num <= 175) return num; // valid pitch speed range (km/h)
  }
  return null;
};

export const formatPitchSpeed = (speed: number | null | undefined): string => {
  if (speed === null || speed === undefined || isNaN(speed)) return '-';
  return `${speed.toFixed(1)} km/h`;
};

export const isScoringPosition = (runnersStr: string | undefined): boolean => {
  if (!runnersStr) return false;
  const r = runnersStr.toString().toLowerCase();
  return r.includes('2') || r.includes('3') || r.includes('満') || 
         r.includes('loaded') || r.includes('second') || r.includes('third');
};

export const getPitchColor = (type: string | undefined): string => {
  if (!type) return '#a1a1aa';
  const t = type.toString().toLowerCase().trim();
  
  if (t.includes('4シーム') || t.includes('ストレート') || t.includes('直球') || t === 'fa' || t === 'ff' || t.includes('seam') || t.includes('fastball')) {
    return '#D2264F'; // Red (Four Seam)
  }
  if (t.includes('2シーム') || t.includes('２シーム') || t.includes('シンカー') || t === 'si' || t === 'ft' || t.includes('sinker') || t.includes('twoseam')) {
    return '#FE9D02'; // Orange (Sinker / 2-Seam)
  }
  if (t.includes('カット') || t === 'fc' || t.includes('cutter')) {
    return '#933F2F'; // Rust/Brown (Cutter)
  }
  if (t.includes('チェンジ') || t === 'ch' || t.includes('change')) {
    return '#1FB256'; // Bright Green (Changeup)
  }
  if (t.includes('スプリット') || t === 'fs' || t === 'sf' || t.includes('splitter')) {
    return '#3BB0AC'; // Dark Teal (Splitter)
  }
  if (t.includes('フォーク') || t.includes('fork')) {
    return '#55CCAB'; // Light Mint/Green (Forkball)
  }
  if (t.includes('スクリュー') || t.includes('screw')) {
    return '#5CD62D'; // Lime/Yellow-Green (Screwball)
  }
  if (t.includes('ナックルカーブ') || t === 'kc' || t.includes('knuckle curve')) {
    return '#6236CD'; // Purple (Knuckle Curve)
  }
  if (t.includes('スローカーブ') || t === 'sc' || t.includes('slow curve')) {
    return '#005EFF'; // Royal Blue (Slow Curve)
  }
  if (t.includes('カーブ') || t === 'cu' || t === 'cb' || t.includes('curve')) {
    return '#00C5EC'; // Cyan/Light Blue (Curveball)
  }
  if (t.includes('スイーパー') || t.includes('sweeper')) {
    return '#DCAE1D'; // Golden Yellow (Sweeper)
  }
  if (t.includes('スライダー') || t === 'sl' || t.includes('slider')) {
    return '#E2D810'; // Yellow (Slider)
  }
  if (t.includes('スラーブ') || t.includes('slurve')) {
    return '#82A4D3'; // Soft Slate Blue (Slurve)
  }
  if (t.includes('ナックル') || t.includes('knuckle')) {
    return '#3843D0'; // Indigo/Navy (Knuckleball)
  }
  
  return '#a1a1aa'; // Zinc/Gray (Default)
};

const pitchOrderRank = [
  '4シーム', 'ストレート', '直球', 'four-seam', 'four seam',
  '2シーム', '２シーム', 'シンカー', 'sinker', 'two-seam', 'two seam',
  'カットボール', 'カット', 'cutter',
  'チェンジアップ', 'チェンジ', 'changeup',
  'スプリット', 'splitter',
  'フォーク', 'forkball',
  'スクリュー', 'screwball',
  'カーブ', 'curveball',
  'ナックルカーブ', 'knuckle curve',
  'スローカーブ', 'slow curve',
  'スライダー', 'slider',
  'スイーパー', 'sweeper',
  'スラーブ', 'slurve',
  'ナックル', 'knuckleball'
];

export const sortPitchTypes = (types: string[]): string[] => {
  const getRank = (type: string) => {
    const t = type.toLowerCase().trim();
    for (let i = 0; i < pitchOrderRank.length; i++) {
      const pattern = pitchOrderRank[i].toLowerCase();
      if (t.includes(pattern) || pattern.includes(t)) {
        return i;
      }
    }
    return 999;
  };
  return [...types].sort((a, b) => getRank(a) - getRank(b));
};

interface AnalyticsDashboardProps {
  currentEvents: TaggedEvent[];
  players?: Player[];
  teamAName?: string;
  teamBName?: string;
  currentUser?: string;
}

interface SavantAggregatedStats {
  pa: number;
  ab: number;
  hits: number;
  b1: number;
  b2: number;
  b3: number;
  hr: number;
  k: number;
  bb: number;
  hbp: number;
  sf: number;
  rbi: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
  rawOps: number;
  
  // Advanced Batting Sabermetrics
  wOBA: string;
  babip: string;
  isoP: string;
  isoD: string;
  bbRate: string;
  kRate: string;
  bbKRatio: string;
  war: string;

  // Advanced Pitching Sabermetrics
  k9: string;
  bb9: string;
  h9: string;
  hr9: string;
  kbb: string;
  whip: string;
  fip: string;
  pitcherWar: string;
  kMinusBbRate: string;
  // Statcast & Modern Sabermetrics (Savant Standard)
  whiffRate: string;
  cswRate: string;
  hardHitRate: string;

  pitchTypeMap: { [type: string]: { pitches: number; strikes: number; whiffs: number; hits: number } };
  courseStatsMap: { [course: string]: { pitches: number; hits: number; hr: number; whiffs: number; swings: number } };
  hitDirectionMap: { [dir: string]: number };
}

// -------------------------------------------------------------
// CORE HELPER: Baseball Savant & Advanced Sabermetrics Aggregator
// -------------------------------------------------------------
const calculateSavantStats = (events: TaggedEvent[], quickCustomMap: any): SavantAggregatedStats => {
  let pa = 0;
  let ab = 0;
  let hits = 0;
  let b1 = 0, b2 = 0, b3 = 0, hr = 0;
  let k = 0, bb = 0, hbp = 0, sf = 0;
  let rbi = 0;

  const pitchTypeMap: { [type: string]: { pitches: number; strikes: number; whiffs: number; hits: number } } = {};
  const courseStatsMap: { [course: string]: { pitches: number; hits: number; hr: number; whiffs: number; swings: number } } = {};
  const hitDirectionMap: { [dir: string]: number } = { LF: 0, CF: 0, RF: 0, IF: 0 };

  events.forEach(ev => {
    const labels = ev.labels || {};
    let res = getLabelValueByKeywords(labels, ['result', '結果', '判定', '判定/結果', 'play']);
    if (!res) {
      // Fallback: search across all label values to find any standard result keyword
      const labelValues = Object.values(labels).map(v => (v || '').toString());
      const matchKeywords = ['単打', '二塁打', '三塁打', '本塁打', 'ヒット', '安打', '1b', '2b', '3b', 'hr', 'ホームラン', '三振', '四球', '死球', 'エラー', '失策', '犠飛', 'sf', 'ゴロ', 'フライ', 'ライナー', 'アウト', '凡退'];
      const found = labelValues.find(val => {
        const lVal = val.toLowerCase().trim();
        return matchKeywords.some(kw => lVal === kw || lVal.includes(kw));
      });
      if (found) res = found;
    }

    const pType = getLabelValueByKeywords(labels, ['pitch type', 'pitchtype', '球種', '球種名']);
    const course = getLabelValueByKeywords(labels, ['course', 'コース', 'コース位置']);
    const hitDir = getLabelValueByKeywords(labels, ['hit_direction', 'hitdirection', '打球方向', '打球位置']);

    // Pitch type tracking
    if (pType) {
      if (!pitchTypeMap[pType]) {
        pitchTypeMap[pType] = { pitches: 0, strikes: 0, whiffs: 0, hits: 0 };
      }
      pitchTypeMap[pType].pitches++;

      const lowerRes = res.toLowerCase().trim();
      if (lowerRes.includes('ストライク') || lowerRes.includes('空振り') || lowerRes.includes('見逃し') || lowerRes.includes('ファール') || lowerRes.includes('安打') || lowerRes.includes('単打') || lowerRes.includes('2b') || lowerRes.includes('hr')) {
        pitchTypeMap[pType].strikes++;
      }
      if (lowerRes.includes('空振り') || lowerRes.includes('swinging') || lowerRes.includes('swing')) {
        pitchTypeMap[pType].whiffs++;
      }
    }

    // Course tracking (5x5 grid B11 to B55)
    if (course) {
      const cleanCourse = course.split(' ')[0]; // E.g., "B11 (捕手)" -> "B11"
      if (!courseStatsMap[cleanCourse]) {
        courseStatsMap[cleanCourse] = { pitches: 0, hits: 0, hr: 0, whiffs: 0, swings: 0 };
      }
      courseStatsMap[cleanCourse].pitches++;

      const lowerRes = res.toLowerCase().trim();
      if (lowerRes.includes('空振り') || lowerRes.includes('swinging') || lowerRes.includes('swing')) {
        courseStatsMap[cleanCourse].whiffs++;
        courseStatsMap[cleanCourse].swings++;
      }
      if (lowerRes.includes('単打') || lowerRes.includes('安打') || lowerRes.includes('二塁打') || lowerRes.includes('三塁打') || lowerRes.includes('本塁打') || lowerRes === '1b' || lowerRes === '2b' || lowerRes === '3b' || lowerRes === 'hr' || lowerRes.includes('ヒット')) {
        courseStatsMap[cleanCourse].hits++;
        courseStatsMap[cleanCourse].swings++;
        if (pType && pitchTypeMap[pType]) pitchTypeMap[pType].hits++;
      }
      if (lowerRes.includes('本塁打') || lowerRes === 'hr' || lowerRes.includes('ホームラン')) {
        courseStatsMap[cleanCourse].hr++;
      }
    }

    // Hit direction
    if (hitDir) {
      if (['LF', 'CF', 'RF'].includes(hitDir)) {
        hitDirectionMap[hitDir] = (hitDirectionMap[hitDir] || 0) + 1;
      } else {
        hitDirectionMap['IF'] = (hitDirectionMap['IF'] || 0) + 1;
      }
    }

    // Outcome results matching exact quick custom button names and standard tags
    if (res) {
      const lowerRes = res.toLowerCase().trim();

      // Check against user custom quick button names dynamically!
      const isCustom1B = quickCustomMap['h_1b']?.name && res === quickCustomMap['h_1b']?.name;
      const isCustom2B = quickCustomMap['h_2b']?.name && res === quickCustomMap['h_2b']?.name;
      const isCustom3B = quickCustomMap['h_3b']?.name && res === quickCustomMap['h_3b']?.name;
      const isCustomHR = quickCustomMap['h_hr']?.name && res === quickCustomMap['h_hr']?.name;
      const isCustomK = (quickCustomMap['p_k']?.name && res === quickCustomMap['p_k']?.name) || lowerRes.includes('三振') || lowerRes === 'k' || lowerRes === 'so' || lowerRes.includes('strikeout');
      const isCustomBB = (quickCustomMap['p_bb']?.name && res === quickCustomMap['p_bb']?.name) || lowerRes.includes('四球') || lowerRes.includes('敬遠') || lowerRes === 'bb';
      const isCustomHBP = (quickCustomMap['p_hbp']?.name && res === quickCustomMap['p_hbp']?.name) || lowerRes.includes('死球') || lowerRes === 'hbp';

      if (isCustom1B || lowerRes.includes('単打') || lowerRes.includes('安打') || lowerRes === '1b' || lowerRes.includes('シングル') || lowerRes.includes('ヒット')) {
        hits++; b1++; pa++; ab++;
      } else if (isCustom2B || lowerRes.includes('二塁打') || lowerRes === '2b') {
        hits++; b2++; pa++; ab++;
      } else if (isCustom3B || lowerRes.includes('三塁打') || lowerRes === '3b') {
        hits++; b3++; pa++; ab++;
      } else if (isCustomHR || lowerRes.includes('本塁打') || lowerRes === 'hr' || lowerRes.includes('ホームラン')) {
        hits++; hr++; pa++; ab++;
      } else if (isCustomK || lowerRes.includes('三振') || lowerRes.includes('strikeout') || lowerRes === 'k' || lowerRes === 'so') {
        k++; pa++; ab++;
      } else if (isCustomBB || lowerRes === 'bb') {
        bb++; pa++;
      } else if (isCustomHBP || lowerRes === 'hbp') {
        hbp++; pa++;
      } else if (lowerRes.includes('犠飛') || lowerRes === 'sf' || lowerRes.includes('犠勝')) {
        sf++; pa++;
      } else if (lowerRes.includes('ゴロ') || lowerRes.includes('フライ') || lowerRes.includes('ライナー') || lowerRes.includes('アウト') || lowerRes === 'out' || lowerRes.includes('失策') || lowerRes.includes('凡退')) {
        pa++; ab++;
      }
    }

    // RBI calculation
    if (labels.RBI) {
      const rVal = parseInt(labels.RBI.toString());
      if (!isNaN(rVal)) rbi += rVal;
    }
  });

  const safeAB = Math.max(1, ab);
  const safeOBP_Denom = Math.max(1, ab + bb + hbp + sf);
  const safePA = Math.max(1, pa);
  const safeK = Math.max(1, k);
  
  const avgVal = hits / safeAB;
  const obpVal = (hits + bb + hbp) / safeOBP_Denom;
  const slgVal = (b1 + b2 * 2 + b3 * 3 + hr * 4) / safeAB;
  const opsVal = obpVal + slgVal;

  // -------------------------------------------------------------
  // ADVANCED SABERMETRICS CALCULATION
  // -------------------------------------------------------------
  // 1. wOBA (加重出塁率) 簡易式
  const wObaNumerator = (0.69 * bb) + (0.72 * hbp) + (0.88 * b1) + (1.25 * b2) + (1.58 * b3) + (2.05 * hr);
  const wObaVal = wObaNumerator / safeOBP_Denom;

  // 2. BABIP (インプレイ打率)
  const babipDenom = ab - k - hr + sf;
  const babipVal = babipDenom > 0 ? (hits - hr) / babipDenom : 0;

  // 3. IsoP (純粋長打力)
  const isoPVal = Math.max(0, slgVal - avgVal);

  // 4. IsoD (選球眼)
  const isoDVal = Math.max(0, obpVal - avgVal);

  // 5. Rates
  const bbRateVal = (bb / safePA) * 100;
  const kRateVal = (k / safePA) * 100;
  const bbKRatioVal = bb / safeK;

  // 6. 簡易打者 WAR (代替選手比での勝利貢献)
  // wOBA貢献分 + 走塁貢献(盗塁) + 守備減点(失策ペナルティ) + 代替選手に対するアドバンテージ
  let stealSuccess = 0;
  let stealFail = 0;
  let defenseErrors = 0;
  events.forEach(ev => {
    const play = getLabelValueByKeywords(ev.labels, ['play', 'プレー', '結果', '判定']);
    const res = getLabelValueByKeywords(ev.labels, ['result', '結果', '判定', '判定/結果']);
    if (play.includes('盗塁成功')) stealSuccess++;
    if (play.includes('盗塁失敗')) stealFail++;
    if (res.includes('失策') || res.includes('エラー')) defenseErrors++;
  });
  const battingValue = (wObaVal - 0.315) * safePA * 1.15; // リーグ平均wOBAを.315と仮定
  const runningValue = (stealSuccess * 0.2) - (stealFail * 0.45);
  const fieldingValue = -0.5 * defenseErrors;
  const replacementLevel = safePA * 0.035; 
  const warVal = (battingValue + runningValue + fieldingValue + replacementLevel) / 9.5;

  // -------------------------------------------------------------
  // PITCHING METRICS (9イニング＝アウト27個ベース)
  // -------------------------------------------------------------
  let totalOuts = 0;
  events.forEach(ev => {
    const resVal = getLabelValueByKeywords(ev.labels, ['result', '結果', '判定', '判定/結果', 'play']).toLowerCase();
    if (resVal.includes('三振') || resVal.includes('ゴロ') || resVal.includes('フライ') || resVal.includes('ライナー') || resVal.includes('アウト') || resVal.includes('凡退')) {
      totalOuts++;
    }
    if (resVal.includes('併殺') || resVal.includes('ダブルプレー')) {
      totalOuts += 2;
    }
  });

  const ip = totalOuts > 0 ? totalOuts / 3 : 0;

  const k9Val = ip > 0 ? (k * 9) / ip : 0;
  const bb9Val = ip > 0 ? (bb * 9) / ip : 0;
  const h9Val = ip > 0 ? (hits * 9) / ip : 0;
  const hr9Val = ip > 0 ? (hr * 9) / ip : 0;
  const whipVal = ip > 0 ? (bb + hits) / ip : 0;

  // MLB公式 FIP (守備影響を排した真の投手防御率指標)
  const fipVal = ip > 0 ? (((13 * hr) + (3 * (bb + hbp)) - (2 * k)) / ip) + 3.15 : 0;
  
  // 投手 WAR (イニング貢献 + FIP補正)
  const pitcherWarVal = ip > 0 ? (ip * (4.40 - fipVal) / 9) + (k * 0.05) : 0;

  const formatRate = (val: number) => {
    if (isNaN(val) || val < 0) return '.000';
    return val.toFixed(3).replace(/^0/, '');
  };

  // Statcast & Modern Sabermetrics (Whiff%, CSW%, HardHit%)
  let totalPitchesCount = events.length;
  let totalWhiffs = 0;
  let totalSwings = 0;
  let totalCalledStrikesAndWhiffs = 0;
  let totalBattedBalls = 0;
  let totalHardHits = 0;

  events.forEach(ev => {
    const labels = ev.labels || {};
    const resStr = (getLabelValueByKeywords(labels, ['result', '結果', '判定', '判定/結果', 'play']) || '').toLowerCase();
    
    if (resStr.includes('空振り') || resStr.includes('ファール') || resStr.includes('単打') || resStr.includes('二塁打') || resStr.includes('三塁打') || resStr.includes('本塁打') || resStr.includes('ゴロ') || resStr.includes('フライ') || resStr.includes('ライナー')) {
      totalSwings++;
    }
    if (resStr.includes('空振り')) {
      totalWhiffs++;
    }
    if (resStr.includes('空振り') || resStr.includes('見逃し') || resStr.includes('見逃しストライク')) {
      totalCalledStrikesAndWhiffs++;
    }
    if (resStr.includes('二塁打') || resStr.includes('三塁打') || resStr.includes('本塁打') || resStr.includes('ライナー') || resStr.includes('2b') || resStr.includes('3b') || resStr.includes('hr')) {
      totalHardHits++;
      totalBattedBalls++;
    } else if (resStr.includes('単打') || resStr.includes('ゴロ') || resStr.includes('フライ') || resStr.includes('1b')) {
      totalBattedBalls++;
    }
  });

  const whiffRateVal = totalSwings > 0 ? (totalWhiffs / totalSwings) * 100 : 0;
  const cswRateVal = totalPitchesCount > 0 ? (totalCalledStrikesAndWhiffs / totalPitchesCount) * 100 : 0;
  const hardHitRateVal = totalBattedBalls > 0 ? (totalHardHits / totalBattedBalls) * 100 : 0;

  return {
    pa, ab, hits, b1, b2, b3, hr, k, bb, hbp, sf, rbi,
    avg: formatRate(avgVal),
    obp: formatRate(obpVal),
    slg: formatRate(slgVal),
    ops: isNaN(opsVal) ? '.000' : opsVal.toFixed(3),
    rawOps: opsVal,
    
    // Advanced batting sabermetrics mapping
    wOBA: formatRate(wObaVal),
    babip: formatRate(babipVal),
    isoP: formatRate(isoPVal),
    isoD: formatRate(isoDVal),
    bbRate: bbRateVal.toFixed(1) + '%',
    kRate: kRateVal.toFixed(1) + '%',
    bbKRatio: bbKRatioVal.toFixed(2),
    war: warVal.toFixed(2),

    // Advanced pitching sabermetrics mapping
    k9: k9Val.toFixed(2),
    bb9: bb9Val.toFixed(2),
    h9: h9Val.toFixed(2),
    hr9: hr9Val.toFixed(2),
    kbb: bb > 0 ? (k / bb).toFixed(2) : k.toFixed(2),
    whip: ip > 0 ? whipVal.toFixed(2) : '0.00',
    fip: ip > 0 ? fipVal.toFixed(2) : '0.00',
    pitcherWar: pitcherWarVal.toFixed(2),
    kMinusBbRate: (kRateVal - bbRateVal).toFixed(1) + '%',

    // Statcast Modern Sabermetrics
    whiffRate: whiffRateVal.toFixed(1) + '%',
    cswRate: cswRateVal.toFixed(1) + '%',
    hardHitRate: hardHitRateVal.toFixed(1) + '%',

    pitchTypeMap,
    courseStatsMap,
    hitDirectionMap
  };
};

// -------------------------------------------------------------
// SUB-COMPONENTS
// -------------------------------------------------------------
const StrikeZoneHeatmap: React.FC<{ courseStatsMap: { [course: string]: { pitches: number; hits: number; hr: number; whiffs: number } } }> = ({ courseStatsMap }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative aspect-square w-full max-w-[280px] p-3 bg-[#0b0f19] rounded-2xl border border-zinc-800 shadow-inner select-none animate-fade-in">
        {/* Outer 5x5 Grid Container */}
        <div className="grid grid-cols-5 gap-1.5 w-full h-full">
          {Array.from({ length: 25 }).map((_, idx) => {
            const row = Math.floor(idx / 5) + 1;
            const col = (idx % 5) + 1;
            const courseId = `B${row}${col}`;
            const isStrikeZone = row >= 2 && row <= 4 && col >= 2 && col <= 4;
            const data = courseStatsMap[courseId] || { pitches: 0, hits: 0, hr: 0, whiffs: 0 };
            const intensity = Math.min(1, data.pitches / 8);

            return (
              <div
                key={courseId}
                className={`rounded-lg flex flex-col items-center justify-center text-[9px] font-black font-mono transition-all border shadow ${
                  isStrikeZone ? 'border-amber-400/50 bg-amber-950/20' : 'border-zinc-800/80'
                }`}
                style={{
                  backgroundColor: data.pitches > 0 
                    ? `rgba(225, 29, 72, ${0.22 + intensity * 0.72})` 
                    : isStrikeZone ? 'rgba(251, 191, 36, 0.05)' : 'transparent',
                  color: data.pitches > 0 ? '#ffffff' : isStrikeZone ? '#fbbf24' : '#4b5563'
                }}
                title={`${courseId} (${isStrikeZone ? 'ストライクゾーン' : 'ボールゾーン'}): ${data.pitches}球 / 安打:${data.hits} / HR:${data.hr}`}
              >
                <span className={`text-[7.5px] ${isStrikeZone ? 'text-amber-300 font-bold' : 'text-zinc-500'}`}>{courseId}</span>
                <span className="font-extrabold">{data.pitches > 0 ? data.pitches : '-'}</span>
              </div>
            );
          })}
        </div>

        {/* PROMINENT STRIKE ZONE OUTLINE (Encapsulates central 9 cells: B22 to B44) */}
        <div 
          className="absolute border-2 border-amber-400/80 rounded-xl pointer-events-none shadow-[0_0_12px_rgba(251,191,36,0.25)]"
          style={{
            top: 'calc(20% + 6px)',
            left: 'calc(20% + 6px)',
            width: 'calc(60% - 12px)',
            height: 'calc(60% - 12px)',
          }}
        />
      </div>

      <div className="text-[10px] text-zinc-400 font-bold tracking-wider bg-zinc-950/60 px-3 py-1 rounded-full border border-zinc-800/60 shadow-sm flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-[0_0_6px_#fbbf24]"></span>
        <span>👁️ 捕手・打者目線 (黄色の枠線内 = ストライクゾーン)</span>
      </div>
    </div>
  );
};

const PitchMixTable: React.FC<{ pitchTypeMap: { [type: string]: { pitches: number; strikes: number; whiffs: number; hits: number } } }> = ({ pitchTypeMap }) => {
  const totalPitches = Object.values(pitchTypeMap).reduce((sum, curr) => sum + curr.pitches, 0);

  return (
    <div className="overflow-x-auto max-h-[300px]">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-zinc-800 text-[10px] font-black uppercase text-zinc-400 bg-zinc-950">
            <th className="p-2">球種 (Type)</th>
            <th className="p-2 font-mono">投球数 (%)</th>
            <th className="p-2 font-mono">ストライク率</th>
            <th className="p-2 font-mono">Whiff率</th>
            <th className="p-2 font-mono">被安打</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-850 font-mono text-zinc-300">
          {Object.keys(pitchTypeMap).length === 0 ? (
            <tr>
              <td colSpan={5} className="p-4 text-center text-zinc-500 font-sans">球種データがまだ登録されていません。</td>
            </tr>
          ) : (
            sortPitchTypes(Object.keys(pitchTypeMap))
              .map(type => {
                const st = pitchTypeMap[type];
                const percent = totalPitches > 0 ? ((st.pitches / totalPitches) * 100).toFixed(1) : '0.0';
                const strikeRate = st.pitches > 0 ? ((st.strikes / st.pitches) * 100).toFixed(1) : '0.0';
                const whiffRate = st.pitches > 0 ? ((st.whiffs / st.pitches) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={type} className="hover:bg-zinc-900/80">
                    <td className="p-2 font-bold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full block border border-zinc-900/60" style={{ backgroundColor: getPitchColor(type) }} />
                      <span style={{ color: getPitchColor(type) }}>{type}</span>
                    </td>
                    <td className="p-2 text-white font-bold">{st.pitches} <span className="text-[10px] text-zinc-500 font-normal">({percent}%)</span></td>
                    <td className="p-2 text-teal-400">{strikeRate}%</td>
                    <td className="p-2 text-sky-400">{whiffRate}%</td>
                    <td className="p-2 text-emerald-400">{st.hits}</td>
                  </tr>
                );
              })
          )}
        </tbody>
      </table>
    </div>
  );
};

const InningVelocityChart: React.FC<{ trend: { inning: number; count: number; avg: number; max: number; min: number }[] }> = ({ trend }) => {
  // Determine max inning: minimum 9 innings, but expand dynamically if extra innings exist (e.g. 10th, 11th inning)
  const maxInningInTrend = trend.length > 0 ? Math.max(...trend.map(t => t.inning)) : 9;
  const maxInning = Math.max(9, maxInningInTrend);

  // Build full innings list [1, 2, 3, 4, 5, 6, 7, 8, 9, ...]
  const fullInnings = Array.from({ length: maxInning }, (_, i) => i + 1);

  // Map trend data into a lookup dictionary
  const trendMap = new Map<number, { count: number; avg: number; max: number; min: number }>();
  trend.forEach(t => trendMap.set(t.inning, t));

  // Extract all valid speed values to compute Y-axis range
  const validSpeeds = trend.flatMap(t => [t.avg, t.max]);
  const minSpeed = validSpeeds.length > 0 ? Math.floor(Math.min(...validSpeeds) - 2) : 130;
  const maxSpeed = validSpeeds.length > 0 ? Math.ceil(Math.max(...validSpeeds) + 2) : 160;
  const speedRange = Math.max(1, maxSpeed - minSpeed);

  const svgWidth = 400;
  const svgHeight = 130;
  const paddingX = 32;
  const paddingTop = 20;
  const paddingBottom = 22;

  const getX = (inn: number) => {
    return paddingX + ((inn - 1) / (maxInning - 1)) * (svgWidth - paddingX * 2);
  };

  const getY = (speed: number) => {
    return svgHeight - paddingBottom - ((speed - minSpeed) / speedRange) * (svgHeight - paddingTop - paddingBottom);
  };

  // Points with data only
  const pointsWithData = fullInnings
    .filter(inn => trendMap.has(inn))
    .map(inn => {
      const data = trendMap.get(inn)!;
      return { inn, x: getX(inn), yAvg: getY(data.avg), yMax: getY(data.max), ...data };
    });

  const avgPointsStr = pointsWithData.map(p => `${p.x},${p.yAvg}`).join(' ');
  const maxPointsStr = pointsWithData.map(p => `${p.x},${p.yMax}`).join(' ');

  return (
    <div className="w-full flex flex-col items-center select-none pt-1">
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-[140px] overflow-visible">
        {/* Horizontal Guide Lines */}
        {[0, 0.5, 1].map(ratio => {
          const val = minSpeed + ratio * speedRange;
          const y = getY(val);
          return (
            <g key={ratio}>
              <line x1={paddingX - 5} y1={y} x2={svgWidth - paddingX + 5} y2={y} stroke="#27272a" strokeDasharray="3,3" strokeWidth="1" />
              <text x={paddingX - 8} y={y + 3} textAnchor="end" fill="#71717a" fontSize="7.5" fontFamily="monospace">
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Connecting Lines */}
        {pointsWithData.length > 1 && (
          <>
            <polyline fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={maxPointsStr} />
            <polyline fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={avgPointsStr} />
          </>
        )}

        {/* X Axis Inning Labels for ALL 1 to 9 (or extra) innings */}
        {fullInnings.map(inn => {
          const x = getX(inn);
          const hasData = trendMap.has(inn);
          return (
            <g key={inn}>
              <line x1={x} y1={svgHeight - paddingBottom} x2={x} y2={svgHeight - paddingBottom + 3} stroke={hasData ? '#a1a1aa' : '#3f3f46'} strokeWidth="1" />
              <text x={x} y={svgHeight - 4} textAnchor="middle" fill={hasData ? '#f4f4f5' : '#52525b'} fontSize="8.5" fontWeight={hasData ? 'bold' : 'normal'}>
                {inn}回
              </text>
            </g>
          );
        })}

        {/* Data Points */}
        {pointsWithData.map(p => (
          <g key={p.inn}>
            {/* Max Dot & Text */}
            <circle cx={p.x} cy={p.yMax} r="3.5" fill="#fbbf24" stroke="#09090b" strokeWidth="1.5" />
            <text x={p.x} y={p.yMax - 5} textAnchor="middle" fill="#fef08a" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
              {p.max.toFixed(1)}
            </text>

            {/* Avg Dot & Text */}
            <circle cx={p.x} cy={p.yAvg} r="3.5" fill="#38bdf8" stroke="#09090b" strokeWidth="1.5" />
            <text x={p.x} y={p.yAvg + 10} textAnchor="middle" fill="#7dd3fc" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
              {p.avg.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex items-center gap-4 text-[10px] font-bold mt-1">
        <span className="flex items-center gap-1.5 text-amber-400">
          <span className="w-2.5 h-0.5 bg-amber-400 inline-block rounded-full"></span> 最速 (Max)
        </span>
        <span className="flex items-center gap-1.5 text-sky-400">
          <span className="w-2.5 h-0.5 bg-sky-400 inline-block rounded-full"></span> 平均 (Avg)
        </span>
      </div>
    </div>
  );
};

// NEW Stadium Spray Chart with dynamic lines, individual hit plotting, and percentage labels
const StadiumSprayChart: React.FC<{ 
  hitDirectionMap: { [dir: string]: number }; 
  events?: TaggedEvent[];
  mode?: 'team' | 'batter';
}> = ({ hitDirectionMap, events = [], mode = 'team' }) => {
  const total = Object.values(hitDirectionMap).reduce((sum, curr) => sum + curr, 0);
  const lfCount = hitDirectionMap.LF || 0;
  const cfCount = hitDirectionMap.CF || 0;
  const rfCount = hitDirectionMap.RF || 0;
  const ifCount = hitDirectionMap.IF || 0;

  const lfPct = total > 0 ? (lfCount / total) : 0;
  const cfPct = total > 0 ? (cfCount / total) : 0;
  const rfPct = total > 0 ? (rfCount / total) : 0;
  const ifPct = total > 0 ? (ifCount / total) : 0;

  // Track hovered dot details for dynamic tooltip render
  const [hoveredDot, setHoveredDot] = React.useState<{
    x: number;
    y: number;
    label: string;
    color: string;
    batter: string;
    pitcher: string;
    pitchType: string;
    situation: string;
  } | null>(null);

  // Extract and scale individual plotted hits using exact affine transformation mapping tagger -> dashboard:
  // x_dash = x * 1.31 + 4.5
  // y_dash = y * 1.31 - 5.0
  const plottedDots = React.useMemo(() => {
    return events.map(e => {
      const plot = getLabelValueByKeywords(e.labels, ['hit_plot', '打球位置']);
      if (!plot || plot === '-') return null;

      const parts = plot.split(',');
      if (parts.length !== 2) return null;

      const rawX = parseFloat(parts[0]);
      const rawY = parseFloat(parts[1]);
      if (isNaN(rawX) || isNaN(rawY)) return null;

      const x = rawX * 1.31 + 4.5;
      const y = rawY * 1.31 - 5.0;

      const res = getLabelValueByKeywords(e.labels, ['result', '結果', '判定', '判定/結果', 'play']).toLowerCase();
      let color = '#ef4444'; // Red for Outs/Others
      let label = 'アウト/凡退';

      if (res.includes('本塁打') || res === 'hr' || res.includes('ホームラン')) {
        color = '#fbbf24'; // Gold/Yellow for HR
        label = '本塁打';
      } else if (res.includes('単打') || res.includes('安打') || res.includes('ヒット') || res === '1b' ||
                 res.includes('二塁打') || res === '2b' || res.includes('三塁打') || res === '3b') {
        color = '#10b981'; // Green for Hits
        label = '安打';
      }

      const batter = getLabelValueByKeywords(e.labels, ['batter', '打者']) || e.playerName || '選手';
      const pitcher = getLabelValueByKeywords(e.labels, ['pitcher', '投手']) || '-';
      const pitchType = getLabelValueByKeywords(e.labels, ['pitch type', '球種']) || '-';
      const count = getLabelValueByKeywords(e.labels, ['count', 'カウント']) || '';
      const runners = getLabelValueByKeywords(e.labels, ['runners', 'ランナー', '走者']) || '';

      let situation = '';
      if (count && count !== '-') situation += `カウント: ${count}`;
      if (runners && runners !== '-' && runners !== 'なし' && runners !== 'None') {
        situation += situation ? ` (${runners})` : `走者: ${runners}`;
      }

      return { x, y, color, label, batter, pitcher, pitchType, situation };
    }).filter(Boolean) as Array<{
      x: number;
      y: number;
      color: string;
      label: string;
      batter: string;
      pitcher: string;
      pitchType: string;
      situation: string;
    }>;
  }, [events]);

  return (
    <div className="flex flex-col items-center gap-6 bg-zinc-950/80 p-6 rounded-2xl border border-zinc-800/80 w-full animate-fade-in shadow-2xl relative">
      <div className="w-full max-w-[340px] aspect-[4/3] relative select-none">
        <svg viewBox="12 25 116 87" className="w-full h-full filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
          {/* Outfield Grass Sector (Green gradient) */}
          <path d="M 70 105 L 15 50 A 78 78 0 0 1 125 50 Z" fill="#047857" fillOpacity="0.18" stroke="#10b981" strokeWidth="1.5" />
          
          {/* Outfield Wall Border (Arc) */}
          <path d="M 15 50 A 78 78 0 0 1 125 50" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Infield Dirt Diamond */}
          <path d="M 70 105 L 90 85 L 70 65 L 50 85 Z" fill="#b45309" fillOpacity="0.18" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
          
          {/* Foul Lines */}
          <line x1="70" y1="105" x2="15" y2="50" stroke="#ef4444" strokeWidth="1.5" />
          <line x1="70" y1="105" x2="125" y2="50" stroke="#ef4444" strokeWidth="1.5" />
          
          {/* Foul Poles */}
          <circle cx="15" cy="50" r="2.5" fill="#ef4444" />
          <circle cx="125" cy="50" r="2.5" fill="#ef4444" />

          {/* Individual Plotted Hit Dots */}
          {plottedDots.map((dot, idx) => {
            const isHovered = hoveredDot?.x === dot.x && hoveredDot?.y === dot.y;
            return (
              <circle 
                key={idx}
                cx={dot.x} 
                cy={dot.y} 
                r={isHovered ? 4.2 : 2.5} 
                fill={dot.color} 
                stroke={isHovered ? "#ffffff" : "#ffffff"} 
                strokeWidth={isHovered ? 1.2 : 0.6} 
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredDot(dot)}
                onMouseLeave={() => setHoveredDot(null)}
              />
            );
          })}

          {/* Home Plate Icon */}
          <path d="M 68 105 L 72 105 L 73 107 L 70 110 L 67 107 Z" fill="#fff" />
        </svg>

        {/* Dynamic HTML Hover Tooltip */}
        {hoveredDot && (
          <div 
            className="absolute z-30 bg-zinc-900/95 border border-zinc-700/60 px-2.5 py-1.5 rounded-xl shadow-2xl text-[10px] text-white font-bold flex flex-col gap-1 pointer-events-none transition-all duration-100 whitespace-nowrap"
            style={{
              left: `${((hoveredDot.x - 12) / 116) * 100}%`,
              top: `${((hoveredDot.y - 25) / 87) * 100}%`,
              transform: 'translate(-50%, -130%)',
            }}
          >
            <div className="flex items-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full block" style={{ backgroundColor: hoveredDot.color }}></span>
              <span className="text-[9.5px]" style={{ color: hoveredDot.color }}>{hoveredDot.label}</span>
            </div>

            {mode === 'team' ? (
              <>
                <div className="text-white font-black text-xs leading-tight">
                  打者: {hoveredDot.batter}
                </div>
                <div className="text-zinc-300 font-medium text-[9.5px] leading-tight">
                  投手: {hoveredDot.pitcher} ({hoveredDot.pitchType})
                </div>
              </>
            ) : (
              <>
                <div className="text-white font-black text-xs leading-tight">
                  対戦投手: {hoveredDot.pitcher}
                </div>
                <div className="text-zinc-300 font-medium text-[9.5px] leading-tight">
                  球種: {hoveredDot.pitchType}
                </div>
              </>
            )}

            {hoveredDot.situation && (
              <div className="text-zinc-400 font-semibold text-[8.5px] border-t border-zinc-800/80 pt-1 mt-0.5 font-mono">
                {hoveredDot.situation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spray Chart Legend */}
      <div className="flex gap-4 justify-center text-[10px] text-zinc-400 font-bold border-t border-zinc-900/60 pt-3.5 w-full max-w-[340px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10b981] border border-white/40 block"></span>
          <span>安打 (Hit)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#fbbf24] border border-white/40 block"></span>
          <span>本塁打 (HR)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ef4444] border border-white/40 block"></span>
          <span>アウト/凡退</span>
        </div>
      </div>

      {/* Stats Labels Below Chart */}
      <div className="grid grid-cols-4 gap-2.5 text-center w-full max-w-[380px]">
        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl shadow-lg hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-extrabold block leading-tight">レフト</span>
            <span className="text-[9px] text-zinc-500 font-bold block leading-tight">(LF)</span>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-emerald-400 font-mono block">{(lfPct * 100).toFixed(1)}%</span>
            <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">({lfCount}本)</span>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl shadow-lg hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-extrabold block leading-tight">センター</span>
            <span className="text-[9px] text-zinc-500 font-bold block leading-tight">(CF)</span>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-emerald-400 font-mono block">{(cfPct * 100).toFixed(1)}%</span>
            <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">({cfCount}本)</span>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl shadow-lg hover:border-emerald-500/30 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-extrabold block leading-tight">ライト</span>
            <span className="text-[9px] text-zinc-500 font-bold block leading-tight">(RF)</span>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-emerald-400 font-mono block">{(rfPct * 100).toFixed(1)}%</span>
            <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">({rfCount}本)</span>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl shadow-lg hover:border-amber-500/30 transition-all flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-extrabold block leading-tight">内野</span>
            <span className="text-[9px] text-zinc-500 font-bold block leading-tight">(IF)</span>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-amber-400 font-mono block">{(ifPct * 100).toFixed(1)}%</span>
            <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">({ifCount}本)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SlashStatsGrid: React.FC<{ stats: SavantAggregatedStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. AVG */}
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-400">打率 (AVG)</span>
        <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{stats.avg}</p>
        <span className="text-[10px] text-zinc-500 mt-1 font-mono">{stats.hits}安打 / {stats.ab}打数</span>
      </div>

      {/* 2. OBP */}
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-400">出塁率 (OBP)</span>
        <p className="text-2xl font-black text-teal-400 mt-1 font-mono">{stats.obp}</p>
        <span className="text-[10px] text-zinc-500 mt-1 font-mono">PA {stats.pa} / 四死球 {stats.bb + stats.hbp}</span>
      </div>

      {/* 3. SLG */}
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-400">長打率 (SLG)</span>
        <p className="text-2xl font-black text-rose-400 mt-1 font-mono">{stats.slg}</p>
        <span className="text-[10px] text-zinc-500 mt-1 font-mono">長打 {stats.b2 + stats.b3 + stats.hr}本</span>
      </div>

      {/* 4. PA & AB */}
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-400">打席数 (PA) / 打数 (AB)</span>
        <p className="text-xl font-black text-sky-400 mt-1 font-mono">{stats.pa} PA <span className="text-sm font-normal text-zinc-400">/ {stats.ab} AB</span></p>
        <span className="text-[10px] text-zinc-500 mt-1 font-mono">四死球 {stats.bb + stats.hbp} / 犠飛 {stats.sf}</span>
      </div>

      {/* 5. HR & RBI */}
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-400">本塁打 / 打点</span>
        <p className="text-xl font-black text-rose-400 mt-1 font-mono">{stats.hr}本 <span className="text-sm font-normal text-zinc-400">/ {stats.rbi}打点</span></p>
        <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">HR率: {stats.pa > 0 ? ((stats.hr / stats.pa) * 100).toFixed(1) : '0.0'}%</span>
      </div>

      {/* 6. Hits Breakdown */}
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-400">安打内訳</span>
        <p className="text-xs font-bold text-zinc-200 mt-1 font-mono leading-tight">
          単:{stats.b1} 二:{stats.b2} 三:{stats.b3} 本:{stats.hr}
        </p>
        <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">計 {stats.hits}本</span>
      </div>

      {/* 7. K & BB */}
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-400">三振 (SO) / 四球 (BB)</span>
        <p className="text-xl font-black text-zinc-300 mt-1 font-mono">{stats.k} K / {stats.bb} BB</p>
        <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">死球 {stats.hbp}</span>
      </div>

      {/* 8. IsoP */}
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-400">IsoP (純長打力)</span>
        <p className="text-xl font-black text-purple-300 mt-1 font-mono">{stats.isoP}</p>
        <span className="text-[10px] text-zinc-500 mt-0.5 font-mono">SLG - AVG</span>
      </div>
    </div>
  );
};

// Advanced Sabermetrics Component for Batters (10 Advanced Metrics with ZERO duplicates!)
const AdvancedSabermetricsGrid: React.FC<{ stats: SavantAggregatedStats; title: string }> = ({ stats, title }) => {
  const paPerK = stats.k > 0 ? (stats.pa / stats.k).toFixed(1) : stats.pa.toFixed(1);
  const hrRate = stats.pa > 0 ? ((stats.hr / stats.pa) * 100).toFixed(1) + '%' : '0.0%';
  const wraa = ((parseFloat(stats.wOBA || '0') - 0.315) / 1.15 * stats.pa).toFixed(1);

  return (
    <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          {title} セイバーメトリクス詳細指標 (Advanced Sabermetrics)
        </h3>
        <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded uppercase">
          ADVANCED METRICS
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. WAR */}
        <div className="bg-gradient-to-br from-amber-950/40 to-zinc-950 border border-amber-500/30 p-4 rounded-xl flex flex-col justify-between shadow relative overflow-hidden">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">簡易 WAR</span>
          <div className="my-2">
            <p className="text-3xl font-black text-white font-mono">{stats.war}</p>
          </div>
          <span className="text-[8.5px] text-zinc-400 block leading-tight">
            代替選手比での勝利貢献度
          </span>
        </div>

        {/* 2. wOBA */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-teal-400 block">wOBA (加重出塁率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.wOBA}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            単打・長打価値を加重した出塁率
          </span>
        </div>

        {/* 3. wRAA */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-emerald-400 block">wRAA (得点貢献)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{wraa}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            リーグ平均比での利得創出点数
          </span>
        </div>

        {/* 4. IsoD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-teal-300 block">IsoD (選球眼)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.isoD}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            OBP - AVG (四球での出塁力)
          </span>
        </div>

        {/* 5. BB% */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-sky-400 block">BB% (四球率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.bbRate}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            全打席に占める四球割合
          </span>
        </div>

        {/* 6. K% */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-rose-400 block">K% (三振率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.kRate}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            全打席に占める三振割合
          </span>
        </div>

        {/* 7. BB / K */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-zinc-400 block">BB / K (アプローチ比)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.bbKRatio}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            四球 ÷ 三振の比率
          </span>
        </div>

        {/* 8. PA / K */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-zinc-400 block">PA / K (粘り強さ)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{paPerK}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            1三振を喫するまでの平均打席
          </span>
        </div>

        {/* 9. HR% */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-amber-400 block">HR% (本塁打率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{hrRate}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            打席あたりの本塁打確率
          </span>
        </div>

        {/* 10. BABIP */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-zinc-400 block">BABIP (インプレイ打率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.babip}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            インプレイ打球が安打になる率
          </span>
        </div>
      </div>
    </div>
  );
};

// NEW: Advanced Pitching Stats Component (includes FIP, WHIP, WAR, etc.)
const AdvancedPitchingMetricsGrid: React.FC<{ stats: SavantAggregatedStats; title: string }> = ({ stats, title }) => {
  return (
    <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-sky-400" />
          {title} 投手セイバーメトリクス指標 (Pitching Advanced Metrics)
        </h3>
        <span className="text-[9px] bg-sky-500/20 text-sky-400 font-bold px-2 py-0.5 rounded uppercase">
          PITCHING ADVANCED
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* PITCHER WAR CARD */}
        <div className="bg-gradient-to-br from-sky-950/40 to-zinc-950 border border-sky-500/30 p-4 rounded-xl flex flex-col justify-between shadow relative overflow-hidden">
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">投手 簡易 WAR</span>
          <div className="my-2">
            <p className="text-3xl font-black text-white font-mono">{stats.pitcherWar}</p>
          </div>
          <span className="text-[8.5px] text-zinc-400 block leading-tight">
            投手としてのチーム勝利貢献度
          </span>
        </div>

        {/* FIP CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-rose-400 block">FIP (守備独立防御率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.fip}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            守備影響を排除した投手の防御率
          </span>
        </div>

        {/* WHIP CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-teal-400 block">WHIP (被走者率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.whip}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            1イニングに許した走者の平均数
          </span>
        </div>

        {/* Whiff% CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-purple-400 block">Whiff% (空振り率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.whiffRate}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            全スイングに対する空ぶりの割合
          </span>
        </div>

        {/* CSW% CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-sky-400 block">CSW% (支配力指標)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.cswRate}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            見逃しストライク + 空振り率
          </span>
        </div>

        {/* K/9 CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-sky-400 block">K / 9 (奪三振率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.k9}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            9イニングあたりの奪三振数
          </span>
        </div>

        {/* BB/9 CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-zinc-400 block">BB / 9 (与四球率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.bb9}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            9イニングあたりの与四球数
          </span>
        </div>

        {/* H/9 CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-zinc-400 block">H / 9 (被安打率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.h9}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            9イニングあたりの被安打数
          </span>
        </div>

        {/* K / BB CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-zinc-400 block">K / BB (制球力)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.kbb}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            奪三振 ÷ 与四球の比率
          </span>
        </div>

        {/* K - BB % CARD */}
        <div className="bg-[#111827] border border-amber-500/30 p-4 rounded-xl flex flex-col justify-between shadow relative overflow-hidden">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">K - BB % (投手支配力)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-amber-300 font-mono">{stats.kMinusBbRate}</p>
          </div>
          <span className="text-[8.5px] text-zinc-400 block leading-tight">
            K% - BB% (真の投手力)
          </span>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// MAIN DASHBOARD COMPONENT
// -------------------------------------------------------------
export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  currentEvents,
  players = [],
  currentUser = ''
}) => {
  // Scoped localStorage wrapper using lexical scoping
  const localStorage = {
    getItem: (key: string): string | null => {
      if (key === 'sportscode_current_user' || key === 'sportscode_current_password' || key === 'sportscode_is_logged_in' || key === 'sportscode_users_db') {
        return window.localStorage.getItem(key);
      }
      if (!currentUser) return window.localStorage.getItem(key);
      const userKey = `sportscode_user_${currentUser}_${key.replace('sportscode_', '')}`;
      const userVal = window.localStorage.getItem(userKey);
      if (userVal !== null) return userVal;
      
      const isolatedKeys = ['players', 'roster', 'accumulated_csv_events', 'quick_custom_map'];
      const isIsolated = isolatedKeys.some(ik => key.toLowerCase().includes(ik));
      if (isIsolated) return null;

      return window.localStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
      if (key === 'sportscode_current_user' || key === 'sportscode_current_password' || key === 'sportscode_is_logged_in' || key === 'sportscode_users_db') {
        window.localStorage.setItem(key, value);
        return;
      }
      if (!currentUser) {
        window.localStorage.setItem(key, value);
        return;
      }
      const userKey = `sportscode_user_${currentUser}_${key.replace('sportscode_', '')}`;
      window.localStorage.setItem(userKey, value);
    },
    removeItem: (key: string) => {
      if (key === 'sportscode_current_user' || key === 'sportscode_current_password' || key === 'sportscode_is_logged_in' || key === 'sportscode_users_db') {
        window.localStorage.removeItem(key);
        return;
      }
      if (!currentUser) {
        window.localStorage.removeItem(key);
        return;
      }
      const userKey = `sportscode_user_${currentUser}_${key.replace('sportscode_', '')}`;
      window.localStorage.removeItem(userKey);
    }
  };
  const [csvEvents, setCsvEvents] = useState<TaggedEvent[]>(() => {
    try {
      const saved = localStorage.getItem('accumulated_csv_events');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [dataMode, setDataMode] = useState<'current' | 'csv'>(() => {
    try {
      const saved = localStorage.getItem('accumulated_csv_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return 'csv';
        }
      }
    } catch {}
    return 'current';
  });
  const [selectedTab, setSelectedTab] = useState<'savant' | 'batter' | 'pitcher' | 'gameday'>('savant');
  const [showManageModal, setShowManageModal] = useState(false);
  
  const [selectedBatterName, setSelectedBatterName] = useState<string>('all');
  const [selectedPitcherName, setSelectedPitcherName] = useState<string>('all');
  const [batterVsHand, setBatterVsHand] = useState<'all' | 'R' | 'L'>('all');
  const [pitcherVsHand, setPitcherVsHand] = useState<'all' | 'R' | 'L'>('all');
  const [batterScoringPositionOnly, setBatterScoringPositionOnly] = useState<boolean>(false);
  const [pitcherScoringPositionOnly, setPitcherScoringPositionOnly] = useState<boolean>(false);
  const [teamHeatmapPitchType, setTeamHeatmapPitchType] = useState<string>('all');
  const [batterHeatmapPitchType, setBatterHeatmapPitchType] = useState<string>('all');
  const [pitcherHeatmapPitchType, setPitcherHeatmapPitchType] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // Load custom quick button mapping to sync names/groups exactly with designer config
  const quickCustomMap = useMemo(() => {
    try {
      const saved = localStorage.getItem('sportscode_quick_custom_map');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {} as { [key: string]: { name: string; group: string; color?: string; linkTrigger?: string } };
  }, []);

  // Handlers for managing accumulated data
  const handleLoadDemoData = () => {
    const demoEvents: TaggedEvent[] = [
      // Game 1: 2026-07-10
      {
        id: 'demo_1_1', timestamp: 1, startTime: 1, endTime: 6, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-10', sourceCsvName: 'デモ試合データ_20260710.csv',
        labels: { Batter: '山田 太郎', Pitcher: '鈴木 一朗', Team: 'Aチーム', Course: 'B22', Result: '本塁打', 'Pitch Type': '4シーム', Hit_Direction: 'LF', Hit_Plot: '22,34', Count: '2-1', Runners: '1・2塁', RBI: '3', 'Pitch Speed': '149km/h', '球速': '149km/h', Inning: '1回表', Inning_Num: '1' }
      },
      {
        id: 'demo_1_2', timestamp: 2, startTime: 2, endTime: 7, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-10', sourceCsvName: 'デモ試合データ_20260710.csv',
        labels: { Batter: '佐藤 次郎', Pitcher: '鈴木 一朗', Team: 'Aチーム', Course: 'B44', Result: '空振りストライク', 'Pitch Type': 'スライダー', Count: '0-2', 'Pitch Speed': '136km/h', '球速': '136km/h', Inning: '1回表', Inning_Num: '1' }
      },
      {
        id: 'demo_1_3', timestamp: 3, startTime: 3, endTime: 8, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-10', sourceCsvName: 'デモ試合データ_20260710.csv',
        labels: { Batter: '佐藤 次郎', Pitcher: '鈴木 一朗', Team: 'Aチーム', Course: 'B11', Result: '三振', 'Pitch Type': 'フォーク', Count: '1-3', 'Pitch Speed': '138km/h', '球速': '138km/h', Inning: '1回表', Inning_Num: '1' }
      },
      {
        id: 'demo_1_4', timestamp: 4, startTime: 4, endTime: 9, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-10', sourceCsvName: 'デモ試合データ_20260710.csv',
        labels: { Batter: '高橋 三郎', Pitcher: '鈴木 一朗', Team: 'Aチーム', Course: 'B33', Result: '二塁打', 'Pitch Type': '4シーム', Hit_Direction: 'CF', Hit_Plot: '50,42', Count: '0-0', Runners: 'なし', 'Pitch Speed': '152km/h', '球速': '152km/h', Inning: '3回表', Inning_Num: '3' }
      },
      {
        id: 'demo_1_5', timestamp: 5, startTime: 5, endTime: 10, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-10', sourceCsvName: 'デモ試合データ_20260710.csv',
        labels: { Batter: '田中 四郎', Pitcher: '鈴木 一朗', Team: 'Aチーム', Course: 'B55', Result: '四球', 'Pitch Type': 'カーブ', Count: '3-2', Runners: '2塁', 'Pitch Speed': '126km/h', '球速': '126km/h', Inning: '3回表', Inning_Num: '3' }
      },
      {
        id: 'demo_1_6', timestamp: 6, startTime: 6, endTime: 11, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-10', sourceCsvName: 'デモ試合データ_20260710.csv',
        labels: { Batter: '山田 太郎', Pitcher: '鈴木 一朗', Team: 'Aチーム', Course: 'B32', Result: '単打', 'Pitch Type': '2シーム', Hit_Direction: 'RF', Hit_Plot: '72,48', Count: '1-1', Runners: '1・2塁', RBI: '1', 'Pitch Speed': '144km/h', '球速': '144km/h', Inning: '5回表', Inning_Num: '5' }
      },
      // Opponent Team: Aチーム pitching, Bチーム batting
      {
        id: 'demo_1_7', timestamp: 7, startTime: 7, endTime: 12, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-10', sourceCsvName: 'デモ試合データ_20260710.csv',
        labels: { Batter: 'Jackson', Pitcher: '山田 太郎', Team: 'Bチーム', Course: 'B24', Result: '本塁打', 'Pitch Type': '4シーム', Hit_Direction: 'RF', Hit_Plot: '85,32', Count: '3-1', Runners: 'なし', RBI: '1', 'Pitch Speed': '146km/h', '球速': '146km/h', Inning: '5回裏', Inning_Num: '5' }
      },
      {
        id: 'demo_1_8', timestamp: 8, startTime: 8, endTime: 13, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-10', sourceCsvName: 'デモ試合データ_20260710.csv',
        labels: { Batter: 'Smith', Pitcher: '山田 太郎', Team: 'Bチーム', Course: 'B42', Result: '単打', 'Pitch Type': 'スライダー', Hit_Direction: 'LF', Hit_Plot: '28,52', Count: '1-2', Runners: 'なし', 'Pitch Speed': '133km/h', '球速': '133km/h', Inning: '7回裏', Inning_Num: '7' }
      },
      {
        id: 'demo_1_9', timestamp: 9, startTime: 9, endTime: 14, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-10', sourceCsvName: 'デモ試合データ_20260710.csv',
        labels: { Batter: 'Smith', Pitcher: '山田 太郎', Team: 'Bチーム', Course: 'B33', Result: '単打', 'Pitch Type': 'スライダー', Hit_Direction: 'CF', Hit_Plot: '49,47', Count: '2-2', Runners: '1塁', 'Pitch Speed': '135km/h', '球速': '135km/h', Inning: '7回裏', Inning_Num: '7' }
      },

      // Game 2: 2026-07-12
      {
        id: 'demo_2_1', timestamp: 10, startTime: 10, endTime: 15, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-12', sourceCsvName: 'デモ試合データ_20260712.csv',
        labels: { Batter: '山田 太郎', Pitcher: '田中 四郎', Team: 'Aチーム', Course: 'B33', Result: '本塁打', 'Pitch Type': 'カットボール', Hit_Direction: 'CF', Hit_Plot: '51,30', Count: '0-1', Runners: 'なし', RBI: '1', 'Pitch Speed': '141km/h', '球速': '141km/h', Inning: '1回表', Inning_Num: '1' }
      },
      {
        id: 'demo_2_2', timestamp: 11, startTime: 11, endTime: 16, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-12', sourceCsvName: 'デモ試合データ_20260712.csv',
        labels: { Batter: '佐藤 次郎', Pitcher: '田中 四郎', Team: 'Aチーム', Course: 'B22', Result: '単打', 'Pitch Type': '4シーム', Hit_Direction: 'LF', Hit_Plot: '32,50', Count: '2-2', Runners: 'なし', 'Pitch Speed': '147km/h', '球速': '147km/h', Inning: '1回表', Inning_Num: '1' }
      },
      {
        id: 'demo_2_3', timestamp: 12, startTime: 12, endTime: 17, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-12', sourceCsvName: 'デモ試合データ_20260712.csv',
        labels: { Batter: '高橋 三郎', Pitcher: '田中 四郎', Team: 'Aチーム', Course: 'B44', Result: '本塁打', 'Pitch Type': 'チェンジアップ', Hit_Direction: 'LF', Hit_Plot: '18,36', Count: '3-2', Runners: '1塁', RBI: '2', 'Pitch Speed': '131km/h', '球速': '131km/h', Inning: '3回表', Inning_Num: '3' }
      },
      {
        id: 'demo_2_4', timestamp: 13, startTime: 13, endTime: 18, actionId: 'btn_pitch', actionName: 'Pitch', color: 'bg-emerald-900', createdAt: Date.now(), gameDate: '2026-07-12', sourceCsvName: 'デモ試合データ_20260712.csv',
        labels: { Batter: '田中 四郎', Pitcher: '田中 四郎', Team: 'Aチーム', Course: 'B12', Result: '三振', 'Pitch Type': 'スプリット', Count: '1-3', 'Pitch Speed': '137km/h', '球速': '137km/h', Inning: '3回表', Inning_Num: '3' }
      }
    ];

    const merged = [...csvEvents, ...demoEvents].filter((ev, index, self) =>
      self.findIndex(t => t.id === ev.id) === index
    );
    setCsvEvents(merged);
    localStorage.setItem('accumulated_csv_events', JSON.stringify(merged));
    setDataMode('csv');
  };

  const handleAdminClearAllCsv = () => {
    if (confirm('蓄積されたすべてのCSVデータを完全に消去しますか？')) {
      setCsvEvents([]);
      localStorage.removeItem('accumulated_csv_events');
      setDataMode('current');
    }
  };

  const handleAdminDeleteCsvFile = (fileName: string) => {
    if (confirm(`「${fileName}」のデータのみを削除しますか？`)) {
      const filtered = csvEvents.filter(ev => ev.sourceCsvName !== fileName);
      setCsvEvents(filtered);
      localStorage.setItem('accumulated_csv_events', JSON.stringify(filtered));
      if (filtered.length === 0) {
        setDataMode('current');
      }
    }
  };

  // Handle CSV File Upload & Parsing (Matches exact column mapping, supports multiple files)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const readAndParseFile = (file: File): Promise<TaggedEvent[]> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (!text) {
            resolve([]);
            return;
          }

          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length < 2) {
            resolve([]);
            return;
          }

          // Dynamic Header Parsing
          const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
          
          const idxBatter = headers.findIndex(h => h === 'batter' || h.includes('打者'));
          const idxPitcher = headers.findIndex(h => h === 'pitcher' || h.includes('投手'));
          const idxCount = headers.findIndex(h => h === 'count' || h.includes('カウント'));
          const idxTeam = headers.findIndex(h => h === 'team' || h.includes('チーム') || h.includes('球団'));
          const idxCourse = headers.findIndex(h => h === 'course' || h.includes('コース'));
          const idxResult = headers.findIndex(h => h === 'result' || h.includes('結果') || h.includes('判定'));
          const idxPitchType = headers.findIndex(h => h === 'pitch type' || h.includes('pitchtype') || h.includes('球種'));
          const idxHitDirection = headers.findIndex(h => h === 'hit_direction' || h.includes('hitdirection') || h.includes('打球方向'));
          const idxHitPlot = headers.findIndex(h => h === 'hit_plot' || h.includes('hitplot') || h.includes('打球位置'));
          const idxRunners = headers.findIndex(h => h === 'runners' || h.includes('ランナー'));
          const idxRbi = headers.findIndex(h => h === 'rbi' || h.includes('打点') || h.includes('runs'));
          const idxDate = headers.findIndex(h => h === 'date' || h.includes('日付'));
          const idxSpeed = headers.findIndex(h => h.includes('speed') || h.includes('球速'));

          const parsed: TaggedEvent[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
            if (cols.length < 3) continue;

            const batter = idxBatter !== -1 ? cols[idxBatter] : '';
            const count = idxCount !== -1 ? cols[idxCount] : '';
            const course = idxCourse !== -1 ? cols[idxCourse] : '';
            const team = idxTeam !== -1 ? cols[idxTeam] : '';
            const runners = idxRunners !== -1 ? cols[idxRunners] : '';
            const runs = idxRbi !== -1 ? cols[idxRbi] : '';
            const battedResult = idxResult !== -1 ? cols[idxResult] : '';
            const hitDirection = idxHitDirection !== -1 ? cols[idxHitDirection] : '';
            const hitPlot = idxHitPlot !== -1 ? cols[idxHitPlot] : '';
            const pitcher = idxPitcher !== -1 ? cols[idxPitcher] : '';
            const pitchType = idxPitchType !== -1 ? cols[idxPitchType] : '';
            const pitchSpeed = idxSpeed !== -1 ? cols[idxSpeed] : '';
            const gameDateVal = idxDate !== -1 ? cols[idxDate] : '';

            let formattedGameDate = '';
            if (gameDateVal && /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(gameDateVal.replace(/\//g, '-'))) {
              formattedGameDate = gameDateVal.replace(/\//g, '-');
            } else {
              const dateMatch = file.name.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
              if (dateMatch) {
                formattedGameDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
              } else {
                formattedGameDate = new Date(file.lastModified || Date.now()).toISOString().split('T')[0];
              }
            }

            parsed.push({
              id: `csv_${file.name}_${i}_${Math.random().toString(36).substr(2, 5)}`,
              timestamp: i,
              startTime: i,
              endTime: i + 5,
              actionId: 'btn_pitch',
              actionName: 'Pitch',
              color: 'bg-emerald-900',
              createdAt: file.lastModified || Date.now(),
              gameDate: formattedGameDate,
              sourceCsvName: file.name,
              labels: {
                Batter: batter,
                Pitcher: pitcher,
                Count: count,
                Team: team,
                Course: course,
                Result: battedResult,
                'Pitch Type': pitchType,
                'Pitch Speed': pitchSpeed,
                '球速': pitchSpeed,
                Hit_Direction: hitDirection,
                Hit_Plot: hitPlot || '-',
                Runners: runners,
                RBI: runs
              }
            });
          }
          resolve(parsed);
        };
        reader.onerror = () => resolve([]);
        reader.readAsText(file);
      });
    };

    const results = await Promise.all(fileList.map(readAndParseFile));
    const allParsedEvents = results.flat();

    if (allParsedEvents.length === 0) return;

    // Merge and prevent duplicates
    const merged = [...csvEvents, ...allParsedEvents].filter((ev, index, self) =>
      self.findIndex(t => t.id === ev.id) === index
    );

    setCsvEvents(merged);
    localStorage.setItem('accumulated_csv_events', JSON.stringify(merged));
    setDataMode('csv');
  };

  const activeEvents = dataMode === 'current' ? currentEvents : csvEvents;

  // Unique Teams List
  const teamNames = useMemo(() => {
    const set = new Set<string>();
    activeEvents.forEach(e => {
      const t = getLabelValueByKeywords(e.labels, ['team', 'チーム', '球団']);
      if (t && t !== '-') set.add(t.toString());
    });
    return Array.from(set).sort();
  }, [activeEvents]);

  // Filter events by selected team for Team Stats Overview
  const filteredTeamEvents = useMemo(() => {
    if (selectedTeam === 'all') return activeEvents;
    return activeEvents.filter(e => {
      const t = getLabelValueByKeywords(e.labels, ['team', 'チーム', '球団']);
      return t === selectedTeam;
    });
  }, [activeEvents, selectedTeam]);

  // Helper to extract available pitch types and counts from an events array
  const getPitchTypesWithCounts = (events: TaggedEvent[]) => {
    const counts: { [type: string]: number } = {};
    events.forEach(e => {
      const type = getLabelValueByKeywords(e.labels, ['pitch type', '球種']);
      if (type && type !== '-') {
        counts[type] = (counts[type] || 0) + 1;
      }
    });
    const list = sortPitchTypes(Object.keys(counts));
    return { list, counts };
  };

  // 1. Team stats calculation
  const teamStats = useMemo(() => {
    return calculateSavantStats(filteredTeamEvents, quickCustomMap);
  }, [filteredTeamEvents, quickCustomMap]);

  // 1b. Team Heatmap Stats
  const teamHeatmapData = useMemo(() => {
    const { list, counts } = getPitchTypesWithCounts(filteredTeamEvents);
    let evs = filteredTeamEvents;
    if (teamHeatmapPitchType !== 'all' && list.includes(teamHeatmapPitchType)) {
      evs = filteredTeamEvents.filter(e => {
        const type = getLabelValueByKeywords(e.labels, ['pitch type', '球種']);
        return type === teamHeatmapPitchType;
      });
    }
    const stats = calculateSavantStats(evs, quickCustomMap);
    return { list, counts, stats, total: evs.length };
  }, [filteredTeamEvents, teamHeatmapPitchType, quickCustomMap]);

  // Unique Batters & Pitchers List
  const batterNames = useMemo(() => {
    const set = new Set<string>();
    activeEvents.forEach(e => {
      const b = e.labels?.Batter || e.labels?.打者;
      if (b && b !== '-') set.add(b.toString());
    });
    return Array.from(set);
  }, [activeEvents]);

  const pitcherNames = useMemo(() => {
    const set = new Set<string>();
    activeEvents.forEach(e => {
      const p = e.labels?.Pitcher || e.labels?.投手;
      if (p && p !== '-') set.add(p.toString());
    });
    return Array.from(set);
  }, [activeEvents]);

  // 2. Batter specific stats calculation
  const batterEvents = useMemo(() => {
    let evs = activeEvents;
    if (selectedBatterName !== 'all') {
      evs = evs.filter(e => (e.labels?.Batter || e.labels?.打者) === selectedBatterName);
    }
    if (batterVsHand !== 'all') {
      evs = evs.filter(e => {
        const pitcherName = getLabelValueByKeywords(e.labels, ['pitcher', '投手名', '投手']);
        if (!pitcherName) return false;
        const pitcherObj = players.find(p => p.name === pitcherName);
        return pitcherObj?.throws === batterVsHand;
      });
    }
    if (batterScoringPositionOnly) {
      evs = evs.filter(e => {
        const runners = getLabelValueByKeywords(e.labels, ['runners', 'ランナー', '走者']);
        return isScoringPosition(runners);
      });
    }
    return evs;
  }, [activeEvents, selectedBatterName, batterVsHand, batterScoringPositionOnly, players]);

  // Batter Velocity Tier Breakdown (For space below Batter Heatmap)
  const batterVelocityStats = useMemo(() => {
    const tiers = {
      over150: { label: '150km/h以上', count: 0, hits: 0, outs: 0, atBats: 0 },
      over145: { label: '145 - 149km/h', count: 0, hits: 0, outs: 0, atBats: 0 },
      range140: { label: '140 - 144km/h', count: 0, hits: 0, outs: 0, atBats: 0 },
      under140: { label: '140km/h未満', count: 0, hits: 0, outs: 0, atBats: 0 },
    };

    let totalWithSpeed = 0;
    batterEvents.forEach(ev => {
      const speedStr = getLabelValueByKeywords(ev.labels, ['pitch speed', 'pitchspeed', '球速', 'pitch_speed', 'speed']);
      const speed = parsePitchSpeedNumber(speedStr);
      if (speed) {
        totalWithSpeed++;
        const res = getLabelValueByKeywords(ev.labels, ['result', '結果', '判定']);
        const isHit = ['単打', '二塁打', '三塁打', '本塁打', 'hit'].some(k => res.includes(k));
        const isOut = ['ゴロ', 'フライ', 'ライナー', '小フライ', '見逃しストライク', '空振りストライク', '三振', 'out'].some(k => res.includes(k));

        let key: keyof typeof tiers | null = null;
        if (speed >= 150) key = 'over150';
        else if (speed >= 145) key = 'over145';
        else if (speed >= 140) key = 'range140';
        else key = 'under140';

        if (key) {
          tiers[key].count++;
          if (isHit) { tiers[key].hits++; tiers[key].atBats++; }
          else if (isOut) { tiers[key].outs++; tiers[key].atBats++; }
        }
      }
    });

    return { tiers, totalWithSpeed };
  }, [batterEvents]);

  const batterStats = useMemo(() => {
    return calculateSavantStats(batterEvents, quickCustomMap);
  }, [batterEvents, quickCustomMap]);

  // 2b. Batter Heatmap Stats
  const batterHeatmapData = useMemo(() => {
    const { list, counts } = getPitchTypesWithCounts(batterEvents);
    let evs = batterEvents;
    if (batterHeatmapPitchType !== 'all' && list.includes(batterHeatmapPitchType)) {
      evs = batterEvents.filter(e => {
        const type = getLabelValueByKeywords(e.labels, ['pitch type', '球種']);
        return type === batterHeatmapPitchType;
      });
    }
    const stats = calculateSavantStats(evs, quickCustomMap);
    return { list, counts, stats, total: evs.length };
  }, [batterEvents, batterHeatmapPitchType, quickCustomMap]);

  // 3. Pitcher specific stats calculation
  const pitcherEvents = useMemo(() => {
    let evs = activeEvents;
    if (selectedPitcherName !== 'all') {
      evs = evs.filter(e => (e.labels?.Pitcher || e.labels?.投手) === selectedPitcherName);
    }
    if (pitcherVsHand !== 'all') {
      evs = evs.filter(e => {
        const batterName = getLabelValueByKeywords(e.labels, ['batter', '打者名', '打者']);
        if (!batterName) return false;
        const batterObj = players.find(p => p.name === batterName);
        if (!batterObj) return false;
        if (pitcherVsHand === 'R') {
          return batterObj.bats === 'R' || batterObj.bats === 'S';
        } else {
          return batterObj.bats === 'L' || batterObj.bats === 'S';
        }
      });
    }
    if (pitcherScoringPositionOnly) {
      evs = evs.filter(e => {
        const runners = getLabelValueByKeywords(e.labels, ['runners', 'ランナー', '走者']);
        return isScoringPosition(runners);
      });
    }
    return evs;
  }, [activeEvents, selectedPitcherName, pitcherVsHand, pitcherScoringPositionOnly, players]);

  const pitcherStats = useMemo(() => {
    return calculateSavantStats(pitcherEvents, quickCustomMap);
  }, [pitcherEvents, quickCustomMap]);

  // 3b. Pitcher Heatmap Stats
  const pitcherHeatmapData = useMemo(() => {
    const { list, counts } = getPitchTypesWithCounts(pitcherEvents);
    let evs = pitcherEvents;
    if (pitcherHeatmapPitchType !== 'all' && list.includes(pitcherHeatmapPitchType)) {
      evs = pitcherEvents.filter(e => {
        const type = getLabelValueByKeywords(e.labels, ['pitch type', '球種']);
        return type === pitcherHeatmapPitchType;
      });
    }
    const stats = calculateSavantStats(evs, quickCustomMap);
    return { list, counts, stats, total: evs.length };
  }, [pitcherEvents, pitcherHeatmapPitchType, quickCustomMap]);

  // 3c. Velocity Analytics (Inning Trend & Pitch Type Speeds & Velocity Tiers)
  const pitcherVelocityStats = useMemo(() => {
    const inningMap = new Map<number, number[]>();
    const pitchTypeMap = new Map<string, number[]>();
    const velocityTiers = {
      over150: { label: '150km/h以上', count: 0, hits: 0, outs: 0, atBats: 0 },
      over145: { label: '145 - 149km/h', count: 0, hits: 0, outs: 0, atBats: 0 },
      range140: { label: '140 - 144km/h', count: 0, hits: 0, outs: 0, atBats: 0 },
      under140: { label: '140km/h未満', count: 0, hits: 0, outs: 0, atBats: 0 },
    };

    let allSpeeds: number[] = [];

    pitcherEvents.forEach(ev => {
      const speedStr = getLabelValueByKeywords(ev.labels, ['pitch speed', 'pitchspeed', '球速', 'pitch_speed', 'speed']);
      const speed = parsePitchSpeedNumber(speedStr);
      if (speed) {
        allSpeeds.push(speed);

        // 1. Inning Grouping
        const innStr = getLabelValueByKeywords(ev.labels, ['inning_num', 'inning', 'イニング']);
        const innMatch = innStr.match(/(\d+)/);
        const innNum = innMatch ? parseInt(innMatch[1]) : 1;
        if (!inningMap.has(innNum)) inningMap.set(innNum, []);
        inningMap.get(innNum)!.push(speed);

        // 2. Pitch Type Grouping
        const pType = getLabelValueByKeywords(ev.labels, ['pitch type', '球種']) || 'その他';
        if (!pitchTypeMap.has(pType)) pitchTypeMap.set(pType, []);
        pitchTypeMap.get(pType)!.push(speed);

        // 3. Velocity Tiers
        const res = getLabelValueByKeywords(ev.labels, ['result', '結果', '判定']);
        const isHit = ['単打', '二塁打', '三塁打', '本塁打', 'hit'].some(k => res.includes(k));
        const isOut = ['ゴロ', 'フライ', 'ライナー', '小フライ', '見逃しストライク', '空振りストライク', '三振', 'out'].some(k => res.includes(k));

        let tierKey: keyof typeof velocityTiers | null = null;
        if (speed >= 150) tierKey = 'over150';
        else if (speed >= 145) tierKey = 'over145';
        else if (speed >= 140) tierKey = 'range140';
        else tierKey = 'under140';

        if (tierKey) {
          velocityTiers[tierKey].count++;
          if (isHit) { velocityTiers[tierKey].hits++; velocityTiers[tierKey].atBats++; }
          else if (isOut) { velocityTiers[tierKey].outs++; velocityTiers[tierKey].atBats++; }
        }
      }
    });

    const maxSpeed = allSpeeds.length > 0 ? Math.max(...allSpeeds) : null;
    const avgSpeed = allSpeeds.length > 0 ? Math.round((allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length) * 10) / 10 : null;

    // Inning Trend Data (sorted by inning number)
    const inningTrend = Array.from(inningMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([inn, speeds]) => ({
        inning: inn,
        count: speeds.length,
        avg: Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10,
        max: Math.max(...speeds),
        min: Math.min(...speeds)
      }));

    // Pitch Type Speed Data
    const pitchTypeSpeeds = Array.from(pitchTypeMap.entries()).map(([pType, speeds]) => ({
      pitchType: pType,
      count: speeds.length,
      avg: Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10,
      max: Math.max(...speeds),
      min: Math.min(...speeds)
    })).sort((a, b) => b.count - a.count);

    return { maxSpeed, avgSpeed, totalPitchesWithSpeed: allSpeeds.length, inningTrend, pitchTypeSpeeds, velocityTiers };
  }, [pitcherEvents]);

  // ============================================================
  // GAME DAY ANALYSIS LOGIC
  // ============================================================
  const gameDays = useMemo(() => {
    const dayMap = new Map<string, TaggedEvent[]>();
    activeEvents.forEach(ev => {
      // Use manually set gameDate if available, otherwise fall back to createdAt date
      const dateStr = ev.gameDate
        ? ev.gameDate  // Already YYYY-MM-DD string
        : new Date(ev.createdAt).toLocaleDateString('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit'
          });
      if (!dayMap.has(dateStr)) dayMap.set(dateStr, []);
      dayMap.get(dateStr)!.push(ev);
    });
    // Sort descending
    return Array.from(dayMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [activeEvents]);

  const [selectedGameDay, setSelectedGameDay] = useState<string>('');

  const selectedDayEvents = useMemo(() => {
    const dayKey = selectedGameDay || (gameDays[0]?.[0] ?? '');
    return gameDays.find(([d]) => d === dayKey)?.[1] ?? [];
  }, [selectedGameDay, gameDays]);

  const scoreboardData = useMemo(() => {
    if (selectedDayEvents.length === 0) return null;

    // Extract unique teams
    const teams = Array.from(new Set(selectedDayEvents.map(e => e.labels?.Team).filter(Boolean))) as string[];
    if (teams.length === 0) return null;

    let team1 = teams[0];
    let team2 = teams[1] || '対戦相手';

    // Figure out who bats in the top of any inning to order them Visitors first (team1)
    const hasTeam2InTop = selectedDayEvents.some(e => {
      const team = e.labels?.Team;
      const inn = e.labels?.Inning || '';
      return team === team2 && (inn.includes('表') || e.labels?.Inning_Half === 'top');
    });
    if (hasTeam2InTop && teams.length > 1) {
      team1 = teams[1];
      team2 = teams[0];
    }

    // Determine max inning number
    let maxInning = 9;
    selectedDayEvents.forEach(e => {
      const innStr = e.labels?.Inning_Num;
      if (innStr) {
        const innNum = parseInt(innStr);
        if (!isNaN(innNum) && innNum > maxInning) maxInning = innNum;
      } else {
        const innMatch = (e.labels?.Inning || '').match(/(\d+)/);
        if (innMatch) {
          const innNum = parseInt(innMatch[1]);
          if (!isNaN(innNum) && innNum > maxInning) maxInning = innNum;
        }
      }
    });

    const team1Scores: (number | string)[] = Array(maxInning).fill(0);
    const team2Scores: (number | string)[] = Array(maxInning).fill(0);
    
    let team1Hits = 0;
    let team2Hits = 0;
    let team1Runs = 0;
    let team2Runs = 0;
    let team1Errors = 0;
    let team2Errors = 0;

    selectedDayEvents.forEach(e => {
      const team = e.labels?.Team;
      
      let innNum = 1;
      const innStr = e.labels?.Inning_Num;
      if (innStr) {
        innNum = parseInt(innStr);
      } else {
        const innMatch = (e.labels?.Inning || '').match(/(\d+)/);
        if (innMatch) innNum = parseInt(innMatch[1]);
      }
      const inningIndex = innNum - 1;

      const rbiStr = e.labels?.RBI || e.labels?.打点 || '';
      const runsScored = rbiStr ? (parseInt(rbiStr) || 0) : 0;
      
      const res = (e.labels?.Result || '').toLowerCase();
      const isHit = res.includes('単打') || res.includes('安打') || res.includes('ヒット') || res === '1b' ||
                    res.includes('二塁打') || res === '2b' || res.includes('三塁打') || res === '3b' ||
                    res.includes('本塁打') || res === 'hr' || res.includes('ホームラン');

      const isError = res.includes('失策') || res.includes('エラー') || res.includes('error');

      if (team === team1) {
        if (isHit) team1Hits++;
        if (runsScored > 0) {
          team1Runs += runsScored;
          if (inningIndex >= 0 && inningIndex < maxInning) {
            team1Scores[inningIndex] = (team1Scores[inningIndex] as number) + runsScored;
          }
        }
        if (isError) {
          team2Errors++;
        }
      } else if (team === team2) {
        if (isHit) team2Hits++;
        if (runsScored > 0) {
          team2Runs += runsScored;
          if (inningIndex >= 0 && inningIndex < maxInning) {
            team2Scores[inningIndex] = (team2Scores[inningIndex] as number) + runsScored;
          }
        }
        if (isError) {
          team1Errors++;
        }
      }
    });

    return {
      team1,
      team2,
      team1Scores,
      team2Scores,
      team1Runs,
      team2Runs,
      team1Hits,
      team2Hits,
      team1Errors,
      team2Errors,
      maxInning
    };
  }, [selectedDayEvents]);

  const gameDayLineup = useMemo(() => {
    // Group players by team, collect their appearance and stats from that day's events
    const teamMap = new Map<string, Map<string, {
      name: string; number?: string; pa: number; hits: number; hr: number; rbi: number;
      bb: number; k: number; ab: number; b1: number; b2: number; b3: number;
      order?: number; positionType?: string;
    }>>();

    selectedDayEvents.forEach(ev => {
      const batter = ev.labels?.Batter || ev.labels?.打者 || ev.playerName || '';
      const team = (ev.labels as any)?.Team || (ev.labels as any)?.チーム || '';
      const result = Object.values(ev.labels || {}).join(' ');
      const lRes = result.toLowerCase();

      if (!batter || batter === '-') return;

      const teamKey = team || 'チーム不明';
      if (!teamMap.has(teamKey)) teamMap.set(teamKey, new Map());
      const teamPlayers = teamMap.get(teamKey)!;

      if (!teamPlayers.has(batter)) {
        // Try to find player data from roster
        const rosterPlayer = players.find(p => p.name === batter);
        teamPlayers.set(batter, {
          name: batter,
          number: rosterPlayer?.number,
          pa: 0, hits: 0, hr: 0, rbi: 0, bb: 0, k: 0, ab: 0, b1: 0, b2: 0, b3: 0,
          order: rosterPlayer?.battingOrder,
          positionType: rosterPlayer?.positionType
        });
      }

      const ps = teamPlayers.get(batter)!;
      ps.pa++;

      const isHR = lRes.includes('本塁打') || lRes.includes('hr') || lRes.includes('ホームラン');
      const is3B = lRes.includes('三塁打') || lRes.includes('3b');
      const is2B = lRes.includes('二塁打') || lRes.includes('2b') || lRes.includes('ツーベース');
      const is1B = lRes.includes('単打') || lRes.includes('1b') || lRes.includes('ヒット') || lRes.includes('安打');
      const isBB = lRes.includes('四球') || lRes.includes('bb') || lRes.includes('walk');
      const isHBP = lRes.includes('死球') || lRes.includes('hbp');
      const isK = lRes.includes('三振') || lRes.includes('k ') || lRes.includes(' k') || lRes === 'k';
      const isSF = lRes.includes('犠飛') || lRes.includes('sf');
      const isSH = lRes.includes('犠打') || lRes.includes('sh') || lRes.includes('bunt');

      if (isBB || isHBP) { ps.bb++; }
      else if (isSF || isSH) { /* plate appearance but no AB */ }
      else {
        ps.ab++;
        if (isHR) { ps.hits++; ps.hr++; ps.b3++; /* reuse b3 for HR total */ }
        else if (is3B) { ps.hits++; ps.b3++; }
        else if (is2B) { ps.hits++; ps.b2++; }
        else if (is1B) { ps.hits++; ps.b1++; }
      }
      if (isK) ps.k++;

      // RBI
      const rbiLabel = (ev.labels as any)?.RBI || (ev.labels as any)?.打点 || '';
      const rbiNum = parseInt(rbiLabel);
      if (!isNaN(rbiNum)) ps.rbi += rbiNum;
    });

    return teamMap;
  }, [selectedDayEvents, players]);

  const [gameDayViewMode, setGameDayViewMode] = useState<{ [team: string]: 'batting' | 'pitching' }>({});

  const gameDayPitching = useMemo(() => {
    const teamMap = new Map<string, Map<string, {
      name: string; number?: string; bf: number; pitches: number; strikes: number;
      hits: number; hr: number; bb: number; k: number; rbi: number;
    }>>();

    selectedDayEvents.forEach((ev: any) => {
      const pitcher = ev.labels?.Pitcher || ev.labels?.投手 || '';
      if (!pitcher || pitcher === '-') return;

      const batterTeam = (ev.labels as any)?.Team || (ev.labels as any)?.チーム || '';
      let pitcherTeam = 'チーム不明';
      
      const teamA = teamNames[0] || 'Aチーム';
      const teamB = teamNames[1] || 'Bチーム';
      if (batterTeam === teamA) pitcherTeam = teamB;
      else if (batterTeam === teamB) pitcherTeam = teamA;
      else if (batterTeam) pitcherTeam = `${batterTeam}の対戦相手`;

      const result = Object.values(ev.labels || {}).join(' ');
      const lRes = result.toLowerCase();

      if (!teamMap.has(pitcherTeam)) teamMap.set(pitcherTeam, new Map());
      const teamPitchers = teamMap.get(pitcherTeam)!;

      if (!teamPitchers.has(pitcher)) {
        const rosterPlayer = players.find((p: any) => p.name === pitcher);
        teamPitchers.set(pitcher, {
          name: pitcher,
          number: rosterPlayer?.number,
          bf: 0, pitches: 0, strikes: 0, hits: 0, hr: 0, bb: 0, k: 0, rbi: 0
        });
      }

      const ps = teamPitchers.get(pitcher)!;
      ps.pitches++;

      const isPlateAppearanceEnd = lRes.includes('本塁打') || lRes.includes('hr') || lRes.includes('ホームラン') ||
        lRes.includes('三塁打') || lRes.includes('3b') ||
        lRes.includes('二塁打') || lRes.includes('2b') || lRes.includes('ヒット') || lRes.includes('安打') || lRes.includes('単打') ||
        lRes.includes('四球') || lRes.includes('bb') || lRes.includes('walk') ||
        lRes.includes('死球') || lRes.includes('hbp') ||
        lRes.includes('三振') || lRes.includes('k ') || lRes.includes(' k') || lRes === 'k' ||
        lRes.includes('凡退') || lRes.includes('ゴロ') || lRes.includes('フライ') || lRes.includes('ライナー') || lRes.includes('アウト') || lRes.includes('失策') || lRes.includes('エラー') || lRes.includes('犠飛') || lRes.includes('犠打');

      if (isPlateAppearanceEnd) {
        ps.bf++;
        const isHR = lRes.includes('本塁打') || lRes.includes('hr') || lRes.includes('ホームラン');
        const is3B = lRes.includes('三塁打') || lRes.includes('3b');
        const is2B = lRes.includes('二塁打') || lRes.includes('2b') || lRes.includes('ツーベース');
        const is1B = lRes.includes('単打') || lRes.includes('1b') || lRes.includes('ヒット') || lRes.includes('安打');
        const isBB = lRes.includes('四球') || lRes.includes('bb') || lRes.includes('walk');
        const isHBP = lRes.includes('死球') || lRes.includes('hbp');
        const isK = lRes.includes('三振') || lRes.includes('k ') || lRes.includes(' k') || lRes === 'k';

        if (isHR || is3B || is2B || is1B) ps.hits++;
        if (isHR) ps.hr++;
        if (isBB || isHBP) ps.bb++;
        if (isK) ps.k++;

        const rbiLabel = (ev.labels as any)?.RBI || (ev.labels as any)?.打点 || '';
        const rbiNum = parseInt(rbiLabel);
        if (!isNaN(rbiNum)) ps.rbi += rbiNum;
      }

      if (lRes.includes('ストライク') || lRes.includes('空振り') || lRes.includes('見逃し') || lRes.includes('ファール') || lRes.includes('三振') || lRes.includes('安打') || lRes.includes('単打') || lRes.includes('2b') || lRes.includes('hr')) {
        ps.strikes++;
      }
    });

    return teamMap;
  }, [selectedDayEvents, players, teamNames]);

  return (
    <div className="flex-1 bg-[#0b0f19] p-4 sm:p-6 flex flex-col gap-6 text-zinc-100 overflow-y-auto overflow-x-hidden w-full max-w-full font-sans">
      {/* Baseball Savant Inspired Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111827] border border-rose-900/40 p-5 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Flame className="w-64 h-64 text-rose-500" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-widest shadow">
              MLB STATCAST STYLE
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Baseball Savant アナリティクス
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            OPS・WAR・FIP・球種・打球方向・コース別スタッツ熱線の自動集計
          </p>
        </div>

        {/* Data Source Switcher */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 bg-zinc-950/80 border border-zinc-800 p-1.5 rounded-xl">
          <button
            onClick={() => setDataMode('current')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dataMode === 'current'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            現在の試合データ ({currentEvents.length}件)
          </button>

          <button
            onClick={() => setDataMode('csv')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dataMode === 'csv'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/50'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            蓄積CSVデータ ({csvEvents.length}件)
          </button>

          <label className="px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 text-zinc-450 hover:text-white bg-zinc-900 border border-zinc-800">
            <Upload className="w-3.5 h-3.5" />
            📁 CSV追加読込
            <input type="file" accept=".csv" multiple onChange={handleFileUpload} className="hidden" />
          </label>

          {csvEvents.length === 0 ? (
            <button
              onClick={handleLoadDemoData}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-emerald-950/45 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-900/40"
              title="ダッシュボードの表示例を確認できる2試合分のデモデータを読み込みます"
            >
              💡 デモデータ読込
            </button>
          ) : (
            <button
              onClick={() => setShowManageModal(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
              title="読み込まれたCSVファイルごとの削除や全消去を行います"
            >
              ⚙️ 蓄積データ管理
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setSelectedTab('savant')}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            selectedTab === 'savant'
              ? 'bg-rose-955/80 text-rose-400 border border-rose-600/50 shadow-lg shadow-rose-950/40'
              : 'text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          <Flame className="w-4 h-4 text-rose-500" /> Savant チーム総合分析 & OPS
        </button>
        <button
          onClick={() => setSelectedTab('batter')}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            selectedTab === 'batter'
              ? 'bg-amber-955/80 text-amber-400 border border-amber-600/50 shadow-lg shadow-amber-950/40'
              : 'text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          <Target className="w-4 h-4 text-amber-500" /> 打者別 Statcast ヒートマップ & WAR
        </button>
        <button
          onClick={() => setSelectedTab('pitcher')}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            selectedTab === 'pitcher'
              ? 'bg-sky-955/80 text-sky-400 border border-sky-600/50 shadow-lg shadow-sky-950/40'
              : 'text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          <Activity className="w-4 h-4 text-sky-500" /> 投手別 Pitch Tracking & FIP
        </button>
        <button
          onClick={() => setSelectedTab('gameday')}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            selectedTab === 'gameday'
              ? 'bg-emerald-955/80 text-emerald-400 border border-emerald-600/50 shadow-lg shadow-emerald-950/40'
              : 'text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-500" /> 試合別 スタメン & スタッツ
        </button>
      </div>

      {/* TAB 1: SAVANT TEAM OVERVIEW & OPS */}
      {selectedTab === 'savant' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 bg-[#111827] p-4 rounded-2xl border border-zinc-800">
            <label className="text-xs font-bold text-zinc-400">分析対象のチームを選択:</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-rose-400 font-bold text-sm px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="all">全チーム合計</option>
              {teamNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* TOP HIGHLIGHT: OPS & MAIN DASHBOARD CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* GIANT OPS CARD */}
            <div className="lg:col-span-1 bg-gradient-to-br from-rose-950/90 via-zinc-900 to-zinc-950 border border-rose-600/50 p-6 rounded-2xl shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs uppercase font-black text-rose-400 tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> 総合 OPS (On-Base + Slugging)
                </span>
                <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded">
                  SAVANT KEY
                </span>
              </div>
              <div className="my-4">
                <p className="text-5xl font-black text-white tracking-tight font-mono">{teamStats.ops}</p>
                <div className="flex gap-4 text-xs font-semibold text-zinc-300 mt-2 font-mono">
                  <span>OBP: <strong className="text-teal-400">{teamStats.obp}</strong></span>
                  <span>+</span>
                  <span>SLG: <strong className="text-purple-400">{teamStats.slg}</strong></span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 border-t border-zinc-800 pt-2">
                出塁率 (OBP) と長打率 (SLG) を足し合わせた最強の打撃総合指標
              </p>
            </div>

            {/* KEY TRIPLE SLASH STATS GRID */}
            <div className="lg:col-span-3">
              <SlashStatsGrid stats={teamStats} />
            </div>
          </div>

          {/* NEW: ADVANCED SABERMETRICS FOR TEAM */}
          <AdvancedSabermetricsGrid stats={teamStats} title="チーム総合" />

          {/* STATCAST ZONE HEATMAP & DETAILED ZONE TABLE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Savant Style Strike Zone (5x5 Grid) */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-rose-500" />
                  Savant ストライクゾーン・コース熱線 (5x5 Heatmap)
                </h3>
                <span className="text-[9px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                  赤=高頻度 / 青=低頻度
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* The Heatmap itself */}
                <div className="flex-1 flex justify-center py-2">
                  <StrikeZoneHeatmap courseStatsMap={teamHeatmapData.stats.courseStatsMap} />
                </div>

                {/* Pitch Type Selector Panel */}
                <div className="w-full sm:w-44 bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-2.5">
                  <div className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">表示する球種</div>
                  <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
                    <button
                      onClick={() => setTeamHeatmapPitchType('all')}
                      className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                        teamHeatmapPitchType === 'all'
                          ? 'bg-zinc-850 border-zinc-700 text-white'
                          : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 block" />
                      すべて ({teamStats.courseStatsMap ? Object.values(teamStats.courseStatsMap).reduce((acc, curr) => acc + curr.pitches, 0) : 0}球)
                    </button>
                    {teamHeatmapData.list.map(type => {
                      const count = teamHeatmapData.counts[type] || 0;
                      const color = getPitchColor(type);
                      return (
                        <button
                          key={type}
                          onClick={() => setTeamHeatmapPitchType(type)}
                          className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                            teamHeatmapPitchType === type
                              ? 'bg-zinc-850 border-zinc-700 text-white'
                              : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full block border border-zinc-900/50" style={{ backgroundColor: color }} />
                          <span className="truncate" style={{ color: teamHeatmapPitchType === type ? '#ffffff' : color }}>{type}</span>
                          <span className="text-[9px] text-zinc-500 font-normal ml-auto">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Statcast Course Breakdown Table */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400" />
                コース別スタッツテーブル (Statcast Zone Breakdown Table)
              </h3>

              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] font-black uppercase text-zinc-400 bg-zinc-950">
                      <th className="p-2">コース (Zone/捕手目線)</th>
                      <th className="p-2 font-mono">投球数</th>
                      <th className="p-2 font-mono">安打 (H)</th>
                      <th className="p-2 font-mono">本塁打 (HR)</th>
                      <th className="p-2 font-mono">空振り (Whiff)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 font-mono text-zinc-300">
                    {Object.keys(teamHeatmapData.stats.courseStatsMap).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-zinc-500 font-sans">コースデータがまだ登録されていません。</td>
                      </tr>
                    ) : (
                      Object.entries(teamHeatmapData.stats.courseStatsMap)
                        .sort((a, b) => b[1].pitches - a[1].pitches)
                        .map(([course, st]) => (
                          <tr key={course} className="hover:bg-zinc-900/80">
                            <td className="p-2 font-bold text-amber-300">{course}</td>
                            <td className="p-2 text-white font-bold">{st.pitches}</td>
                            <td className="p-2 text-emerald-400">{st.hits}</td>
                            <td className="p-2 text-rose-400">{st.hr}</td>
                            <td className="p-2 text-sky-400">{st.whiffs}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* NEW: PITCH MIX & HIT DIRECTION GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pitch Mix Table */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                チーム全体の球種スタッツ表 (Team Pitch Mix Stats)
              </h3>
              <PitchMixTable pitchTypeMap={teamStats.pitchTypeMap} />
            </div>

            {/* Stadium Spray Chart (Upgraded) */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                チーム全体の打球スプレーチャート & 方向割合 (Team Stadium Spray Chart)
              </h3>
              <StadiumSprayChart hitDirectionMap={teamStats.hitDirectionMap} events={filteredTeamEvents} mode="team" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BATTER DEEP DIVE */}
      {selectedTab === 'batter' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 bg-[#111827] p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-zinc-400">分析対象の打者を選択:</label>
              <select
                value={selectedBatterName}
                onChange={(e) => setSelectedBatterName(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-amber-400 font-bold text-sm px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="all">全打者合計</option>
                {batterNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-zinc-400">投手利き腕 (Vs Hand):</label>
              <select
                value={batterVsHand}
                onChange={(e) => setBatterVsHand(e.target.value as 'all' | 'R' | 'L')}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 font-bold text-xs px-2.5 py-1.5 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="all">すべて対戦</option>
                <option value="R">対 右投手 (Vs RHP)</option>
                <option value="L">対 左投手 (Vs LHP)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-1.5 hover:border-zinc-700 transition-all select-none text-xs font-black text-zinc-300 active:scale-95">
              <input
                type="checkbox"
                checked={batterScoringPositionOnly}
                onChange={(e) => setBatterScoringPositionOnly(e.target.checked)}
                className="rounded border-zinc-800 text-amber-500 focus:ring-amber-500/30 w-3.5 h-3.5 bg-zinc-950 cursor-pointer"
              />
              🔥 得点圏のみ (Scoring Position Only)
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* INDIVIDUAL OPS CARD */}
            <div className="lg:col-span-1 bg-gradient-to-br from-amber-950/80 via-zinc-900 to-zinc-950 border border-amber-600/50 p-6 rounded-2xl shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div>
                <span className="text-xs uppercase font-black text-amber-400 tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> 打者 OPS
                </span>
                <p className="text-[10px] text-zinc-400 mt-0.5">{selectedBatterName === 'all' ? 'チーム全体' : selectedBatterName}</p>
              </div>
              <div className="my-4">
                <p className="text-5xl font-black text-white tracking-tight font-mono">{batterStats.ops}</p>
                <div className="flex gap-4 text-xs font-semibold text-zinc-300 mt-2 font-mono">
                  <span>OBP: <strong className="text-teal-400">{batterStats.obp}</strong></span>
                  <span>SLG: <strong className="text-purple-400">{batterStats.slg}</strong></span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 border-t border-zinc-800 pt-2 font-semibold flex justify-between">
                <span>打率: {batterStats.avg}</span>
                <span className="text-amber-400">簡易WAR: {batterStats.war}</span>
              </p>
            </div>

            {/* DETAILED STATS */}
            <div className="lg:col-span-3">
              <SlashStatsGrid stats={batterStats} />
            </div>
          </div>

          {/* NEW: ADVANCED SABERMETRICS GRID */}
          <AdvancedSabermetricsGrid stats={batterStats} title={`${selectedBatterName === 'all' ? 'チーム' : selectedBatterName + ' 選手'}`} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Individual Strike Zone (5x5 Grid) */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-500" />
                  打者別コース別投球分布ヒートマップ (5x5 Heatmap)
                </h3>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* The Heatmap itself */}
                <div className="flex-1 flex justify-center py-2">
                  <StrikeZoneHeatmap courseStatsMap={batterHeatmapData.stats.courseStatsMap} />
                </div>

                {/* Pitch Type Selector Panel */}
                <div className="w-full sm:w-44 bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-2.5">
                  <div className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">表示する球種</div>
                  <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
                    <button
                      onClick={() => setBatterHeatmapPitchType('all')}
                      className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                        batterHeatmapPitchType === 'all'
                          ? 'bg-zinc-850 border-zinc-700 text-white'
                          : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 block" />
                      すべて ({batterStats.courseStatsMap ? Object.values(batterStats.courseStatsMap).reduce((acc, curr) => acc + curr.pitches, 0) : 0}球)
                    </button>
                    {batterHeatmapData.list.map(type => {
                      const count = batterHeatmapData.counts[type] || 0;
                      const color = getPitchColor(type);
                      return (
                        <button
                          key={type}
                          onClick={() => setBatterHeatmapPitchType(type)}
                          className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                            batterHeatmapPitchType === type
                              ? 'bg-zinc-850 border-zinc-700 text-white'
                              : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full block border border-zinc-900/50" style={{ backgroundColor: color }} />
                          <span className="truncate" style={{ color: batterHeatmapPitchType === type ? '#ffffff' : color }}>{type}</span>
                          <span className="text-[9px] text-zinc-500 font-normal ml-auto">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* NEW: Batter Velocity Tier Performance Panel (Inserted right below heat map) */}
              <div className="pt-3 border-t border-zinc-850/80 space-y-2">
                <span className="text-[11px] font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  ⚡ 対戦球速帯別 打撃成績 (Pitch Speed Breakdown)
                </span>
                {batterVelocityStats.totalWithSpeed === 0 ? (
                  <div className="text-[10px] text-zinc-500 font-sans py-1">
                    球速データが記録されると、球速帯ごとの打撃成績がここに自動表示されます。
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                    {Object.entries(batterVelocityStats.tiers).map(([key, tier]) => {
                      const avgStr = tier.atBats > 0 ? (tier.hits / tier.atBats).toFixed(3).replace(/^0/, '') : '.---';
                      return (
                        <div key={key} className="bg-zinc-950 p-2 rounded-xl border border-zinc-850 flex flex-col justify-between">
                          <span className="text-[9.5px] font-bold text-zinc-400 font-sans">{tier.label}</span>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-xs font-black text-emerald-400">{avgStr}</span>
                            <span className="text-[9px] text-zinc-500">{tier.hits}H / {tier.atBats}打数</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Upgraded Individual Stadium Spray Chart */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-lg">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                打撃スプレーチャート & 打球割合 (Stadium Spray Chart)
              </h3>
              <StadiumSprayChart hitDirectionMap={batterStats.hitDirectionMap} events={batterEvents} mode="batter" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Batter logs */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-white">個別打撃成績まとめ ({selectedBatterName === 'all' ? '全打者合計' : selectedBatterName})</h3>
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">総打席記録数: <span className="font-bold text-white">{batterEvents.length}件</span></p>
                <div className="divide-y divide-zinc-800 max-h-[350px] overflow-y-auto font-mono text-xs">
                  {batterEvents.map(ev => (
                    <div key={ev.id} className="py-2 flex justify-between hover:bg-zinc-900 px-1 rounded transition-colors">
                      <span className="text-zinc-300 font-semibold">{ev.labels?.Result || ev.labels?.Play || '打撃記録'}</span>
                      <span className="text-amber-400">
                        {ev.labels?.Course || '-'} 
                        <span className="text-zinc-500 font-normal"> (</span>
                        <span className="font-bold" style={{ color: getPitchColor(ev.labels?.['Pitch Type'] || ev.labels?.['球種']) }}>
                          {ev.labels?.['Pitch Type'] || ev.labels?.['球種'] || '-'}
                        </span>
                        <span className="text-zinc-500 font-normal">)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Zone breakdown table */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-white">コース別詳細テーブル</h3>
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] font-black uppercase text-zinc-400 bg-zinc-950">
                      <th className="p-2">コース (捕手目線)</th>
                      <th className="p-2 font-mono">投球数</th>
                      <th className="p-2 font-mono">安打 (H)</th>
                      <th className="p-2 font-mono">本塁打 (HR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 font-mono text-zinc-300">
                    {Object.keys(batterHeatmapData.stats.courseStatsMap).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-zinc-500 font-sans">コースデータがありません。</td>
                      </tr>
                    ) : (
                      Object.entries(batterHeatmapData.stats.courseStatsMap)
                        .sort((a, b) => b[1].pitches - a[1].pitches)
                        .map(([course, st]) => (
                          <tr key={course} className="hover:bg-zinc-900/80">
                            <td className="p-2 font-bold text-amber-300">{course}</td>
                            <td className="p-2 text-white font-bold">{st.pitches}</td>
                            <td className="p-2 text-emerald-400">{st.hits}</td>
                            <td className="p-2 text-rose-400">{st.hr}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PITCHER DEEP DIVE */}
      {selectedTab === 'pitcher' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4 bg-[#111827] p-4 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-zinc-400">分析対象の投手を選択:</label>
              <select
                value={selectedPitcherName}
                onChange={(e) => setSelectedPitcherName(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-sky-400 font-bold text-sm px-3 py-1.5 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="all">全投手合計</option>
                {pitcherNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-zinc-400">打者打席 (Vs Hand):</label>
              <select
                value={pitcherVsHand}
                onChange={(e) => setPitcherVsHand(e.target.value as 'all' | 'R' | 'L')}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 font-bold text-xs px-2.5 py-1.5 rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="all">すべて対戦</option>
                <option value="R">対 右打者 (Vs RHB)</option>
                <option value="L">対 左打者 (Vs LHB)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-1.5 hover:border-zinc-700 transition-all select-none text-xs font-black text-zinc-300 active:scale-95">
              <input
                type="checkbox"
                checked={pitcherScoringPositionOnly}
                onChange={(e) => setPitcherScoringPositionOnly(e.target.checked)}
                className="rounded border-zinc-800 text-sky-500 focus:ring-sky-500/30 w-3.5 h-3.5 bg-zinc-950 cursor-pointer"
              />
              🔥 得点圏のみ (Scoring Position Only)
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* INDIVIDUAL PITCHER SUMMARY CARD */}
            <div className="lg:col-span-1 bg-gradient-to-br from-sky-950/80 via-zinc-900 to-zinc-950 border border-sky-600/50 p-6 rounded-2xl shadow-2xl flex flex-col justify-between relative overflow-hidden">
              <div>
                <span className="text-xs uppercase font-black text-sky-400 tracking-wider flex items-center gap-1">
                  <Activity className="w-4 h-4" /> 投手サマリー
                </span>
                <p className="text-[10px] text-zinc-400 mt-0.5">{selectedPitcherName === 'all' ? '全投手合計' : selectedPitcherName}</p>
              </div>
              <div className="my-4">
                <p className="text-4xl font-black text-white tracking-tight font-mono">{pitcherEvents.length}球</p>
                <div className="flex flex-col gap-1 text-xs font-semibold text-zinc-300 mt-2 font-mono">
                  <span>奪三振: <strong className="text-rose-400">{pitcherStats.k}</strong></span>
                  <span>被安打: <strong className="text-emerald-400">{pitcherStats.hits}</strong> (HR: {pitcherStats.hr})</span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 border-t border-zinc-800 pt-2 font-mono flex justify-between">
                <span>被AVG: {pitcherStats.avg}</span>
                <span className="text-sky-400 font-bold">投手WAR: {pitcherStats.pitcherWar}</span>
              </p>
            </div>

            {/* DETAILED STATS */}
            <div className="lg:col-span-3">
              <SlashStatsGrid stats={pitcherStats} />
            </div>
          </div>

          {/* NEW: ADVANCED PITCHING SABERMETRICS GRID */}
          <AdvancedPitchingMetricsGrid stats={pitcherStats} title={`${selectedPitcherName === 'all' ? 'チーム投手' : selectedPitcherName + ' 投手'}`} />

          {/* NEW: PITCH VELOCITY & STAMINA ANALYTICS SECTION */}
          <div className="bg-[#111827] border border-zinc-800 p-4 rounded-2xl space-y-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-850 pb-2.5">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                球速・スタミナ推移アナリティクス (Velocity & Stamina Breakdown)
              </h3>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 rounded-lg text-zinc-300">
                  最速: <strong className="text-amber-400 font-bold">{formatPitchSpeed(pitcherVelocityStats.maxSpeed)}</strong>
                </span>
                <span className="bg-zinc-950 border border-zinc-800 px-2.5 py-0.5 rounded-lg text-zinc-300">
                  平均: <strong className="text-sky-400 font-bold">{formatPitchSpeed(pitcherVelocityStats.avgSpeed)}</strong>
                </span>
              </div>
            </div>

            {pitcherVelocityStats.totalPitchesWithSpeed === 0 ? (
              <div className="py-4 text-center text-[11px] text-zinc-500 font-sans">
                球速データが記録されていません。打刻時に球速を入力すると、イニング別・球種別の球速推移が自動分析されます。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inning Speed Trend SVG Line Chart */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-2 flex flex-col justify-between">
                  <span className="text-[11px] font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    📈 イニング別 平均・最速球速 (スタミナ推移グラフ)
                  </span>
                  <InningVelocityChart trend={pitcherVelocityStats.inningTrend} />
                </div>

                {/* Pitch Type Speeds */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-2">
                  <span className="text-[11px] font-black text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                    ⚾ 球種別 球速範囲 (平均 / 最速 / 最緩)
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {pitcherVelocityStats.pitchTypeSpeeds.map(row => (
                      <div key={row.pitchType} className="px-2.5 py-1.5 rounded bg-zinc-900/80 border border-zinc-850 text-xs flex items-center justify-between font-mono">
                        <span className="font-bold text-zinc-200 font-sans truncate max-w-[90px] text-[11px]" style={{ color: getPitchColor(row.pitchType) }}>
                          {row.pitchType}
                        </span>
                        <div className="flex items-center gap-2.5 text-[11px]">
                          <span className="text-sky-300">平均: {formatPitchSpeed(row.avg)}</span>
                          <span className="text-amber-300">最速: {formatPitchSpeed(row.max)}</span>
                          <span className="text-zinc-500">最緩: {formatPitchSpeed(row.min)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Individual Strike Zone (5x5 Grid) */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-sky-500" />
                  投手別コース別投球分布ヒートマップ (5x5 Heatmap)
                </h3>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* The Heatmap itself */}
                <div className="flex-1 flex justify-center py-2">
                  <StrikeZoneHeatmap courseStatsMap={pitcherHeatmapData.stats.courseStatsMap} />
                </div>

                {/* Pitch Type Selector Panel */}
                <div className="w-full sm:w-44 bg-zinc-950 p-3 rounded-xl border border-zinc-850 space-y-2.5">
                  <div className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">表示する球種</div>
                  <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
                    <button
                      onClick={() => setPitcherHeatmapPitchType('all')}
                      className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                        pitcherHeatmapPitchType === 'all'
                          ? 'bg-zinc-850 border-zinc-700 text-white'
                          : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 block" />
                      すべて ({pitcherStats.courseStatsMap ? Object.values(pitcherStats.courseStatsMap).reduce((acc, curr) => acc + curr.pitches, 0) : 0}球)
                    </button>
                    {pitcherHeatmapData.list.map(type => {
                      const count = pitcherHeatmapData.counts[type] || 0;
                      const color = getPitchColor(type);
                      return (
                        <button
                          key={type}
                          onClick={() => setPitcherHeatmapPitchType(type)}
                          className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                            pitcherHeatmapPitchType === type
                              ? 'bg-zinc-850 border-zinc-700 text-white'
                              : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-300'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full block border border-zinc-900/50" style={{ backgroundColor: color }} />
                          <span className="truncate" style={{ color: pitcherHeatmapPitchType === type ? '#ffffff' : color }}>{type}</span>
                          <span className="text-[9px] text-zinc-500 font-normal ml-auto">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Pitch Mix Table */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-lg">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                球種別スタッツ表 (Pitch Mix Table)
              </h3>
              <PitchMixTable pitchTypeMap={pitcherStats.pitchTypeMap} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pitcher logs detail */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-3 shadow-lg">
              <h3 className="text-sm font-bold text-white">投手ログ詳細 ({selectedPitcherName === 'all' ? '全投手合計' : selectedPitcherName})</h3>
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">総投球記録数: <span className="font-bold text-white">{pitcherEvents.length}球</span></p>
                <div className="divide-y divide-zinc-800 max-h-[300px] overflow-y-auto font-mono text-xs">
                  {pitcherEvents.map(ev => {
                    const spStr = getLabelValueByKeywords(ev.labels, ['pitch speed', 'pitchspeed', '球速', 'pitch_speed', 'speed']);
                    const spNum = parsePitchSpeedNumber(spStr);
                    return (
                      <div key={ev.id} className="py-2 flex items-center justify-between hover:bg-zinc-900 px-1 rounded transition-colors">
                        <span className="text-zinc-300 font-semibold">{ev.labels?.Result || ev.labels?.Play || '投球記録'}</span>
                        <div className="flex items-center gap-3">
                          {spNum && (
                            <span className="text-amber-400 font-bold text-[11px]">{formatPitchSpeed(spNum)}</span>
                          )}
                          <span className="text-sky-400 text-[11px]">
                            {ev.labels?.Course || '-'} 
                            <span className="text-zinc-500 font-normal"> (球種: </span>
                            <span className="font-bold" style={{ color: getPitchColor(ev.labels?.['Pitch Type'] || ev.labels?.['球種']) }}>
                              {ev.labels?.['Pitch Type'] || ev.labels?.['球種'] || '-'}
                            </span>
                            <span className="text-zinc-500 font-normal">)</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Course Summary Table for Pitcher */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-3 shadow-lg">
              <h3 className="text-sm font-bold text-white">コース別被投球サマリー</h3>
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] font-black uppercase text-zinc-400 bg-zinc-950">
                      <th className="p-2">コース</th>
                      <th className="p-2 font-mono">投球数</th>
                      <th className="p-2 font-mono">被安打</th>
                      <th className="p-2 font-mono">被HR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 font-mono text-zinc-300">
                    {Object.keys(pitcherHeatmapData.stats.courseStatsMap).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-zinc-500 font-sans">コースデータがありません。</td>
                      </tr>
                    ) : (
                      Object.entries(pitcherHeatmapData.stats.courseStatsMap)
                        .sort((a, b) => b[1].pitches - a[1].pitches)
                        .map(([course, st]) => (
                          <tr key={course} className="hover:bg-zinc-900/80">
                            <td className="p-2 font-bold text-amber-300">{course}</td>
                            <td className="p-2 text-white font-bold">{st.pitches}</td>
                            <td className="p-2 text-emerald-400">{st.hits}</td>
                            <td className="p-2 text-rose-400">{st.hr}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GAME DAY ANALYSIS */}
      {selectedTab === 'gameday' && (
        <div className="space-y-6">
          {/* Game day selector */}
          <div className="bg-[#111827] border border-emerald-900/40 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-black text-white">試合日を選択</span>
            </div>
            {gameDays.length === 0 ? (
              <p className="text-xs text-zinc-500">タグデータがありません。試合のタグ打ちを行ってください。</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {gameDays.map(([day, evs]) => (
                  <button
                    key={day}
                    onClick={() => setSelectedGameDay(day)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      (selectedGameDay || gameDays[0]?.[0]) === day
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                    }`}
                  >
                    {day}
                    <span className="ml-1.5 opacity-70">{evs.length}件</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* MLB-Style Line Scoreboard */}
          {scoreboardData && gameDays.length > 0 && (
            <div className="max-w-3xl mx-auto bg-[#111827] border border-zinc-800 p-5 rounded-2xl shadow-xl space-y-3 w-full">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                イニング別スコアボード (Line Scoreboard)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs font-mono select-none table-fixed min-w-[500px]">
                  <thead>
                    <tr className="border-b border-zinc-850 text-zinc-500 font-bold uppercase tracking-wider">
                      <th className="px-2 py-2 text-left font-sans text-[11px] w-[25%]">チーム</th>
                      {Array.from({ length: scoreboardData.maxInning }).map((_, idx) => (
                        <th key={idx} className="px-1 py-2 w-[6.5%]">{idx + 1}</th>
                      ))}
                      <th className="px-1 py-2 w-[7%] text-amber-400 font-black border-l border-zinc-850">R</th>
                      <th className="px-1 py-2 w-[7%] text-emerald-400 font-bold">H</th>
                      <th className="px-1 py-2 w-[7%] text-red-400 font-bold">E</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-900/60 hover:bg-zinc-900/10">
                      <td className="px-2 py-3 text-left font-sans font-bold text-white text-[11.5px] truncate">
                        {scoreboardData.team1}
                      </td>
                      {scoreboardData.team1Scores.map((score, idx) => (
                        <td key={idx} className="px-1 py-3 text-zinc-300 font-medium">
                          {score}
                        </td>
                      ))}
                      <td className="px-1 py-3 text-amber-400 font-extrabold text-[13px] border-l border-zinc-850 bg-amber-500/5">
                        {scoreboardData.team1Runs}
                      </td>
                      <td className="px-1 py-3 text-emerald-400 font-bold">
                        {scoreboardData.team1Hits}
                      </td>
                      <td className="px-1 py-3 text-red-400 font-bold">
                        {scoreboardData.team1Errors}
                      </td>
                    </tr>
                    <tr className="hover:bg-zinc-900/10">
                      <td className="px-2 py-3 text-left font-sans font-bold text-white text-[11.5px] truncate">
                        {scoreboardData.team2}
                      </td>
                      {scoreboardData.team2Scores.map((score, idx) => (
                        <td key={idx} className="px-1 py-3 text-zinc-300 font-medium">
                          {score}
                        </td>
                      ))}
                      <td className="px-1 py-3 text-amber-400 font-extrabold text-[13px] border-l border-zinc-850 bg-amber-500/5">
                        {scoreboardData.team2Runs}
                      </td>
                      <td className="px-1 py-3 text-emerald-400 font-bold">
                        {scoreboardData.team2Hits}
                      </td>
                      <td className="px-1 py-3 text-red-400 font-bold">
                        {scoreboardData.team2Errors}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Per-team Lineup & Stats */}
          {gameDays.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {Array.from(gameDayLineup.entries()).map(([teamName, playerMap]) => {
                const viewMode = gameDayViewMode[teamName] || 'batting';
                
                const lineup = Array.from(playerMap.values()).sort((a: any, b: any) => {
                  if (a.order && b.order) return a.order - b.order;
                  if (a.order) return -1;
                  if (b.order) return 1;
                  return b.pa - a.pa;
                });

                const pitchingMap = gameDayPitching.get(teamName);
                const pitchers = pitchingMap ? Array.from(pitchingMap.values()).sort((a: any, b: any) => b.pitches - a.pitches) : [];

                return (
                  <div key={teamName} className="bg-[#111827] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                    {/* Team header */}
                    <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-950/60 to-zinc-900 border-b border-zinc-800 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-black text-white">{teamName}</span>
                      </div>

                      {/* Batting/Pitching Sub-tab switcher */}
                      <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-850 select-none">
                        <button
                          onClick={() => setGameDayViewMode(prev => ({ ...prev, [teamName]: 'batting' }))}
                          className={`px-2.5 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                            viewMode === 'batting'
                              ? 'bg-emerald-600 text-white shadow'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          打撃スタッツ
                        </button>
                        <button
                          onClick={() => setGameDayViewMode(prev => ({ ...prev, [teamName]: 'pitching' }))}
                          className={`px-2.5 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${
                            viewMode === 'pitching'
                              ? 'bg-sky-600 text-white shadow'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          投手スタッツ
                        </button>
                      </div>
                    </div>

                    {/* STATS TABLES */}
                    {viewMode === 'batting' ? (
                      /* Batting/Lineup Table */
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-500 font-bold tracking-wider">
                              <th className="px-4 py-2.5 w-8">#</th>
                              <th className="px-4 py-2.5 min-w-28">選手名</th>
                              <th className="px-2 py-2.5 text-center">PA</th>
                              <th className="px-2 py-2.5 text-center">AB</th>
                              <th className="px-2 py-2.5 text-center">H</th>
                              <th className="px-2 py-2.5 text-center">1B</th>
                              <th className="px-2 py-2.5 text-center">2B</th>
                              <th className="px-2 py-2.5 text-center">HR</th>
                              <th className="px-2 py-2.5 text-center">BB</th>
                              <th className="px-2 py-2.5 text-center">K</th>
                              <th className="px-2 py-2.5 text-center">RBI</th>
                              <th className="px-3 py-2.5 text-center">AVG</th>
                              <th className="px-3 py-2.5 text-center">OBP</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900">
                            {lineup.map((player: any, idx: number) => {
                              const avg = player.ab > 0 ? (player.hits / player.ab).toFixed(3) : '---';
                              const obp = player.pa > 0 ? ((player.hits + player.bb) / player.pa).toFixed(3) : '---';
                              return (
                                <tr key={player.name} className="hover:bg-zinc-900/50 transition-colors bg-transparent">
                                  <td className="px-4 py-2.5">
                                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-[9px] font-black flex items-center justify-center">
                                      {player.order ?? (idx + 1)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      {player.number && (
                                        <span className="text-[9px] font-black text-zinc-500 font-mono">#{player.number}</span>
                                      )}
                                      <span className="font-bold text-white">{player.name}</span>
                                      {player.positionType === 'pitcher' && (
                                        <span className="text-[8px] bg-sky-950 text-sky-400 border border-sky-900 px-1 py-0.5 rounded font-black">P</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-2 py-2.5 text-center font-mono text-zinc-300">{player.pa}</td>
                                  <td className="px-2 py-2.5 text-center font-mono text-zinc-400">{player.ab}</td>
                                  <td className="px-2 py-2.5 text-center font-mono font-bold text-amber-400">{player.hits}</td>
                                  <td className="px-2 py-2.5 text-center font-mono text-zinc-400">{player.b1}</td>
                                  <td className="px-2 py-2.5 text-center font-mono text-zinc-400">{player.b2}</td>
                                  <td className="px-2 py-2.5 text-center font-mono font-bold text-rose-400">{player.hr}</td>
                                  <td className="px-2 py-2.5 text-center font-mono text-zinc-400">{player.bb}</td>
                                  <td className="px-2 py-2.5 text-center font-mono text-zinc-400">{player.k}</td>
                                  <td className="px-2 py-2.5 text-center font-mono font-bold text-emerald-400">{player.rbi}</td>
                                  <td className="px-3 py-2.5 text-center font-mono font-bold">
                                    <span className="text-zinc-300">
                                      {avg}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center font-mono font-bold">
                                    <span className="text-zinc-300">
                                      {obp}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* Pitching Stats Table */
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-950/60 border-b border-zinc-800 text-zinc-550 font-bold tracking-wider">
                              <th className="px-4 py-2.5 w-8">#</th>
                              <th className="px-4 py-2.5 min-w-28">投手名</th>
                              <th className="px-2 py-2.5 text-center">NP (球数)</th>
                              <th className="px-2 py-2.5 text-center">BF (打者)</th>
                              <th className="px-2 py-2.5 text-center">S (ストライク)</th>
                              <th className="px-2 py-2.5 text-center">Str% (S率)</th>
                              <th className="px-2 py-2.5 text-center">H (被安打)</th>
                              <th className="px-2 py-2.5 text-center">HR (被本)</th>
                              <th className="px-2 py-2.5 text-center">BB (与四)</th>
                              <th className="px-2 py-2.5 text-center">SO (三振)</th>
                              <th className="px-2 py-2.5 text-center">R (失点)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900">
                            {pitchers.length === 0 ? (
                              <tr>
                                <td colSpan={11} className="px-4 py-8 text-center text-zinc-500">
                                  この試合日の投手記録はありません
                                </td>
                              </tr>
                            ) : (
                              pitchers.map((pitcher: any, idx: number) => {
                                const strikeRate = pitcher.pitches > 0 ? ((pitcher.strikes / pitcher.pitches) * 100).toFixed(1) : '0.0';
                                return (
                                  <tr key={pitcher.name} className="hover:bg-zinc-900/50 transition-colors bg-transparent">
                                    <td className="px-4 py-2.5">
                                      <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-[9px] font-black flex items-center justify-center">
                                        {idx + 1}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <div className="flex items-center gap-2">
                                        {pitcher.number && (
                                          <span className="text-[9px] font-black text-zinc-500 font-mono">#{pitcher.number}</span>
                                        )}
                                        <span className="font-bold text-white">{pitcher.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-2 py-2.5 text-center font-mono font-bold text-sky-400">{pitcher.pitches}</td>
                                    <td className="px-2 py-2.5 text-center font-mono text-zinc-350">{pitcher.bf}</td>
                                    <td className="px-2 py-2.5 text-center font-mono text-zinc-400">{pitcher.strikes}</td>
                                    <td className="px-2 py-2.5 text-center font-mono font-bold text-emerald-400">{strikeRate}%</td>
                                    <td className="px-2 py-2.5 text-center font-mono text-rose-450">{pitcher.hits}</td>
                                    <td className="px-2 py-2.5 text-center font-mono text-rose-500">{pitcher.hr}</td>
                                    <td className="px-2 py-2.5 text-center font-mono text-zinc-400">{pitcher.bb}</td>
                                    <td className="px-2 py-2.5 text-center font-mono font-bold text-emerald-400">{pitcher.k}</td>
                                    <td className="px-2 py-2.5 text-center font-mono text-zinc-350">{pitcher.rbi}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {gameDays.length > 0 && gameDayLineup.size === 0 && (
            <div className="bg-[#111827] border border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">この試合日の打席データがありません</p>
              <p className="text-xs mt-1 opacity-60">「打者」ラベルが付いたイベントが必要です</p>
            </div>
          )}
        </div>
      )}

      {/* ⚙️ 蓄積データ管理モーダル */}
      {showManageModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚙️</span>
                <h3 className="text-sm font-extrabold text-white">蓄積されたCSVデータの管理</h3>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors cursor-pointer"
              >
                閉じる
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1 scrollbar-thin">
              <p className="text-xs text-zinc-450 leading-relaxed">
                読み込まれたCSVファイルは、現在のアカウント（チーム）ごとにPC内に保存され、起動時に自動ロードされます。
              </p>

              <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">総蓄積データ件数</p>
                  <p className="text-xl font-black text-white font-mono mt-0.5">{csvEvents.length} <span className="text-xs font-normal text-zinc-400">打席イベント</span></p>
                </div>
                <button
                  onClick={handleAdminClearAllCsv}
                  disabled={csvEvents.length === 0}
                  className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-900/40 disabled:opacity-40 disabled:cursor-not-allowed text-rose-400 hover:text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow"
                >
                  すべてのデータを消去
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">📁 読み込み済みのファイル一覧</h4>
                {csvEvents.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-6 bg-zinc-950/50 border border-dashed border-zinc-800 rounded-xl">読み込まれたCSVファイルはありません</p>
                ) : (
                  <div className="divide-y divide-zinc-850 border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/20 max-h-[250px] overflow-y-auto">
                    {Array.from(
                      csvEvents.reduce((acc, ev) => {
                        const file = ev.sourceCsvName || '未分類ファイル';
                        acc.set(file, (acc.get(file) || 0) + 1);
                        return acc;
                      }, new Map<string, number>()).entries()
                    ).map(([fileName, count]) => (
                      <div key={fileName} className="p-3 flex items-center justify-between hover:bg-zinc-900/40 text-xs">
                        <div className="flex flex-col gap-0.5 min-w-0 pr-4">
                          <span className="font-bold text-white truncate font-mono" title={fileName}>{fileName}</span>
                          <span className="text-[9px] text-zinc-500 font-bold font-mono">{count}打席</span>
                        </div>
                        <button
                          onClick={() => handleAdminDeleteCsvFile(fileName)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-rose-950 border border-zinc-800 hover:border-rose-900 text-zinc-400 hover:text-rose-450 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          🗑 削除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
