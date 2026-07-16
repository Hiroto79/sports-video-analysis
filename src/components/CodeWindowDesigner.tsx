import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { ButtonConfig, ButtonType, Player, CustomPreset } from '../types';
import { Settings, Plus, RotateCcw, Edit2, Trash2, ShieldAlert, Compass, Lock, Unlock, Save } from 'lucide-react';

interface CodeWindowDesignerProps {
  buttons: ButtonConfig[];
  onAddButton: (btn: ButtonConfig) => void;
  onUpdateButton: (btn: ButtonConfig) => void;
  onDeleteButton: (id: string) => void;
  onUpdateButtons: (btns: ButtonConfig[]) => void;
  onLoadTemplate: (type: 'baseball' | 'football' | 'blank') => void;
  onTriggerButton: (btn: ButtonConfig) => void;
  activeEventName: string | null;
  
  players: Player[];
  onUpdatePlayerHand: (id: string, hand: 'R' | 'L' | 'S') => void;
  onUpdatePlayerThrows?: (id: string, hand: 'R' | 'L') => void;
  onUpdatePlayerBats?: (id: string, hand: 'R' | 'L' | 'S') => void;
  activePlayerId: string | null;
  onSelectPlayer: (id: string | null) => void;
  teamAName: string;
  teamBName: string;

  // Scoreboard State
  balls: number;
  strikes: number;
  outs: number;
  onIncrementBall: () => void;
  onIncrementStrike: () => void;
  onIncrementOut: () => void;
  onResetScoreboard: () => void;

  // Tagging variables
  pitcherA: string;
  onUpdatePitcherA: (val: string) => void;
  pitcherB: string;
  onUpdatePitcherB: (val: string) => void;
  defense: string;
  onUpdateDefense: (val: string) => void;
  selectedCourse: string;
  onSelectCourse: (val: string) => void;
  plottedHit: { x: number, y: number } | null;
  onUpdatePlottedHit: (val: { x: number, y: number } | null) => void;
  coursePerspective: 'pitcher' | 'catcher';
  onTogglePerspective: () => void;

  // Hotkey Lock State
  hotkeysEnabled: boolean;
  onToggleHotkeys: () => void;

  // Inning & Runners & Defenders
  inningNum: number;
  onUpdateInningNum: (val: number) => void;
  inningHalf: 'top' | 'bottom';
  onUpdateInningHalf: (val: 'top' | 'bottom') => void;
  runner1BId: string;
  onUpdateRunner1BId: (val: string) => void;
  runner2BId: string;
  onUpdateRunner2BId: (val: string) => void;
  runner3BId: string;
  onUpdateRunner3BId: (val: string) => void;
  
  catcherId: string;
  onUpdateCatcherId: (val: string) => void;
  inf1Id: string;
  onUpdateInf1Id: (val: string) => void;
  inf2Id: string;
  onUpdateInf2Id: (val: string) => void;
  inf3Id: string;
  onUpdateInf3Id: (val: string) => void;
  inf4Id: string;
  onUpdateInf4Id: (val: string) => void;
  
  // Outfielders
  lfId: string;
  onUpdateLfId: (val: string) => void;
  cfId: string;
  onUpdateCfId: (val: string) => void;
  rfId: string;
  onUpdateRfId: (val: string) => void;
  dhId: string;
  onUpdateDhId: (val: string) => void;
  onUpdatePlayerBattingOrder: (playerId: string, order: number | undefined) => void;
  
  preSelectedLabels: string[];

  // Custom Presets Management
  customPresets?: CustomPreset[];
  onSaveCustomPreset?: (name: string, targetId?: string, currentButtons?: ButtonConfig[]) => string | void;
  onLoadCustomPreset?: (id: string) => void;
  onDeleteCustomPreset?: (id: string) => void;
}

const TAILWIND_COLORS = [
  { name: '赤', class: 'bg-red-950/70 border-red-800/60 hover:bg-red-900/80 text-red-300' },
  { name: '青', class: 'bg-blue-950/70 border-blue-800/60 hover:bg-blue-900/80 text-blue-300' },
  { name: '緑', class: 'bg-emerald-950/70 border-emerald-800/60 hover:bg-emerald-900/80 text-emerald-300' },
  { name: '黄', class: 'bg-amber-950/70 border-amber-800/60 hover:bg-amber-900/80 text-amber-300' },
  { name: '紫', class: 'bg-purple-950/70 border-purple-800/60 hover:bg-purple-900/80 text-purple-300' },
  { name: '水色', class: 'bg-sky-950/70 border-sky-800/60 hover:bg-sky-900/80 text-sky-300' },
  { name: 'インディゴ', class: 'bg-indigo-950/70 border-indigo-800/60 hover:bg-indigo-900/80 text-indigo-300' },
  { name: '灰色', class: 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200' },
];

const TEXT_COLORS = [
  { name: '標準 (テーマ依存)', class: '' },
  { name: '白', class: 'text-white' },
  { name: '黄', class: 'text-yellow-300' },
  { name: '水色', class: 'text-sky-300' },
  { name: '赤', class: 'text-red-400' },
  { name: '緑', class: 'text-emerald-300' },
  { name: '紫', class: 'text-purple-300' },
  { name: '黒 (漆黒)', class: 'text-zinc-950 font-black' },
];

interface SearchableSelectProps {
  value: string;
  options: { id: string; name: string; number?: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  returnId?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  options,
  onChange,
  placeholder = '未選択',
  disabled = false,
  className = '',
  returnId = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value || opt.name === value);
  const displayText = selectedOption 
    ? `${selectedOption.number ? '#' + selectedOption.number + ' ' : ''}${selectedOption.name}`
    : value || '';

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Automatically clear search keyword when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => {
    const searchStr = search.toLowerCase();
    const nameMatch = opt.name.toLowerCase().includes(searchStr);
    const numMatch = opt.number ? opt.number.toLowerCase().includes(searchStr) : false;
    return nameMatch || numMatch;
  });

  return (
    <div ref={containerRef} className={`relative flex-1 min-w-0 ${className}`}>
      <div 
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearch('');
          }
        }}
        className={`w-full bg-zinc-900 border border-zinc-800 rounded px-2 text-[10px] text-zinc-200 focus:outline-none focus:border-sky-550 h-7 flex items-center justify-between ${
          disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <input
          type="text"
          disabled={disabled}
          value={isOpen ? search : displayText}
          placeholder={isOpen ? '検索...' : placeholder}
          onChange={(e) => {
            e.stopPropagation();
            setSearch(e.target.value);
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="bg-transparent border-none outline-none text-[10px] text-zinc-200 w-full h-full p-0 cursor-pointer focus:cursor-text"
        />
        <span className="text-[7px] text-zinc-500 select-none shrink-0 ml-1">▼</span>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-[1100] top-8 left-0 right-0 max-h-48 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded shadow-2xl p-1 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-100">
          <div
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="px-2 py-1 text-[9.5px] rounded hover:bg-zinc-800 text-zinc-400 cursor-pointer"
          >
            未選択
          </div>
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-3 text-[9.5px] text-zinc-650 text-center">一致する選手がいません</div>
          ) : (
            filteredOptions.map(opt => (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(returnId ? opt.id : opt.name);
                  setIsOpen(false);
                }}
                className={`px-2 py-1 text-[9.5px] rounded hover:bg-zinc-800 text-zinc-200 cursor-pointer flex items-center justify-between ${
                  (opt.id === value || opt.name === value) ? 'bg-sky-950/40 text-sky-400 border border-sky-900/30' : ''
                }`}
              >
                <span>{opt.name}</span>
                {opt.number && <span className="text-[8px] opacity-60">#{opt.number}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const CodeWindowDesigner: React.FC<CodeWindowDesignerProps> = ({
  buttons,
  onAddButton,
  onUpdateButton: _onUpdateButton,
  onDeleteButton,
  onUpdateButtons,
  onLoadTemplate,
  onTriggerButton,
  activeEventName,
  
  players,
  onUpdatePlayerHand,
  onUpdatePlayerThrows,
  onUpdatePlayerBats,
  activePlayerId,
  onSelectPlayer,
  teamAName,
  teamBName,

  balls,
  strikes,
  outs,
  onIncrementBall,
  onIncrementStrike,
  onIncrementOut,
  onResetScoreboard,

  pitcherA,
  onUpdatePitcherA,
  pitcherB,
  onUpdatePitcherB,
  defense,
  onUpdateDefense,
  selectedCourse,
  onSelectCourse,
  plottedHit,
  onUpdatePlottedHit,
  coursePerspective,
  onTogglePerspective,

  hotkeysEnabled,
  onToggleHotkeys,

  inningNum,
  onUpdateInningNum,
  inningHalf,
  onUpdateInningHalf,
  runner1BId,
  onUpdateRunner1BId,
  runner2BId,
  onUpdateRunner2BId,
  runner3BId,
  onUpdateRunner3BId,
  
  catcherId,
  onUpdateCatcherId,
  inf1Id,
  onUpdateInf1Id,
  inf2Id,
  onUpdateInf2Id,
  inf3Id,
  onUpdateInf3Id,
  inf4Id,
  onUpdateInf4Id,
  
  lfId,
  onUpdateLfId,
  cfId,
  onUpdateCfId,
  rfId,
  onUpdateRfId,
  dhId,
  onUpdateDhId,
  onUpdatePlayerBattingOrder,
  preSelectedLabels,
  customPresets = [],
  onSaveCustomPreset,
  onLoadCustomPreset,
  onDeleteCustomPreset
}) => {
  const [editingButton, setEditingButton] = useState<ButtonConfig | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDesignMode, setIsDesignMode] = useState(false);

  // Preset save inline input state & active ID persistence
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveInputName, setSaveInputName] = useState('');
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    return localStorage.getItem('sportscode_active_preset_id') || 'preset_p1';
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };
  
  // Local active drag/resize coordinate buffer to bypass continuous broadcasts
  const [activeDragMap, setActiveDragMap] = useState<{ [id: string]: { x: number, y: number, w?: number, h?: number } } | null>(null);
  
  // Mutable coordinate ref to ensure mouseup reads the exact final mousemove values and prevents snapping back
  const multiDragCoordsRef = useRef<{ [id: string]: { x: number, y: number, w?: number, h?: number } } | null>(null);

  // Multi-selection states
  const [selectedButtonIds, setSelectedButtonIds] = useState<string[]>([]);
  const [selectionMarquee, setSelectionMarquee] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
  const selectedDragStartCoordsRef = useRef<{ [id: string]: { x: number, y: number } }>({});

  // Undo/Redo states for canvas button layout changes in Design Mode
  const [, setUndoStack] = useState<ButtonConfig[][]>([]);
  
  const pushToUndo = (layout: ButtonConfig[]) => {
    const clone = JSON.parse(JSON.stringify(layout));
    setUndoStack(prev => {
      const next = [...prev, clone];
      if (next.length > 50) next.shift();
      return next;
    });
  };

  const handleDeleteWithUndo = (id: string) => {
    pushToUndo(buttons);
    onDeleteButton(id);
  };

  const handleLoadTemplateWithUndo = (type: 'baseball' | 'football' | 'blank') => {
    pushToUndo(buttons);
    onLoadTemplate(type);
  };

  // Keyboard Undo (Cmd+Z / Ctrl+Z) listener
  React.useEffect(() => {
    if (!isDesignMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't undo if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isCmdZ = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z';
      if (isCmdZ) {
        e.preventDefault();
        setUndoStack(prev => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const prevLayout = next.pop()!;
          onUpdateButtons(prevLayout);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
  }, [isDesignMode, buttons, onUpdateButtons]);

  // Global Keyboard listener for space play/pause (Code Window popout helper)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll!
        // Broadcast to main window to toggle play
        try {
          const channel = new BroadcastChannel('sportscode_multiwindow_sync');
          channel.postMessage({ type: 'TOGGLE_PLAY' });
          channel.close();
        } catch (err) {
          console.error("Failed to broadcast TOGGLE_PLAY:", err);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Global Keyboard listener for tagging shortcuts (active only in Code Window popout when hotkeys are enabled)
  useEffect(() => {
    const handleTaggingKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (!hotkeysEnabled) return;

      const toHalfWidth = (str: string) => {
        return str.replace(/[！-～]/g, (r) => String.fromCharCode(r.charCodeAt(0) - 0xFEE0))
                  .replace(/　/g, ' ');
      };
      const rawKey = e.key.toLowerCase();
      const key = toHalfWidth(rawKey);
      if (e.code === 'Space') return;

      const matchedBtn = buttons.find(btn => btn.hotkey === key);
      if (matchedBtn) {
        e.preventDefault();
        // Flash the button visually (same as mouse click)
        setFlashingButtons(prev => ({ ...prev, [matchedBtn.id]: true }));
        setTimeout(() => {
          setFlashingButtons(prev => { const n = { ...prev }; delete n[matchedBtn.id]; return n; });
        }, 200);
        try {
          const channel = new BroadcastChannel('sportscode_multiwindow_sync');
          channel.postMessage({
            type: 'TRIGGER_BUTTON_VIA_HOTKEY',
            hotkey: key
          });
          channel.close();
        } catch (err) {
          console.error("Failed to broadcast TRIGGER_BUTTON_VIA_HOTKEY:", err);
        }
      }
    };

    window.addEventListener('keydown', handleTaggingKeyDown);
    return () => window.removeEventListener('keydown', handleTaggingKeyDown);
  }, [buttons, hotkeysEnabled]);

  // Transient flashing buttons state (for 150ms active flash)
  const [flashingButtons, setFlashingButtons] = useState<{ [id: string]: boolean }>({});

  // Listen for FLASH_BUTTON_BY_HOTKEY from main window to animate button press
  useEffect(() => {
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel('sportscode_multiwindow_sync');
      ch.onmessage = (e) => {
        const data = e.data;
        if (data?.type === 'FLASH_BUTTON_BY_HOTKEY' && data.hotkey) {
          const matchedBtn = buttons.find(b => b.hotkey === data.hotkey);
          if (matchedBtn) {
            setFlashingButtons(prev => ({ ...prev, [matchedBtn.id]: true }));
            setTimeout(() => {
              setFlashingButtons(prev => { const n = { ...prev }; delete n[matchedBtn.id]; return n; });
            }, 200);
          }
        }
      };
    } catch (_) {}
    return () => { try { ch?.close(); } catch (_) {} };
  }, [buttons]);

  // Hotkey Badges Toggle State & Position (Default OFF as requested)
  const [showHotkeyBadges, setShowHotkeyBadges] = useState(false);
  const [globalBadgePosition, setGlobalBadgePosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'none'>('bottom-left');

  // Modal Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<ButtonType>('code');
  const [formHotkey, setFormHotkey] = useState('');
  const [formColor, setFormColor] = useState(TAILWIND_COLORS[0].class);
  const [formTextColor, setFormTextColor] = useState('');
  const [formLeadIn, setFormLeadIn] = useState(3);
  const [formLeadOut, setFormLeadOut] = useState(2);
  const [formGroupName, setFormGroupName] = useState('');
  const [formFontSize, setFormFontSize] = useState<number>(11);
  const [formBadgePosition, setFormBadgePosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'none' | 'default'>('default');
  const [formLinkTrigger, setFormLinkTrigger] = useState<'none' | 'hit' | 'out' | 'score' | 'pitch' | 'walk'>('none');

  // Quick Default Buttons Custom Mapping (Name, Group, Color, LinkTrigger)
  const [quickCustomMap, setQuickCustomMap] = useState<{ [key: string]: { name: string; group: string; color?: string; linkTrigger?: 'none' | 'hit' | 'out' | 'score' | 'pitch' | 'walk' } }>(() => {
    try {
      const saved = localStorage.getItem('sportscode_quick_custom_map');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Quick Button Modal Editing States
  const [editingQuickKey, setEditingQuickKey] = useState<string | null>(null);
  const [quickFormName, setQuickFormName] = useState('');
  const [quickFormGroup, setQuickFormGroup] = useState('');
  const [quickFormColor, setQuickFormColor] = useState('');
  const [quickFormLinkTrigger, setQuickFormLinkTrigger] = useState<'none' | 'hit' | 'out' | 'score' | 'pitch' | 'walk'>('none');

  const saveQuickCustomButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuickKey || !quickFormName.trim()) return;
    const updated = {
      ...quickCustomMap,
      [editingQuickKey]: {
        name: quickFormName.trim(),
        group: quickFormGroup.trim() || 'Result',
        color: quickFormColor || undefined,
        linkTrigger: quickFormLinkTrigger
      }
    };
    setQuickCustomMap(updated);
    localStorage.setItem('sportscode_quick_custom_map', JSON.stringify(updated));
    setEditingQuickKey(null);
  };

  // Dynamically calculate canvas size to remove empty scrolling space
  const dynamicCanvasBounds = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    buttons.forEach(b => {
      const rx = (b.x || 0) + (b.w || 120);
      const ry = (b.y || 0) + (b.h || 44);
      if (rx > maxX) maxX = rx;
      if (ry > maxY) maxY = ry;
    });
    return {
      minWidth: `${Math.max(600, maxX + 60)}px`,
      minHeight: `${Math.max(300, maxY + 60)}px`
    };
  }, [buttons]);

  // Batch Font Size Adjustment for Multi-selected buttons
  const handleBatchFontSizeChange = (delta: number) => {
    if (selectedButtonIds.length === 0) return;
    pushToUndo(buttons);
    const updatedButtons = buttons.map(b => {
      if (selectedButtonIds.includes(b.id)) {
        const currentSize = b.fontSize || 11;
        const nextSize = Math.max(8, Math.min(32, currentSize + delta));
        return { ...b, fontSize: nextSize };
      }
      return b;
    });
    onUpdateButtons(updatedButtons);
  };

  // Resolve teams active matchup: Top (表) = Team A bats, Team B defends. Bottom (裏) = Team B bats, Team A defends.
  const battingTeam = inningHalf === 'top' ? teamAName : teamBName;
  const defendingTeam = inningHalf === 'top' ? teamBName : teamAName;

  // Roster lists for selectors with strict position filtering (野手/打者 vs 投手 vs 二刀流)
  const battingPlayers = players
    .filter(p => {
      if (p.teamName !== battingTeam) return false;
      const pos = p.positionType || 'batter';
      return (pos === 'batter' || pos === 'both') && p.battingOrder !== undefined && p.battingOrder >= 1 && p.battingOrder <= 9;
    })
    .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0));
  const pitchingPlayers = players.filter(p => {
    if (p.teamName !== defendingTeam) return false;
    const pos = p.positionType || 'pitcher';
    return pos === 'pitcher' || pos === 'both';
  });
  const defendingPlayers = players.filter(p => p.teamName === defendingTeam);

  // Resolved active pitcher's name
  const activePitcher = defendingTeam === teamAName ? pitcherA : pitcherB;

  const activePlayerObj = players.find(p => p.id === activePlayerId);
  const activePitcherPlayer = defendingPlayers.find(p => p.name === activePitcher);

  // Custom Marquee Selection Logic on Canvas Background
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!isDesignMode) return;
    if (e.target !== e.currentTarget) return;
    
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setSelectionMarquee({
      startX,
      startY,
      currentX: startX,
      currentY: startY
    });

    if (!e.shiftKey) {
      setSelectedButtonIds([]);
    }

    const handleMarqueeMouseMove = (moveEvent: MouseEvent) => {
      const currentX = Math.max(0, moveEvent.clientX - rect.left);
      const currentY = Math.max(0, moveEvent.clientY - rect.top);

      setSelectionMarquee(prev => {
        if (!prev) return null;
        const next = { ...prev, currentX, currentY };

        const minX = Math.min(next.startX, next.currentX);
        const maxX = Math.max(next.startX, next.currentX);
        const minY = Math.min(next.startY, next.currentY);
        const maxY = Math.max(next.startY, next.currentY);

        const overlappingIds = buttons.filter(btn => {
          const btnX = btn.x !== undefined ? btn.x : 30;
          const btnY = btn.y !== undefined ? btn.y : 30;
          const btnW = btn.w !== undefined ? btn.w : 120;
          const btnH = btn.h !== undefined ? btn.h : 44;

          return (
            btnX < maxX &&
            btnX + btnW > minX &&
            btnY < maxY &&
            btnY + btnH > minY
          );
        }).map(btn => btn.id);

        if (e.shiftKey) {
          setSelectedButtonIds(prevSelected => Array.from(new Set([...prevSelected, ...overlappingIds])));
        } else {
          setSelectedButtonIds(overlappingIds);
        }

        return next;
      });
    };

    const handleMarqueeMouseUp = () => {
      window.removeEventListener('mousemove', handleMarqueeMouseMove);
      window.removeEventListener('mouseup', handleMarqueeMouseUp);
      setSelectionMarquee(null);
    };

    window.addEventListener('mousemove', handleMarqueeMouseMove);
    window.addEventListener('mouseup', handleMarqueeMouseUp);
  };

  // Custom Button Drag and Drop Logic (Moves all selected buttons)
  const handleButtonDragStart = (e: React.MouseEvent, btn: ButtonConfig) => {
    e.preventDefault();
    pushToUndo(buttons);
    const startX = e.clientX;
    const startY = e.clientY;

    const dragIds = selectedButtonIds.includes(btn.id)
      ? selectedButtonIds
      : [btn.id];

    if (!selectedButtonIds.includes(btn.id)) {
      setSelectedButtonIds([btn.id]);
    }

    const startCoords: { [id: string]: { x: number, y: number } } = {};
    dragIds.forEach(id => {
      const b = buttons.find(x => x.id === id);
      if (b) {
        startCoords[id] = {
          x: b.x !== undefined ? b.x : 30,
          y: b.y !== undefined ? b.y : 30
        };
      }
    });
    selectedDragStartCoordsRef.current = startCoords;

    const initialDragMap: { [id: string]: { x: number, y: number } } = {};
    dragIds.forEach(id => {
      initialDragMap[id] = { ...startCoords[id] };
    });
    multiDragCoordsRef.current = initialDragMap;
    setActiveDragMap(initialDragMap);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const nextDrags: { [id: string]: { x: number, y: number } } = {};
      dragIds.forEach(id => {
        const startPos = selectedDragStartCoordsRef.current[id];
        if (startPos) {
          nextDrags[id] = {
            x: Math.max(0, startPos.x + deltaX),
            y: Math.max(0, startPos.y + deltaY)
          };
        }
      });

      multiDragCoordsRef.current = nextDrags;
      setActiveDragMap(nextDrags);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const finalCoords = multiDragCoordsRef.current || selectedDragStartCoordsRef.current;
      setActiveDragMap(null);
      selectedDragStartCoordsRef.current = {};
      multiDragCoordsRef.current = null;

      const updatedButtons = buttons.map(b => {
        if (finalCoords[b.id]) {
          return {
            ...b,
            x: finalCoords[b.id].x,
            y: finalCoords[b.id].y
          };
        }
        return b;
      });
      onUpdateButtons(updatedButtons);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Custom Button Resizing Logic (Multi-select resize supported!)
  const handleButtonResizeStart = (e: React.MouseEvent, btn: ButtonConfig) => {
    e.preventDefault();
    pushToUndo(buttons);
    const startX = e.clientX;
    const startY = e.clientY;

    const resizeIds = selectedButtonIds.includes(btn.id)
      ? selectedButtonIds
      : [btn.id];

    if (!selectedButtonIds.includes(btn.id)) {
      setSelectedButtonIds([btn.id]);
    }

    const startSizes: { [id: string]: { x: number, y: number, w: number, h: number } } = {};
    resizeIds.forEach(id => {
      const b = buttons.find(x => x.id === id);
      if (b) {
        startSizes[id] = {
          x: b.x !== undefined ? b.x : 30,
          y: b.y !== undefined ? b.y : 30,
          w: b.w !== undefined ? b.w : 120,
          h: b.h !== undefined ? b.h : 44,
        };
      }
    });

    const initialMap: { [id: string]: { x: number, y: number, w: number, h: number } } = {};
    resizeIds.forEach(id => {
      initialMap[id] = { ...startSizes[id] };
    });
    multiDragCoordsRef.current = initialMap;
    setActiveDragMap(initialMap);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const nextCoords: { [id: string]: { x: number, y: number, w: number, h: number } } = {};
      resizeIds.forEach(id => {
        const start = startSizes[id];
        if (start) {
          nextCoords[id] = {
            x: start.x,
            y: start.y,
            w: Math.max(50, start.w + deltaX),
            h: Math.max(24, start.h + deltaY),
          };
        }
      });

      multiDragCoordsRef.current = nextCoords;
      setActiveDragMap(nextCoords);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const finalCoordsMap = multiDragCoordsRef.current || initialMap;
      setActiveDragMap(null);
      multiDragCoordsRef.current = null;

      const updatedButtons = buttons.map(b => {
        if (finalCoordsMap[b.id]) {
          return {
            ...b,
            w: finalCoordsMap[b.id].w,
            h: finalCoordsMap[b.id].h,
          };
        }
        return b;
      });
      onUpdateButtons(updatedButtons);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleEditButton = (btn: ButtonConfig) => {
    setEditingButton(btn);
    setFormName(btn.name);
    setFormType(btn.type);
    setFormHotkey(btn.hotkey);
    setFormColor(btn.color);
    setFormTextColor(btn.textColor || '');
    setFormLeadIn(btn.leadIn || 0);
    setFormLeadOut(btn.leadOut || 0);
    setFormGroupName(btn.groupName || '');
    setFormFontSize(btn.fontSize || 11);
    setFormBadgePosition(btn.badgePosition || 'default');
    setFormLinkTrigger(btn.linkTrigger || 'none');
    setIsCreateModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingButton(null);
    setFormName('');
    setFormType('code');
    setFormHotkey('');
    setFormColor(TAILWIND_COLORS[0].class);
    setFormTextColor('');
    setFormLeadIn(3);
    setFormLeadOut(2);
    setFormGroupName('');
    setFormFontSize(11);
    setFormBadgePosition('default');
    setFormLinkTrigger('none');
    setIsCreateModalOpen(true);
  };

  const handleSaveButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    pushToUndo(buttons);

    const config: ButtonConfig = {
      id: editingButton ? editingButton.id : `btn_${Date.now()}`,
      name: formName.trim(),
      type: formType,
      hotkey: formHotkey.trim().toLowerCase(),
      color: formColor,
      textColor: formTextColor || undefined,
      fontSize: Number(formFontSize) || 11,
      badgePosition: formBadgePosition,
      linkTrigger: formLinkTrigger,
      leadIn: formType === 'code' ? Number(formLeadIn) : 0,
      leadOut: formType === 'code' ? Number(formLeadOut) : 0,
      groupName: formType === 'label' ? (formGroupName.trim() || 'General') : undefined,
      x: editingButton ? editingButton.x : 30,
      y: editingButton ? editingButton.y : 30,
      w: editingButton ? editingButton.w : 120,
      h: editingButton ? editingButton.h : 44,
    };

    if (editingButton) {
      const isMultiEditing = selectedButtonIds.includes(editingButton.id) && selectedButtonIds.length > 1;
      const updatedButtons = buttons.map(b => {
        if (b.id === editingButton.id) {
          return config;
        }
        // Batch apply font size, color, text color, and badge position to all multi-selected buttons!
        if (isMultiEditing && selectedButtonIds.includes(b.id)) {
          return {
            ...b,
            fontSize: config.fontSize,
            color: config.color,
            textColor: config.textColor,
            badgePosition: config.badgePosition
          };
        }
        if (config.groupName && b.groupName === config.groupName) {
          return { ...b, color: config.color, textColor: config.textColor };
        }
        return b;
      });
      onUpdateButtons(updatedButtons);
    } else {
      onAddButton(config);
    }
    setIsCreateModalOpen(false);
  };

  // Batting Order Navigation helpers
  const handlePrevBatter = () => {
    if (battingPlayers.length === 0) return;
    const currentIndex = battingPlayers.findIndex(p => p.id === activePlayerId);
    let nextIndex = currentIndex - 1;
    if (nextIndex < 0) nextIndex = battingPlayers.length - 1;
    onSelectPlayer(battingPlayers[nextIndex].id);
  };

  const handleNextBatter = () => {
    if (battingPlayers.length === 0) return;
    const currentIndex = battingPlayers.findIndex(p => p.id === activePlayerId);
    let nextIndex = currentIndex + 1;
    if (nextIndex >= battingPlayers.length) nextIndex = 0;
    onSelectPlayer(battingPlayers[nextIndex].id);
  };

  // Cell Strike-zone helper
  const getCellDetails = (row: number, col: number) => {
    const isStrikeZone = row >= 2 && row <= 4 && col >= 2 && col <= 4;
    const label = `B${row}${col}`;
    return { label, isStrikeZone };
  };

  const handleCellClick = (label: string) => {
    onSelectCourse(selectedCourse === label ? '' : label);
  };

  const handleFieldClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pctX = (e.clientX - rect.left) / rect.width;
    const pctY = (e.clientY - rect.top) / rect.height;
    const x = 5 + pctX * 90;
    const y = 26 + pctY * 62;
    onUpdatePlottedHit({ x, y });
  };

  // Wrapper around onTriggerButton to show visual flash
  const handleTriggerButtonWithFlash = (btn: ButtonConfig) => {
    // Visual flash animation: glow for 150ms
    setFlashingButtons(prev => ({ ...prev, [btn.id]: true }));
    setTimeout(() => {
      setFlashingButtons(prev => ({ ...prev, [btn.id]: false }));
    }, 150);

    onTriggerButton(btn);
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 w-full flex-1 min-w-0">
      
      {/* LEFT COLUMN: Default Fixed Widgets (Very compact, scroll-free) */}
      <div className="w-full md:w-[325px] xl:w-[335px] flex flex-col gap-1.5 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl shadow-xl h-fit text-[10px] shrink-0">
        
        {/* ROW 1: Count & Inning & Batter with Prev/Next buttons */}
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* Balls, Strikes, Outs */}
          <div className="col-span-4 bg-zinc-950/50 px-2 py-1 rounded-lg border border-zinc-850 flex flex-col justify-center gap-1 h-10">
            <div className="flex justify-between items-center text-[7.5px] uppercase font-black text-zinc-550 select-none">
              <span>カウント</span>
              <button onClick={onResetScoreboard} className="text-zinc-650 hover:text-zinc-400">
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </div>
            <div className="flex gap-2 text-[9px] font-bold text-zinc-450">
              <div className="flex items-center gap-0.5">
                <span>B:</span>
                {[1, 2, 3].map(b => (
                  <div
                    key={b}
                    onClick={onIncrementBall}
                    className={`w-2.5 h-2.5 rounded-full border cursor-pointer ${
                      balls >= b ? 'bg-emerald-500 border-emerald-455 shadow shadow-emerald-700' : 'bg-zinc-900 border-zinc-850'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                <span>S:</span>
                {[1, 2].map(s => (
                  <div
                    key={s}
                    onClick={onIncrementStrike}
                    className={`w-2.5 h-2.5 rounded-full border cursor-pointer ${
                      strikes >= s ? 'bg-yellow-500 border-yellow-450 shadow shadow-yellow-600' : 'bg-zinc-900 border-zinc-850'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                <span>O:</span>
                {[1, 2].map(o => (
                  <div
                    key={o}
                    onClick={onIncrementOut}
                    className={`w-2.5 h-2.5 rounded-full border cursor-pointer ${
                      outs >= o ? 'bg-red-500 border-red-400 shadow shadow-red-700' : 'bg-zinc-900 border-zinc-850'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Inning Select */}
          <div className="col-span-3 flex flex-col gap-0.5">
            <label className="text-[7.5px] uppercase font-bold text-zinc-500 select-none">イニング</label>
            <div className="flex gap-0.5 h-7">
              <select
                value={inningNum}
                onChange={(e) => onUpdateInningNum(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded px-1 text-[10px] text-zinc-200 focus:outline-none focus:border-sky-500 w-11 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                  <option key={num} value={num}>{num}回</option>
                ))}
              </select>
              <select
                value={inningHalf}
                onChange={(e) => onUpdateInningHalf(e.target.value as 'top' | 'bottom')}
                className="bg-zinc-900 border border-zinc-805 rounded px-0.5 text-[9px] text-zinc-205 focus:outline-none focus:border-sky-505 flex-1 cursor-pointer"
              >
                <option value="top">表</option>
                <option value="bottom">裏</option>
              </select>
            </div>
          </div>

          {/* Batter Select + Prev / Next Switchers */}
          <div className="col-span-5 flex flex-col gap-0.5">
            <label className="text-[7.5px] uppercase font-bold text-zinc-550 select-none">打者 [攻: {battingTeam}]</label>
            <div className="flex items-center gap-1 h-7">
              <button
                type="button"
                onClick={handlePrevBatter}
                className="px-1.5 bg-zinc-800 hover:bg-zinc-755 text-zinc-305 rounded text-xs border border-zinc-750 h-7 flex items-center justify-center cursor-pointer active:scale-95"
                title="前の打者 (戻る)"
              >
                ◀
              </button>
              <select
                value={activePlayerId || 'unassigned'}
                onChange={(e) => onSelectPlayer(e.target.value === 'unassigned' ? null : e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded px-1.5 text-[9.5px] focus:outline-none transition-colors h-7 text-zinc-200 flex-1 min-w-0 cursor-pointer"
              >
                <option value="unassigned">打者未選択</option>
                {battingPlayers.map((p, idx) => (
                  <option key={p.id} value={p.id}>{(idx + 1)}番: {p.number ? `#${p.number} ` : ''}{p.name}</option>
                ))}
              </select>
              {activePlayerObj && (
                <select
                  value={activePlayerObj.bats || activePlayerObj.hand || 'R'}
                  onChange={(e) => {
                    const val = e.target.value as 'R' | 'L' | 'S';
                    if (onUpdatePlayerBats) onUpdatePlayerBats(activePlayerObj.id, val);
                    else onUpdatePlayerHand(activePlayerObj.id, val);
                  }}
                  className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-8 text-center shrink-0"
                  title="打撃の左右を切り替え"
                >
                  <option value="R">右</option>
                  <option value="L">左</option>
                  <option value="S">両</option>
                </select>
              )}
              <button
                type="button"
                onClick={handleNextBatter}
                className="px-1.5 bg-zinc-805 hover:bg-zinc-755 text-zinc-305 rounded text-xs border border-zinc-750 h-7 flex items-center justify-center cursor-pointer active:scale-95"
                title="次の打者 (進む)"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        {/* SECTION: DEFENSE (PITCHERS & LINEUP) - Always visible section */}
        <div className="border-t border-zinc-800/50 pt-1.5 select-none">
          <div className="group">
            <div className="flex items-center justify-between text-[7.5px] uppercase font-black tracking-wider text-sky-400 select-none pb-1">
              <span className="flex items-center gap-1">
                🛡️ 守備設定交代 [守: {defendingTeam}]
              </span>
            </div>

            <div className="space-y-1.5 mt-1.5">
              {/* Row 1: Pitcher, Catcher, SS */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] uppercase font-bold text-zinc-500 select-none">投手 (P)</label>
                  <div className="flex gap-1 flex-wrap sm:flex-nowrap">
                    <SearchableSelect
                      value={defendingTeam === teamAName ? pitcherA : pitcherB}
                      /* always enabled */
                      options={pitchingPlayers}
                      returnId={false}
                      onChange={(val) => {
                        if (defendingTeam === teamAName) onUpdatePitcherA(val);
                        else onUpdatePitcherB(val);
                      }}
                    />
                    {activePitcherPlayer && (
                      <select
                        value={activePitcherPlayer.throws || (activePitcherPlayer.hand === 'L' ? 'L' : 'R')}
                        onChange={(e) => {
                          const val = e.target.value as 'R' | 'L';
                          if (onUpdatePlayerThrows) onUpdatePlayerThrows(activePitcherPlayer.id, val);
                          else onUpdatePlayerHand(activePitcherPlayer.id, val === 'L' ? 'L' : 'R');
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-8 text-center shrink-0"
                        title="投手の投球利き腕を切り替え"
                      >
                        <option value="R">右</option>
                        <option value="L">左</option>
                      </select>
                    )}
                    {/* DH未設定の時のみ、投手の打順を設定可能 */}
                    {activePitcherPlayer && !dhId && (
                      <select
                        value={activePitcherPlayer.battingOrder || ''}
                        onChange={(e) => onUpdatePlayerBattingOrder(activePitcherPlayer.id, e.target.value ? Number(e.target.value) : undefined)}
                        className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-12 text-center shrink-0"
                        title="投手の打順を設定 (DHなし用)"
                      >
                        <option value="">打順</option>
                        {[1,2,3,4,5,6,7,8,9].map(num => (
                          <option key={num} value={num}>{num}番</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] uppercase font-bold text-zinc-555 select-none">捕手 (C)</label>
                  <div className="flex gap-1">
                    <SearchableSelect
                      value={catcherId}
                      /* always enabled */
                      options={defendingPlayers}
                      returnId={false}
                      onChange={onUpdateCatcherId}
                    />
                    {catcherId && (() => {
                      const selPlayer = players.find(p => p.id === catcherId || p.name === catcherId);
                      return (
                        <select
                          value={selPlayer?.battingOrder || ''}
                          onChange={(e) => selPlayer && onUpdatePlayerBattingOrder(selPlayer.id, e.target.value ? Number(e.target.value) : undefined)}
                          className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-12 text-center shrink-0"
                          title="打順を設定"
                        >
                          <option value="">打順</option>
                          {[1,2,3,4,5,6,7,8,9].map(num => (
                            <option key={num} value={num}>{num}番</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] uppercase font-bold text-zinc-555 select-none">遊撃手 (SS)</label>
                  <div className="flex gap-1">
                    <SearchableSelect
                      value={inf1Id}
                      /* always enabled */
                      options={defendingPlayers}
                      returnId={false}
                      onChange={onUpdateInf1Id}
                    />
                    {inf1Id && (() => {
                      const selPlayer = players.find(p => p.id === inf1Id || p.name === inf1Id);
                      return (
                        <select
                          value={selPlayer?.battingOrder || ''}
                          onChange={(e) => selPlayer && onUpdatePlayerBattingOrder(selPlayer.id, e.target.value ? Number(e.target.value) : undefined)}
                          className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-12 text-center shrink-0"
                          title="打順を設定"
                        >
                          <option value="">打順</option>
                          {[1,2,3,4,5,6,7,8,9].map(num => (
                            <option key={num} value={num}>{num}番</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Row 2: 1B, 2B, 3B */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] uppercase font-bold text-zinc-555 select-none">一塁手 (1B)</label>
                  <div className="flex gap-1">
                    <SearchableSelect
                      value={inf4Id}
                      /* always enabled */
                      options={defendingPlayers}
                      returnId={false}
                      onChange={onUpdateInf4Id}
                    />
                    {inf4Id && (() => {
                      const selPlayer = players.find(p => p.id === inf4Id || p.name === inf4Id);
                      return (
                        <select
                          value={selPlayer?.battingOrder || ''}
                          onChange={(e) => selPlayer && onUpdatePlayerBattingOrder(selPlayer.id, e.target.value ? Number(e.target.value) : undefined)}
                          className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-12 text-center shrink-0"
                          title="打順を設定"
                        >
                          <option value="">打順</option>
                          {[1,2,3,4,5,6,7,8,9].map(num => (
                            <option key={num} value={num}>{num}番</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] uppercase font-bold text-zinc-555 select-none">二塁手 (2B)</label>
                  <div className="flex gap-1">
                    <SearchableSelect
                      value={inf2Id}
                      /* always enabled */
                      options={defendingPlayers}
                      returnId={false}
                      onChange={onUpdateInf2Id}
                    />
                    {inf2Id && (() => {
                      const selPlayer = players.find(p => p.id === inf2Id || p.name === inf2Id);
                      return (
                        <select
                          value={selPlayer?.battingOrder || ''}
                          onChange={(e) => selPlayer && onUpdatePlayerBattingOrder(selPlayer.id, e.target.value ? Number(e.target.value) : undefined)}
                          className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-12 text-center shrink-0"
                          title="打順を設定"
                        >
                          <option value="">打順</option>
                          {[1,2,3,4,5,6,7,8,9].map(num => (
                            <option key={num} value={num}>{num}番</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] uppercase font-bold text-zinc-555 select-none">三塁手 (3B)</label>
                  <div className="flex gap-1">
                    <SearchableSelect
                      value={inf3Id}
                      /* always enabled */
                      options={defendingPlayers}
                      returnId={false}
                      onChange={onUpdateInf3Id}
                    />
                    {inf3Id && (() => {
                      const selPlayer = players.find(p => p.id === inf3Id || p.name === inf3Id);
                      return (
                        <select
                          value={selPlayer?.battingOrder || ''}
                          onChange={(e) => selPlayer && onUpdatePlayerBattingOrder(selPlayer.id, e.target.value ? Number(e.target.value) : undefined)}
                          className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-12 text-center shrink-0"
                          title="打順を設定"
                        >
                          <option value="">打順</option>
                          {[1,2,3,4,5,6,7,8,9].map(num => (
                            <option key={num} value={num}>{num}番</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Row 3: LF, CF, RF */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] uppercase font-bold text-zinc-555 select-none">左翼手 (LF)</label>
                  <div className="flex gap-1">
                    <SearchableSelect
                      value={lfId}
                      /* always enabled */
                      options={defendingPlayers}
                      returnId={false}
                      onChange={onUpdateLfId}
                    />
                    {lfId && (() => {
                      const selPlayer = players.find(p => p.id === lfId || p.name === lfId);
                      return (
                        <select
                          value={selPlayer?.battingOrder || ''}
                          onChange={(e) => selPlayer && onUpdatePlayerBattingOrder(selPlayer.id, e.target.value ? Number(e.target.value) : undefined)}
                          className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-12 text-center shrink-0"
                          title="打順を設定"
                        >
                          <option value="">打順</option>
                          {[1,2,3,4,5,6,7,8,9].map(num => (
                            <option key={num} value={num}>{num}番</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] uppercase font-bold text-zinc-555 select-none">中堅手 (CF)</label>
                  <div className="flex gap-1">
                    <SearchableSelect
                      value={cfId}
                      /* always enabled */
                      options={defendingPlayers}
                      returnId={false}
                      onChange={onUpdateCfId}
                    />
                    {cfId && (() => {
                      const selPlayer = players.find(p => p.id === cfId || p.name === cfId);
                      return (
                        <select
                          value={selPlayer?.battingOrder || ''}
                          onChange={(e) => selPlayer && onUpdatePlayerBattingOrder(selPlayer.id, e.target.value ? Number(e.target.value) : undefined)}
                          className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-12 text-center shrink-0"
                          title="打順を設定"
                        >
                          <option value="">打順</option>
                          {[1,2,3,4,5,6,7,8,9].map(num => (
                            <option key={num} value={num}>{num}番</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[7px] uppercase font-bold text-zinc-555 select-none">右翼手 (RF)</label>
                  <div className="flex gap-1">
                    <SearchableSelect
                      value={rfId}
                      /* always enabled */
                      options={defendingPlayers}
                      returnId={false}
                      onChange={onUpdateRfId}
                    />
                    {rfId && (() => {
                      const selPlayer = players.find(p => p.id === rfId || p.name === rfId);
                      return (
                        <select
                          value={selPlayer?.battingOrder || ''}
                          onChange={(e) => selPlayer && onUpdatePlayerBattingOrder(selPlayer.id, e.target.value ? Number(e.target.value) : undefined)}
                          className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-12 text-center shrink-0"
                          title="打順を設定"
                        >
                          <option value="">打順</option>
                          {[1,2,3,4,5,6,7,8,9].map(num => (
                            <option key={num} value={num}>{num}番</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Row 3: DH (指名打者) ＆ Row 5: Shift / Notes Memo */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-0.5 col-span-1">
                  <label className="text-[7px] uppercase font-bold text-sky-400 select-none">指名打者 (DH)</label>
                  <div className="flex gap-1">
                    <SearchableSelect
                      value={dhId}
                      /* always enabled */
                      options={defendingPlayers}
                      returnId={false}
                      onChange={onUpdateDhId}
                      placeholder="未選択"
                    />
                    {dhId && (() => {
                      const selPlayer = players.find(p => p.id === dhId || p.name === dhId);
                      return (
                        <select
                          value={selPlayer?.battingOrder || ''}
                          onChange={(e) => selPlayer && onUpdatePlayerBattingOrder(selPlayer.id, e.target.value ? Number(e.target.value) : undefined)}
                          className="bg-zinc-950 border border-zinc-800 rounded text-[9px] text-zinc-300 font-bold focus:outline-none cursor-pointer h-7 w-12 text-center shrink-0"
                          title="DHの打順を設定"
                        >
                          <option value="">打順</option>
                          {[1,2,3,4,5,6,7,8,9].map(num => (
                            <option key={num} value={num}>{num}番</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 col-span-2">
                  <label className="text-[7px] uppercase font-bold text-zinc-500 select-none">守備シフトメモ</label>
                  <input
                    type="text"
                    /* always enabled */
                    value={defense}
                    onChange={(e) => onUpdateDefense(e.target.value)}
                    placeholder="シフト等のメモ"
                    className="bg-zinc-900 border border-zinc-800 text-[10px] px-2 rounded placeholder-zinc-700 focus:outline-none focus:border-sky-505 text-zinc-202 h-7 w-full cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 5: Strike Zone Grid & RUNNERS (Center) & Outfield SVG Plotter (Side-by-side) */}
        <div className="flex gap-2 pt-2 border-t border-zinc-850/50 justify-between items-start">
          
          {/* Left Side: Strike Zone Grid */}
          <div className="space-y-1 shrink-0">
            <div className="flex justify-between items-center text-[7.5px] font-bold text-zinc-555 select-none">
              <span className="uppercase tracking-wider flex items-center gap-0.5">
                <Compass className="w-2.5 h-2.5 text-sky-400" /> コース位置
              </span>
              <button
                onClick={onTogglePerspective}
                className="bg-zinc-950 hover:bg-zinc-850 px-1 py-0.2 rounded text-sky-400 font-bold transition-all text-[7.5px]"
              >
                {coursePerspective === 'pitcher' ? '投手' : '捕手'}
              </button>
            </div>
            
            {/* Compact 5x5 Grid */}
            <div className="flex flex-col gap-0.5 bg-zinc-950/45 p-0.5 rounded-lg border border-zinc-850/80">
              {[1, 2, 3, 4, 5].map((row) => {
                const cols = coursePerspective === 'catcher' ? [1, 2, 3, 4, 5] : [5, 4, 3, 2, 1];
                return (
                  <div key={row} className="flex gap-0.5">
                    {cols.map((col) => {
                      const { label, isStrikeZone } = getCellDetails(row, col);
                      const isSelected = selectedCourse === label;

                      return (
                        <div
                          key={col}
                          onClick={() => handleCellClick(label)}
                          className={`w-[18px] h-[18px] flex items-center justify-center text-[6px] font-mono font-bold rounded cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-sky-500 border-sky-350 text-white shadow font-black scale-105'
                              : isStrikeZone
                                ? 'bg-red-950/30 border-red-900/20 text-red-400 hover:bg-red-900/40'
                                : 'bg-blue-950/20 border-blue-900/15 text-blue-355 hover:bg-blue-900/40'
                          }`}
                          title={label}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toast Notification Telop */}
          {toastMessage && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 border border-emerald-500 text-emerald-200 px-4 py-2 rounded-xl shadow-2xl font-bold text-xs flex items-center gap-2 animate-bounce">
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Center Column: RUNNER SELECTORS & QUICK BUTTONS */}
          <div className="flex-1 flex flex-col gap-0.5 shrink-0 w-[130px] h-[102px] justify-between">
            <div className="text-[7.5px] uppercase font-black text-amber-500 select-none text-center">
              🏃‍♂️ 走者・クイック記録
            </div>
            
            <div className="flex flex-col bg-zinc-950 p-1 rounded-lg border border-zinc-850 h-[88px] justify-between">
              {/* Horizontal 3-column Runner selectors */}
              <div className="grid grid-cols-3 gap-1 bg-zinc-900/60 p-1 rounded border border-zinc-800/80">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[6.5px] font-black text-zinc-500 text-center leading-none select-none">1塁</span>
                  <select
                    value={runner1BId}
                    /* always enabled */
                    onChange={(e) => onUpdateRunner1BId(e.target.value)}
                    className={"bg-zinc-950 border border-zinc-850 text-[8px] rounded px-0.5 focus:outline-none text-zinc-300 w-full h-5 cursor-pointer"}
                  >
                    <option value="">-</option>
                    {battingPlayers.map(p => (
                      <option key={p.id} value={p.id}>#{p.number || ''} {p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[6.5px] font-black text-zinc-500 text-center leading-none select-none">2塁</span>
                  <select
                    value={runner2BId}
                    /* always enabled */
                    onChange={(e) => onUpdateRunner2BId(e.target.value)}
                    className={"bg-zinc-950 border border-zinc-850 text-[8px] rounded px-0.5 focus:outline-none text-zinc-300 w-full h-5 cursor-pointer"}
                  >
                    <option value="">-</option>
                    {battingPlayers.map(p => (
                      <option key={p.id} value={p.id}>#{p.number || ''} {p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[6.5px] font-black text-zinc-500 text-center leading-none select-none">3塁</span>
                  <select
                    value={runner3BId}
                    /* always enabled */
                    onChange={(e) => onUpdateRunner3BId(e.target.value)}
                    className={"bg-zinc-950 border border-zinc-850 text-[8px] rounded px-0.5 focus:outline-none text-zinc-300 w-full h-5 cursor-pointer"}
                  >
                    <option value="">-</option>
                    {battingPlayers.map(p => (
                      <option key={p.id} value={p.id}>#{p.number || ''} {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 1: Hits */}
              <div className="grid grid-cols-4 gap-0.5 select-none">
                {[
                  { defaultName: '単打', defaultGroup: 'Result', defaultColor: 'bg-emerald-950/40 border-emerald-900/50 hover:bg-emerald-900/60 text-emerald-400', key: 'h_1b' },
                  { defaultName: '二塁打', defaultGroup: 'Result', defaultColor: 'bg-emerald-950/40 border-emerald-900/50 hover:bg-emerald-900/60 text-emerald-400', key: 'h_2b' },
                  { defaultName: '三塁打', defaultGroup: 'Result', defaultColor: 'bg-emerald-950/40 border-emerald-900/50 hover:bg-emerald-900/60 text-emerald-400', key: 'h_3b' },
                  { defaultName: '本塁打', defaultGroup: 'Result', defaultColor: 'bg-red-950/40 border-red-900/50 hover:bg-red-900/60 text-red-400 font-bold', key: 'h_hr' }
                ].map((btn) => {
                  const custom = quickCustomMap[btn.key];
                  const displayName = custom?.name || btn.defaultName;
                  const displayGroup = custom?.group || btn.defaultGroup;
                  const displayColor = custom?.color || btn.defaultColor;
                  const displayLinkTrigger = custom?.linkTrigger || 'hit';
                  const quickId = `quick_${btn.key}`;

                  return (
                    <div key={btn.key} className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          if (isDesignMode) {
                            setEditingQuickKey(btn.key);
                            setQuickFormName(displayName);
                            setQuickFormGroup(displayGroup);
                            setQuickFormColor(displayColor);
                            setQuickFormLinkTrigger(displayLinkTrigger);
                            return;
                          }
                          // 1. Fire quick record label
                          const quickConfig: ButtonConfig = {
                            id: quickId,
                            name: displayName,
                            type: 'label' as ButtonType,
                            groupName: displayGroup,
                            color: displayColor,
                            hotkey: '',
                            leadIn: 0,
                            leadOut: 0
                          };
                          onTriggerButton(quickConfig);

                          // 2. Activation Link Triggering
                          if (displayLinkTrigger !== 'none') {
                            const linkedTargetButtons = buttons.filter(b => {
                              if (b.linkTrigger === displayLinkTrigger) return true;
                              const lower = b.name.toLowerCase().trim();
                              if (displayLinkTrigger === 'hit') return lower === 'hit' || lower === 'ヒット' || lower === '安打';
                              if (displayLinkTrigger === 'out') return lower === 'out' || lower === 'アウト' || lower === '凡退';
                              if (displayLinkTrigger === 'score') return lower === 'score' || lower === '得点' || lower === 'ラン';
                              if (displayLinkTrigger === 'pitch') return lower === 'pitch' || lower === '投球' || b.id === 'btn_pitch';
                              if (displayLinkTrigger === 'walk') return lower === 'walk' || lower === '四球' || lower === '死球' || lower === '四死球';
                              return false;
                            });

                            linkedTargetButtons.forEach(targetBtn => {
                              setFlashingButtons(prev => ({ ...prev, [targetBtn.id]: true }));
                              setTimeout(() => {
                                setFlashingButtons(prev => ({ ...prev, [targetBtn.id]: false }));
                              }, 180);

                              onTriggerButton(targetBtn);
                            });
                          }
                        }}
                        className={`w-full border rounded py-0.5 text-[8.5px] leading-tight transition-all active:scale-95 text-center cursor-pointer ${displayColor}`}
                      >
                        {displayName}
                      </button>

                      {/* Design mode edit indicator */}
                      {isDesignMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuickKey(btn.key);
                            setQuickFormName(displayName);
                            setQuickFormGroup(displayGroup);
                            setQuickFormColor(displayColor);
                            setQuickFormLinkTrigger(displayLinkTrigger);
                          }}
                          className="absolute -top-1 -right-1 p-0.5 bg-amber-500 text-zinc-950 rounded-full shadow hover:bg-amber-400"
                          title="デフォボタンの編集 (名前・グループ・連動トリガー)"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Row 2: Plays */}
              <div className="grid grid-cols-4 gap-0.5 select-none">
                {[
                  { defaultName: '死球', defaultGroup: 'Result', defaultColor: 'bg-amber-950/40 border-amber-900/50 hover:bg-amber-900/60 text-amber-300', key: 'p_hbp' },
                  { defaultName: '失策', defaultGroup: 'Error', defaultColor: 'bg-rose-955/40 border-rose-900/50 hover:bg-rose-900/60 text-rose-300', key: 'p_err' },
                  { defaultName: '牽制', defaultGroup: 'Pickoff', defaultColor: 'bg-blue-955/40 border-blue-900/50 hover:bg-blue-900/60 text-blue-300', key: 'p_po' },
                  { defaultName: '四球', defaultGroup: 'Result', defaultColor: 'bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-700/60 text-zinc-300', key: 'p_bb' }
                ].map((btn) => {
                  const custom = quickCustomMap[btn.key];
                  const displayName = custom?.name || btn.defaultName;
                  const displayGroup = custom?.group || btn.defaultGroup;
                  const displayColor = custom?.color || btn.defaultColor;
                  const displayLinkTrigger = custom?.linkTrigger || 'none';
                  const quickId = `quick_${btn.key}`;

                  return (
                    <div key={btn.key} className="relative group">
                      <button
                        type="button"
                        onClick={() => {
                          if (isDesignMode) {
                            setEditingQuickKey(btn.key);
                            setQuickFormName(displayName);
                            setQuickFormGroup(displayGroup);
                            setQuickFormColor(displayColor);
                            setQuickFormLinkTrigger(displayLinkTrigger);
                            return;
                          }

                          onTriggerButton({
                            id: quickId,
                            name: displayName,
                            type: 'label' as ButtonType,
                            groupName: displayGroup,
                            color: displayColor,
                            hotkey: '',
                            leadIn: 0,
                            leadOut: 0
                          });

                          // Activation Link Firing if configured
                          if (displayLinkTrigger !== 'none') {
                            const linkedTargetButtons = buttons.filter(b => {
                              if (b.linkTrigger === displayLinkTrigger) return true;
                              const lower = b.name.toLowerCase().trim();
                              if (displayLinkTrigger === 'hit') return lower === 'hit' || lower === 'ヒット' || lower === '安打';
                              if (displayLinkTrigger === 'out') return lower === 'out' || lower === 'アウト' || lower === '凡退';
                              if (displayLinkTrigger === 'score') return lower === 'score' || lower === '得点' || lower === 'ラン';
                              if (displayLinkTrigger === 'pitch') return lower === 'pitch' || lower === '投球' || b.id === 'btn_pitch';
                              if (displayLinkTrigger === 'walk') return lower === 'walk' || lower === '四球' || lower === '死球' || lower === '四死球';
                              return false;
                            });

                            linkedTargetButtons.forEach(targetBtn => {
                              setFlashingButtons(prev => ({ ...prev, [targetBtn.id]: true }));
                              setTimeout(() => {
                                setFlashingButtons(prev => ({ ...prev, [targetBtn.id]: false }));
                              }, 180);

                              onTriggerButton(targetBtn);
                            });
                          }
                        }}
                        className={`w-full border rounded py-0.5 text-[8.5px] leading-tight transition-all active:scale-95 text-center cursor-pointer ${displayColor}`}
                      >
                        {displayName}
                      </button>

                      {/* Design mode edit indicator */}
                      {isDesignMode && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuickKey(btn.key);
                            setQuickFormName(displayName);
                            setQuickFormGroup(displayGroup);
                            setQuickFormColor(displayColor);
                            setQuickFormLinkTrigger(displayLinkTrigger);
                          }}
                          className="absolute -top-1 -right-1 p-0.5 bg-amber-500 text-zinc-950 rounded-full shadow hover:bg-amber-400"
                          title="デフォボタンの編集 (名前・グループ・連動トリガー)"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Side: Baseball Outfield SVG */}
          <div className="flex flex-col gap-0.5 shrink-0 w-[98px] h-[102px] justify-between">
            <div className="flex justify-between items-center text-[7.5px] font-bold text-zinc-400 select-none">
              <span>打球方向 (球場)</span>
              {plottedHit && (
                <button onClick={() => onUpdatePlottedHit(null)} className="text-red-400 hover:underline">
                  クリア
                </button>
              )}
            </div>
            <div className="w-full aspect-square relative select-none bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden h-[88px]">
              <svg 
                onClick={handleFieldClick}
                className="w-full h-full cursor-crosshair"
                viewBox="5 26 90 62"
              >
                {/* Outfield Grass Sector (Center-balanced 90 deg baseball field) */}
                <path d="M 50 84 L 8 42 A 52 52 0 0 1 92 42 L 50 84 Z" fill="#047857" fillOpacity="0.28" stroke="#10b981" strokeWidth="1.2" />
                
                {/* Infield Dirt Area (Circle Mound & Baselines) */}
                <path d="M 50 84 L 66 68 L 50 52 L 34 68 Z" fill="#b45309" fillOpacity="0.28" stroke="#f59e0b" strokeWidth="0.9" strokeDasharray="1.5 1.5" />
                <circle cx="50" cy="68" r="9" fill="#b45309" fillOpacity="0.2" />

                {/* Fair Line Foul Poles (Yellow Poles) */}
                <line x1="8" y1="42" x2="8" y2="34" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />
                <line x1="92" y1="42" x2="92" y2="34" stroke="#facc15" strokeWidth="2" strokeLinecap="round" />

                {/* Base Bags */}
                <rect x="64.5" y="66.5" width="3" height="3" fill={runner1BId ? "#f43f5e" : "#fff"} transform="rotate(45 66 68)" className={runner1BId ? "animate-pulse" : ""} />
                <rect x="48.5" y="50.5" width="3" height="3" fill={runner2BId ? "#f43f5e" : "#fff"} transform="rotate(45 50 52)" className={runner2BId ? "animate-pulse" : ""} />
                <rect x="32.5" y="66.5" width="3" height="3" fill={runner3BId ? "#f43f5e" : "#fff"} transform="rotate(45 34 68)" className={runner3BId ? "animate-pulse" : ""} />
                <path d="M 48.5 82.5 L 51.5 82.5 L 50 84 Z" fill="#fff" />
                
                {/* Pitcher Mound Rubber */}
                <circle cx="50" cy="68" r="1.5" fill="#e4e4e7" />

                {/* Trajectory Line from Home (50, 84) */}
                {plottedHit && (
                  <>
                    <line x1="50" y1="84" x2={plottedHit.x} y2={plottedHit.y} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx={plottedHit.x} cy={plottedHit.y} r="2.8" fill="#f43f5e" stroke="#fff" strokeWidth="0.8" className="animate-pulse" />
                  </>
                )}
              </svg>
            </div>
          </div>

        </div>

      </div>

      {/* RIGHT COLUMN: Button Board Canvas */}
      <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl shadow-xl">
        
        {/* Canvas Header & Design mode triggers */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-emerald-455 animate-spin-slow" />
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-205">ボタンキャンバス</h2>
            
            {/* Active Tag Status inline to save vertical space */}
            {!isDesignMode && (
              <div className="text-[9px] flex items-center gap-1 select-none">
                <span className="text-zinc-650 font-bold uppercase tracking-wider">状態:</span>
                {activeEventName ? (
                  <span className="text-emerald-400 font-bold px-1.5 py-0.2 bg-emerald-950/45 border border-emerald-900/30 rounded flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-405 animate-pulse"></span>
                    {activeEventName}記録中
                  </span>
                ) : (
                  <span className="text-zinc-500 font-medium px-1.5 py-0.2 bg-zinc-950/40 border border-zinc-800/30 rounded">
                    準備完了
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap text-[9px]">
            {/* Keyboard Hotkey Lock Button */}
            <button
              onClick={onToggleHotkeys}
              className={`px-2 py-1 rounded text-[9px] font-bold transition-all shadow flex items-center gap-1 cursor-pointer ${
                hotkeysEnabled
                  ? 'bg-red-950/80 border border-red-800/60 text-red-400 hover:bg-red-950'
                  : 'bg-zinc-850 border border-zinc-800 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {hotkeysEnabled ? (
                <>
                  <Lock className="w-3 h-3 text-red-400" />
                  <span>ホットキー: ON</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3 text-zinc-500" />
                  <span>ホットキー: OFF</span>
                </>
              )}
            </button>

            {/* Hotkey Badges Toggle Button & Position Selector */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowHotkeyBadges(!showHotkeyBadges)}
                className={`px-2 py-1 rounded text-[9px] font-bold transition-all shadow flex items-center gap-1 cursor-pointer ${
                  showHotkeyBadges
                    ? 'bg-amber-950/80 border border-amber-800 text-amber-300'
                    : 'bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
                title="ボタン上のキーバッジ表示をON/OFF切替"
              >
                ⌨️ キー表示: {showHotkeyBadges ? 'ON' : 'OFF'}
              </button>

              {showHotkeyBadges && (
                <select
                  value={globalBadgePosition}
                  onChange={(e) => {
                    const pos = e.target.value as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'none';
                    setGlobalBadgePosition(pos);
                  }}
                  className="text-[9px] bg-zinc-900 border border-amber-800/80 text-amber-300 font-bold px-1.5 py-1 rounded focus:outline-none cursor-pointer"
                  title="ショートカットキーの表示位置を一括切り替え"
                >
                  <option value="bottom-left">位置: 左下</option>
                  <option value="top-left">位置: 左上</option>
                  <option value="top-right">位置: 右上</option>
                  <option value="bottom-right">位置: 右下</option>
                </select>
              )}
            </div>

            {/* Batch Font Size Controls (Design mode multi-select) */}
            {isDesignMode && selectedButtonIds.length > 0 && (
              <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-[9px]">
                <span className="text-zinc-400 font-bold">文字サイズ ({selectedButtonIds.length}個):</span>
                <button
                  type="button"
                  onClick={() => handleBatchFontSizeChange(-1)}
                  className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-black border border-zinc-700 cursor-pointer active:scale-95"
                  title="選択したボタンの文字サイズを1px小さく"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchFontSizeChange(1)}
                  className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded font-black border border-zinc-700 cursor-pointer active:scale-95"
                  title="選択したボタンの文字サイズを1px大きく"
                >
                  A+
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (isDesignMode) {
                  // Auto save when exiting Design mode!
                  if (onSaveCustomPreset) {
                    const activePreset = customPresets.find(p => p.id === activePresetId);
                    const targetName = activePreset ? activePreset.name : (saveInputName.trim() || 'パターン 1');
                    const resId = onSaveCustomPreset(targetName, activePresetId || undefined, buttons);
                    if (resId) {
                      setActivePresetId(resId);
                      localStorage.setItem('sportscode_active_preset_id', resId);
                    }
                    triggerToast(`✅ パターン「${targetName}」に自動保存しました！`);
                  }
                  setIsDesignMode(false);
                } else {
                  setIsDesignMode(true);
                }
              }}
              className={`px-2 py-1 rounded text-[9px] font-bold transition-all shadow cursor-pointer ${
                isDesignMode
                  ? 'bg-amber-600 hover:bg-amber-500 text-white font-extrabold ring-2 ring-amber-400'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
              title={isDesignMode ? 'デザインモードを終了しレイアウトを自動保存します' : 'レイアウトの配置やデザインを編集'}
            >
              {isDesignMode ? '📐 終了 (自動保存)' : '🛠️ デザイン'}
            </button>
            
            {/* Pattern selector — always visible */}
            <select
              value={activePresetId}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                setActivePresetId(val);
                localStorage.setItem('sportscode_active_preset_id', val);
                if (val === 'template_baseball') {
                  handleLoadTemplateWithUndo('baseball');
                } else if (val === 'template_football') {
                  handleLoadTemplateWithUndo('football');
                } else if (onLoadCustomPreset) {
                  onLoadCustomPreset(val);
                }
              }}
              className="text-[9px] bg-zinc-900 border border-zinc-700 text-sky-300 font-bold px-2 py-1 rounded focus:outline-none cursor-pointer max-w-[170px]"
            >
              <option value="">📂 パターン切替...</option>
              <optgroup label="標準テンプレート">
                <option value="template_baseball">⚾ 野球用（標準）</option>
                <option value="template_football">⚽ サッカー用（標準）</option>
              </optgroup>
              {customPresets.length > 0 && (
                <optgroup label="保存済みパターン">
                  {customPresets.map(p => (
                    <option key={p.id} value={p.id}>💾 {p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Design mode controls */}
            {isDesignMode && (
              <>
                {/* Save preset — direct overwrite or name input */}
                {showSaveInput ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={saveInputName}
                      onChange={(e) => setSaveInputName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && saveInputName.trim() && onSaveCustomPreset) {
                          const name = saveInputName.trim();
                          const resId = onSaveCustomPreset(name, activePresetId || undefined, buttons);
                          if (resId) {
                            setActivePresetId(resId);
                            localStorage.setItem('sportscode_active_preset_id', resId);
                          }
                          setShowSaveInput(false);
                          setSaveInputName('');
                          triggerToast(`✅ パターン「${name}」を保存しました！`);
                        }
                        if (e.key === 'Escape') {
                          setShowSaveInput(false);
                          setSaveInputName('');
                        }
                      }}
                      placeholder="パターン名..."
                      className="text-[9px] bg-zinc-800 border border-amber-700 text-zinc-100 px-2 py-1 rounded focus:outline-none w-28"
                    />
                    <button
                      type="button"
                      disabled={!saveInputName.trim()}
                      onClick={() => {
                        if (saveInputName.trim() && onSaveCustomPreset) {
                          const name = saveInputName.trim();
                          const resId = onSaveCustomPreset(name, activePresetId || undefined, buttons);
                          if (resId) {
                            setActivePresetId(resId);
                            localStorage.setItem('sportscode_active_preset_id', resId);
                          }
                          setShowSaveInput(false);
                          setSaveInputName('');
                          triggerToast(`✅ パターン「${name}」を保存しました！`);
                        }
                      }}
                      className="text-[9px] bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded font-bold disabled:opacity-40 cursor-pointer"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowSaveInput(false); setSaveInputName(''); }}
                      className="text-[9px] text-zinc-400 hover:text-white px-1.5 py-1 rounded cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {/* Quick Overwrite button if a preset is active */}
                    {activePresetId && customPresets.find(p => p.id === activePresetId) && (
                      <button
                        type="button"
                        onClick={() => {
                          const activePreset = customPresets.find(p => p.id === activePresetId);
                          if (activePreset && onSaveCustomPreset) {
                            const resId = onSaveCustomPreset(activePreset.name, activePreset.id, buttons);
                            if (resId) {
                              setActivePresetId(resId);
                              localStorage.setItem('sportscode_active_preset_id', resId);
                            }
                            triggerToast(`✅ 「${activePreset.name}」を上書き保存しました！`);
                          }
                        }}
                        className="text-[9px] text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-950/90 px-2 py-1 rounded border border-emerald-800 font-extrabold cursor-pointer flex items-center gap-1 shadow"
                        title={`選択中の「${customPresets.find(p => p.id === activePresetId)?.name}」を現在のレイアウトで上書き保存します`}
                      >
                        <Save className="w-3 h-3 text-emerald-400" /> 上書き保存
                      </button>
                    )}

                    {/* Save button */}
                    <button
                      type="button"
                      onClick={() => {
                        const activePreset = customPresets.find(p => p.id === activePresetId);
                        setSaveInputName(activePreset ? activePreset.name : `パターン ${customPresets.length + 1}`);
                        setShowSaveInput(true);
                      }}
                      className="text-[9px] text-amber-300 hover:text-amber-200 bg-amber-950/45 hover:bg-amber-950/80 px-2 py-1 rounded border border-amber-900/50 font-bold cursor-pointer flex items-center gap-1"
                      title="名前を指定してパターンを保存します"
                    >
                      <Save className="w-3 h-3 text-amber-400" /> {activePresetId ? '別名保存' : '新規保存'}
                    </button>
                  </div>
                )}

                {/* Delete preset */}
                {customPresets.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return;
                      const name = customPresets.find(p => p.id === id)?.name;
                      if (window.confirm(`パターン「${name}」を削除しますか？`) && onDeleteCustomPreset) {
                        onDeleteCustomPreset(id);
                        if (activePresetId === id) setActivePresetId('');
                      }
                      e.target.value = '';
                    }}
                    className="text-[9px] bg-zinc-900 border border-rose-900/50 text-rose-400 font-bold px-1.5 py-1 rounded focus:outline-none cursor-pointer"
                  >
                    <option value="">🗑 削除...</option>
                    {customPresets.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] px-2 py-1 rounded font-bold shadow flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> 追加
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('キャンバス上のすべてのボタンを削除しますか？')) handleLoadTemplateWithUndo('blank');
                  }}
                  className="text-[9px] text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-750 px-2 py-1 rounded border border-zinc-750 font-medium cursor-pointer"
                >
                  全消去
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('野球用デフォルト配置を再ロードしますか？')) handleLoadTemplateWithUndo('baseball');
                  }}
                  className="text-[9px] text-sky-400 hover:text-sky-300 bg-sky-950/45 hover:bg-sky-950/80 px-2 py-1 rounded border border-sky-900/50 font-semibold cursor-pointer"
                >
                  リセット
                </button>
              </>
            )}
          </div>
        </div>

        {/* ABSOLUTE POSITIONED BUTTON CANVAS */}
        <div 
          className="flex-1 relative bg-zinc-950 border border-zinc-850 rounded-xl mt-3 p-4 overflow-auto min-h-[350px]"
        >
          {/* onMouseDown here so e.target===e.currentTarget check works correctly (buttons are children) */}
          <div 
            onMouseDown={handleCanvasMouseDown} 
            style={{ minWidth: dynamicCanvasBounds.minWidth, minHeight: dynamicCanvasBounds.minHeight }}
            className="relative transition-all duration-200"
          >
          {/* Visual dashed marquee box overlay */}
          {selectionMarquee && (
            <div 
              style={{
                position: 'absolute',
                left: `${Math.min(selectionMarquee.startX, selectionMarquee.currentX)}px`,
                top: `${Math.min(selectionMarquee.startY, selectionMarquee.currentY)}px`,
                width: `${Math.abs(selectionMarquee.currentX - selectionMarquee.startX)}px`,
                height: `${Math.abs(selectionMarquee.currentY - selectionMarquee.startY)}px`,
                border: '1.5px dashed #38bdf8', // sky-400
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                pointerEvents: 'none',
                zIndex: 50
              }}
            />
          )}

          {buttons.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-zinc-500 gap-1.5 select-none animate-fade-in">
              <ShieldAlert className="w-8 h-8 opacity-25 text-amber-500" />
              <p className="text-xs font-semibold text-zinc-400">キャンバスが空です。</p>
              <p className="text-[10px] text-zinc-650">「デザインモード」をONにしてボタンを追加するか、リセットを押してください。</p>
            </div>
          ) : (
            buttons.map((btn) => {
              const dragInfo = activeDragMap && activeDragMap[btn.id];
              const x = dragInfo ? dragInfo.x : (btn.x !== undefined ? btn.x : 30);
              const y = dragInfo ? dragInfo.y : (btn.y !== undefined ? btn.y : 30);
              const w = (dragInfo && dragInfo.w !== undefined) ? dragInfo.w : (btn.w !== undefined ? btn.w : 120);
              const h = (dragInfo && dragInfo.h !== undefined) ? dragInfo.h : (btn.h !== undefined ? btn.h : 44);
              
              const isCodeType = btn.type === 'code';
              
              // Bind capture button label to the resolved active pitcher name!
              const isConfirmButton = btn.id === 'btn_pitch' || btn.name.toLowerCase().includes('pitch') || btn.name.toLowerCase().includes('confirm');
              const buttonDisplayName = (isCodeType && isConfirmButton && activePitcher) 
                ? `${activePitcher}` 
                : btn.name;
 
              // Check if button is currently flashing (150ms active click)
              const isCurrentlyFlashing = flashingButtons[btn.id];
 
              // Check if button is pre-selected (only when no active event)
              const isPreSelected = !activeEventName && preSelectedLabels.includes(btn.id);
              const isSelectedInDesign = selectedButtonIds.includes(btn.id);
 
              return (
                <div
                  key={btn.id}
                  style={{
                    position: 'absolute',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${w}px`,
                    height: `${h}px`
                  }}
                  onMouseDown={(e) => {
                    if (!isDesignMode) {
                      handleTriggerButtonWithFlash(btn);
                    } else {
                      handleButtonDragStart(e, btn);
                    }
                  }}
                  onDoubleClick={() => {
                    if (isDesignMode) {
                      handleEditButton(btn);
                    }
                  }}
                  className={`relative rounded-xl border flex flex-col items-center justify-center p-2 text-center select-none group ${
                    isDesignMode
                      ? `${btn.color} ${isSelectedInDesign ? 'ring-2 ring-sky-400 border-sky-350 shadow shadow-sky-900/50 scale-[1.01]' : 'border-zinc-500/80'} cursor-move opacity-85 hover:border-sky-500`
                      : (isCurrentlyFlashing || isPreSelected)
                        ? 'bg-sky-500 border-sky-350 text-white shadow shadow-sky-950/50 ring-4 ring-sky-400/80 scale-[1.03] font-black'
                        : `cursor-pointer active:scale-95 hover:scale-[1.01] transform transition-all duration-100 ${btn.color} text-white border-transparent shadow`
                  }`}
                  title={isDesignMode ? 'ドラッグで移動、ダブルクリックで編集。' : `ホットキー: ${btn.hotkey.toUpperCase()}`}
                >
                  {/* Button Text Display with dynamic fontSize */}
                  <span 
                    style={{ fontSize: btn.fontSize ? `${btn.fontSize}px` : undefined }}
                    className={`font-extrabold tracking-wide px-1 whitespace-normal break-words max-w-full leading-tight ${!btn.fontSize ? 'text-[10px] sm:text-[11px]' : ''} ${btn.textColor || ''}`}
                  >
                    {buttonDisplayName}
                  </span>

                  {/* Hotkey Badge (Position customizable via global / button position) */}
                  {showHotkeyBadges && btn.hotkey && btn.hotkey.trim() !== '' && (() => {
                    const pos = globalBadgePosition;
                    if (pos === 'none') return null;
                    const posClass = 
                      pos === 'top-left' ? 'top-1 left-1.5' :
                      pos === 'top-right' ? 'top-1 right-1.5' :
                      pos === 'bottom-right' ? 'bottom-1 right-1.5' :
                      'bottom-1 left-1.5';

                    return (
                      <span 
                        className={`absolute ${posClass} px-1 py-0.2 rounded text-[8.5px] font-mono font-black bg-zinc-950/90 border border-amber-400/60 text-amber-300 shadow select-none pointer-events-none uppercase tracking-wider z-10`}
                        title={`割り当てホットキー: ${btn.hotkey.toUpperCase()}`}
                      >
                        {btn.hotkey.toUpperCase()}
                      </span>
                    );
                  })()}

                  {/* Design buttons (No full-button overlay to prevent blocking drags!) */}
                  {isDesignMode && (
                    <>
                      {/* Delete Button (Top Left Corner) */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); handleDeleteWithUndo(btn.id); }}
                        className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-950 border border-red-800 text-red-400 hover:bg-red-900 rounded-full flex items-center justify-center cursor-pointer shadow z-20 hover:scale-105 transition-transform"
                        title="ボタン削除"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>

                      {/* Edit Button (Top Right Corner) */}
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); handleEditButton(btn); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-850 border border-zinc-755 text-zinc-300 hover:bg-zinc-700 rounded-full flex items-center justify-center cursor-pointer shadow z-20 hover:scale-105 transition-transform"
                        title="設定の編集"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                    </>
                  )}

                  {/* Resize Drag Handle */}
                  {isDesignMode && (
                    <div
                      onMouseDown={(e) => { e.stopPropagation(); handleButtonResizeStart(e, btn); }}
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize bg-zinc-700 hover:bg-sky-500 rounded-br-xl flex items-center justify-center border-t border-l border-zinc-800 z-20"
                      title="リサイズ"
                    >
                      <span className="text-[7px] text-zinc-400 select-none">◢</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>

      {/* Button Creator / Editor Modal Dialog */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <form
            onSubmit={handleSaveButton}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-sky-400" />
                {editingButton ? 'ボタン設定の編集' : 'カスタムボタンの追加'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Button Name */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-555">ボタン名</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例: Pitch, ストレート, 見逃し三振"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Button Type selection */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-zinc-555">ボタン動作タイプ</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as ButtonType)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-505 cursor-pointer"
              >
                <option value="code">コードボタン (タイムラインにクリップを作成)</option>
                <option value="label">ラベルボタン (メタデータタグを付与)</option>
              </select>
            </div>

            {/* Conditional Type Configs */}
            {formType === 'code' ? (
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-550">リードイン (秒前)</label>
                  <input
                    type="number"
                    min={0}
                    value={formLeadIn}
                    onChange={(e) => setFormLeadIn(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-550">リードアウト (秒後)</label>
                  <input
                    type="number"
                    min={0}
                    value={formLeadOut}
                    onChange={(e) => setFormLeadOut(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-550"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1 animate-in slide-in-from-top-1 duration-100">
                <label className="text-[10px] uppercase font-bold text-zinc-550">ラベルグループ名</label>
                <input
                  type="text"
                  value={formGroupName}
                  onChange={(e) => setFormGroupName(e.target.value)}
                  placeholder="例: Pitch Type, Result, Zone"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-505"
                />
              </div>
            )}

            {/* Hotkey Character, Button Color, Font Color Palette & Font Size */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400">ホットキー</label>
                <input
                  type="text"
                  maxLength={1}
                  value={formHotkey}
                  onChange={(e) => setFormHotkey(e.target.value)}
                  placeholder="例: q, f"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 text-center font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400">キー表示位置</label>
                <select
                  value={formBadgePosition}
                  onChange={(e) => setFormBadgePosition(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-1 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  <option value="default">キャンバス設定に従う (標準)</option>
                  <option value="bottom-left">個別固定: 左下</option>
                  <option value="top-left">個別固定: 左上</option>
                  <option value="top-right">個別固定: 右上</option>
                  <option value="bottom-right">個別固定: 右下</option>
                  <option value="none">個別固定: 非表示</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400">連動トリガー (Link)</label>
                <select
                  value={formLinkTrigger}
                  onChange={(e) => setFormLinkTrigger(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-1 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer text-[11px]"
                  title="安打やアウト発生時にこのボタンも自動発火させる Sportscode 連動設定"
                >
                  <option value="none">連動なし</option>
                  <option value="hit">安打連動 (Hit)</option>
                  <option value="out">アウト連動 (Out)</option>
                  <option value="score">得点連動 (Score)</option>
                  <option value="pitch">投球連動 (Pitch)</option>
                  <option value="walk">四死球連動 (Walk)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400">文字サイズ</label>
                <select
                  value={formFontSize}
                  onChange={(e) => setFormFontSize(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-1 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {[8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24].map(sz => (
                    <option key={sz} value={sz}>{sz}px</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400">背景の色</label>
                <select
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-1 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {TAILWIND_COLORS.map(c => (
                    <option key={c.name} value={c.class}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-550">文字の色</label>
                <select
                  value={formTextColor}
                  onChange={(e) => setFormTextColor(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-1.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                >
                  {TEXT_COLORS.map((col) => (
                    <option key={col.class} value={col.class}>{col.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/85">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-755 text-xs font-bold text-zinc-305 rounded-lg cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-lg cursor-pointer shadow"
              >
                保存
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DEFAULT QUICK BUTTON EDIT MODAL */}
      {editingQuickKey && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                デフォボタン設定の編集
              </h3>
              <button 
                type="button"
                onClick={() => setEditingQuickKey(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveQuickCustomButton} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400">ボタン名 (表示名)</label>
                <input
                  type="text"
                  required
                  value={quickFormName}
                  onChange={(e) => setQuickFormName(e.target.value)}
                  placeholder="ボタン名..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400">グループ名</label>
                <input
                  type="text"
                  value={quickFormGroup}
                  onChange={(e) => setQuickFormGroup(e.target.value)}
                  placeholder="グループ名 (例: Result, Play)..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400">連動トリガー (Link Trigger)</label>
                <select
                  value={quickFormLinkTrigger}
                  onChange={(e) => setQuickFormLinkTrigger(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="none">連動なし</option>
                  <option value="hit">安打連動 (Hit)</option>
                  <option value="out">アウト連動 (Out)</option>
                  <option value="score">得点連動 (Score)</option>
                  <option value="pitch">投球連動 (Pitch)</option>
                  <option value="walk">四死球連動 (Walk)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400">背景の色</label>
                <select
                  value={quickFormColor}
                  onChange={(e) => setQuickFormColor(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {TAILWIND_COLORS.map(c => (
                    <option key={c.name} value={c.class}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingQuickKey(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
