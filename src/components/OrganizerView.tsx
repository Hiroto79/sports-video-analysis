import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { TaggedEvent } from '../types';
import { 
  Trash2, Edit2, Table, Film, CheckSquare, Square, ChevronRight, Play
} from 'lucide-react';

interface OrganizerViewProps {
  events: TaggedEvent[];
  videoDuration: number;
  onSeek: (time: number) => void;
  onUpdateEvents: (events: TaggedEvent[]) => void;
  
  activeTab: 'grid' | 'organizer';
  onChangeTab: (tab: 'grid' | 'organizer') => void;
  selectedIds: Set<string>;
  onUpdateSelectedIds: (ids: Set<string>) => void;
  exportProgress: string | null;
  activePreviewClip: TaggedEvent | null;
  onPreviewClip: (clip: TaggedEvent) => void;
  onClearPreviewClip: () => void;
}

export const OrganizerView: React.FC<OrganizerViewProps> = ({
  events,
  videoDuration,
  onSeek,
  onUpdateEvents,
  activeTab,
  onChangeTab,
  selectedIds,
  onUpdateSelectedIds,
  exportProgress,
  activePreviewClip,
  onPreviewClip,
  onClearPreviewClip
}) => {
  const [editingCell, setEditingCell] = useState<{ id: string; group: string } | null>(null);

  // Drag selection tracking states
  const isDraggingRef = useRef(false);
  const dragStartIdRef = useRef<string | null>(null);
  const [dragCurrentSelected, setDragCurrentSelected] = useState<Set<string>>(new Set());

  // Row Drag and Drop reordering states
  const [draggedRowIdx, setDraggedRowIdx] = useState<number | null>(null);
  const [dragOverRowIdx, setDragOverRowIdx] = useState<number | null>(null);

  // Column Drag and Drop reordering states
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [draggedColName, setDraggedColName] = useState<string | null>(null);
  const [dragOverColName, setDragOverColName] = useState<string | null>(null);

  // Get active unique group names for grid headers
  const activeGroupNames = useMemo(() => {
    const groups = new Set<string>();
    groups.add('Pitch Type');
    groups.add('Result');
    groups.add('Batted Ball');
    groups.add('Play');
    groups.add('Tactics');
    groups.add('RBI');

    events.forEach(ev => {
      Object.keys(ev.labels).forEach(g => {
        if (g !== 'Pitcher' && g !== 'Batter') groups.add(g);
      });
    });
    return Array.from(groups);
  }, [events]);

  // Initialize and sync column order reordering states
  useEffect(() => {
    if (columnOrder.length === 0 && activeGroupNames.length > 0) {
      setColumnOrder(activeGroupNames);
    } else if (activeGroupNames.length > 0) {
      const merged = Array.from(new Set([...columnOrder, ...activeGroupNames]));
      const cleaned = merged.filter(col => activeGroupNames.includes(col));
      if (JSON.stringify(cleaned) !== JSON.stringify(columnOrder)) {
        setColumnOrder(cleaned);
      }
    }
  }, [activeGroupNames, columnOrder]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.startTime - b.startTime);
  }, [events]);

  // Handle Event label modifications directly in cells
  const handleUpdateLabelVal = (eventId: string, groupKey: string, newVal: string) => {
    const updated = events.map(ev => {
      if (ev.id !== eventId) return ev;
      const labels = { ...ev.labels };
      if (!newVal || newVal.trim() === '-' || newVal.trim() === '') {
        delete labels[groupKey];
      } else {
        labels[groupKey] = newVal;
      }
      return { ...ev, labels };
    });
    onUpdateEvents(updated);
    setEditingCell(null);
  };

  // -------------------------------------------------------------
  // MOUSE DRAG MULTI-SELECTION LOGIC FOR TABLE ROWS
  // -------------------------------------------------------------
  const handleRowMouseDown = (id: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'SELECT' || target.tagName === 'INPUT' || target.isContentEditable) return;
    if (target.closest('.drag-handle') || target.tagName === 'TD') {
      const idxCell = target.closest('td');
      if (idxCell && idxCell.cellIndex === 1) return;
    }

    isDraggingRef.current = true;
    dragStartIdRef.current = id;
    
    const nextSelected = new Set(selectedIds);
    if (nextSelected.has(id)) {
      nextSelected.delete(id);
    } else {
      nextSelected.add(id);
    }
    onUpdateSelectedIds(nextSelected);
    setDragCurrentSelected(new Set([id]));
    
    e.preventDefault();
  };

  const handleRowMouseEnter = (id: string) => {
    if (!isDraggingRef.current || !dragStartIdRef.current) return;
    
    const startIndex = sortedEvents.findIndex(ev => ev.id === dragStartIdRef.current);
    const endIndex = sortedEvents.findIndex(ev => ev.id === id);
    if (startIndex === -1 || endIndex === -1) return;

    const min = Math.min(startIndex, endIndex);
    const max = Math.max(startIndex, endIndex);
    
    const rangeIds = new Set<string>();
    const nextSelected = new Set(selectedIds);

    for (let i = min; i <= max; i++) {
      const rowId = sortedEvents[i].id;
      rangeIds.add(rowId);
      nextSelected.add(rowId);
    }
    
    onUpdateSelectedIds(nextSelected);
    setDragCurrentSelected(rangeIds);
  };

  const handleMouseUpGlobal = () => {
    isDraggingRef.current = false;
    dragStartIdRef.current = null;
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => window.removeEventListener('mouseup', handleMouseUpGlobal);
  }, [selectedIds, sortedEvents]);

  // -------------------------------------------------------------
  // ROW DRAG AND DROP REORDERING HANDLERS
  // -------------------------------------------------------------
  const handleRowDragStart = (e: React.DragEvent, index: number) => {
    setDraggedRowIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedRowIdx !== index) {
      setDragOverRowIdx(index);
    }
  };

  const handleRowDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedRowIdx === null || draggedRowIdx === targetIndex) return;

    const nextEvents = [...sortedEvents];
    const [draggedItem] = nextEvents.splice(draggedRowIdx, 1);
    nextEvents.splice(targetIndex, 0, draggedItem);

    onUpdateEvents(nextEvents);
  };

  const handleRowDragEnd = () => {
    setDraggedRowIdx(null);
    setDragOverRowIdx(null);
  };

  // -------------------------------------------------------------
  // COLUMN DRAG AND DROP REORDERING HANDLERS
  // -------------------------------------------------------------
  const handleColDragStart = (e: React.DragEvent, colName: string) => {
    setDraggedColName(colName);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colName);
  };

  const handleColDragOver = (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    if (draggedColName !== colName) {
      setDragOverColName(colName);
    }
  };

  const handleColDrop = (e: React.DragEvent, targetColName: string) => {
    e.preventDefault();
    if (!draggedColName || draggedColName === targetColName) return;

    const nextOrder = [...columnOrder];
    const draggedIdx = nextOrder.indexOf(draggedColName);
    const targetIdx = nextOrder.indexOf(targetColName);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      nextOrder.splice(draggedIdx, 1);
      nextOrder.splice(targetIdx, 0, draggedColName);
      setColumnOrder(nextOrder);
    }
  };

  const handleColDragEnd = () => {
    setDraggedColName(null);
    setDragOverColName(null);
  };

  // Seek video player via parent callback
  const handleSeekToEvent = (ev: TaggedEvent) => {
    onSeek(ev.startTime);
  };

  // Toggle single selection
  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onUpdateSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === events.length) {
      onUpdateSelectedIds(new Set());
    } else {
      onUpdateSelectedIds(new Set(events.map(ev => ev.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`本当に選択された ${selectedIds.size} 件のクリップを削除しますか？`)) {
      const remaining = events.filter(ev => !selectedIds.has(ev.id));
      onUpdateEvents(remaining);
      onUpdateSelectedIds(new Set());
    }
  };

  // -------------------------------------------------------------
  // CLIP IN/OUT TRIMMING (In/Out 0.1s steps)
  // -------------------------------------------------------------
  const handleTrimClip = (eventId: string, type: 'start' | 'end', delta: number) => {
    const updated = events.map(ev => {
      if (ev.id !== eventId) return ev;
      let start = ev.startTime;
      let end = ev.endTime;
      
      if (type === 'start') {
        start = Math.max(0, Math.min(start + delta, end - 0.2));
      } else {
        end = Math.max(start + 0.2, Math.min(end + delta, videoDuration || 99999));
      }
      
      return { ...ev, startTime: start, endTime: end };
    });
    onUpdateEvents(updated);
    
    if (activePreviewClip && activePreviewClip.id === eventId) {
      const found = updated.find(ev => ev.id === eventId);
      if (found) onPreviewClip(found);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-3 w-full max-w-7xl mx-auto p-2 lg:p-4 overflow-hidden min-h-0">
      
      {/* 0. TAB NAVIGATION HEADER (Compact, Sticky) */}
      <div className="px-4 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between shrink-0 h-11">
        <div className="flex gap-1 py-1">
          <button
            onClick={() => onChangeTab('grid')}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'grid'
                ? 'bg-zinc-850 border border-zinc-750 text-emerald-400 shadow-inner'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Table className="w-4 h-4" />
            📊 データグリッド編集 (Spreadsheet)
          </button>
          <button
            onClick={() => onChangeTab('organizer')}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'organizer'
                ? 'bg-zinc-850 border border-zinc-750 text-emerald-400 shadow-inner'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Film className="w-4 h-4" />
            🎞️ クリップオーガナイザー ({selectedIds.size} 件選択)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-555 font-mono">
            選択: {selectedIds.size} / {events.length} 件
          </span>
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-2 py-0.5 bg-red-950/80 border border-red-800/80 hover:bg-red-900 text-red-300 rounded text-[10px] font-bold transition-all cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3 h-3" />
              選択削除
            </button>
          )}
        </div>
      </div>

      {/* Progress banner for Combined media encoder */}
      {exportProgress && (
        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 flex items-center justify-between shrink-0 animate-pulse">
          <span className="text-xs text-emerald-400 font-bold">{exportProgress}</span>
        </div>
      )}

      {/* 2. DYNAMIC CONTENT AREA (Grid Table vs Sorter Cards) */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-0">
        
        {/* TAB A: SPREADSHEET GRID EDITOR */}
        {activeTab === 'grid' && (
          <div className="flex-1 overflow-auto relative select-none">
            <table className="w-full border-collapse text-xs table-fixed">
              <thead>
                <tr className="bg-zinc-950/95 text-zinc-400 uppercase font-black tracking-wider text-[9px] border-b border-zinc-850 sticky top-0 z-20">
                  <th className="w-12 py-1.5 px-1 text-center border-r border-zinc-850">
                    <button 
                      onClick={handleSelectAll}
                      className="text-zinc-400 hover:text-white"
                      title="すべて選択/解除"
                    >
                      {selectedIds.size === events.length && events.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5 mx-auto text-emerald-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 mx-auto" />
                      )}
                    </button>
                  </th>
                  <th className="w-14 py-1.5 px-1 border-r border-zinc-850 text-center">No</th>
                  <th className="w-32 py-1.5 px-2 border-r border-zinc-850 text-left">投手名 (再生)</th>
                  <th className="w-28 py-1.5 px-2 border-r border-zinc-850 text-left">タグ (シーク)</th>
                  
                  {columnOrder.map(group => {
                    const isColOver = dragOverColName === group;
                    const isColDragging = draggedColName === group;

                    return (
                      <th 
                        key={group} 
                        draggable
                        onDragStart={(e) => handleColDragStart(e, group)}
                        onDragOver={(e) => handleColDragOver(e, group)}
                        onDrop={(e) => handleColDrop(e, group)}
                        onDragEnd={handleColDragEnd}
                        className={`w-28 py-1.5 px-2 border-r border-zinc-850 text-left font-bold text-sky-400 truncate cursor-move select-none transition-all ${
                          isColOver ? 'border-l-4 border-l-amber-500 bg-zinc-800' : ''
                        } ${isColDragging ? 'opacity-30 bg-zinc-950' : ''}`}
                        title="ドラッグで列を左右に並び替え"
                      >
                        <span className="text-zinc-650 mr-1 select-none text-[8.5px]">::</span>
                        {group}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60">
                {sortedEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4 + columnOrder.length} className="text-center py-20 text-zinc-650 text-xs">
                      記録された投球イベントがありません。ビデオ＆タグ記録画面でプレイをログしてください。
                    </td>
                  </tr>
                ) : (
                  sortedEvents.map((ev, idx) => {
                    const isSelected = selectedIds.has(ev.id);
                    const isDragActive = dragCurrentSelected.has(ev.id);
                    const pName = ev.labels.Pitcher || ev.labels['投手名'] || ev.actionName;

                    const isRowDragging = draggedRowIdx === idx;
                    const isRowOver = dragOverRowIdx === idx;

                    return (
                      <tr 
                        key={ev.id} 
                        draggable
                        onDragStart={(e) => handleRowDragStart(e, idx)}
                        onDragOver={(e) => handleRowDragOver(e, idx)}
                        onDrop={(e) => handleRowDrop(e, idx)}
                        onDragEnd={handleRowDragEnd}
                        onMouseDown={(e) => handleRowMouseDown(ev.id, e)}
                        onMouseEnter={() => handleRowMouseEnter(ev.id)}
                        className={`group hover:bg-zinc-850/30 transition-colors cursor-row-resize ${
                          isSelected 
                            ? 'bg-emerald-950/20 hover:bg-emerald-950/30' 
                            : isDragActive 
                            ? 'bg-zinc-800/40'
                            : 'bg-zinc-950/10'
                        } ${isRowOver ? 'border-t-4 border-t-amber-500 bg-zinc-900' : ''} ${
                          isRowDragging ? 'opacity-30 bg-zinc-950 scale-[0.99]' : ''
                        }`}
                        title="行のNo付近をドラッグして上下に並び替え"
                      >
                        <td 
                          className="py-1 px-1.5 text-center border-r border-zinc-850"
                          onMouseDown={(e) => e.stopPropagation()}
                          draggable={false}
                        >
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRow(ev.id)}
                            className="w-3 h-3 accent-emerald-500 cursor-pointer"
                          />
                        </td>

                        <td className="py-1 px-1 text-center font-mono text-[9.5px] text-zinc-555 border-r border-zinc-850 select-none drag-handle">
                          {idx + 1}
                        </td>

                        <td 
                          className="py-1 px-2 text-[10px] font-semibold text-zinc-300 hover:text-emerald-400 cursor-pointer border-r border-zinc-850 transition-colors truncate"
                          onClick={() => handleSeekToEvent(ev)}
                          onMouseDown={(e) => e.stopPropagation()}
                          draggable={false}
                        >
                          <span className="flex items-center gap-1 truncate">
                            <ChevronRight className="w-3 h-3 text-zinc-655 shrink-0 group-hover:text-emerald-500" />
                            {pName}
                          </span>
                        </td>

                        <td 
                          className="py-1 px-2 border-r border-zinc-850 text-[10px] font-bold text-zinc-400 hover:text-emerald-400 cursor-pointer transition-colors"
                          onClick={() => handleSeekToEvent(ev)}
                          onMouseDown={(e) => e.stopPropagation()}
                          draggable={false}
                        >
                          <span className="bg-zinc-950 border border-zinc-850 px-1 py-0.2 rounded text-[8.5px] text-zinc-400 font-mono">
                            {ev.actionName} ({ev.startTime.toFixed(1)}s)
                          </span>
                        </td>

                        {columnOrder.map(group => {
                          const val = ev.labels[group] || '';
                          const isEditing = editingCell?.id === ev.id && editingCell?.group === group;
                          
                          const discoveredLabels = Array.from(new Set(
                            events.map(e => e.labels[group]).filter(v => v !== undefined && v !== null && v !== '')
                          )) as string[];

                          if (discoveredLabels.length === 0) {
                            if (group === 'Pitch Type') discoveredLabels.push('4シーム', '2シーム', 'スライダー', 'カーブ', 'フォーク', 'チェンジアップ');
                            if (group === 'Result') discoveredLabels.push('見逃しストライク', '空振りストライク', 'ファール', 'ボール', '単打', '二塁打', '三塁打', '本塁打');
                            if (group === 'Batted Ball') discoveredLabels.push('ゴロ', 'フライ', 'ライナー', '小フライ');
                          }

                          return (
                            <td 
                              key={group} 
                              className="py-1 px-2 border-r border-zinc-850 relative group/cell hover:bg-zinc-900 cursor-pointer"
                              onDoubleClick={() => setEditingCell({ id: ev.id, group })}
                              onMouseDown={(e) => e.stopPropagation()}
                              draggable={false}
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-1 w-full z-30 relative">
                                  <select
                                    defaultValue={val}
                                    autoFocus
                                    onChange={(e) => handleUpdateLabelVal(ev.id, group, e.target.value)}
                                    onBlur={() => setEditingCell(null)}
                                    className="bg-zinc-850 text-white border border-zinc-700 text-xs px-1.5 py-0.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  >
                                    <option value="-">- (空欄にする)</option>
                                    {discoveredLabels.map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                    {val && !discoveredLabels.includes(val) && (
                                      <option value={val}>{val}</option>
                                    )}
                                  </select>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between w-full h-6 truncate text-zinc-300">
                                  <span className={val ? "font-bold text-zinc-200" : "text-zinc-650"}>
                                    {val || '-'}
                                  </span>
                                  <Edit2 className="w-3 h-3 text-zinc-655 opacity-0 group-hover/cell:opacity-100 transition-opacity absolute right-2 bg-zinc-900/60 p-0.5 rounded" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB B: CLIP ORGANIZER GRID */}
        {activeTab === 'organizer' && (
          <div className="flex-1 overflow-auto p-4">
            {sortedEvents.filter(ev => selectedIds.has(ev.id)).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-655 gap-2">
                <Film className="w-10 h-10 opacity-30 text-zinc-600" />
                <span>チェックされたクリップがありません。「データグリッド編集」タブでクリップ行を選択してください。</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedEvents
                  .filter(ev => selectedIds.has(ev.id))
                  .map((ev, idx) => {
                    const isActivePreview = activePreviewClip?.id === ev.id;
                    const pName = ev.labels.Pitcher || ev.labels['投手名'] || ev.actionName;
                    const hitRes = ev.labels['Result'] || '-';
                    const pType = ev.labels['Pitch Type'] || '-';

                    return (
                      <div 
                        key={ev.id}
                        onDoubleClick={() => onPreviewClip(ev)}
                        className={`bg-zinc-900 border p-4.5 rounded-2xl flex flex-col justify-between gap-4 transition-all duration-300 shadow hover:shadow-xl select-none relative ${
                          isActivePreview 
                            ? 'border-emerald-500 bg-emerald-950/10 ring-2 ring-emerald-500/20' 
                            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 font-extrabold px-2 py-0.5 rounded font-mono">
                              CLIP #{idx + 1}
                            </span>
                            
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onPreviewClip(ev)}
                                className={`p-1 rounded cursor-pointer ${
                                  isActivePreview ? 'bg-emerald-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                                }`}
                                title="クリッププレビュー (ループ再生)"
                              >
                                <Play className="w-3 h-3" />
                              </button>
                              
                              {isActivePreview && (
                                <button
                                  onClick={onClearPreviewClip}
                                  className="text-[9px] bg-red-955 text-red-400 border border-red-900 font-bold px-1.5 py-0.5 rounded cursor-pointer hover:bg-red-900 hover:text-white"
                                >
                                  解除
                                </button>
                              )}

                              <button
                                onClick={() => handleToggleSelectRow(ev.id)}
                                className="p-1 rounded bg-zinc-800 hover:bg-red-850 text-zinc-455 hover:text-white cursor-pointer"
                                title="オーガナイザーから除外"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 mt-1 text-xs">
                            <p className="font-extrabold text-zinc-100 flex justify-between">
                              <span className="text-zinc-555">投手:</span>
                              <span className="text-emerald-400 truncate max-w-[130px]">{pName}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-zinc-555">球種:</span>
                              <span className="text-zinc-300 font-semibold">{pType}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-zinc-555">結果:</span>
                              <span className="text-amber-400 font-bold">{hitRes}</span>
                            </p>
                          </div>
                        </div>

                        {/* Trimmer controls */}
                        <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-850/60 space-y-2 mt-2">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <div className="text-left">
                              <span className="text-zinc-555 block">IN (START)</span>
                              <span className="text-zinc-300 font-bold">{ev.startTime.toFixed(1)}s</span>
                            </div>
                            <div className="text-right">
                              <span className="text-zinc-555 block">OUT (END)</span>
                              <span className="text-zinc-300 font-bold">{ev.endTime.toFixed(1)}s</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="flex bg-zinc-900 border border-zinc-800 rounded p-0.5 justify-between items-center">
                              <button 
                                onClick={() => handleTrimClip(ev.id, 'start', -0.1)}
                                className="px-1 text-[10px] font-extrabold hover:text-white text-zinc-455 active:scale-90"
                              >
                                -
                              </button>
                              <span className="text-[8.5px] font-bold text-zinc-400">IN</span>
                              <button 
                                onClick={() => handleTrimClip(ev.id, 'start', 0.1)}
                                className="px-1 text-[10px] font-extrabold hover:text-white text-zinc-455 active:scale-90"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex bg-zinc-900 border border-zinc-800 rounded p-0.5 justify-between items-center">
                              <button 
                                onClick={() => handleTrimClip(ev.id, 'end', -0.1)}
                                className="px-1 text-[10px] font-extrabold hover:text-white text-zinc-455 active:scale-90"
                              >
                                -
                              </button>
                              <span className="text-[8.5px] font-bold text-zinc-400">OUT</span>
                              <button 
                                onClick={() => handleTrimClip(ev.id, 'end', 0.1)}
                                className="px-1 text-[10px] font-extrabold hover:text-white text-zinc-455 active:scale-90"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 bg-zinc-950 text-[10px] text-zinc-550 border border-zinc-850 rounded-xl flex justify-between shrink-0">
        <span>Spreadsheet: Row drag multi-select. Drag Row No / Column headers to reorder. Double-click cells to modify.</span>
        <span>Clicking Pitcher or Tag seeks video to playhead instantly.</span>
      </div>
    </div>
  );
};
