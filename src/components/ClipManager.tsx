import React, { useState } from 'react';
import type { TaggedEvent, Player } from '../types';
import { formatCentiseconds } from '../utils/formatters';
import { PlayCircle, Trash2, Search, Tag, Plus, User, Info } from 'lucide-react';

interface ClipManagerProps {
  events: TaggedEvent[];
  players: Player[];
  onSeek: (time: number) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateEventLabels: (eventId: string, labels: Record<string, string>) => void;
  onUpdateEventPlayer: (eventId: string, playerId: string | undefined, playerName: string | undefined) => void;
}

export const ClipManager: React.FC<ClipManagerProps> = ({
  events,
  players,
  onSeek,
  onDeleteEvent,
  onUpdateEventLabels,
  onUpdateEventPlayer
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [manualTagInputs, setManualTagInputs] = useState<Record<string, string>>({});

  // Filter events based on search query (matches player name or action name or label group/value)
  const filteredEvents = events.filter((ev) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const matchesPlayer = ev.playerName?.toLowerCase().includes(query);
    const matchesAction = ev.actionName.toLowerCase().includes(query);
    const matchesLabels = Object.entries(ev.labels).some(
      ([group, val]) => group.toLowerCase().includes(query) || val.toLowerCase().includes(query)
    );

    return matchesPlayer || matchesAction || matchesLabels;
  });

  const handleManualTagSubmit = (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    const inputVal = manualTagInputs[eventId]?.trim();
    if (!inputVal) return;

    const targetEvent = events.find(ev => ev.id === eventId);
    if (!targetEvent) return;

    let group = 'Note';
    let value = inputVal;

    // Check if input is key:value format (e.g. "Speed: 153km/h" or "Result: Ball")
    if (inputVal.includes(':')) {
      const parts = inputVal.split(':');
      const possibleGroup = parts[0].trim();
      const possibleValue = parts.slice(1).join(':').trim();
      
      if (possibleGroup && possibleValue) {
        group = possibleGroup;
        value = possibleValue;
      }
    }

    const updatedLabels = {
      ...targetEvent.labels,
      [group]: value
    };

    onUpdateEventLabels(eventId, updatedLabels);
    
    // Clear input
    setManualTagInputs({
      ...manualTagInputs,
      [eventId]: ''
    });
  };

  const handleDeleteLabel = (eventId: string, groupKey: string) => {
    const targetEvent = events.find(ev => ev.id === eventId);
    if (!targetEvent) return;

    const updatedLabels = { ...targetEvent.labels };
    delete updatedLabels[groupKey];

    onUpdateEventLabels(eventId, updatedLabels);
  };

  const handlePlayerChange = (eventId: string, playerId: string) => {
    if (playerId === 'unassigned') {
      onUpdateEventPlayer(eventId, undefined, undefined);
    } else {
      const selectedPlayer = players.find(p => p.id === playerId);
      if (selectedPlayer) {
        onUpdateEventPlayer(eventId, selectedPlayer.id, selectedPlayer.name);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl min-h-[450px]">
      {/* Search Header toolbar */}
      <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-zinc-400">
            Clip Review & Manual Tag Editor
          </h3>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clips, players, tags..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Grid Canvas list */}
      <div className="flex-1 p-5 overflow-y-auto max-h-[600px]">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-xs gap-3">
            <Search className="w-10 h-10 opacity-20" />
            <span>
              {events.length === 0 
                ? 'No clips logged yet. Tag some events in the Tagging tab first.' 
                : 'No clips match your search filters.'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEvents.map((ev) => {
              const startClock = formatCentiseconds(ev.startTime);
              const endClock = formatCentiseconds(ev.endTime);
              const durationSeconds = ev.endTime - ev.startTime;

              return (
                <div 
                  key={ev.id} 
                  className="bg-zinc-950/40 border border-zinc-850 rounded-xl p-4 flex flex-col gap-3.5 relative group hover:border-zinc-700/60 transition-all hover:bg-zinc-950/70 shadow"
                >
                  {/* Top: Card Header info */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-zinc-850 px-2 py-0.5 rounded font-bold text-zinc-400 border border-zinc-800">
                        {ev.actionName} Clip
                      </span>
                      <h4 className="text-xs font-mono font-bold text-zinc-300 mt-2">
                        ⏱️ {startClock} - {endClock} ({durationSeconds.toFixed(1)}s)
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSeek(ev.startTime)}
                        className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-900/60 text-emerald-400 hover:text-emerald-300 transition-transform active:scale-95 cursor-pointer"
                        title="Review Video Clip"
                      >
                        <PlayCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteEvent(ev.id)}
                        className="p-1.5 rounded-lg bg-red-950/45 hover:bg-red-950 border border-red-950/80 text-red-400 hover:text-red-300 cursor-pointer"
                        title="Delete Clip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body: Player Reassignment Selector */}
                  <div className="flex items-center gap-2 text-xs">
                    <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="text-zinc-500 font-semibold">Player:</span>
                    <select
                      value={ev.playerId || 'unassigned'}
                      onChange={(e) => handlePlayerChange(ev.id, e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-300 focus:outline-none focus:border-sky-500"
                    >
                      <option value="unassigned">Team / Unassigned</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Body: Tag Badges lists */}
                  <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                    {Object.entries(ev.labels).length === 0 ? (
                      <span className="text-[10px] text-zinc-650 italic">No labels or tags.</span>
                    ) : (
                      Object.entries(ev.labels).map(([group, val]) => (
                        <div 
                          key={group}
                          className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 text-[10px] rounded px-2 py-0.5 text-zinc-300 font-semibold"
                        >
                          <span className="text-sky-400">{group}:</span>
                          <span className="text-zinc-200">{val}</span>
                          <button
                            onClick={() => handleDeleteLabel(ev.id, group)}
                            className="ml-1 text-zinc-500 hover:text-red-400 text-[10px] cursor-pointer"
                            title={`Remove ${group} tag`}
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Bottom: Manual custom tag input */}
                  <form 
                    onSubmit={(e) => handleManualTagSubmit(e, ev.id)} 
                    className="flex gap-2 border-t border-zinc-850 pt-3"
                  >
                    <input
                      type="text"
                      value={manualTagInputs[ev.id] || ''}
                      onChange={(e) => setManualTagInputs({
                        ...manualTagInputs,
                        [ev.id]: e.target.value
                      })}
                      placeholder="Add tag (e.g. Pitcher: Yamamoto or Note: Great play)"
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      className="bg-sky-950/70 hover:bg-sky-900/80 border border-sky-900/40 text-sky-400 hover:text-sky-300 px-2 py-1 rounded text-[11px] font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Footnote */}
      <div className="p-3 bg-zinc-950 text-[10px] text-zinc-500 border-t border-zinc-850 flex items-start gap-1">
        <Info className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-semibold text-zinc-400">Manual tagging syntax:</p>
          <p>Type <code className="bg-zinc-900 border border-zinc-800 px-1 rounded text-zinc-300">Group: Value</code> (e.g., <code className="text-zinc-300">Speed: 154km/h</code>) to create group column names, or type text directly to log a note.</p>
        </div>
      </div>
    </div>
  );
};
