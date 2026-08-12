import React, { useState, useMemo } from 'react';
import type { TaggedEvent } from '../types';
import { 
  Grid3X3, 
  Film, 
  Filter
} from 'lucide-react';
import { getLabelValueByKeywords } from './AnalyticsDashboard';

interface MatrixViewProps {
  events: TaggedEvent[];
  onOpenMatrixPlayer: (clips: TaggedEvent[], title: string) => void;
}

type RowAxisType = 'pitcher' | 'batter' | 'inning' | 'action';
type ColAxisType = 'all' | 'pitch_type' | 'result' | 'batted_ball' | 'course' | 'pitch_speed';

const AXIS_LABELS_ROW: Record<RowAxisType, string> = {
  pitcher: '投手名',
  batter: '打者名',
  inning: 'イニング',
  action: 'アクション名',
};

const AXIS_LABELS_COL: Record<ColAxisType, string> = {
  all: 'すべて表示',
  pitch_type: '球種のみ',
  result: '結果のみ',
  batted_ball: '打球方向のみ',
  course: 'コースのみ',
  pitch_speed: '球速のみ',
};

// 複合フィルター (Slicers) 定義
type QuickFilterType = 'all' | 'two_strikes' | 'risp' | 'first_pitch' | 'hits_only' | 'swings_misses' | 'rhb' | 'lhb';

const QUICK_FILTERS: { id: QuickFilterType; label: string; icon: string; desc: string }[] = [
  { id: 'all', label: '全投球', icon: '⚾', desc: 'すべての投球を表示' },
  { id: 'two_strikes', label: '2ストライク時', icon: '⚡', desc: '追い込み時 (S=2)' },
  { id: 'risp', label: '得点圏 (RISP)', icon: '🔥', desc: '2塁・3塁に走者あり' },
  { id: 'first_pitch', label: '初球 (0-0)', icon: '🎯', desc: 'カウント 0-0 の初球' },
  { id: 'hits_only', label: '被安打・ヒット', icon: '💥', desc: '単打・長打・本塁打' },
  { id: 'swings_misses', label: '空振り・奪三振', icon: '🌪️', desc: '空振り・三振シーン' },
  { id: 'rhb', label: '対右打者', icon: '👉', desc: '右打者への投球' },
  { id: 'lhb', label: '対左打者', icon: '👈', desc: '左打者への投球' },
];

export const MatrixView: React.FC<MatrixViewProps> = ({ events, onOpenMatrixPlayer }) => {
  const [rowAxis, setRowAxis] = useState<RowAxisType>('pitcher');
  const [colAxis, setColAxis] = useState<ColAxisType>('all');
  const [activeFilter, setActiveFilter] = useState<QuickFilterType>('all');

  // Resolve event property value depending on selected axis key
  const getEventValueByAxis = (ev: TaggedEvent, axis: string): string => {
    switch (axis) {
      case 'pitcher':
        return getLabelValueByKeywords(ev.labels, ['pitcher', '投手名', '投手']) || ev.playerName || '未指定';
      case 'batter':
        return getLabelValueByKeywords(ev.labels, ['batter', '打者名', '打者']) || '未指定';
      case 'inning':
        return getLabelValueByKeywords(ev.labels, ['inning', 'イニング']) || '未指定';
      case 'action':
        return ev.actionName || '未指定';
      case 'pitch_type':
        return getLabelValueByKeywords(ev.labels, ['pitch type', 'pitchtype', '球種', '球種名']);
      case 'result':
        return getLabelValueByKeywords(ev.labels, ['result', '結果', '判定', '判定/結果', 'play']);
      case 'batted_ball':
        return getLabelValueByKeywords(ev.labels, ['batted ball', 'battedball', '打球方向', '打球位置']);
      case 'course':
        return getLabelValueByKeywords(ev.labels, ['course', 'コース', 'コース位置']);
      case 'pitch_speed':
        return getLabelValueByKeywords(ev.labels, ['pitch speed', 'pitchspeed', '球速', 'pitch_speed']);
      default:
        return '';
    }
  };

  // 複合スライサーによるイベントの事前フィルタリング
  const filteredEvents = useMemo(() => {
    if (activeFilter === 'all') return events;

    return events.filter(ev => {
      const count = ev.labels['カウント'] || ev.labels['Count'] || '';
      const result = (ev.labels['結果'] || ev.labels['Result'] || '').toLowerCase();
      const batter = (ev.labels['打者'] || ev.labels['Batter'] || '');
      const runners = (ev.labels['走者'] || ev.labels['ランナー'] || '');

      switch (activeFilter) {
        case 'two_strikes':
          return count.endsWith('-2') || count.includes('2ストライク') || count.includes('2S') || result.includes('三振');
        case 'risp':
          return runners.includes('2塁') || runners.includes('3塁') || runners.includes('満塁') || runners.includes('得点圏');
        case 'first_pitch':
          return count === '0-0' || count.startsWith('0-0');
        case 'hits_only':
          return result.includes('ヒット') || result.includes('単打') || result.includes('二塁打') || result.includes('三塁打') || result.includes('本塁打') || result.includes('ホームラン') || result.includes('single') || result.includes('double') || result.includes('triple') || result.includes('hr');
        case 'swings_misses':
          return result.includes('空振り') || result.includes('三振') || result.includes('swinging') || result.includes('strikeout');
        case 'rhb':
          return batter.includes('(右)') || batter.includes('右') || ev.labels['打席'] === '右' || ev.labels['Bats'] === 'R';
        case 'lhb':
          return batter.includes('(左)') || batter.includes('左') || ev.labels['打席'] === '左' || ev.labels['Bats'] === 'L';
        default:
          return true;
      }
    });
  }, [events, activeFilter]);

  // Generate dynamic Rows (y-axis keys)
  const rows = useMemo(() => {
    const list = new Set<string>();
    filteredEvents.forEach(ev => {
      const val = getEventValueByAxis(ev, rowAxis);
      if (val) list.add(val);
    });

    if (list.size === 0) {
      list.add('未登録');
    }
    return Array.from(list).sort();
  }, [filteredEvents, rowAxis]);

  // Generate dynamic Columns (x-axis keys)
  const cols = useMemo(() => {
    const list = new Set<string>();

    if (colAxis === 'all') {
      filteredEvents.forEach(ev => {
        Object.entries(ev.labels).forEach(([key, val]) => {
          if (
            key !== 'Pitcher' && 
            key !== '投手名' && 
            key !== '投手' &&
            key !== 'Batter' && 
            key !== '打者名' && 
            key !== '打者' &&
            key !== 'Inning' &&
            key !== 'イニング' &&
            key !== 'カウント' &&
            key !== 'Count' &&
            key !== '確信度' &&
            key !== 'AI判定' &&
            val && val !== '-'
          ) {
            list.add(val.toString());
          }
        });
      });

      if (list.size === 0) {
        ['見逃しストライク', '空振りストライク', 'ボール', 'ファール', '単打', '二塁打', '三塁打', '本塁打', '4シーム', 'スライダー'].forEach(v => list.add(v));
      }
    } else {
      if (colAxis === 'pitch_type') {
        ['4シーム', '2シーム', 'スライダー', 'カーブ', 'フォーク', 'チェンジアップ'].forEach(v => list.add(v));
      } else if (colAxis === 'result') {
        ['見逃しストライク', '空振りストライク', 'ボール', 'ファール', '単打', '二塁打', '三塁打', '本塁打'].forEach(v => list.add(v));
      } else if (colAxis === 'batted_ball') {
        ['ゴロ', 'フライ', 'ライナー', '小フライ'].forEach(v => list.add(v));
      } else if (colAxis === 'course') {
        ['内角高め', '真ん中高め', '外角高め', '内角中央', '真ん中', '外角中央', '内角低め', '真ん中低め', '外角低め'].forEach(v => list.add(v));
      }

      filteredEvents.forEach(ev => {
        const val = getEventValueByAxis(ev, colAxis);
        if (val && val !== '-') list.add(val);
      });
    }

    return Array.from(list).sort();
  }, [filteredEvents, colAxis]);

  // Slices events intersecting at row/column coordinate
  const getCellData = (rowVal: string, colVal: string) => {
    return filteredEvents.filter(ev => {
      const evRow = getEventValueByAxis(ev, rowAxis);
      if (evRow !== rowVal) return false;

      if (colAxis === 'all') {
        return Object.entries(ev.labels).some(([key, val]) => {
          if (
            key !== 'Pitcher' && 
            key !== '投手名' && 
            key !== '投手' &&
            key !== 'Batter' && 
            key !== '打者名' && 
            key !== '打者' &&
            key !== 'Inning' &&
            key !== 'イニング'
          ) {
            return val?.toString() === colVal;
          }
          return false;
        });
      } else {
        const evCol = getEventValueByAxis(ev, colAxis);
        return evCol === colVal;
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col gap-3 w-full max-w-7xl mx-auto p-2 lg:p-4 overflow-hidden min-h-0 select-none">
      
      {/* 1. Header Panel with Dynamic Axis Selectors */}
      <div className="glass-panel p-3.5 rounded-2xl border border-zinc-800/80 flex flex-col md:flex-row gap-3 md:items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600/20 border border-sky-500/30 p-2 rounded-xl text-sky-400 shrink-0">
            <Grid3X3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm lg:text-base font-extrabold text-white">
                Sportscode クロスマトリックス解析
              </h2>
              <span className="text-[10px] bg-sky-950/80 border border-sky-700/60 text-sky-300 px-2 py-0.5 rounded-full font-mono">
                {filteredEvents.length} / {events.length} 球
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              スライサーで絞り込み、交点セルをクリックして「ワンクリック結合ダイジェスト出力」が可能です。
            </p>
          </div>
        </div>

        {/* Dynamic Axis Customizer Dropdowns */}
        <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-xl border border-zinc-850 shrink-0">
          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] uppercase font-bold text-zinc-500">縦軸（行）</span>
            <select
              value={rowAxis}
              onChange={(e) => setRowAxis(e.target.value as RowAxisType)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10.5px] text-zinc-200 focus:outline-none cursor-pointer hover:border-sky-550 transition-colors font-bold"
            >
              {Object.entries(AXIS_LABELS_ROW).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <span className="text-zinc-650 font-bold self-end mb-1 text-[10px]">×</span>

          <div className="flex flex-col gap-1">
            <span className="text-[7.5px] uppercase font-bold text-zinc-500">横軸（列）</span>
            <select
              value={colAxis}
              onChange={(e) => setColAxis(e.target.value as ColAxisType)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10.5px] text-zinc-200 focus:outline-none cursor-pointer hover:border-sky-550 transition-colors font-bold"
            >
              {Object.entries(AXIS_LABELS_COL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. One-Tap Quick Slicer Bar (複合フィルター) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 px-1 shrink-0 select-none">
          <Filter className="w-3 h-3 text-sky-400" />
          条件絞り込み:
        </span>
        {QUICK_FILTERS.map(qf => {
          const isActive = activeFilter === qf.id;
          return (
            <button
              key={qf.id}
              onClick={() => setActiveFilter(qf.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer border ${
                isActive
                  ? 'bg-sky-600 border-sky-400 text-white shadow-[0_0_12px_rgba(2,132,199,0.5)] scale-[1.02]'
                  : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title={qf.desc}
            >
              <span>{qf.icon}</span>
              <span>{qf.label}</span>
            </button>
          );
        })}

        {filteredEvents.length > 0 && (
          <button
            onClick={() => onOpenMatrixPlayer(filteredEvents, `全抽出クリップ [${QUICK_FILTERS.find(f => f.id === activeFilter)?.label}]`)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow cursor-pointer shrink-0"
          >
            <Film className="w-3.5 h-3.5" />
            <span>この条件の全 {filteredEvents.length} 球を結合・再生</span>
          </button>
        )}
      </div>

      {/* 3. Grid Matrix Table */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-auto shadow-2xl relative">
        <table className="w-full border-collapse text-xs text-left">
          <thead>
            <tr className="bg-zinc-950/95 border-b border-zinc-850 sticky top-0 z-20">
              <th className="p-3.5 w-40 font-black text-zinc-500 uppercase tracking-wider text-[9px] border-r border-zinc-850 bg-zinc-950 sticky left-0 z-30">
                {AXIS_LABELS_ROW[rowAxis]} / {AXIS_LABELS_COL[colAxis]}
              </th>
              {cols.map(col => (
                <th 
                  key={col} 
                  className="p-3.5 min-w-[110px] font-black text-sky-400 uppercase tracking-wider text-[9px] border-r border-zinc-850 text-center"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850/60">
            {rows.length === 0 || filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="text-center py-20 text-zinc-650 text-xs">
                  該当する投球データがありません。スライサー条件を変更するか、タグ記録を行ってください。
                </td>
              </tr>
            ) : (
              rows.map(rowName => (
                <tr key={rowName} className="hover:bg-zinc-850/30 transition-colors">
                  <td className="p-3.5 font-extrabold text-zinc-200 border-r border-zinc-850 bg-zinc-950/80 sticky left-0 z-10">
                    {rowName}
                  </td>
                  {cols.map(colName => {
                    const cellEvents = getCellData(rowName, colName);
                    const count = cellEvents.length;

                    return (
                      <td 
                        key={colName} 
                        className="border-r border-zinc-850 p-2 text-center"
                      >
                        {count > 0 ? (
                          <button
                            onClick={() => onOpenMatrixPlayer(cellEvents, `${AXIS_LABELS_ROW[rowAxis]}[${rowName}] × ${colName}`)}
                            className="w-full py-2 bg-emerald-950/30 border border-emerald-800/40 hover:bg-emerald-900 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-lg text-xs font-black transition-all cursor-pointer active:scale-95 shadow flex items-center justify-center gap-1.5 group"
                            title="クリックしてこの交点シーンのみを連続再生＆結合書き出し"
                          >
                            <Film className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            {count}
                          </button>
                        ) : (
                          <span className="text-zinc-650 font-bold">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
