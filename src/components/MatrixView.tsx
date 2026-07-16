import React, { useState, useMemo } from 'react';
import type { TaggedEvent } from '../types';
import { Grid3X3, Film } from 'lucide-react';
import { getLabelValueByKeywords } from './AnalyticsDashboard';

interface MatrixViewProps {
  events: TaggedEvent[];
  onOpenMatrixPlayer: (clips: TaggedEvent[], title: string) => void;
}

type RowAxisType = 'pitcher' | 'batter' | 'inning' | 'action';
type ColAxisType = 'all' | 'pitch_type' | 'result' | 'batted_ball' | 'course';

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
  course: 'コース位置のみ',
};

export const MatrixView: React.FC<MatrixViewProps> = ({ events, onOpenMatrixPlayer }) => {
  const [rowAxis, setRowAxis] = useState<RowAxisType>('pitcher');
  const [colAxis, setColAxis] = useState<ColAxisType>('all');

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
      default:
        return '';
    }
  };

  // Generate dynamic Rows (y-axis keys)
  const rows = useMemo(() => {
    const list = new Set<string>();
    events.forEach(ev => {
      const val = getEventValueByAxis(ev, rowAxis);
      if (val) list.add(val);
    });

    if (list.size === 0) {
      list.add('未登録');
    }
    return Array.from(list).sort();
  }, [events, rowAxis]);

  // Generate dynamic Columns (x-axis keys)
  const cols = useMemo(() => {
    const list = new Set<string>();

    if (colAxis === 'all') {
      // Extract all labels except pitchers, batters and innings
      events.forEach(ev => {
        Object.entries(ev.labels).forEach(([key, val]) => {
          if (
            key !== 'Pitcher' && 
            key !== '投手名' && 
            key !== 'Batter' && 
            key !== '打者名' && 
            key !== 'Inning' &&
            key !== 'イニング' &&
            val && val !== '-'
          ) {
            list.add(val.toString());
          }
        });
      });

      // Baseball standard fallback if no tags are logged yet
      if (list.size === 0) {
        ['見逃しストライク', '空振りストライク', 'ボール', 'ファール', '単打', '二塁打', '三塁打', '本塁打', '4シーム', 'スライダー'].forEach(v => list.add(v));
      }
    } else {
      // Sane defaults depending on selected column axis type to initialize grid beautifully
      if (colAxis === 'pitch_type') {
        ['4シーム', '2シーム', 'スライダー', 'カーブ', 'フォーク', 'チェンジアップ'].forEach(v => list.add(v));
      } else if (colAxis === 'result') {
        ['見逃しストライフ', '空振りストライク', 'ボール', 'ファール', '単打', '二塁打', '三塁打', '本塁打'].forEach(v => list.add(v));
      } else if (colAxis === 'batted_ball') {
        ['ゴロ', 'フライ', 'ライナー', '小フライ'].forEach(v => list.add(v));
      } else if (colAxis === 'course') {
        ['B33', 'B22', 'B44', 'B11', 'B55'].forEach(v => list.add(v));
      }

      events.forEach(ev => {
        const val = getEventValueByAxis(ev, colAxis);
        if (val && val !== '-') list.add(val);
      });
    }

    return Array.from(list).sort();
  }, [events, colAxis]);

  // Slices events intersecting at row/column coordinate
  const getCellData = (rowVal: string, colVal: string) => {
    return events.filter(ev => {
      const evRow = getEventValueByAxis(ev, rowAxis);
      if (evRow !== rowVal) return false;

      if (colAxis === 'all') {
        // Check if any value of custom labels matches the colVal key
        return Object.entries(ev.labels).some(([key, val]) => {
          if (
            key !== 'Pitcher' && 
            key !== '投手名' && 
            key !== 'Batter' && 
            key !== '打者名' && 
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
    <div className="flex-1 flex flex-col gap-4 w-full max-w-7xl mx-auto p-4 lg:p-6 overflow-hidden min-h-0 select-none">
      
      {/* Header Panel with Dynamic Axis Selectors */}
      <div className="glass-panel p-4.5 rounded-2xl border border-zinc-800/80 flex flex-col md:flex-row gap-4 md:items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-sky-600/20 border border-sky-500/30 p-2 rounded-xl text-sky-400 shrink-0">
            <Grid3X3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm lg:text-base font-extrabold text-white">
              Sportscode クロスマトリックス解析
            </h2>
            <p className="text-[10px] text-zinc-400 mt-1">
              分析軸をリアルタイムに切り替えて、特定の交点プレイのみをポップアップ再生＆書き出し可能。
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

      {/* Grid Matrix Table */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-auto shadow-2xl relative">
        <table className="w-full border-collapse text-xs text-left">
          <thead>
            <tr className="bg-zinc-950/95 border-b border-zinc-850 sticky top-0 z-20">
              <th className="p-4 w-40 font-black text-zinc-500 uppercase tracking-wider text-[9px] border-r border-zinc-850 bg-zinc-950 sticky left-0 z-30">
                {AXIS_LABELS_ROW[rowAxis]} / {AXIS_LABELS_COL[colAxis]}
              </th>
              {cols.map(col => (
                <th 
                  key={col} 
                  className="p-4 min-w-[110px] font-black text-sky-400 uppercase tracking-wider text-[9px] border-r border-zinc-850 text-center"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850/60">
            {rows.length === 0 || events.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="text-center py-24 text-zinc-650 text-xs">
                  データがありません。ビデオ＆タグ記録画面でプレイを登録すると自動で集計されます。
                </td>
              </tr>
            ) : (
              rows.map(rowName => (
                <tr key={rowName} className="hover:bg-zinc-850/30 transition-colors">
                  <td className="p-4 font-extrabold text-zinc-200 border-r border-zinc-850 bg-zinc-950/80 sticky left-0 z-10">
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
                            onClick={() => onOpenMatrixPlayer(cellEvents, `マトリックス: ${AXIS_LABELS_ROW[rowAxis]}[${rowName}] × ${colName}`)}
                            className="w-full py-2 bg-emerald-950/30 border border-emerald-800/40 hover:bg-emerald-900 hover:border-emerald-500 text-emerald-400 hover:text-white rounded-lg text-xs font-black transition-all cursor-pointer active:scale-95 shadow flex items-center justify-center gap-1.5"
                          >
                            <Film className="w-3.5 h-3.5" />
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
