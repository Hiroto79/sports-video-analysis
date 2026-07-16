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

  const safeOuts = Math.max(1, totalOuts);
  const ip = safeOuts / 3;

  const k9Val = (k * 27) / safeOuts;
  const bb9Val = (bb * 27) / safeOuts;
  const h9Val = (hits * 27) / safeOuts;
  const hr9Val = (hr * 27) / safeOuts;
  const whipVal = (bb + hits) / ip;

  // 簡易 FIP (被本塁打・与四死球・奪三振のみでの投手能力評価)
  const fipVal = ip > 0 ? ((13 * hr + 3 * (bb + hbp) - 2 * k) / ip) + 3.15 : 0;
  
  // 投手 WAR (投球イニングとFIP、奪三振貢献)
  const pitcherWarVal = ip > 0 ? (ip * (4.40 - fipVal) / 9) + (k * 0.07) : 0;

  const formatRate = (val: number) => {
    if (isNaN(val) || val < 0) return '.000';
    return val.toFixed(3).replace(/^0/, '');
  };

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
    <div className="grid grid-cols-5 gap-1.5 aspect-square max-w-[280px] mx-auto p-3 bg-[#0b0f19] rounded-2xl border border-zinc-800 shadow-inner select-none animate-fade-in">
      {Array.from({ length: 25 }).map((_, idx) => {
        const row = Math.floor(idx / 5) + 1;
        const col = (idx % 5) + 1;
        const courseId = `B${row}${col}`;
        const data = courseStatsMap[courseId] || { pitches: 0, hits: 0, hr: 0, whiffs: 0 };
        const intensity = Math.min(1, data.pitches / 8);

        return (
          <div
            key={courseId}
            className="rounded-lg flex flex-col items-center justify-center text-[9px] font-black font-mono transition-all border border-zinc-800/80 shadow"
            style={{
              backgroundColor: data.pitches > 0 ? `rgba(225, 29, 72, ${0.18 + intensity * 0.75})` : 'transparent',
              color: data.pitches > 0 ? '#ffffff' : '#4b5563'
            }}
            title={`${courseId}: ${data.pitches}球 / 安打:${data.hits} / HR:${data.hr}`}
          >
            <span className="text-[7.5px] text-zinc-400">{courseId}</span>
            <span>{data.pitches > 0 ? data.pitches : '-'}</span>
          </div>
        );
      })}
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
            Object.entries(pitchTypeMap)
              .sort((a, b) => b[1].pitches - a[1].pitches)
              .map(([type, st]) => {
                const percent = totalPitches > 0 ? ((st.pitches / totalPitches) * 100).toFixed(1) : '0.0';
                const strikeRate = st.pitches > 0 ? ((st.strikes / st.pitches) * 100).toFixed(1) : '0.0';
                const whiffRate = st.pitches > 0 ? ((st.whiffs / st.pitches) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={type} className="hover:bg-zinc-900/80">
                    <td className="p-2 font-bold text-amber-300">{type}</td>
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

// NEW Stadium Spray Chart with dynamic lines & percentage labels
const StadiumSprayChart: React.FC<{ hitDirectionMap: { [dir: string]: number } }> = ({ hitDirectionMap }) => {
  const total = Object.values(hitDirectionMap).reduce((sum, curr) => sum + curr, 0);
  const lfCount = hitDirectionMap.LF || 0;
  const cfCount = hitDirectionMap.CF || 0;
  const rfCount = hitDirectionMap.RF || 0;
  const ifCount = hitDirectionMap.IF || 0;

  const lfPct = total > 0 ? (lfCount / total) : 0;
  const cfPct = total > 0 ? (cfCount / total) : 0;
  const rfPct = total > 0 ? (rfCount / total) : 0;
  const ifPct = total > 0 ? (ifCount / total) : 0;

  return (
    <div className="flex flex-col items-center gap-6 bg-zinc-950/80 p-6 rounded-2xl border border-zinc-800/80 w-full animate-fade-in shadow-2xl">
      <div className="w-full max-w-[340px] aspect-[4/3] relative select-none">
        <svg viewBox="0 0 140 110" className="w-full h-full filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
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

          {/* Dynamic Spray Lines from Home (70,105) */}
          {/* LF Line */}
          {lfCount > 0 && (
            <>
              <line 
                x1="70" y1="105" x2="35" y2="45" 
                stroke="#10b981" 
                strokeWidth={2 + lfPct * 5} 
                strokeOpacity={0.6 + lfPct * 0.4}
                className="transition-all duration-500"
              />
              <circle 
                cx="35" cy="45" 
                r={4 + lfPct * 8} 
                fill="#10b981" 
                fillOpacity={0.8 + lfPct * 0.2} 
                className="animate-pulse" 
              />
            </>
          )}

          {/* CF Line */}
          {cfCount > 0 && (
            <>
              <line 
                x1="70" y1="105" x2="70" y2="30" 
                stroke="#10b981" 
                strokeWidth={2 + cfPct * 5} 
                strokeOpacity={0.6 + cfPct * 0.4}
                className="transition-all duration-500"
              />
              <circle 
                cx="70" cy="30" 
                r={4 + cfPct * 8} 
                fill="#10b981" 
                fillOpacity={0.8 + cfPct * 0.2} 
                className="animate-pulse" 
              />
            </>
          )}

          {/* RF Line */}
          {rfCount > 0 && (
            <>
              <line 
                x1="70" y1="105" x2="105" y2="45" 
                stroke="#10b981" 
                strokeWidth={2 + rfPct * 5} 
                strokeOpacity={0.6 + rfPct * 0.4}
                className="transition-all duration-500"
              />
              <circle 
                cx="105" cy="45" 
                r={4 + rfPct * 8} 
                fill="#10b981" 
                fillOpacity={0.8 + rfPct * 0.2} 
                className="animate-pulse" 
              />
            </>
          )}

          {/* IF Line */}
          {ifCount > 0 && (
            <>
              <line 
                x1="70" y1="105" x2="70" y2="85" 
                stroke="#f59e0b" 
                strokeWidth={2 + ifPct * 5} 
                strokeOpacity={0.6 + ifPct * 0.4}
                className="transition-all duration-500"
              />
              <circle 
                cx="70" cy="85" 
                r={4 + ifPct * 8} 
                fill="#f59e0b" 
                fillOpacity={0.8 + ifPct * 0.2} 
              />
            </>
          )}

          {/* Home Plate Icon */}
          <path d="M 68 105 L 72 105 L 73 107 L 70 110 L 67 107 Z" fill="#fff" />
        </svg>
      </div>

      {/* Stats Labels Below Chart */}
      <div className="grid grid-cols-4 gap-3 text-center w-full max-w-[380px]">
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl shadow-lg hover:border-emerald-500/30 transition-all">
          <span className="text-[10px] text-zinc-400 font-bold block leading-none">レフト (LF)</span>
          <span className="text-base font-extrabold text-emerald-400 font-mono block mt-2">{(lfPct * 100).toFixed(1)}%</span>
          <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">({lfCount}本)</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl shadow-lg hover:border-emerald-500/30 transition-all">
          <span className="text-[10px] text-zinc-400 font-bold block leading-none">センター (CF)</span>
          <span className="text-base font-extrabold text-emerald-400 font-mono block mt-2">{(cfPct * 100).toFixed(1)}%</span>
          <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">({cfCount}本)</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl shadow-lg hover:border-emerald-500/30 transition-all">
          <span className="text-[10px] text-zinc-400 font-bold block leading-none">ライト (RF)</span>
          <span className="text-base font-extrabold text-emerald-400 font-mono block mt-2">{(rfPct * 100).toFixed(1)}%</span>
          <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">({rfCount}本)</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl shadow-lg hover:border-amber-500/30 transition-all">
          <span className="text-[10px] text-zinc-400 font-bold block leading-none">内野 (IF)</span>
          <span className="text-base font-extrabold text-amber-400 font-mono block mt-2">{(ifPct * 100).toFixed(1)}%</span>
          <span className="text-[9px] text-zinc-500 block font-mono mt-0.5">({ifCount}本)</span>
        </div>
      </div>
    </div>
  );
};

const SlashStatsGrid: React.FC<{ stats: SavantAggregatedStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-500">打率 (AVG)</span>
        <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{stats.avg}</p>
        <span className="text-[10px] text-zinc-500 mt-1">{stats.hits}安打 / {stats.ab}打数</span>
      </div>
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-500">出塁率 (OBP)</span>
        <p className="text-2xl font-black text-teal-400 mt-1 font-mono">{stats.obp}</p>
        <span className="text-[10px] text-zinc-500 mt-1 font-mono">PA {stats.pa} / 四死球 {stats.bb + stats.hbp}</span>
      </div>
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-500">長打率 (SLG)</span>
        <p className="text-2xl font-black text-purple-400 mt-1 font-mono">{stats.slg}</p>
        <span className="text-[10px] text-zinc-500 mt-1">長打 {stats.b2 + stats.b3 + stats.hr}本</span>
      </div>
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-500">本塁打 (HR)</span>
        <p className="text-2xl font-black text-rose-400 mt-1 font-mono">{stats.hr}</p>
        <span className="text-[10px] text-zinc-500 mt-1">得点打点 {stats.rbi}</span>
      </div>

      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-500">IsoP (純長打力)</span>
        <p className="text-xl font-black text-purple-300 mt-1 font-mono">{stats.isoP}</p>
        <span className="text-[10px] text-zinc-500 mt-0.5 leading-none">SLG - AVG (長打獲得力)</span>
      </div>
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-500">IsoD (四死球選球眼)</span>
        <p className="text-xl font-black text-teal-300 mt-1 font-mono">{stats.isoD}</p>
        <span className="text-[10px] text-zinc-500 mt-0.5 leading-none">OBP - AVG (四死球獲得力)</span>
      </div>
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-500">三振 (SO) / 四球 (BB)</span>
        <p className="text-xl font-black text-zinc-300 mt-1 font-mono">{stats.k} / {stats.bb}</p>
        <span className="text-[10px] text-zinc-500 mt-0.5 leading-none font-mono">BB/K比率: {stats.bbKRatio}</span>
      </div>
      <div className="bg-[#111827] border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
        <span className="text-[10px] uppercase font-bold text-zinc-500">BABIP (インプレイ打率)</span>
        <p className="text-xl font-black text-amber-300 mt-1 font-mono">{stats.babip}</p>
        <span className="text-[10px] text-zinc-500 mt-0.5 leading-none">本塁打・三振以外の安打率</span>
      </div>
    </div>
  );
};

// NEW: Advanced Sabermetrics Component for Batters (includes WAR, wOBA, etc.)
const AdvancedSabermetricsGrid: React.FC<{ stats: SavantAggregatedStats; title: string }> = ({ stats, title }) => {
  return (
    <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          {title} セイバーメトリクス詳細指標 (Advanced Metrics)
        </h3>
        <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded uppercase">
          SABER METRICS
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* WAR CARD */}
        <div className="bg-gradient-to-br from-amber-950/40 to-zinc-950 border border-amber-500/30 p-4 rounded-xl flex flex-col justify-between shadow relative overflow-hidden">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">簡易 WAR</span>
          <div className="my-2">
            <p className="text-3xl font-black text-white font-mono">{stats.war}</p>
          </div>
          <span className="text-[8.5px] text-zinc-400 block leading-tight">
            代替選手比での勝利貢献度
          </span>
        </div>

        {/* wOBA CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-teal-400 block">wOBA (加重出塁率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.wOBA}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            単打・長打価値を加重した真の出塁率
          </span>
        </div>

        {/* IsoP CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-purple-400 block">IsoP (純長打力)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.isoP}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            SLG - AVG (真のパワー指標)
          </span>
        </div>

        {/* IsoD CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-teal-400 block">IsoD (選球眼)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.isoD}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            OBP - AVG (四球での出塁力)
          </span>
        </div>

        {/* BB% CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-zinc-400 block">BB% (四球率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.bbRate}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            全打席に占める四球割合
          </span>
        </div>

        {/* K% CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-zinc-400 block">K% (三振率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.kRate}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            全打席に占める三振割合
          </span>
        </div>

        {/* BB/K CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-zinc-400 block">BB / K (アプローチ)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.bbKRatio}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            数値が高いほど選球能力が優秀
          </span>
        </div>

        {/* BABIP CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-amber-400 block">BABIP (インプレイ打率)</span>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

        {/* HR/9 CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-zinc-400 block">HR / 9 (被本塁打率)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.hr9}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            9イニングあたりの被本塁打数
          </span>
        </div>

        {/* K / BB CARD */}
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between shadow">
          <span className="text-[10px] font-bold text-zinc-400 block">K / BB (制球力)</span>
          <div className="my-2">
            <p className="text-2xl font-black text-white font-mono">{stats.kbb}</p>
          </div>
          <span className="text-[8.5px] text-zinc-500 block leading-tight">
            数値が高いほどコントロールが優秀
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
      if (!currentUser) return window.localStorage.getItem(key);
      const userKey = `user_${currentUser}_${key}`;
      const userVal = window.localStorage.getItem(userKey);
      if (userVal !== null) return userVal;
      return window.localStorage.getItem(key);
    },
    setItem: (key: string, value: string) => {
      if (!currentUser) {
        window.localStorage.setItem(key, value);
        return;
      }
      const userKey = `user_${currentUser}_${key}`;
      window.localStorage.setItem(userKey, value);
    }
  };
  const [dataMode, setDataMode] = useState<'current' | 'csv'>('current');
  const [csvEvents, setCsvEvents] = useState<TaggedEvent[]>([]);
  const [selectedTab, setSelectedTab] = useState<'savant' | 'batter' | 'pitcher' | 'gameday'>('savant');
  
  const [selectedBatterName, setSelectedBatterName] = useState<string>('all');
  const [selectedPitcherName, setSelectedPitcherName] = useState<string>('all');
  const [batterVsHand, setBatterVsHand] = useState<'all' | 'R' | 'L'>('all');
  const [pitcherVsHand, setPitcherVsHand] = useState<'all' | 'R' | 'L'>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // Load custom quick button mapping to sync names/groups exactly with designer config
  const quickCustomMap = useMemo(() => {
    try {
      const saved = localStorage.getItem('sportscode_quick_custom_map');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {} as { [key: string]: { name: string; group: string; color?: string; linkTrigger?: string } };
  }, []);

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

          const parsed: TaggedEvent[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
            if (cols.length < 3) continue;

            const batter = cols[0] || '';
            const count = cols[1] || '';
            const course = cols[2] || '';
            const team = cols[3] || '';
            const runners = cols[4] || '';
            const runs = cols[5] || '';
            const battedResult = cols[7] || '';
            const hitDirection = cols[8] || '';
            const pitcher = cols[15] || cols[10] || ''; // Read pitcherName from 16th column (index 15) with fallback to index 10
            const pitchResult = cols[11] || '';
            const pickoff = cols[12] || '';
            const pitchType = cols[13] || '';
            const steal = cols[14] || '';

            parsed.push({
              id: `csv_${file.name}_${i}`,
              timestamp: i,
              startTime: i,
              endTime: i + 5,
              actionId: 'btn_pitch',
              actionName: 'Pitch',
              color: 'bg-emerald-900',
              createdAt: Date.now(),
              labels: {
                Batter: batter,
                Pitcher: pitcher,
                Count: count,
                Team: team,
                Course: course,
                Result: battedResult || pitchResult,
                'Pitch Type': pitchType,
                Hit_Direction: hitDirection,
                Runners: runners,
                RBI: runs,
                Pickoff: pickoff,
                Steal: steal
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

    // Re-index event timestamps/ids to be continuous and prevent duplication
    const reindexedEvents = allParsedEvents.map((ev, idx) => ({
      ...ev,
      id: `csv_merged_${idx + 1}`,
      timestamp: idx + 1,
      startTime: idx + 1,
      endTime: idx + 6
    }));

    setCsvEvents(reindexedEvents);
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

  // 1. Team stats calculation
  const teamStats = useMemo(() => {
    return calculateSavantStats(filteredTeamEvents, quickCustomMap);
  }, [filteredTeamEvents, quickCustomMap]);

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
    return evs;
  }, [activeEvents, selectedBatterName, batterVsHand, players]);

  const batterStats = useMemo(() => {
    return calculateSavantStats(batterEvents, quickCustomMap);
  }, [batterEvents, quickCustomMap]);

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
    return evs;
  }, [activeEvents, selectedPitcherName, pitcherVsHand, players]);

  const pitcherStats = useMemo(() => {
    return calculateSavantStats(pitcherEvents, quickCustomMap);
  }, [pitcherEvents, quickCustomMap]);

  // ============================================================
  // GAME DAY ANALYSIS LOGIC
  // ============================================================
  const gameDays = useMemo(() => {
    const dayMap = new Map<string, TaggedEvent[]>();
    activeEvents.forEach(ev => {
      const dateStr = new Date(ev.createdAt).toLocaleDateString('ja-JP', {
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

  return (
    <div className="flex-1 bg-[#0b0f19] p-6 flex flex-col gap-6 text-zinc-100 overflow-y-auto max-w-7xl mx-auto w-full font-sans">
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
        <div className="relative z-10 flex items-center gap-2.5 bg-zinc-950/80 border border-zinc-800 p-1.5 rounded-xl">
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

          <label className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
            dataMode === 'csv'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/50'
              : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
          }`}>
            <Upload className="w-3.5 h-3.5" />
            {dataMode === 'csv' && csvEvents.length > 0 ? `CSV分析中 (${csvEvents.length}件)` : '📁 CSVファイル読込'}
            <input type="file" accept=".csv" multiple onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2">
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
              <StrikeZoneHeatmap courseStatsMap={teamStats.courseStatsMap} />
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
                      <th className="p-2">コース (Zone)</th>
                      <th className="p-2 font-mono">投球数</th>
                      <th className="p-2 font-mono">安打 (H)</th>
                      <th className="p-2 font-mono">本塁打 (HR)</th>
                      <th className="p-2 font-mono">空振り (Whiff)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 font-mono text-zinc-300">
                    {Object.keys(teamStats.courseStatsMap).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-zinc-500 font-sans">コースデータがまだ登録されていません。</td>
                      </tr>
                    ) : (
                      Object.entries(teamStats.courseStatsMap)
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
              <StadiumSprayChart hitDirectionMap={teamStats.hitDirectionMap} />
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
              <StrikeZoneHeatmap courseStatsMap={batterStats.courseStatsMap} />
            </div>

            {/* Upgraded Individual Stadium Spray Chart */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-lg">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                打撃スプレーチャート & 打球割合 (Stadium Spray Chart)
              </h3>
              <StadiumSprayChart hitDirectionMap={batterStats.hitDirectionMap} />
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
                      <span className="text-amber-400">{ev.labels?.Course || '-'} ({ev.labels?.['Pitch Type'] || '-'})</span>
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
                      <th className="p-2">コース</th>
                      <th className="p-2 font-mono">投球数</th>
                      <th className="p-2 font-mono">安打 (H)</th>
                      <th className="p-2 font-mono">本塁打 (HR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 font-mono text-zinc-300">
                    {Object.keys(batterStats.courseStatsMap).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-zinc-500 font-sans">コースデータがありません。</td>
                      </tr>
                    ) : (
                      Object.entries(batterStats.courseStatsMap)
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Individual Strike Zone (5x5 Grid) */}
            <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-sky-500" />
                  投手別コース別投球分布ヒートマップ (5x5 Heatmap)
                </h3>
              </div>
              <StrikeZoneHeatmap courseStatsMap={pitcherStats.courseStatsMap} />
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

          <div className="bg-[#111827] border border-zinc-800 p-5 rounded-2xl space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-white">投手ログ詳細 ({selectedPitcherName === 'all' ? '全投手合計' : selectedPitcherName})</h3>
            <div className="space-y-2">
              <p className="text-xs text-zinc-400">総投球記録数: <span className="font-bold text-white">{pitcherEvents.length}球</span></p>
              <div className="divide-y divide-zinc-800 max-h-[300px] overflow-y-auto font-mono text-xs">
                {pitcherEvents.map(ev => (
                  <div key={ev.id} className="py-2 flex justify-between hover:bg-zinc-900 px-1 rounded transition-colors">
                    <span className="text-zinc-300 font-semibold">{ev.labels?.Result || ev.labels?.Play || '投球記録'}</span>
                    <span className="text-sky-400">{ev.labels?.Course || '-'} (球種: {ev.labels?.['Pitch Type'] || '-'})</span>
                  </div>
                ))}
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

          {/* Per-team Lineup & Stats */}
          {gameDays.length > 0 && Array.from(gameDayLineup.entries()).map(([teamName, playerMap]) => {
            const lineup = Array.from(playerMap.values()).sort((a, b) => {
              if (a.order && b.order) return a.order - b.order;
              if (a.order) return -1;
              if (b.order) return 1;
              return b.pa - a.pa; // sort by PA descending as fallback
            });

            return (
              <div key={teamName} className="bg-[#111827] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                {/* Team header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-950/60 to-zinc-900 border-b border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-black text-white">{teamName}</span>
                    <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                      {lineup.length}名出場
                    </span>
                  </div>
                  <div className="flex gap-4 text-[10px] font-bold text-zinc-400">
                    <span>PA: <strong className="text-emerald-400">{lineup.reduce((s, p) => s + p.pa, 0)}</strong></span>
                    <span>H: <strong className="text-amber-400">{lineup.reduce((s, p) => s + p.hits, 0)}</strong></span>
                    <span>HR: <strong className="text-rose-400">{lineup.reduce((s, p) => s + p.hr, 0)}</strong></span>
                  </div>
                </div>

                {/* Lineup table */}
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
                      {lineup.map((player, idx) => {
                        const avg = player.ab > 0 ? (player.hits / player.ab).toFixed(3) : '---';
                        const obp = player.pa > 0 ? ((player.hits + player.bb) / player.pa).toFixed(3) : '---';
                        return (
                          <tr key={player.name} className={`hover:bg-zinc-900/50 transition-colors ${
                            idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-950/20'
                          }`}>
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
                              <span className={avg !== '---' ? (parseFloat(avg) >= 0.300 ? 'text-emerald-400' : parseFloat(avg) >= 0.250 ? 'text-amber-400' : 'text-zinc-300') : 'text-zinc-600'}>
                                {avg}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold">
                              <span className={obp !== '---' ? (parseFloat(obp) >= 0.350 ? 'text-emerald-400' : parseFloat(obp) >= 0.300 ? 'text-amber-400' : 'text-zinc-300') : 'text-zinc-600'}>
                                {obp}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {gameDays.length > 0 && gameDayLineup.size === 0 && (
            <div className="bg-[#111827] border border-zinc-800 rounded-2xl p-10 text-center text-zinc-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">この試合日の打席データがありません</p>
              <p className="text-xs mt-1 opacity-60">「打者」ラベルが付いたイベントが必要です</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
