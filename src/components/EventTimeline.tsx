import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { TaggedEvent, Player } from '../types';
import { formatCentiseconds } from '../utils/formatters';
import { Download, Trash2, PlayCircle, Edit3 } from 'lucide-react';

interface EventTimelineProps {
  events: TaggedEvent[];
  players: Player[];
  videoDuration: number;
  currentVideoTime: number;
  onSeek: (time: number) => void;
  onDeleteEvent: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, eventId: string, activeGroup?: string) => void;
  selectedEventId?: string | null;
  onSelectEvent?: (id: string) => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  players,
  videoDuration,
  currentVideoTime,
  onSeek,
  onDeleteEvent,
  onContextMenu,
  selectedEventId,
  onSelectEvent
}) => {
  const [zoom, setZoom] = useState(1);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Group tracks strictly by actionName
  const trackNames = useMemo(
    () => Array.from(new Set(events.map(e => e.actionName))),
    [events]
  );

  // Sort events chronologically
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.startTime - b.startTime),
    [events]
  );

  // All unique label group names (dynamic columns in log table)
  const activeGroupNames = useMemo(() => {
    const groups = new Set<string>();
    events.forEach(ev => Object.keys(ev.labels).forEach(g => groups.add(g)));
    return Array.from(groups).sort();
  }, [events]);

  const totalD = Math.max(videoDuration, 1);

  // Ruler tick generation
  const ticks = useMemo(() => {
    if (totalD <= 0) return [];
    const px = totalD * 10 * zoom;
    const step = px > 1800 ? (zoom > 5 ? 30 : 300)
               : px > 500  ? (zoom > 5 ? 10 : 60)
               : (zoom > 5 ? 2 : 10);
    const result = [];
    for (let t = 0; t <= totalD; t += step) result.push(t);
    return result;
  }, [totalD, zoom]);

  // Auto-scroll playhead
  useEffect(() => {
    if (totalD <= 0 || !timelineContainerRef.current) return;
    const c = timelineContainerRef.current;
    const px = (currentVideoTime / totalD) * c.scrollWidth;
    const vw = c.clientWidth;
    if (px > c.scrollLeft + vw * 0.8 || px < c.scrollLeft + vw * 0.1) {
      c.scrollTo({ left: px - vw * 0.3, behavior: 'smooth' });
    }
  }, [currentVideoTime, totalD, zoom]);

  // CSV export
  const handleExportCSV = () => {
    if (events.length === 0) return;
    const baseHeaders = ['ID', 'Start (s)', 'End (s)', 'Start Clock', 'End Clock', 'Player', '#', 'Action'];
    let csv = 'data:text/csv;charset=utf-8,';
    csv += [...baseHeaders, ...activeGroupNames].map(h => `"${h}"`).join(',') + '\n';
    sortedEvents.forEach(ev => {
      const pl = players.find(p => p.id === ev.playerId);
      const row = [
        ev.id, ev.startTime.toFixed(2), ev.endTime.toFixed(2),
        formatCentiseconds(ev.startTime), formatCentiseconds(ev.endTime),
        ev.playerName || '-', pl?.number ? `#${pl.number}` : '-', ev.actionName,
        ...activeGroupNames.map(g => ev.labels[g] || '')
      ];
      csv += row.map(v => `"${v.toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `tags_export_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalD <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * totalD);
  };

  const blockColor = (color: string) =>
    color.includes('red')     ? 'bg-red-500/35 border-red-500/70 text-red-200 hover:bg-red-500/60' :
    color.includes('sky')     ? 'bg-sky-500/35 border-sky-500/70 text-sky-200 hover:bg-sky-500/60' :
    color.includes('emerald') ? 'bg-emerald-500/35 border-emerald-500/70 text-emerald-200 hover:bg-emerald-500/60' :
    color.includes('amber')   ? 'bg-amber-500/35 border-amber-500/70 text-amber-200 hover:bg-amber-500/60' :
    color.includes('purple')  ? 'bg-purple-500/35 border-purple-500/70 text-purple-200 hover:bg-purple-500/60' :
    'bg-zinc-700/50 border-zinc-500 text-zinc-200 hover:bg-zinc-700/70';

  return (
    <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl select-none">
      {/* Header */}
      <div className="px-3 py-2 bg-zinc-950 border-b border-zinc-850 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
            📊 ビジュアルタイムライン <span className="text-[9px] font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-900/80 px-1.5 py-0.2 rounded">LIVE EDITABLE</span>
          </span>
          <span className="text-[9px] text-zinc-500 font-mono">計 {events.length} 件</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase text-zinc-500">ZOOM</span>
            <input type="range" min="0.2" max="10" step="0.1" value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-[9px] font-mono text-emerald-400 w-8">{zoom.toFixed(1)}x</span>
          </div>
          <button onClick={handleExportCSV} disabled={events.length === 0}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${
              events.length > 0
                ? 'bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-750 cursor-pointer active:scale-95'
                : 'opacity-40 cursor-not-allowed text-zinc-600 border border-zinc-850'
            }`}
          >
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>

      {/* Timeline Tracks Container */}
      <div className="border-b border-zinc-850 bg-zinc-950/30">
        {events.length === 0 ? (
          <div className="py-6 text-center text-[11px] text-zinc-600">
            タグを打つとリアルタイムでタイムライン上に記録されます
          </div>
        ) : (
          <div ref={timelineContainerRef} className="overflow-x-auto w-full">
            <div className="relative flex flex-col divide-y divide-zinc-800/40 select-none"
              style={{ width: `${Math.max(100, zoom * 100)}%`, minWidth: '100%' }}>
              
              {/* Ruler Header Row */}
              <div className="h-6 bg-zinc-950 sticky top-0 z-20 flex items-center border-b border-zinc-800/80">
                {/* Left Track Label Space Header */}
                <div className="w-[130px] shrink-0 h-full border-r border-zinc-800 bg-zinc-950 flex items-center px-2 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.4)]">
                  <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider font-bold">Code Track</span>
                </div>
                
                {/* Timeline Ruler Track (0% = Exactly at 130px) */}
                <div className="flex-1 relative h-full cursor-pointer" onClick={handleTrackClick}>
                  {ticks.map(t => (
                    <div key={t}
                      className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                      style={{ left: `${(t / totalD) * 100}%` }}>
                      <span className="text-[8px] font-mono text-zinc-400 pb-0.5 font-semibold">
                        {formatCentiseconds(t).split('.')[0]}
                      </span>
                      <div className="w-px h-1.5 bg-zinc-600" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action-name grouped tracks */}
              {trackNames.map(trackName => {
                const trackEvents = events.filter(e => e.actionName === trackName);
                return (
                  <div key={trackName} className="relative h-9 flex items-center hover:bg-zinc-850/15 group/row">
                    {/* Left Track Label */}
                    <div className="w-[130px] shrink-0 h-full bg-zinc-900 border-r border-zinc-800 z-10 flex items-center px-2 shadow-[2px_0_4px_rgba(0,0,0,0.3)]">
                      <span className="text-[9.5px] font-bold text-zinc-200 truncate">{trackName}</span>
                    </div>

                    {/* Right Scrollable Track Area */}
                    <div className="flex-1 relative h-full cursor-pointer" onClick={handleTrackClick}>
                      {trackEvents.map(ev => {
                        const leftPct = Math.max(0, (ev.startTime / totalD) * 100);
                        const widthPct = Math.max(0.5, ((ev.endTime - ev.startTime) / totalD) * 100);
                        const pitcherLabel = ev.labels['Pitcher'] || ev.labels['投手名'] || ev.playerName || '';
                        const resultLabel = ev.labels['Result'] || ev.labels['結果'] || '';
                        const isSelected = selectedEventId === ev.id;

                        const tooltipText = [
                          `${ev.actionName}`,
                          `時刻: ${formatCentiseconds(ev.startTime)} - ${formatCentiseconds(ev.endTime)}`,
                          ...Object.entries(ev.labels).map(([g, v]) => `${g}: ${v}`)
                        ].join('\n');

                        return (
                          <div key={ev.id}
                            onClick={e => {
                              e.stopPropagation();
                              onSelectEvent?.(ev.id);
                            }}
                            onDoubleClick={e => {
                              if (onContextMenu) {
                                e.preventDefault();
                                e.stopPropagation();
                                onContextMenu(e, ev.id);
                              }
                            }}
                            onContextMenu={e => {
                              if (onContextMenu) {
                                e.preventDefault();
                                e.stopPropagation();
                                onContextMenu(e, ev.id);
                              }
                            }}
                            className={`absolute top-1 bottom-1 rounded border px-1.5 flex items-center justify-between overflow-hidden transition-all hover:scale-[1.02] cursor-pointer text-[9px] font-bold shadow-sm ${blockColor(ev.color)} ${
                              isSelected ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-zinc-900 z-10 scale-[1.02]' : ''
                            }`}
                            style={{
                              left: `${leftPct}%`,
                              width: `calc(${widthPct}% - 2px)`,
                              minWidth: '24px'
                            }}
                            title={tooltipText}
                          >
                            <span className="truncate leading-none">
                              {ev.actionName} {pitcherLabel ? `(${pitcherLabel})` : resultLabel ? `[${resultLabel}]` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Playhead Line */}
              {totalD > 0 && (
                <div className="absolute top-0 bottom-0 pointer-events-none z-30"
                  style={{
                    left: `calc(130px + (100% - 130px) * ${Math.min(1, Math.max(0, currentVideoTime / totalD))})`
                  }}>
                  <div className="w-0.5 h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-[4px] -mt-2.5 border-2 border-white shadow-md" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Event Log Table (Fixed height to prevent screen push-down) */}
      <div className="h-[140px] overflow-y-auto shrink-0 border-t border-zinc-850">
        {sortedEvents.length === 0 ? (
          <div className="py-4 text-center text-[11px] text-zinc-600">記録された打撃・投球タグはありません</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-950/80 text-zinc-400 font-bold uppercase border-b border-zinc-850 text-[10px] tracking-wider sticky top-0 z-10">
                <th className="py-2 px-3">時刻</th>
                <th className="py-2 px-3">打者/選手</th>
                <th className="py-2 px-3">アクション</th>
                {activeGroupNames.map(g => (
                  <th key={g} className="py-2 px-3 text-sky-400 font-bold">{g}</th>
                ))}
                <th className="py-2 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/50">
              {sortedEvents.map(ev => {
                const isSelected = selectedEventId === ev.id;
                return (
                  <tr key={ev.id}
                    onClick={() => {
                      onSelectEvent?.(ev.id);
                    }}
                    onDoubleClick={e => {
                      if (onContextMenu) {
                        e.preventDefault();
                        onContextMenu(e, ev.id);
                      }
                    }}
                    onContextMenu={e => {
                      if (onContextMenu) {
                        e.preventDefault();
                        onContextMenu(e, ev.id);
                      }
                    }}
                    className={`transition-colors cursor-pointer group ${
                      isSelected ? 'bg-emerald-950/40 border-l-2 border-emerald-500' : 'hover:bg-zinc-850/30'
                    }`}
                  >
                    <td className="py-1.5 px-3 font-mono text-zinc-300 text-[10px] whitespace-nowrap">
                      {formatCentiseconds(ev.startTime)} – {formatCentiseconds(ev.endTime)}
                    </td>
                    <td className="py-1.5 px-3 text-zinc-200 font-semibold text-[10px] whitespace-nowrap">
                      {ev.playerName || ev.labels['Pitcher'] || '—'}
                    </td>
                    <td className="py-1.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded font-bold text-[9px] bg-zinc-800 border border-zinc-700 text-zinc-200">
                        {ev.actionName}
                      </span>
                    </td>
                    {activeGroupNames.map(g => (
                      <td key={g} className="py-1.5 px-3 text-[10px]">
                        {ev.labels[g] ? (
                          <span className="text-zinc-200 bg-zinc-950/60 px-1.5 py-0.5 rounded border border-zinc-800 font-medium">
                            {ev.labels[g]}
                          </span>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                    ))}
                    <td className="py-1.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        {onContextMenu && (
                          <button
                            onClick={e => onContextMenu(e, ev.id)}
                            className="p-1 rounded text-zinc-400 hover:text-sky-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="右クリック/タグの編集・追加"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => onSeek(ev.startTime)}
                          className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="この位置へ再生移動">
                          <PlayCircle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDeleteEvent(ev.id)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="削除">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 bg-zinc-950 text-[9px] text-zinc-500 border-t border-zinc-850 flex justify-between items-center">
        <span>全 {events.length} 件タグ記録済み</span>
        <span className="text-zinc-400">💡 各ブロックやログ行をダブルクリックまたは右クリックでタグの編集・修正が可能です</span>
      </div>
    </div>
  );
};
