import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { TaggedEvent, Player } from '../types';
import { formatCentiseconds } from '../utils/formatters';
import { ListFilter, Download, Trash2, PlayCircle, Eye, ZoomIn, Info } from 'lucide-react';

interface EventTimelineProps {
  events: TaggedEvent[];
  players: Player[];
  videoDuration: number;
  currentVideoTime: number;
  onSeek: (time: number) => void;
  onDeleteEvent: (id: string) => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({
  events,
  players,
  videoDuration,
  currentVideoTime,
  onSeek,
  onDeleteEvent
}) => {
  const [zoom, setZoom] = useState(1);
  const [timelineMode, setTimelineMode] = useState<'pitcher' | 'roster'>('pitcher');
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Extract unique pitcher names recorded in events or roster
  const uniquePitcherNames = useMemo(() => {
    const list = new Set<string>();
    
    // 1. Get from events labels or actionName (Pitcher name is set to actionName when pitching)
    events.forEach(ev => {
      const p = ev.labels.Pitcher || ev.labels['投手名'];
      if (p && p !== '-') {
        list.add(p.toString());
      } else if (ev.actionId === 'btn_pitch' && ev.actionName && ev.actionName !== 'Pitch' && ev.actionName !== '投球') {
        list.add(ev.actionName);
      }
    });

    // 2. Get from players who are pitchers or dual position
    players.forEach(p => {
      if (p.positionType === 'pitcher' || p.positionType === 'both') {
        list.add(p.name);
      }
    });

    const arr = Array.from(list);
    return arr.length > 0 ? arr : ['投手A', '投手B'];
  }, [events, players]);

  const getEventsForPitcher = (pitcherName: string) => {
    return events.filter(ev => {
      const p = ev.labels.Pitcher || ev.labels['投手名'] || ev.actionName;
      return p === pitcherName || ev.actionName === pitcherName;
    });
  };

  // Sort events chronologically by start time (so the list goes from first pitch to last pitch)
  const sortedEvents = [...events].sort((a, b) => a.startTime - b.startTime);

  // Get all unique label groups present in the current logged events
  // This lets the columns adapt dynamically to whatever buttons they create (e.g., Pitch Type, Result, Count)
  const getUniqueGroupNames = (): string[] => {
    const groups = new Set<string>();
    events.forEach(ev => {
      Object.keys(ev.labels).forEach(g => groups.add(g));
    });
    // Convert to array and sort to keep column order consistent
    return Array.from(groups).sort();
  };

  const activeGroupNames = getUniqueGroupNames();

  // Generate ruler ticks
  const generateRulerTicks = () => {
    if (videoDuration <= 0) return [];
    let step = 10;
    const totalPixels = videoDuration * 10 * zoom;
    
    if (totalPixels < 500) {
      step = 5;
    } else if (videoDuration > 1800) {
      step = zoom > 5 ? 30 : 300;
    } else if (videoDuration > 600) {
      step = zoom > 5 ? 10 : 60;
    } else {
      step = zoom > 5 ? 2 : 10;
    }

    const ticks = [];
    for (let t = 0; t <= videoDuration; t += step) {
      ticks.push(t);
    }
    if (ticks[ticks.length - 1] !== videoDuration && videoDuration - ticks[ticks.length - 1] > step / 2) {
      ticks.push(videoDuration);
    }
    return ticks;
  };

  const ticks = generateRulerTicks();

  // Scroll to track playhead
  useEffect(() => {
    if (videoDuration <= 0 || !timelineContainerRef.current) return;
    
    const container = timelineContainerRef.current;
    const playheadPercent = currentVideoTime / videoDuration;
    const playheadPixelX = playheadPercent * container.scrollWidth;
    
    const viewportWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    
    if (playheadPixelX > scrollLeft + viewportWidth * 0.8 || playheadPixelX < scrollLeft + viewportWidth * 0.1) {
      container.scrollTo({
        left: playheadPixelX - viewportWidth * 0.3,
        behavior: 'smooth'
      });
    }
  }, [currentVideoTime, videoDuration, zoom]);

  // Dynamic wide CSV export
  const handleExportCSV = () => {
    if (events.length === 0) return;
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Headers: Basic columns + all unique Label Group Names
    const basicHeaders = ['ID', 'Trigger Time (s)', 'Start Time (s)', 'End Time (s)', 'Start Clock', 'End Clock', 'Player', 'Jersey Number', 'Code Event'];
    const headers = [...basicHeaders, ...activeGroupNames];
    csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
    
    // Rows mapping labels to matching columns
    sortedEvents.forEach((ev) => {
      const startClock = formatCentiseconds(ev.startTime);
      const endClock = formatCentiseconds(ev.endTime);
      
      const playerObj = players.find(p => p.id === ev.playerId);
      const jerseyStr = playerObj?.number ? `#${playerObj.number}` : '-';

      const basicValues = [
        ev.id,
        ev.timestamp.toFixed(2),
        ev.startTime.toFixed(2),
        ev.endTime.toFixed(2),
        startClock,
        endClock,
        ev.playerName || 'Team/Unassigned',
        jerseyStr,
        ev.actionName
      ];

      const labelValues = activeGroupNames.map(group => ev.labels[group] || '');
      const row = [...basicValues, ...labelValues];
      
      csvContent += row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sportscode_baseball_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group events by player for tracks. Unassigned events are grouped separately
  const getEventsForPlayer = (playerId: string | undefined) => {
    return events.filter(ev => ev.playerId === playerId);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    onSeek(percentage * videoDuration);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header Panel */}
      <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-850 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-zinc-400">
            Baseball Pitch-by-Pitch Timeline Lanes
          </h3>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Zoom Control */}
          <div className="flex items-center gap-2 bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-zinc-800">
            <ZoomIn className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Zoom</span>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-xs font-mono font-semibold text-emerald-400 w-8 text-right">{zoom}x</span>
          </div>

          {/* Timeline Mode Switcher */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setTimelineMode('pitcher')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                timelineMode === 'pitcher'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ⚾ 投手別
            </button>
            <button
              onClick={() => setTimelineMode('roster')}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                timelineMode === 'roster'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              👥 登録選手別
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={events.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md ${
              events.length > 0
                ? 'bg-zinc-850 border border-zinc-700 text-zinc-200 hover:text-white hover:bg-zinc-850/80 cursor-pointer active:scale-95'
                : 'bg-zinc-900 text-zinc-650 border border-zinc-850 cursor-not-allowed opacity-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Export Column-Mapped CSV
          </button>
        </div>
      </div>

      {/* MULTI-TRACK SYSTEM TIMELINE VIEW */}
      <div className="bg-zinc-950/20 border-b border-zinc-850 flex flex-col min-h-[180px]">
        {videoDuration > 0 ? (
          <div className="flex flex-col relative w-full overflow-hidden">
            
            <div ref={timelineContainerRef} className="overflow-x-auto w-full">
              <div 
                className="relative min-w-full flex flex-col divide-y divide-zinc-800/40 select-none pb-2"
                style={{ width: `${zoom * 100}%` }}
              >
                {/* 1. Time Ruler */}
                <div className="h-7 bg-zinc-950/60 sticky top-0 z-10 flex items-end border-b border-zinc-800/60 relative">
                  <div className="absolute inset-0 w-full h-full" onClick={handleTimelineClick} />
                  {ticks.map((t) => {
                    const pct = (t / videoDuration) * 100;
                    return (
                      <div 
                        key={t}
                        className="absolute bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                        style={{ left: `${pct}%` }}
                      >
                        <span className="text-[9px] font-mono text-zinc-500 font-medium pb-0.5">{formatCentiseconds(t).split('.')[0]}</span>
                        <div className="w-px h-1.5 bg-zinc-700" />
                      </div>
                    );
                  })}
                </div>

                {/* 2. Lanes (Pitcher or Roster based) */}
                {timelineMode === 'pitcher' ? (
                  uniquePitcherNames.map((pitcherName: string) => {
                    const pitcherEvents = getEventsForPitcher(pitcherName);
                    return (
                      <div key={pitcherName} className="relative h-11 flex items-center group/row hover:bg-zinc-850/10">
                        {/* Fixed Left Label */}
                        <div className="absolute left-0 w-[140px] top-0 bottom-0 bg-zinc-900 border-r border-zinc-800 z-10 flex items-center px-3 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                          <span className="w-5 h-5 flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded font-mono text-[9px] text-zinc-500 mr-2">
                            P
                          </span>
                          <span className="text-xs font-semibold text-zinc-300 truncate" title={pitcherName}>
                            {pitcherName}
                          </span>
                        </div>

                        {/* Right Scrollable Track Area */}
                        <div 
                          className="absolute left-[140px] right-0 top-0 bottom-0 bg-zinc-950/10 cursor-pointer"
                          onClick={handleTimelineClick}
                        >
                          {pitcherEvents.map((ev) => {
                            const leftPct = (ev.startTime / videoDuration) * 100;
                            const widthPct = ((ev.endTime - ev.startTime) / videoDuration) * 100;
                            const tooltipLabels = Object.entries(ev.labels)
                              .map(([g, v]) => `${g}: ${v}`)
                              .join(' | ');

                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSeek(ev.startTime);
                                }}
                                className={`absolute top-1.5 bottom-1.5 rounded border px-1.5 flex items-center justify-between overflow-hidden shadow-sm transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                                  ev.color.includes('red') ? 'bg-red-500/30 hover:bg-red-500/40 border-red-500/70 text-red-300' :
                                  ev.color.includes('sky') ? 'bg-sky-500/30 hover:bg-sky-500/40 border-sky-500/70 text-sky-300' :
                                  ev.color.includes('emerald') ? 'bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-500/70 text-emerald-300' :
                                  ev.color.includes('amber') ? 'bg-amber-500/30 hover:bg-amber-500/40 border-amber-500/70 text-amber-300' :
                                  ev.color.includes('purple') ? 'bg-purple-500/30 hover:bg-purple-500/40 border-purple-500/70 text-purple-300' : 
                                  'bg-zinc-700/30 hover:bg-zinc-700/40 border-zinc-500 text-zinc-300'
                                }`}
                                style={{ 
                                  left: `${leftPct}%`, 
                                  width: `calc(${widthPct}% - 2px)`,
                                  minWidth: '12px'
                                }}
                                title={`${ev.actionName} - ${tooltipLabels}`}
                              >
                                <span className="text-[9.5px] font-extrabold truncate leading-none">
                                  {ev.actionName} {ev.labels['Result'] ? `(${ev.labels['Result']})` : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  players.map((player) => {
                    const playerEvents = getEventsForPlayer(player.id);
                    return (
                      <div key={player.id} className="relative h-11 flex items-center group/row hover:bg-zinc-850/10">
                        {/* Fixed Left Label */}
                        <div className="absolute left-0 w-[140px] top-0 bottom-0 bg-zinc-900 border-r border-zinc-800 z-10 flex items-center px-3 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                          <span className="w-5 h-5 flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded font-mono text-[9px] text-zinc-500 mr-2">
                            {player.hotkey}
                          </span>
                          <span className="text-xs font-semibold text-zinc-300 truncate" title={player.name}>
                            {player.name}
                          </span>
                        </div>

                        {/* Right Scrollable Track Area */}
                        <div 
                          className="absolute left-[140px] right-0 top-0 bottom-0 bg-zinc-950/10 cursor-pointer"
                          onClick={handleTimelineClick}
                        >
                          {playerEvents.map((ev) => {
                            const leftPct = (ev.startTime / videoDuration) * 100;
                            const widthPct = ((ev.endTime - ev.startTime) / videoDuration) * 100;
                            const tooltipLabels = Object.entries(ev.labels)
                              .map(([g, v]) => `${g}: ${v}`)
                              .join(' | ');

                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSeek(ev.startTime);
                                }}
                                className={`absolute top-1.5 bottom-1.5 rounded border px-1.5 flex items-center justify-between overflow-hidden shadow-sm transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                                  ev.color.includes('red') ? 'bg-red-500/30 hover:bg-red-500/40 border-red-500/70 text-red-300' :
                                  ev.color.includes('sky') ? 'bg-sky-500/30 hover:bg-sky-500/40 border-sky-500/70 text-sky-300' :
                                  ev.color.includes('emerald') ? 'bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-500/70 text-emerald-300' :
                                  ev.color.includes('amber') ? 'bg-amber-500/30 hover:bg-amber-500/40 border-amber-500/70 text-amber-300' :
                                  ev.color.includes('purple') ? 'bg-purple-500/30 hover:bg-purple-500/40 border-purple-500/70 text-purple-300' : 
                                  'bg-zinc-700/30 hover:bg-zinc-700/40 border-zinc-500 text-zinc-300'
                                }`}
                                style={{ 
                                  left: `${leftPct}%`, 
                                  width: `calc(${widthPct}% - 2px)`,
                                  minWidth: '12px'
                                }}
                                title={`${ev.actionName} - ${tooltipLabels || 'No tags'}`}
                              >
                                <span className="text-[9.5px] font-extrabold truncate leading-none">
                                  {ev.actionName} {ev.labels['Result'] ? `(${ev.labels['Result']})` : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* 3. Unassigned/General Track Row */}
                {events.some(ev => !ev.playerId) && (
                  <div className="relative h-11 flex items-center group/row hover:bg-zinc-850/10">
                    <div className="absolute left-0 w-[140px] top-0 bottom-0 bg-zinc-900 border-r border-zinc-800 z-10 flex items-center px-3 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                      <span className="w-5 h-5 flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded font-mono text-[9px] text-zinc-500 mr-2">
                        -
                      </span>
                      <span className="text-xs font-bold text-amber-400 truncate">
                        General / Team
                      </span>
                    </div>

                    <div 
                      className="absolute left-[140px] right-0 top-0 bottom-0 bg-zinc-950/10 cursor-pointer"
                      onClick={handleTimelineClick}
                    >
                      {getEventsForPlayer(undefined).map((ev) => {
                        const leftPct = (ev.startTime / videoDuration) * 100;
                        const widthPct = ((ev.endTime - ev.startTime) / videoDuration) * 100;
                        const tooltipLabels = Object.entries(ev.labels)
                          .map(([g, v]) => `${g}: ${v}`)
                          .join(' | ');

                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSeek(ev.startTime);
                            }}
                            className={`absolute top-1.5 bottom-1.5 rounded border px-1.5 flex items-center justify-between overflow-hidden shadow-sm transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                              ev.color.includes('red') ? 'bg-red-500/30 hover:bg-red-500/40 border-red-500/70 text-red-300' :
                              ev.color.includes('sky') ? 'bg-sky-500/30 hover:bg-sky-500/40 border-sky-500/70 text-sky-300' :
                              ev.color.includes('emerald') ? 'bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-500/70 text-emerald-300' :
                              ev.color.includes('amber') ? 'bg-amber-500/30 hover:bg-amber-500/40 border-amber-500/70 text-amber-300' :
                              ev.color.includes('purple') ? 'bg-purple-500/30 hover:bg-purple-500/40 border-purple-500/70 text-purple-300' : 
                              'bg-zinc-700/30 hover:bg-zinc-700/40 border-zinc-500 text-zinc-300'
                            }`}
                            style={{ 
                              left: `${leftPct}%`, 
                              width: `calc(${widthPct}% - 2px)`,
                              minWidth: '12px'
                            }}
                            title={`${ev.actionName} - ${tooltipLabels}`}
                          >
                            <span className="text-[9.5px] font-extrabold truncate leading-none">
                              {ev.actionName} {ev.labels['Result'] ? `(${ev.labels['Result']})` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Playhead Line */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20 shadow shadow-red-950"
                  style={{ 
                    left: `calc(${currentVideoTime / videoDuration * 100}% + ${(140 / (timelineContainerRef.current?.scrollWidth || 1)) * 100}%)` 
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 -mt-1 shadow border border-white" />
                </div>

              </div>
            </div>
            
          </div>
        ) : (
          <div className="w-full h-32 bg-zinc-950/50 border border-zinc-850 rounded flex flex-col items-center justify-center gap-2">
            <Info className="w-6 h-6 text-zinc-650" />
            <span className="text-xs text-zinc-600 font-medium">Timeline tracks will load once you choose a local video file.</span>
          </div>
        )}
      </div>

      {/* DYNAMIC LOG TABLE (ONE ROW PER PITCH) */}
      <div className="flex-1 overflow-auto max-h-[250px] min-h-[160px]">
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-zinc-500 text-xs gap-2">
            <Eye className="w-8 h-8 opacity-20" />
            <span>No pitches or events logged yet. In tagging mode, trigger buttons to record clips.</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-950/70 text-zinc-400 font-bold uppercase border-b border-zinc-850 text-[10px] tracking-wider sticky top-0 z-10">
                <th className="py-2.5 px-4">Clip Interval</th>
                <th className="py-2.5 px-4 font-semibold">Player</th>
                <th className="py-2.5 px-4">Action</th>
                
                {/* Render Dynamic Group Column Headers */}
                {activeGroupNames.map((group) => (
                  <th key={group} className="py-2.5 px-4 font-bold text-sky-400">
                    {group}
                  </th>
                ))}

                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850/50">
              {sortedEvents.map((ev) => {
                const durationSeconds = ev.endTime - ev.startTime;
                return (
                  <tr key={ev.id} className="hover:bg-zinc-850/30 transition-colors group">
                    <td className="py-2.5 px-4 font-mono font-medium text-zinc-300">
                      {formatCentiseconds(ev.startTime)} - {formatCentiseconds(ev.endTime)} ({durationSeconds.toFixed(1)}s)
                    </td>
                    <td className="py-2.5 px-4 text-zinc-200 font-semibold">
                      {ev.playerName || 'Team/General'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-200`}>
                        {ev.actionName}
                      </span>
                    </td>

                    {/* Render Mapped Labels in columns */}
                    {activeGroupNames.map((group) => {
                      const val = ev.labels[group];
                      return (
                        <td key={group} className="py-2.5 px-4">
                          {val ? (
                            <span className="font-semibold text-zinc-300 bg-zinc-950/45 px-1.5 py-0.5 rounded border border-zinc-850/50">
                              {val}
                            </span>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSeek(ev.startTime)}
                          className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                          title="Play Clip Instance"
                        >
                          <PlayCircle className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => onDeleteEvent(ev.id)}
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800/80 transition-colors cursor-pointer"
                          title="Delete Clip Row"
                        >
                          <Trash2 className="w-4 h-4" />
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

      <div className="px-4 py-2 bg-zinc-950 text-[10px] text-zinc-500 border-t border-zinc-850 flex justify-between">
        <span>Logged: {events.length} Pitch / Action Clip(s)</span>
        <span>Matrix Layout: Label buttons dynamically form new table columns.</span>
      </div>
    </div>
  );
};
