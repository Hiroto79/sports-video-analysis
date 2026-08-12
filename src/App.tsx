import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Player, ButtonConfig, TaggedEvent, CustomPreset } from './types';
import { VideoPlayer } from './components/VideoPlayer';
import type { VideoPlayerRef } from './components/VideoPlayer';
import { PlayerManager } from './components/PlayerManager';
import { CodeWindowDesigner } from './components/CodeWindowDesigner';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { OrganizerView } from './components/OrganizerView';
import { MatrixView } from './components/MatrixView';
import { MatrixPlayerModal } from './components/MatrixPlayerModal';
import { AiLiveStatReceiver } from './components/AiLiveStatReceiver';
import { supabase } from './lib/supabase';
import { EventTimeline } from './components/EventTimeline';
import { getMittDisplacementAtCatch } from './utils/baseballMittTracker';
import { Tv, ExternalLink, Film, Upload, ChevronDown, Command, Scissors, Download, RefreshCw, Users, Eye, EyeOff } from 'lucide-react';

// Default initial roster
const INITIAL_PLAYERS: Player[] = [];

// Simplified Baseball template with absolute coordinates positioned in a 7-column grid
const BASEBALL_TEMPLATE: ButtonConfig[] = [
  {
    "id": "btn_pitch",
    "name": "Pitch (投球)",
    "type": "code",
    "hotkey": "f",
    "color": "bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white font-extrabold shadow-emerald-950/40",
    "fontSize": 11,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 4,
    "leadOut": 2,
    "x": 3,
    "y": 6,
    "w": 90,
    "h": 43
  },
  {
    "id": "btn_4seam",
    "name": "4シーム",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 3,
    "y": 101,
    "w": 79,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_2seam",
    "name": "2シーム",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 3,
    "y": 130,
    "w": 79,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_cutter",
    "name": "カットボール",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 3,
    "y": 158,
    "w": 79,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_slider",
    "name": "スライダー",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 3,
    "y": 187,
    "w": 79,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_sweeper",
    "name": "スイーパー",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 3,
    "y": 216,
    "w": 79,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_slurve",
    "name": "スラーブ",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 3,
    "y": 245,
    "w": 79,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_curve",
    "name": "カーブ",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 84,
    "y": 102,
    "w": 84,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_kncurve",
    "name": "ナックルカーブ",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 84,
    "y": 131,
    "w": 84,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_changeup",
    "name": "チェンジアップ",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 84,
    "y": 159,
    "w": 84,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_splitter",
    "name": "スプリット",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 84,
    "y": 188,
    "w": 84,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_fork",
    "name": "フォーク",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 84,
    "y": 217,
    "w": 84,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_knuckle",
    "name": "ナックル",
    "type": "label",
    "hotkey": "",
    "color": "bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch Type",
    "x": 84,
    "y": 246,
    "w": 84,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_calledstrike",
    "name": "見逃しストライク",
    "type": "label",
    "hotkey": "s",
    "color": "bg-sky-950/70 border-sky-800/60 hover:bg-sky-900/80 text-sky-300",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Strike&ball",
    "x": 176,
    "y": 0,
    "w": 95,
    "h": 24
  },
  {
    "id": "btn_swingingstrike",
    "name": "空振りストライク",
    "type": "label",
    "hotkey": "z",
    "color": "bg-sky-950/70 border-sky-800/60 hover:bg-sky-900/80 text-sky-300",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Strike&ball",
    "x": 175,
    "y": 27,
    "w": 95,
    "h": 24
  },
  {
    "id": "btn_foul",
    "name": "ファール",
    "type": "label",
    "hotkey": "c",
    "color": "bg-sky-950/70 border-sky-800/60 hover:bg-sky-900/80 text-sky-300",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Strike&ball",
    "x": 175,
    "y": 54,
    "w": 95,
    "h": 24
  },
  {
    "id": "btn_ball",
    "name": "ボール",
    "type": "label",
    "hotkey": "a",
    "color": "bg-sky-950/70 border-sky-800/60 hover:bg-sky-900/80 text-sky-300",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Strike&ball",
    "x": 175,
    "y": 82,
    "w": 95,
    "h": 24
  },
  {
    "id": "btn_grounder",
    "name": "ゴロ",
    "type": "label",
    "hotkey": "",
    "color": "bg-purple-950/70 border-purple-900/50 hover:bg-purple-900/60 text-purple-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Batted Ball",
    "x": 282,
    "y": 93,
    "w": 64,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_liner",
    "name": "ライナー",
    "type": "label",
    "hotkey": "",
    "color": "bg-purple-950/70 border-purple-900/50 hover:bg-purple-900/60 text-purple-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Batted Ball",
    "x": 282,
    "y": 120,
    "w": 64,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_flyball",
    "name": "フライ",
    "type": "label",
    "hotkey": "",
    "color": "bg-purple-950/70 border-purple-900/50 hover:bg-purple-900/60 text-purple-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Batted Ball",
    "x": 282,
    "y": 149,
    "w": 64,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_popfly",
    "name": "小フライ",
    "type": "label",
    "hotkey": "",
    "color": "bg-purple-950/70 border-purple-900/50 hover:bg-purple-900/60 text-purple-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Batted Ball",
    "x": 282,
    "y": 178,
    "w": 64,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_steal_success",
    "name": "盗塁成功",
    "type": "label",
    "hotkey": "",
    "color": "bg-emerald-950/70 border-emerald-800/60 hover:bg-emerald-900/80 text-emerald-300",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Runner play",
    "x": 280,
    "y": 6,
    "w": 61,
    "h": 24
  },
  {
    "id": "btn_steal_fail",
    "name": "盗塁失敗",
    "type": "label",
    "hotkey": "",
    "color": "bg-emerald-950/70 border-emerald-800/60 hover:bg-emerald-900/80 text-emerald-300",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "linkTrigger": "out",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Runner play",
    "x": 280,
    "y": 33,
    "w": 61,
    "h": 24
  },
  {
    "id": "btn_bunt",
    "name": "バント",
    "type": "label",
    "hotkey": "",
    "color": "bg-amber-950/40 border-amber-800/60 hover:bg-amber-800/40 text-amber-400 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Tactics",
    "x": 282,
    "y": 207,
    "w": 68,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_endrun",
    "name": "エンドラン",
    "type": "label",
    "hotkey": "",
    "color": "bg-amber-950/40 border-amber-800/60 hover:bg-amber-800/40 text-amber-400 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Tactics",
    "x": 282,
    "y": 235,
    "w": 68,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_squeeze",
    "name": "スクイズ",
    "type": "label",
    "hotkey": "",
    "color": "bg-amber-950/40 border-amber-800/60 hover:bg-amber-800/40 text-amber-400 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Tactics",
    "x": 282,
    "y": 262,
    "w": 68,
    "h": 24,
    "fontSize": 8
  },
  {
    "id": "btn_rbi1",
    "name": "1打点",
    "type": "label",
    "hotkey": "",
    "color": "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "RBI",
    "x": 358,
    "y": 95,
    "w": 61,
    "h": 24,
    "fontSize": 10
  },
  {
    "id": "btn_rbi2",
    "name": "2打点",
    "type": "label",
    "hotkey": "",
    "color": "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "RBI",
    "x": 358,
    "y": 122,
    "w": 61,
    "h": 24,
    "fontSize": 10
  },
  {
    "id": "btn_rbi3",
    "name": "3打点",
    "type": "label",
    "hotkey": "",
    "color": "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "RBI",
    "x": 358,
    "y": 149,
    "w": 61,
    "h": 24,
    "fontSize": 10
  },
  {
    "id": "btn_rbi4",
    "name": "4打点",
    "type": "label",
    "hotkey": "",
    "color": "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "RBI",
    "x": 359,
    "y": 178,
    "w": 61,
    "h": 24,
    "fontSize": 10
  },
  {
    "id": "btn_fc",
    "name": "FC",
    "type": "label",
    "hotkey": "",
    "color": "bg-indigo-950/70 border-indigo-800/60 hover:bg-indigo-900/80 text-indigo-300",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "エラー類",
    "x": 364,
    "y": 209,
    "w": 50,
    "h": 24
  },
  {
    "id": "btn_advance",
    "name": "IFF",
    "type": "label",
    "hotkey": "",
    "color": "bg-indigo-950/70 border-indigo-800/60 hover:bg-indigo-900/80 text-indigo-300",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "エラー類",
    "x": 365,
    "y": 236,
    "w": 50,
    "h": 24
  },
  {
    "id": "btn_1783332404238",
    "name": "OUT",
    "type": "label",
    "hotkey": "",
    "color": "bg-amber-950/70 border-amber-800/60 hover:bg-amber-900/80 text-amber-300",
    "fontSize": 11,
    "badgePosition": "bottom-left",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Play Result",
    "x": 435,
    "y": 78,
    "w": 59,
    "h": 24
  },
  {
    "id": "btn_1783333012788",
    "name": "Hit",
    "type": "label",
    "hotkey": "",
    "color": "bg-amber-950/70 border-amber-800/60 hover:bg-amber-900/80 text-amber-300",
    "fontSize": 11,
    "badgePosition": "bottom-left",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Play Result",
    "x": 434,
    "y": 107,
    "w": 57,
    "h": 24
  },
  {
    "id": "btn_1783333063521",
    "name": "牽制死",
    "type": "label",
    "hotkey": "",
    "color": "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200",
    "fontSize": 9,
    "badgePosition": "bottom-left",
    "linkTrigger": "out",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pickoff",
    "x": 282,
    "y": 60,
    "w": 59,
    "h": 24
  },
  {
    "id": "btn_1783333309088",
    "name": "三振",
    "type": "label",
    "hotkey": "",
    "color": "bg-red-950/70 border-red-800/60 hover:bg-red-900/80 text-red-300",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "linkTrigger": "out",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Strike out",
    "x": 176,
    "y": 110,
    "w": 93,
    "h": 24
  },
  {
    "id": "btn_1783334016852",
    "name": "振り逃げ",
    "type": "label",
    "hotkey": "",
    "color": "bg-red-950/70 border-red-800/60 hover:bg-red-900/80 text-red-300",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Strike out",
    "x": 177,
    "y": 138,
    "w": 93,
    "h": 24
  },
  {
    "id": "btn_1783334057318",
    "name": "WP",
    "type": "label",
    "hotkey": "",
    "color": "bg-purple-950/70 border-purple-800/60 hover:bg-purple-900/80 text-purple-300",
    "fontSize": 9,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch error",
    "x": 111,
    "y": 9,
    "w": 50,
    "h": 24
  },
  {
    "id": "btn_1783334075252",
    "name": "PB",
    "type": "label",
    "hotkey": "",
    "color": "bg-purple-950/70 border-purple-800/60 hover:bg-purple-900/80 text-purple-300",
    "fontSize": 9,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch error",
    "x": 111,
    "y": 35,
    "w": 50,
    "h": 24
  },
  {
    "id": "btn_1783334146535",
    "name": "SF",
    "type": "label",
    "hotkey": "",
    "color": "bg-emerald-950/70 border-emerald-800/60 hover:bg-emerald-900/80 text-emerald-300",
    "fontSize": 11,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "犠飛・犠打",
    "x": 179,
    "y": 172,
    "w": 64,
    "h": 24
  },
  {
    "id": "btn_1783334194802",
    "name": "SFB",
    "type": "label",
    "hotkey": "",
    "color": "bg-emerald-950/70 border-emerald-800/60 hover:bg-emerald-900/80 text-emerald-300",
    "fontSize": 11,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "犠飛・犠打",
    "x": 178,
    "y": 198,
    "w": 66,
    "h": 24
  },
  {
    "id": "btn_1783334293685",
    "name": "IBB",
    "type": "label",
    "hotkey": "",
    "color": "bg-red-950/70 border-red-800/60 hover:bg-red-900/80 text-red-300",
    "fontSize": 9,
    "badgePosition": "bottom-left",
    "linkTrigger": "pitch",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Result",
    "x": 2,
    "y": 61,
    "w": 50,
    "h": 24
  },
  {
    "id": "btn_1783334397550",
    "name": "BK",
    "type": "label",
    "hotkey": "",
    "color": "bg-purple-950/70 border-purple-800/60 hover:bg-purple-900/80 text-purple-300",
    "fontSize": 9,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Pitch error",
    "x": 112,
    "y": 63,
    "w": 50,
    "h": 24
  },
  {
    "id": "btn_1783334667917",
    "name": "Runner out",
    "type": "label",
    "hotkey": "",
    "color": "bg-emerald-950/70 border-emerald-800/60 hover:bg-emerald-900/80 text-emerald-300",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "linkTrigger": "out",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Runner play",
    "x": 181,
    "y": 227,
    "w": 73,
    "h": 24
  },
  {
    "id": "btn_1783334757266",
    "name": "Interference",
    "type": "label",
    "hotkey": "",
    "color": "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200",
    "fontSize": 8,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Player error",
    "x": 351,
    "y": 6,
    "w": 80,
    "h": 24
  },
  {
    "id": "btn_1783518232511",
    "name": "四死球",
    "type": "label",
    "hotkey": "",
    "color": "bg-amber-950/70 border-amber-800/60 hover:bg-amber-900/80 text-amber-300",
    "fontSize": 10,
    "badgePosition": "bottom-left",
    "linkTrigger": "none",
    "leadIn": 0,
    "leadOut": 0,
    "groupName": "Play Result",
    "x": 435,
    "y": 137,
    "w": 58,
    "h": 24
  }
];

const FOOTBALL_TEMPLATE: ButtonConfig[] = [
  { id: 'btn_attack', name: 'Attack (攻撃)', type: 'code', hotkey: '', color: 'bg-red-950/70 border-red-800/60 text-red-300', leadIn: 8, leadOut: 4, x: 10, y: 10, w: 110, h: 38 },
  { id: 'btn_def', name: 'Defense (守備)', type: 'code', hotkey: '', color: 'bg-blue-950/70 border-blue-800/60 text-blue-300', leadIn: 6, leadOut: 3, x: 125, y: 10, w: 110, h: 38 },
  { id: 'btn_shoot', name: 'Shoot (シュート)', type: 'label', hotkey: '', color: 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300', leadIn: 0, leadOut: 0, groupName: 'Action', x: 240, y: 10, w: 110, h: 38 },
  { id: 'btn_pass', name: 'Pass (パス)', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-800/60 text-sky-300', leadIn: 0, leadOut: 0, groupName: 'Action', x: 10, y: 55, w: 110, h: 38 },
  { id: 'btn_foul_f', name: 'Foul (ファウル)', type: 'label', hotkey: '', color: 'bg-purple-950/70 border-purple-800/60 text-purple-300', leadIn: 0, leadOut: 0, groupName: 'Action', x: 125, y: 55, w: 110, h: 38 }
];

const TAG_GROUPS: { [group: string]: string[] } = {
  '球種': ['4シーム', '2シーム', 'カットボール', 'スライダー', 'スイーパー', 'スラーブ', 'カーブ', 'ナックルカーブ', 'チェンジアップ', 'スプリット', 'フォーク', 'ナックル'],
  '判定/結果': ['見逃しストライク', '空振りストライク', 'ファール', 'ボール', '単打', '二塁打', '三塁打', '本塁打', '死球', '四球', '失策'],
  '打球の質': ['ゴロ', 'ライナー', 'フライ', '小フライ'],
  'コース': ['B11', 'B12', 'B13', 'B14', 'B15', 'B21', 'B22', 'B23', 'B24', 'B25', 'B31', 'B32', 'B33', 'B34', 'B35', 'B41', 'B42', 'B43', 'B44', 'B45', 'B51', 'B52', 'B53', 'B54', 'B55'],
  '球速': [],
  'ランナー': ['なし', '1塁', '2塁', '3塁', '満塁', '1・2塁', '2・3塁', '1・3塁'],
  '打点': ['1打点', '2打点', '3打点', '4打点'],
  '作戦/他': ['バント', 'エンドラン', '牽制', '盗塁成功', '盗塁失敗', 'フィルダースチョイス'],
};

function App() {
  const [currentUser, setCurrentUser] = useState<string>(() => window.localStorage.getItem('sportscode_current_user') || '');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => window.localStorage.getItem('sportscode_is_logged_in') === 'true');
  const [usersDb] = useState<{ [key: string]: { name: string; password?: string; email?: string | null; is_active?: boolean } }>(() => {
    try {
      const saved = window.localStorage.getItem('sportscode_users_db');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      'default': { name: 'デフォルトアカウント', password: '', is_active: true },
      'baseball_team_a': { name: 'Aチーム監督', password: '123', is_active: true },
      'baseball_team_b': { name: 'Bチーム監督', password: '123', is_active: true },
      'admin': { name: 'システム管理者', password: 'admin', is_active: true }
    };
  });

  const [inputUserId, setInputUserId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // User Signup / Registration Request states
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'register' || params.get('register') === 'true';
    }
    return false;
  });
  const [regUserId, setRegUserId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regTeamName, setRegTeamName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Administrator Account Management panel & Audit Log states
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminTab, setAdminTab] = useState<'accounts' | 'logs' | 'inquiries'>('accounts');
  const [adminAccountsList, setAdminAccountsList] = useState<any[]>([]);
  const [adminAccountsFilter, setAdminAccountsFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [adminLogsList, setAdminLogsList] = useState<any[]>([]);
  const [adminLogFilter, setAdminLogFilter] = useState<'ALL' | 'LOGIN' | 'LOGIN_FAILED' | 'CSV_EXPORT' | 'VIDEO_EXPORT'>('ALL');
  const [adminPanelError, setAdminPanelError] = useState<string | null>(null);
  const [newTeamId, setNewTeamId] = useState('');
  const [newTeamPassword, setNewTeamPassword] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamEmail, setNewTeamEmail] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // App Settings & Language states
  const [appLanguage, setAppLanguage] = useState<'ja' | 'en'>(() => {
    return (window.localStorage.getItem('sportscode_app_language') as 'ja' | 'en') || 'ja';
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'password' | 'language' | 'support' | 'about'>('password');

  // Support & In-app Inquiry Messaging states
  const [userSupportMessageText, setUserSupportMessageText] = useState('');
  const [userSupportHistory, setUserSupportHistory] = useState<any[]>([]);
  const [adminSupportList, setAdminSupportList] = useState<any[]>([]);
  const [adminReplyTextMap, setAdminReplyTextMap] = useState<{ [id: number]: string }>({});

  const fetchUserSupportHistory = async () => {
    if (!currentUser) return;
    if (supabase) {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('team_id', currentUser)
        .order('created_at', { ascending: false });
      if (data) setUserSupportHistory(data);
    }
  };

  const fetchAdminSupportList = async () => {
    if (supabase) {
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setAdminSupportList(data);
    }
  };

  const handleSendUserSupportMessage = async () => {
    const text = userSupportMessageText.trim();
    if (!text) {
      alert('メッセージ内容を入力してください');
      return;
    }

    if (supabase) {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          team_id: currentUser,
          message: text,
          status: 'pending'
        });

      if (error) {
        alert('送信に失敗しました: ' + error.message);
        return;
      }
    }

    alert('✅ お問い合わせを送信しました！管理者からの返信をお待ちください。');
    setUserSupportMessageText('');
    fetchUserSupportHistory();
  };

  const handleSendAdminReply = async (msgId: number) => {
    const replyText = (adminReplyTextMap[msgId] || '').trim();
    if (!replyText) {
      alert('返信メッセージを入力してください');
      return;
    }

    if (supabase) {
      const { error } = await supabase
        .from('support_messages')
        .update({
          reply: replyText,
          status: 'replied',
          replied_at: new Date().toISOString()
        })
        .eq('id', msgId);

      if (error) {
        alert('返信に失敗しました: ' + error.message);
        return;
      }
    }

    alert('✅ 返信を送信しました！');
    setAdminReplyTextMap(prev => ({ ...prev, [msgId]: '' }));
    fetchAdminSupportList();
  };

  // Password Recovery / Reset states
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(() => {
    return window.localStorage.getItem('sportscode_logged_in_with_temp') === 'true';
  });
  const [changeNewPass, setChangeNewPass] = useState('');
  const [changeConfirmPass, setChangeConfirmPass] = useState('');
  const [changePassError, setChangePassError] = useState<string | null>(null);

  const handleChangeOwnPassword = async () => {
    const newP = changeNewPass.trim();
    if (!newP) {
      setChangePassError('新しいパスワードを入力してください');
      return;
    }
    if (newP !== changeConfirmPass.trim()) {
      setChangePassError('確認用パスワードが一致しません');
      return;
    }

    if (supabase) {
      const { error } = await supabase
        .from('team_accounts')
        .update({
          password: newP,
          temp_password: null,
          temp_password_expires_at: null
        })
        .eq('id', currentUser);

      if (error) {
        setChangePassError('パスワード更新に失敗しました: ' + error.message);
        return;
      }
    } else {
      if (usersDb[currentUser]) {
        usersDb[currentUser].password = newP;
        window.localStorage.setItem('sportscode_users_db', JSON.stringify(usersDb));
      }
    }

    window.localStorage.setItem('sportscode_current_password', newP);
    window.localStorage.removeItem('sportscode_logged_in_with_temp');
    setShowPasswordChangeModal(false);
    setChangeNewPass('');
    setChangeConfirmPass('');
    setChangePassError(null);
    alert('✅ パスワードの変更が完了しました！次回から新しいパスワードでログインできます。');
  };

  // ---- Update system states ----
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready'>('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [updateProgress, setUpdateProgress] = useState<number>(0);

  // Register electron IPC update listeners
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return; // Web / mobile fallback

    electronAPI.onUpdateAvailable((info: any) => {
      setUpdateInfo(info);
      setUpdateStatus('available');
    });
    electronAPI.onUpdateNotAvailable(() => {
      setUpdateStatus('not-available');
      setTimeout(() => setUpdateStatus('idle'), 4000);
    });
    electronAPI.onUpdateDownloadProgress((progress: any) => {
      setUpdateProgress(Math.round(progress.percent || 0));
      setUpdateStatus('downloading');
    });
    electronAPI.onUpdateDownloaded(() => {
      // On Mac, code signature check happens at install time — open browser instead
      const isMacDownload = navigator.userAgent.includes('Mac');
      if (isMacDownload) {
        electronAPI?.openExternal?.('https://github.com/Hiroto79/sports-video-analysis/releases/latest');
        setUpdateStatus('idle');
      } else {
        setUpdateStatus('ready');
      }
    });
    electronAPI.onUpdateError((err: any) => {
      console.error('Update check failed:', err);
      // Silently reset to idle — no popup, no auto browser open
      // User can click the update button again which will open the browser
      setUpdateStatus('idle');
    });

    return () => electronAPI.removeAllUpdateListeners?.();
  }, []);

  const handleCheckForUpdates = async () => {
    const electronAPI = (window as any).electronAPI;
    if (updateStatus === 'ready') {
      electronAPI?.quitAndInstall();
      return;
    }
    if (updateStatus === 'available') {
      // macOS requires valid Apple certificates for auto-updating in-app.
      // Unsigned apps will fail with signature validation errors. Redirect Mac users to browser download!
      const isMac = navigator.userAgent.includes('Mac');
      if (isMac) {
        const downloadUrl = 'https://github.com/Hiroto79/sports-video-analysis/releases/latest';
        if (electronAPI?.openExternal) {
          await electronAPI.openExternal(downloadUrl);
        } else {
          window.open(downloadUrl, '_blank');
        }
        setUpdateStatus('idle');
        return;
      }

      setUpdateStatus('downloading');
      electronAPI?.downloadUpdate();
      return;
    }
    setUpdateStatus('checking');
    if (electronAPI) {
      await electronAPI.checkForUpdates();
    } else {
      // Web fallback: show no-update after 2s
      setTimeout(() => {
        setUpdateStatus('not-available');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      }, 2000);
    }
  };

  // Access Logging Helper (Minimum logging for impersonation / security audit)
  const logAccessEvent = async (
    teamId: string,
    actionType: 'LOGIN' | 'LOGIN_FAILED' | 'CSV_EXPORT' | 'VIDEO_EXPORT',
    status: 'success' | 'failed',
    details: Record<string, any> = {}
  ) => {
    if (!supabase) return;
    try {
      await supabase.from('access_logs').insert({
        team_id: teamId,
        action_type: actionType,
        status: status,
        details: {
          ...details,
          userAgent: navigator.userAgent.substring(0, 120),
          time: new Date().toISOString()
        }
      });
    } catch (err) {
      console.warn('Failed to record access log:', err);
    }
  };

  const fetchAdminAccessLogs = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setAdminLogsList(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch access logs:', err);
    }
  };

  const fetchAdminAccounts = async () => {
    if (!supabase) {
      // Offline fallback: Use usersDb
      const mockList = Object.entries(usersDb).map(([id, info]) => ({
        id,
        password: info.password || '',
        team_name: info.name,
        is_active: true
      }));
      if (!mockList.some(a => a.id === 'admin')) {
        mockList.unshift({ id: 'admin', password: usersDb['admin']?.password || 'admin', team_name: '管理者', is_active: true });
      }
      setAdminAccountsList(mockList);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('team_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const list = [...data];
        if (!list.some(acc => acc.id === 'admin')) {
          list.unshift({ id: 'admin', password: 'admin', team_name: '管理者', is_active: true });
        }
        setAdminAccountsList(list);
        setAdminPanelError(null);
      } else {
        setAdminPanelError(error?.message || 'アカウント一覧の取得に失敗しました');
      }
    } catch (err: any) {
      setAdminPanelError(err?.message || 'エラーが発生しました');
    }
  };

  const handleAdminUpdatePassword = async (id: string, newPass: string) => {
    const trimmedPass = newPass.trim();
    if (!trimmedPass) {
      alert('新しいパスワードを入力してください');
      return;
    }

    if (supabase) {
      const targetAccount = adminAccountsList.find(a => a.id === id);
      const { error } = await supabase
        .from('team_accounts')
        .upsert({
          id,
          password: trimmedPass,
          team_name: targetAccount?.team_name || (id === 'admin' ? '管理者' : null),
          is_active: targetAccount?.is_active ?? true
        });
      if (error) {
        alert('パスワード更新に失敗しました: ' + error.message);
        return;
      }
    } else {
      usersDb[id] = { ...usersDb[id], password: trimmedPass };
      window.localStorage.setItem('sportscode_users_db', JSON.stringify(usersDb));
    }

    // 自分自身のアカウントのパスワードを変更した場合は、ローカルのセッション保存も更新
    if (id === currentUser) {
      window.localStorage.setItem('sportscode_current_password', trimmedPass);
    }

    alert(`✅ アカウント「${id}」のパスワードを「${trimmedPass}」に変更しました。`);
    fetchAdminAccounts();
  };

  const handleGenerateTempPassword = async (id: string) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let tempPass = '';
    for (let i = 0; i < 6; i++) {
      tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    if (supabase) {
      try {
        const { error } = await supabase
          .from('team_accounts')
          .update({
            temp_password: tempPass,
            temp_password_expires_at: expiresAt
          })
          .eq('id', id);

        if (error) {
          console.warn("Supabase temp_password update warning:", error.message);
          // If column doesn't exist in DB schema, update standard password directly as a emergency fallback
          await supabase
            .from('team_accounts')
            .update({ password: tempPass })
            .eq('id', id);
        }
      } catch (err) {
        console.warn("Temp password generation exception fallback:", err);
      }
    }

    alert(`⚡ アカウント「${id}」の30分間有効な一時パスワードを発行しました！\n\n【一時パスワード】 ${tempPass}\n【有効期限】 30分間 (${new Date(expiresAt).toLocaleTimeString('ja-JP')}まで)\n\nこの一時パスワードで緊急ログインおよび再設定が可能です。`);
    fetchAdminAccounts();
  };

  const handleAdminUpdateEmail = async (id: string, newEmail: string) => {
    const trimmedEmail = newEmail.trim() || null;
    if (supabase) {
      const { error } = await supabase
        .from('team_accounts')
        .update({ email: trimmedEmail })
        .eq('id', id);
      if (error) {
        alert('メールアドレスの保存に失敗しました: ' + error.message);
        return;
      }
    } else {
      if (usersDb[id]) {
        usersDb[id].email = trimmedEmail;
        window.localStorage.setItem('sportscode_users_db', JSON.stringify(usersDb));
      }
    }
    showToast(`📧 アカウント「${id}」のメールアドレスを保存しました`);
    fetchAdminAccounts();
  };

  const handleAdminApproveAccount = async (id: string) => {
    if (supabase) {
      const { error } = await supabase
        .from('team_accounts')
        .update({ is_active: true })
        .eq('id', id);
      if (error) {
        alert('承認処理に失敗しました: ' + error.message);
        return;
      }
    } else {
      if (usersDb[id]) {
        usersDb[id].is_active = true;
        window.localStorage.setItem('sportscode_users_db', JSON.stringify(usersDb));
      }
    }
    showToast(`✅ アカウント「${id}」を承認し、利用開始可能にしました！`);
    fetchAdminAccounts();
  };

  const handleAdminToggleActive = async (id: string, currentStatus: boolean) => {
    if (supabase) {
      const { error } = await supabase
        .from('team_accounts')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      if (error) {
        alert('状態の更新に失敗しました: ' + error.message);
        return;
      }
    } else {
      // Offline mock toggle not stored
    }
    fetchAdminAccounts();
  };

  const handleAdminDeleteAccount = async (id: string) => {
    if (supabase) {
      const { error } = await supabase
        .from('team_accounts')
        .delete()
        .eq('id', id);
      if (error) {
        alert('削除に失敗しました: ' + error.message);
        setConfirmDeleteId(null);
        return;
      }
    } else {
      // Offline: remove from local usersDb
      delete usersDb[id];
      window.localStorage.setItem('sportscode_users_db', JSON.stringify(usersDb));
    }
    setConfirmDeleteId(null);
    fetchAdminAccounts();
  };

  const handleAdminCreateTeam = async () => {
    const trimmedId = newTeamId.trim();
    const trimmedPass = newTeamPassword.trim();
    if (!trimmedId || !trimmedPass) {
      alert('IDとパスワードを入力してください');
      return;
    }

    if (supabase) {
      const emailVal = newTeamEmail.trim() || null;
      // 1. Try insert with email column
      let { error } = await supabase
        .from('team_accounts')
        .insert({
          id: trimmedId,
          password: trimmedPass,
          team_name: newTeamName.trim() || null,
          ...(emailVal ? { email: emailVal } : {}),
          is_active: true
        });

      // 2. Fallback without email if schema cache is refreshing
      if (error && (error.message.includes("Could not find the 'email' column") || error.code === 'PGRST204')) {
        const fallbackRes = await supabase
          .from('team_accounts')
          .insert({
            id: trimmedId,
            password: trimmedPass,
            team_name: newTeamName.trim() || null,
            is_active: true
          });
        error = fallbackRes.error;
      }

      if (error) {
        if (error.message.includes('duplicate key') || error.code === '23505') {
          alert(`⚠️ ユーザーID「${trimmedId}」は既に存在・登録されています。別のIDをご指定いただくか、下のアカウント一覧で既存データを編集してください。`);
        } else {
          alert('登録に失敗しました: ' + error.message);
        }
        return;
      }
    } else {
      usersDb[trimmedId] = { name: newTeamName || trimmedId, password: newTeamPassword, email: newTeamEmail };
      window.localStorage.setItem('sportscode_users_db', JSON.stringify(usersDb));
    }

    setNewTeamId('');
    setNewTeamPassword('');
    setNewTeamName('');
    setNewTeamEmail('');
    showToast(`✅ 新規アカウント「${trimmedId}」を作成しました！`);
    fetchAdminAccounts();
  };

  useEffect(() => {
    if (showAdminPanel) {
      fetchAdminAccounts();
      fetchAdminAccessLogs();
    }
  }, [showAdminPanel]);

  // Scoped localStorage wrapper using lexical scoping
  const localStorage = {
    getItem: (key: string): string | null => {
      // Return normal values for global auth states
      if (key === 'sportscode_current_user' || key === 'sportscode_current_password' || key === 'sportscode_is_logged_in' || key === 'sportscode_users_db') {
        return window.localStorage.getItem(key);
      }
      if (!currentUser) return window.localStorage.getItem(key);
      const userKey = `sportscode_user_${currentUser}_${key.replace('sportscode_', '')}`;
      const userVal = window.localStorage.getItem(userKey);
      if (userVal !== null) return userVal;
      
      // If a user is logged in, do NOT fall back to global keys for user-specific states.
      // This prevents new accounts from inheriting old data of previous users.
      const isolatedKeys = ['players', 'roster', 'accumulated_csv_events', 'quick_custom_map'];
      const isIsolated = isolatedKeys.some(ik => key.toLowerCase().includes(ik));
      if (isIsolated) return null;

      // Fallback
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
    },
    get length() {
      return window.localStorage.length;
    },
    key: (index: number) => {
      return window.localStorage.key(index);
    }
  };

  const handlePerformRegister = async () => {
    setRegError(null);
    const trimmedId = regUserId.trim();
    const trimmedPass = regPassword.trim();
    const trimmedPassConfirm = regPasswordConfirm.trim();
    const trimmedTeam = regTeamName.trim();
    const trimmedEmail = regEmail.trim();

    if (!trimmedId) {
      setRegError('ユーザーIDを入力してください（半角英数字、アンダースコア等）');
      return;
    }
    if (trimmedId.length < 3) {
      setRegError('ユーザーIDは3文字以上で入力してください');
      return;
    }
    if (!trimmedPass) {
      setRegError('パスワードを入力してください');
      return;
    }
    if (trimmedPass.length < 6) {
      setRegError('パスワードは6文字以上で入力してください');
      return;
    }
    if (trimmedPass !== trimmedPassConfirm) {
      setRegError('パスワードと確認用パスワードが一致しません');
      return;
    }
    if (!trimmedTeam) {
      setRegError('チーム名または組織名を入力してください');
      return;
    }
    if (!trimmedEmail) {
      setRegError('ご連絡先メールアドレスを入力してください');
      return;
    }

    setRegLoading(true);

    try {
      if (supabase) {
        // 1. Try to insert with is_active = false (Pending admin approval)
        let { error } = await supabase
          .from('team_accounts')
          .insert({
            id: trimmedId,
            password: trimmedPass,
            team_name: trimmedTeam,
            email: trimmedEmail,
            is_active: false
          });

        if (error && (error.message.includes("Could not find the 'email' column") || error.code === 'PGRST204')) {
          const fallbackRes = await supabase
            .from('team_accounts')
            .insert({
              id: trimmedId,
              password: trimmedPass,
              team_name: trimmedTeam,
              is_active: false
            });
          error = fallbackRes.error;
        }

        if (error) {
          if (error.message.includes('duplicate key') || error.code === '23505') {
            setRegError(`⚠️ ユーザーID「${trimmedId}」は既に使われています。別のIDをご指定ください。`);
          } else {
            setRegError('登録申請に失敗しました: ' + error.message);
          }
          setRegLoading(false);
          return;
        }
      } else {
        // Local offline fallback
        if (usersDb[trimmedId]) {
          setRegError(`⚠️ ユーザーID「${trimmedId}」は既に使われています。`);
          setRegLoading(false);
          return;
        }
        usersDb[trimmedId] = { name: trimmedTeam, password: trimmedPass, email: trimmedEmail, is_active: false };
        window.localStorage.setItem('sportscode_users_db', JSON.stringify(usersDb));
      }

      // Log registration application event
      logAccessEvent(trimmedId, 'LOGIN_FAILED', 'failed', { teamName: trimmedTeam, email: trimmedEmail, note: 'User Signup Request Submitted (Pending Approval)' });

      setRegSuccess(true);
    } catch (err: any) {
      setRegError('通信エラーが発生しました: ' + (err?.message || String(err)));
    } finally {
      setRegLoading(false);
    }
  };

  const handlePerformLogin = async () => {
    const trimmedId = inputUserId.trim();
    if (!trimmedId) {
      setLoginError('ユーザーIDを入力してください');
      return;
    }

    // 1. Try to check credentials using Supabase table 'team_accounts'
    let supabaseUser = null;
    let databaseExists = false;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_accounts')
          .select('*')
          .eq('id', trimmedId)
          .single();

        if (!error && data) {
          supabaseUser = data;
          databaseExists = true;
        } else if (error && error.code !== 'PGRST116') {
          console.error("Supabase login connection/table error:", error);
          databaseExists = false;
        } else {
          console.warn("Supabase user row not found (PGRST116):", error);
          databaseExists = true;
        }
      } catch (err) {
        console.error("Supabase query failed exception:", err);
      }
    }

    if (databaseExists && supabaseUser) {
      if (!supabaseUser.is_active) {
        logAccessEvent(trimmedId, 'LOGIN_FAILED', 'failed', { reason: 'Account inactive / pending approval' });
        setLoginError('⏳ このアカウントは現在【管理者承認待ち】です。運営者の承認完了後にログイン可能になります。');
        return;
      }

      const isNormalPasswordMatch = supabaseUser.password === loginPassword;
      const isTempPasswordValid = supabaseUser.temp_password 
        && supabaseUser.temp_password === loginPassword 
        && supabaseUser.temp_password_expires_at 
        && new Date(supabaseUser.temp_password_expires_at).getTime() > Date.now();

      if (!isNormalPasswordMatch && !isTempPasswordValid) {
        logAccessEvent(trimmedId, 'LOGIN_FAILED', 'failed', { reason: 'Incorrect password' });
        setLoginError('IDまたはパスワードが正しくありません（※一時パスワードの場合は30分の有効期限をご確認ください）');
        return;
      }

      if (isTempPasswordValid) {
        window.localStorage.setItem('sportscode_logged_in_with_temp', 'true');
      } else {
        window.localStorage.removeItem('sportscode_logged_in_with_temp');
      }

      // Login successful via Supabase
      await logAccessEvent(trimmedId, 'LOGIN', 'success', { teamName: supabaseUser.team_name });
      window.localStorage.setItem('sportscode_current_user', trimmedId);
      window.localStorage.setItem('sportscode_current_password', loginPassword);
      window.localStorage.setItem('sportscode_is_logged_in', 'true');
      setCurrentUser(trimmedId);
      setIsLoggedIn(true);
      setLoginPassword('');
      setLoginError(null);
      channelRef.current?.postMessage({ type: 'SYNC_USER_LOGGED_IN', userId: trimmedId });
      window.location.reload();
      return;
    }

    // 2. Fallback to Local/Offline simulation
    const user = usersDb[trimmedId];
    if (user) {
      if (user.password && user.password !== loginPassword) {
        logAccessEvent(trimmedId, 'LOGIN_FAILED', 'failed', { reason: 'Incorrect password (local)' });
        setLoginError('IDまたはパスワードが正しくありません');
        return;
      }

      // Login successful via Local Simulation
      await logAccessEvent(trimmedId, 'LOGIN', 'success', { teamName: user.name, mode: 'local' });
      window.localStorage.setItem('sportscode_current_user', trimmedId);
      window.localStorage.setItem('sportscode_current_password', loginPassword);
      window.localStorage.setItem('sportscode_is_logged_in', 'true');
      setCurrentUser(trimmedId);
      setIsLoggedIn(true);
      setLoginPassword('');
      setLoginError(null);
      channelRef.current?.postMessage({ type: 'SYNC_USER_LOGGED_IN', userId: trimmedId });
      window.location.reload();
      return;
    }

    // If both database check and local check failed
    logAccessEvent(trimmedId, 'LOGIN_FAILED', 'failed', { reason: 'Account not found' });
    setLoginError('IDまたはパスワードが正しくありません');
  };

  const handleForceLogout = (reason: string | null = null) => {
    window.localStorage.removeItem('sportscode_current_user');
    window.localStorage.removeItem('sportscode_current_password');
    window.localStorage.setItem('sportscode_is_logged_in', 'false');
    setIsLoggedIn(false);
    setCurrentUser('');
    setLoginError(reason);
    channelRef.current?.postMessage({ type: 'SYNC_USER_LOGGED_OUT' });
    window.location.reload();
  };

  // Periodic & Realtime check to verify if the account is still valid (password hasn't changed, subscription hasn't expired)
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const verifySession = async () => {
      const savedPassword = window.localStorage.getItem('sportscode_current_password') || '';
      
      // If Supabase is active, check the cloud DB
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('team_accounts')
            .select('*')
            .eq('id', currentUser)
            .single();

          if (!error && data) {
            const isNormalPassValid = data.password === savedPassword;
            const isTempPassValid = data.temp_password 
              && data.temp_password === savedPassword 
              && data.temp_password_expires_at 
              && new Date(data.temp_password_expires_at).getTime() > Date.now();

            if ((!isNormalPassValid && !isTempPassValid) || !data.is_active) {
              // Remote password changed or account deactivated -> Silent logout
              handleForceLogout(null);
            }
          }
        } catch (err) {
          console.warn("Session verification check failed:", err);
        }
      } else {
        // Local simulation: Check usersDb
        const user = usersDb[currentUser];
        if (user && user.password !== savedPassword) {
          handleForceLogout(null);
        }
      }
    };

    // Run verification immediately on mount
    verifySession();

    // 1. Check every 5 seconds for fast fallback
    const interval = setInterval(verifySession, 5000);

    // 2. Check immediately when window gains focus or tab becomes visible
    const handleFocus = () => verifySession();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Supabase Realtime Subscription for instant (sub-second) force logout across devices
    let subscriptionChannel: any = null;
    if (supabase) {
      try {
        subscriptionChannel = supabase
          .channel(`realtime_account_watch_${currentUser}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'team_accounts',
              filter: `id=eq.${currentUser}`
            },
            (payload) => {
              const newPassword = payload.new?.password;
              const newIsActive = payload.new?.is_active;
              const savedPassword = window.localStorage.getItem('sportscode_current_password') || '';
              if (newPassword !== savedPassword || !newIsActive) {
                // Silent logout: return cleanly to login screen without notifications
                handleForceLogout(null);
              }
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime subscription failed:', e);
      }
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (subscriptionChannel && supabase) {
        supabase.removeChannel(subscriptionChannel);
      }
    };
  }, [isLoggedIn, currentUser, usersDb]);

  const [isCodeWindow, setIsCodeWindow] = useState(() => window.location.hash === '#code');

  useEffect(() => {
    const handleHashChange = () => {
      setIsCodeWindow(window.location.hash === '#code');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Broadcast Channel setup for multi-window communication
  const channelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    channelRef.current = new BroadcastChannel('sportscode_multiwindow_sync');
    return () => {
      channelRef.current?.close();
    };
  }, []);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(() => localStorage.getItem('sportscode_last_video_name') || null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => {
    const savedTime = localStorage.getItem('sportscode_last_video_time');
    return savedTime ? parseFloat(savedTime) : 0;
  });



  // Teams names state
  const [teamAName, setTeamAName] = useState(() => localStorage.getItem('sportscode_teama_name') || '');
  const [teamBName, setTeamBName] = useState(() => localStorage.getItem('sportscode_teamb_name') || '');
  const [teamAColor, setTeamAColor] = useState(() => localStorage.getItem('sportscode_teama_color') || 'amber');
  const [teamBColor, setTeamBColor] = useState(() => localStorage.getItem('sportscode_teamb_color') || 'sky');

  // Game date state: manually set game date for tagging session (stored as YYYY-MM-DD)
  const [gameDate, setGameDate] = useState<string>(() => localStorage.getItem('sportscode_game_date') || '');

  // Global Toast Notification State
  const [globalToast, setGlobalToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setGlobalToast(message);
    toastTimeoutRef.current = setTimeout(() => {
      setGlobalToast(null);
    }, 2800);
  };

  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('sportscode_players') || localStorage.getItem('sportscode_designer_roster');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse saved players", e);
      }
    }
    return INITIAL_PLAYERS;
  });

  // Load roster from Supabase Cloud DB for the current logged-in team (Account-wide Sync)
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;
    let isMounted = true;
    (async () => {
      if (supabase) {
        const { data, error } = await supabase
          .from('team_players')
          .select('*')
          .eq('team_id', currentUser);
        if (!error && data && data.length > 0 && isMounted) {
          const cloudPlayers: Player[] = data.map((p: any, idx: number) => ({
            id: p.id,
            name: p.name,
            number: p.number || '',
            hotkey: idx < 9 ? (idx + 1).toString() : '-',
            teamName: currentUser,
            hand: (p.hand as 'R' | 'L' | 'S') || 'R',
            throws: (p.throws as 'R' | 'L') || 'R',
            bats: (p.bats as 'R' | 'L' | 'S') || 'R',
            positionType: (p.position as 'batter' | 'pitcher' | 'both') || 'pitcher'
          }));
          setPlayers(cloudPlayers);
        }
      }
    })();
    return () => { isMounted = false; };
  }, [isLoggedIn, currentUser]);

  const updatePlayersAndSync = useCallback((newPlayers: Player[] | ((prev: Player[]) => Player[])) => {
    setPlayers((prev: Player[]) => {
      const next = typeof newPlayers === 'function' ? newPlayers(prev) : newPlayers;
      if (currentUser && supabase) {
        // Sync to cloud in background
        (async () => {
          try {
            await supabase.from('team_players').delete().eq('team_id', currentUser);
            if (next.length > 0) {
              const payload = next.map(p => ({
                id: p.id,
                team_id: currentUser,
                name: p.name,
                number: p.number || '',
                position: p.positionType || 'pitcher',
                throws: p.throws || 'R',
                bats: p.bats || 'R',
                hand: p.hand || 'R',
                updated_at: new Date().toISOString()
              }));
              await supabase.from('team_players').insert(payload);
            }
          } catch {}
        })();
      }
      return next;
    });
  }, [currentUser]);
  const [buttons, setButtons] = useState<ButtonConfig[]>(() => {
    const saved = localStorage.getItem('sportscode_designer_layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(b => b && typeof b.name === 'string' && typeof b.type === 'string')) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved layout", e);
      }
    }
    return BASEBALL_TEMPLATE;
  });

  const [activePresetName, setActivePresetName] = useState<'baseball' | 'football' | 'blank'>(() => {
    const layoutType = localStorage.getItem('sportscode_preset_name');
    return (layoutType as 'baseball' | 'football' | 'blank') || 'baseball';
  });

  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    const saved = localStorage.getItem('sportscode_custom_presets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Failed to parse custom presets", e);
      }
    }
    return [
      { id: 'preset_p1', name: 'パターン 1 (デフォルト)', buttons: BASEBALL_TEMPLATE }
    ];
  });

  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [activePlayerIdA, setActivePlayerIdA] = useState<string | null>(null);
  const [activePlayerIdB, setActivePlayerIdB] = useState<string | null>(null);
  const [events, setEvents] = useState<TaggedEvent[]>(() => {
    try {
      const saved = localStorage.getItem('SVA_LIVE_EVENTS_V1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse saved events", e);
    }
    return [];
  });

  // 🛡️ 誤リロード・離脱防止 (BeforeUnload Prevention)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (events.length > 0 || videoUrl) {
        e.preventDefault();
        e.returnValue = '作業中のタグ付け・動画データがあります。ページを離脱しますか？';
        return '作業中のタグ付け・動画データがあります。ページを離脱しますか？';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [events.length, videoUrl]);

  // 💾 セッション状態の自動退避
  useEffect(() => {
    if (videoName) {
      localStorage.setItem('sportscode_last_video_name', videoName);
      localStorage.setItem('sportscode_last_video_time', currentTime.toString());
    }
    if (events.length > 0) {
      try {
        localStorage.setItem('sportscode_events_backup', JSON.stringify(events));
      } catch (e) {
        console.warn('LocalStorage events backup quota exceeded', e);
      }
    }
  }, [videoName, currentTime, events]);
  const [, setEventsUndoStack] = useState<TaggedEvent[][]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeEventName, setActiveEventName] = useState<string | null>(null);

  const pushEventsUndo = (currentEvents: TaggedEvent[]) => {
    const clone = JSON.parse(JSON.stringify(currentEvents));
    setEventsUndoStack(prev => {
      const next = [...prev, clone];
      if (next.length > 50) next.shift();
      return next;
    });
  };

  // Event selection and right-click tag context menu state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; eventId: string; activeGroup?: string } | null>(null);
  const [activeSubmenuGroup, setActiveSubmenuGroup] = useState<{ groupName: string; top: number; left: number } | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxSelectRect, setBoxSelectRect] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Global mouseup listener so box selection rubberband frame dismisses instantly when mouse is released
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsBoxSelecting(false);
      setBoxSelectRect(null);
    };
    if (isBoxSelecting) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isBoxSelecting]);

  // App View Mode State: 'tagger' | 'analytics' | 'organizer' | 'matrix' | 'live_tagger' | 'ai_receiver'
  const [currentView, setCurrentView] = useState<'tagger' | 'analytics' | 'organizer' | 'matrix' | 'live_tagger' | 'ai_receiver'>('tagger');

  // Live Roster Accordion Open State
  const [isLiveRosterOpen, setIsLiveRosterOpen] = useState(false);

  // Pitch Speed Calculator / Keypad State (球速入力テンキー)
  const [pitchSpeedInput, setPitchSpeedInput] = useState<string>('');

  // Live Timer Mode (For tagging without video file loaded)
  const [isLiveTimerRunning, setIsLiveTimerRunning] = useState(false);
  const [liveTimerSeconds, setLiveTimerSeconds] = useState(0);

  useEffect(() => {
    let timerId: any = null;
    if ((!videoUrl || currentView === 'live_tagger') && isLiveTimerRunning) {
      timerId = setInterval(() => {
        setLiveTimerSeconds(prev => prev + 0.1);
      }, 100);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [videoUrl, isLiveTimerRunning, currentView]);

  // Timeline zoom & timeshift sync states
  const [timelineZoom, setTimelineZoom] = useState(100);
  const [isTimeShiftModalOpen, setIsTimeShiftModalOpen] = useState(false);
  const [timeShiftOffset, setTimeShiftOffset] = useState('');
  const [timeShiftTarget, setTimeShiftTarget] = useState<'all' | 'selected'>('all');



  // Timeline multi-selection state
  const [timelineSelectedIds, setTimelineSelectedIds] = useState<Set<string>>(new Set());

  const handleUndo = useCallback(() => {
    setEventsUndoStack(prevStack => {
      if (prevStack.length === 0) return prevStack;
      const nextStack = [...prevStack];
      const prevEvents = nextStack.pop()!;
      setEvents(prevEvents);
      channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: prevEvents });
      return nextStack;
    });
  }, []);

  const handleBatchDeleteSelectedEvents = () => {
    if (timelineSelectedIds.size === 0) return;
    pushEventsUndo(events); // Save state for Cmd+Z undo
    setEvents(prev => {
      const next = prev.filter(ev => !timelineSelectedIds.has(ev.id));
      channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: next });
      return next;
    });
    setTimelineSelectedIds(new Set());
  };

  // Delete / Backspace key listener & Cmd+Z / Ctrl+Z Undo listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Cmd+Z (Mac) or Ctrl+Z (Windows) for Undo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Delete / Backspace key for Mass Deletion without confirmation dialog
      if ((e.key === 'Delete' || e.key === 'Backspace') && timelineSelectedIds.size > 0) {
        e.preventDefault();
        handleBatchDeleteSelectedEvents();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timelineSelectedIds, handleUndo, events]);

  // Matrix/Timeline Popup Player Modal states
  const [matrixPlayerClips, setMatrixPlayerClips] = useState<TaggedEvent[]>([]);
  const [matrixPlayerTitle, setMatrixPlayerTitle] = useState('');
  const [isMatrixPlayerOpen, setIsMatrixPlayerOpen] = useState(false);

  // Organizer States (Integrated to App.tsx)
  const [activeOrganizerTab, setActiveOrganizerTab] = useState<'grid' | 'organizer'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportMode, setExportMode] = useState<'individual' | 'combined'>('individual');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [activePreviewClip, setActivePreviewClip] = useState<TaggedEvent | null>(null);
  const [nowPlayingClipId, setNowPlayingClipId] = useState<string | null>(null);

  // Timeline track ordering & drag sorting states
  const [timelineTrackOrder, setTimelineTrackOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('timeline_track_order');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [draggedTrackName, setDraggedTrackName] = useState<string | null>(null);
  const [dragOverTrackName, setDragOverTrackName] = useState<string | null>(null);

  // Tab-specific playback states to preserve currentTime across views
  const [taggerTime, setTaggerTime] = useState(0);
  const [organizerTime, setOrganizerTime] = useState(0);
  const [isTaggerPlaying, setIsTaggerPlaying] = useState(false);
  const [isOrganizerPlaying, setIsOrganizerPlaying] = useState(false);
  const [prePreviewTime, setPrePreviewTime] = useState<number | null>(null);

  // Ordered playlist of selected events for organizer skip-playback
  const orderedSelectedClips = useMemo(() => {
    return events
      .filter((ev: TaggedEvent) => selectedIds.has(ev.id))
      .sort((a, b) => a.startTime - b.startTime);
  }, [events, selectedIds]);

  // Scoreboard State
  const [balls, setBalls] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [outs, setOuts] = useState(0);

  // Baseball Metadata State
  const [pitcherA, setPitcherA] = useState('');
  const [pitcherB, setPitcherB] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [plottedHit, setPlottedHit] = useState<{ x: number, y: number } | null>(null);
  const [coursePerspective, setCoursePerspective] = useState<'pitcher' | 'catcher'>('catcher');

  // Keyboard Hotkey Mode lock
  const [hotkeysEnabled, setHotkeysEnabled] = useState(true);

  // Pre-selected label buttons state
  const [preSelectedLabels, setPreSelectedLabels] = useState<string[]>([]);

  // Inning & Runners State
  const [inningNum, setInningNum] = useState(1);
  const [inningHalf, setInningHalf] = useState<'top' | 'bottom'>('top');
  const [runner1BId, setRunner1BId] = useState('');
  const [runner2BId, setRunner2BId] = useState('');
  const [runner3BId, setRunner3BId] = useState('');

  // Team A (Home) Defenders (when Home is defending, which is bottom/裏 of the inning)
  const [catcherIdA, setCatcherIdA] = useState('');
  const [inf1IdA, setInf1IdA] = useState('');
  const [inf2IdA, setInf2IdA] = useState('');
  const [inf3IdA, setInf3IdA] = useState('');
  const [inf4IdA, setInf4IdA] = useState('');
  const [lfIdA, setLfIdA] = useState('');
  const [cfIdA, setCfIdA] = useState('');
  const [rfIdA, setRfIdA] = useState('');
  const [defenseA, setDefenseA] = useState('');
  const [dhIdA, setDhIdA] = useState('');

  // Team B (Away) Defenders (when Away is defending, which is top/表 of the inning)
  const [catcherIdB, setCatcherIdB] = useState('');
  const [inf1IdB, setInf1IdB] = useState('');
  const [inf2IdB, setInf2IdB] = useState('');
  const [inf3IdB, setInf3IdB] = useState('');
  const [inf4IdB, setInf4IdB] = useState('');
  const [lfIdB, setLfIdB] = useState('');
  const [cfIdB, setCfIdB] = useState('');
  const [rfIdB, setRfIdB] = useState('');
  const [defenseB, setDefenseB] = useState('');
  const [dhIdB, setDhIdB] = useState('');

  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const handleTriggerButtonFromSyncRef = useRef<any>(null);
  const isMetadataLoadedRef = useRef<boolean>(false);
  const hasRestoredMatchContextRef = useRef<boolean>(false);

  // Sync layout buttons to localStorage and other windows
  const saveLayout = (newLayout: ButtonConfig[]) => {
    setButtons(newLayout);
    localStorage.setItem('sportscode_designer_layout', JSON.stringify(newLayout));
    channelRef.current?.postMessage({ type: 'SYNC_BUTTONS', buttons: newLayout });
  };

  // アプリ起動時の試合コンテキスト自動復元 (初回マウント時最優先)
  useEffect(() => {
    if (isCodeWindow) return;
    try {
      const saved = localStorage.getItem('SVA_MATCH_CONTEXT_V1');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.pitcherA) setPitcherA(data.pitcherA);
        if (data.pitcherB) setPitcherB(data.pitcherB);

        if (data.catcherIdA) setCatcherIdA(data.catcherIdA);
        if (data.inf1IdA) setInf1IdA(data.inf1IdA);
        if (data.inf2IdA) setInf2IdA(data.inf2IdA);
        if (data.inf3IdA) setInf3IdA(data.inf3IdA);
        if (data.inf4IdA) setInf4IdA(data.inf4IdA);
        if (data.lfIdA) setLfIdA(data.lfIdA);
        if (data.cfIdA) setCfIdA(data.cfIdA);
        if (data.rfIdA) setRfIdA(data.rfIdA);
        if (data.dhIdA) setDhIdA(data.dhIdA);
        if (data.defenseA) setDefenseA(data.defenseA);

        if (data.catcherIdB) setCatcherIdB(data.catcherIdB);
        if (data.inf1IdB) setInf1IdB(data.inf1IdB);
        if (data.inf2IdB) setInf2IdB(data.inf2IdB);
        if (data.inf3IdB) setInf3IdB(data.inf3IdB);
        if (data.inf4IdB) setInf4IdB(data.inf4IdB);
        if (data.lfIdB) setLfIdB(data.lfIdB);
        if (data.cfIdB) setCfIdB(data.cfIdB);
        if (data.rfIdB) setRfIdB(data.rfIdB);
        if (data.dhIdB) setDhIdB(data.dhIdB);
        if (data.defenseB) setDefenseB(data.defenseB);

        if (data.inningNum) setInningNum(data.inningNum);
        if (data.inningHalf) setInningHalf(data.inningHalf);
        if (typeof data.balls === 'number') setBalls(data.balls);
        if (typeof data.strikes === 'number') setStrikes(data.strikes);
        if (typeof data.outs === 'number') setOuts(data.outs);
        if (data.runner1BId) setRunner1BId(data.runner1BId);
        if (data.runner2BId) setRunner2BId(data.runner2BId);
        if (data.runner3BId) setRunner3BId(data.runner3BId);
        if (data.activePlayerId) setActivePlayerId(data.activePlayerId);
      }
    } catch (e) {
      console.error('Failed to restore match context:', e);
    } finally {
      hasRestoredMatchContextRef.current = true;
    }
  }, [isCodeWindow]);

  // 試合中の守備位置・試合進行状態・打順コンテキストの localStorage リアルタイム自動保存 (復元後のみ保存実行)
  useEffect(() => {
    if (isCodeWindow || !hasRestoredMatchContextRef.current) return;
    const matchContext = {
      pitcherA, pitcherB,
      catcherIdA, inf1IdA, inf2IdA, inf3IdA, inf4IdA, lfIdA, cfIdA, rfIdA, dhIdA, defenseA,
      catcherIdB, inf1IdB, inf2IdB, inf3IdB, inf4IdB, lfIdB, cfIdB, rfIdB, dhIdB, defenseB,
      inningNum, inningHalf,
      balls, strikes, outs,
      runner1BId, runner2BId, runner3BId,
      activePlayerId,
    };
    localStorage.setItem('SVA_MATCH_CONTEXT_V1', JSON.stringify(matchContext));
  }, [
    pitcherA, pitcherB,
    catcherIdA, inf1IdA, inf2IdA, inf3IdA, inf4IdA, lfIdA, cfIdA, rfIdA, dhIdA, defenseA,
    catcherIdB, inf1IdB, inf2IdB, inf3IdB, inf4IdB, lfIdB, cfIdB, rfIdB, dhIdB, defenseB,
    inningNum, inningHalf,
    balls, strikes, outs,
    runner1BId, runner2BId, runner3BId,
    activePlayerId,
    isCodeWindow
  ]);

  // 打刻イベント (events) の localStorage リアルタイム自動保存 (リロードやクラッシュ対策)
  useEffect(() => {
    if (isCodeWindow) return;
    localStorage.setItem('SVA_LIVE_EVENTS_V1', JSON.stringify(events));
  }, [events, isCodeWindow]);

  const handleActivePresetChange = (name: 'baseball' | 'football' | 'blank') => {
    setActivePresetName(name);
    localStorage.setItem('sportscode_preset_name', name);
    channelRef.current?.postMessage({ type: 'SYNC_PRESET_NAME', name });
  };

  // Monitor video playback time (Main Window only)
  useEffect(() => {
    if (isCodeWindow) return;

    let interval: ReturnType<typeof setInterval>;
    if (videoUrl && videoPlayerRef.current) {
      interval = setInterval(() => {
        if (videoPlayerRef.current) {
          const videoElement = document.querySelector('video');
          if (videoElement && videoElement.duration) {
            setVideoDuration(videoElement.duration);
          }
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [videoUrl, videoName, isCodeWindow]);

  // Synchronize Active Event Name and ID back to Code Window whenever activeEventId changes
  useEffect(() => {
    if (isCodeWindow) return;
    const activeEv = events.find(ev => ev.id === activeEventId);
    channelRef.current?.postMessage({ 
      type: 'SET_ACTIVE_EVENT', 
      name: activeEv ? activeEv.actionName : null 
    });
    channelRef.current?.postMessage({ 
      type: 'SYNC_ACTIVE_EVENT_ID', 
      id: activeEventId 
    });
  }, [activeEventId, events, isCodeWindow]);

  const arePlayersEqual = (listA: Player[], listB: Player[]) => {
    if (!listA || !listB) return false;
    if (listA.length !== listB.length) return false;
    return listA.every((p, idx) => {
      const target = listB[idx];
      if (!target) return false;
      return p.id === target.id &&
             p.name === target.name &&
             p.number === target.number &&
             p.teamName === target.teamName &&
             p.throws === target.throws &&
             p.bats === target.bats &&
             p.battingOrder === target.battingOrder;
    });
  };

  // Multi-window Message Synchronization listeners using mutable callback ref to prevent sync loop recreation
  const handleMessageRef = useRef<((e: MessageEvent) => void) | null>(null);

  handleMessageRef.current = (e: MessageEvent) => {
    const data = e.data;
    if (!data) return;

    const channel = channelRef.current;
    if (!channel) return;

    if (isCodeWindow) {
      // CODE WINDOW: Listen to Main Window sync messages
      switch (data.type) {
        case 'SYNC_PLAYERS':
          setPlayers(prev => {
            if (arePlayersEqual(prev, data.players)) return prev;
            return data.players;
          });
          break;
        case 'SYNC_BUTTONS': setButtons(data.buttons); break;
        case 'SYNC_PRESET_NAME': setActivePresetName(data.name); break;
        case 'SYNC_CUSTOM_PRESETS': setCustomPresets(data.presets); break;
        case 'SYNC_ACTIVE_PRESET_ID': if (data.id) localStorage.setItem('sportscode_active_preset_id', data.id); break;
        case 'SET_ACTIVE_EVENT': setActiveEventName(data.name); break;
        case 'SYNC_ACTIVE_EVENT_ID': setActiveEventId(data.id); break;
        case 'SYNC_SCOREBOARD':
          setBalls(data.balls);
          setStrikes(data.strikes);
          setOuts(data.outs);
          break;
        case 'SYNC_ACTIVE_PLAYER': setActivePlayerId(data.activePlayerId); break;
        case 'SYNC_TEAMA_NAME': setTeamAName(data.value); break;
        case 'SYNC_TEAMB_NAME': setTeamBName(data.value); break;
        case 'SYNC_TEAMA_COLOR': setTeamAColor(data.value); break;
        case 'SYNC_TEAMB_COLOR': setTeamBColor(data.value); break;
        case 'SYNC_BASEBALL_METADATA':
          setPitcherA(data.pitcherA);
          setPitcherB(data.pitcherB);
          setSelectedCourse(data.selectedCourse);
          setPlottedHit(data.plottedHit);
          setCoursePerspective(data.coursePerspective);
          setHotkeysEnabled(data.hotkeysEnabled);
          setPreSelectedLabels(data.preSelectedLabels || []);

          // New states
          setInningNum(data.inningNum);
          setInningHalf(data.inningHalf);
          setRunner1BId(data.runner1BId);
          setRunner2BId(data.runner2BId);
          setRunner3BId(data.runner3BId);
          setCatcherIdA(data.catcherIdA);
          setCatcherIdB(data.catcherIdB);
          setInf1IdA(data.inf1IdA);
          setInf1IdB(data.inf1IdB);
          setInf2IdA(data.inf2IdA);
          setInf2IdB(data.inf2IdB);
          setInf3IdA(data.inf3IdA);
          setInf3IdB(data.inf3IdB);
          setInf4IdA(data.inf4IdA);
          setInf4IdB(data.inf4IdB);
          setLfIdA(data.lfIdA);
          setLfIdB(data.lfIdB);
          setCfIdA(data.cfIdA);
          setCfIdB(data.cfIdB);
          setRfIdA(data.rfIdA);
          setRfIdB(data.rfIdB);
          setDefenseA(data.defenseA);
          setDefenseB(data.defenseB);
          setDhIdA(data.dhIdA || '');
          setDhIdB(data.dhIdB || '');
          break;
        case 'SYNC_USER_LOGGED_IN':
        case 'SYNC_USER_LOGGED_OUT':
          window.location.reload();
          break;
      }
    } else {
      // MAIN WINDOW: Listen to Code Window tagging actions
      switch (data.type) {
        case 'UPDATE_PITCH_SPEED':
          setPitchSpeedInput(data.value);
          if (data.value) {
            const formattedVal = data.value.endsWith('km/h') ? data.value : `${data.value}km/h`;
            const targetId = selectedEventId || activeEventId;
            if (targetId) {
              setEvents(prevEvents =>
                prevEvents.map(ev => {
                  if (ev.id === targetId) {
                    return {
                      ...ev,
                      labels: {
                        ...ev.labels,
                        '球速': formattedVal,
                        'Pitch Speed': formattedVal,
                        'PITCH_SPEED': formattedVal
                      }
                    };
                  }
                  return ev;
                })
              );
            }
          }
          break;
        case 'TOGGLE_PLAY':
          if (videoPlayerRef.current) {
            videoPlayerRef.current.togglePlay();
          }
          break;
        case 'TRIGGER_BUTTON':
          handleTriggerButtonFromSync(
            data.btn, data.activePlayerId, data.balls, data.strikes, data.outs,
            data.pitcher, data.defense, data.selectedCourse, data.plottedHit, data.coursePerspective,
            data.inningNum, data.inningHalf, data.runner1BId, data.runner2BId, data.runner3BId,
            data.catcherId, data.inf1Id, data.inf2Id, data.inf3Id, data.inf4Id,
            data.lfId, data.cfId, data.rfId,
            data.activeEventId || undefined
          );
          break;
        case 'TRIGGER_BUTTON_VIA_HOTKEY':
          if (!hotkeysEnabled) break;
          const matchedBtn = buttons.find(btn => btn.hotkey === data.hotkey);
          if (matchedBtn) {
            // Resolve active pitcher and defenders locally based on target player team / inning half
            const activePlayerObj = players.find(p => p.id === activePlayerId);
            const isTeamAActive = activePlayerObj?.teamName === teamAName;
            const isTeamBActive = activePlayerObj?.teamName === teamBName;
            const activePitcher = isTeamAActive 
              ? pitcherB 
              : isTeamBActive 
                ? pitcherA 
                : (pitcherA || pitcherB || '');

            const activeCatcherId = inningHalf === 'top' ? catcherIdA : catcherIdB;
            const activeSSId = inningHalf === 'top' ? inf1IdA : inf1IdB;
            const active2BId = inningHalf === 'top' ? inf2IdA : inf2IdB;
            const active3BId = inningHalf === 'top' ? inf3IdA : inf3IdB;
            const active1BId = inningHalf === 'top' ? inf4IdA : inf4IdB;
            const activeLFId = inningHalf === 'top' ? lfIdA : lfIdB;
            const activeCFId = inningHalf === 'top' ? cfIdA : cfIdB;
            const activeRFId = inningHalf === 'top' ? rfIdA : rfIdB;
            const activeDefenseNotes = inningHalf === 'top' ? defenseA : defenseB;

            handleTriggerButtonFromSync(
              matchedBtn, activePlayerId, balls, strikes, outs,
              activePitcher, activeDefenseNotes, selectedCourse, plottedHit, coursePerspective,
              inningNum, inningHalf, runner1BId, runner2BId, runner3BId, activeCatcherId, activeSSId, active2BId, active3BId, active1BId,
              activeLFId, activeCFId, activeRFId,
              activeEventId || undefined
            );
          }
          break;
        case 'UPDATE_SCOREBOARD':
          setBalls(data.balls);
          setStrikes(data.strikes);
          setOuts(data.outs);
          break;
        case 'UPDATE_ACTIVE_PLAYER':
          setActivePlayerId(data.activePlayerId);
          break;
        case 'UPDATE_TEAMA_NAME':
          if (!isCodeWindow) {
            handleUpdateTeamAName(data.value);
          } else {
            setTeamAName(data.value);
          }
          break;
        case 'UPDATE_TEAMB_NAME':
          if (!isCodeWindow) {
            handleUpdateTeamBName(data.value);
          } else {
            setTeamBName(data.value);
          }
          break;
        case 'UPDATE_TEAMA_COLOR': setTeamAColor(data.value); break;
        case 'UPDATE_TEAMB_COLOR': setTeamBColor(data.value); break;
        
        case 'UPDATE_PITCHERA': setPitcherA(data.value); break;
        case 'UPDATE_PITCHERB': setPitcherB(data.value); break;
        case 'UPDATE_DEFENSE':
          if (inningHalf === 'top') setDefenseA(data.value);
          else setDefenseB(data.value);
          break;
        case 'UPDATE_COURSE': setSelectedCourse(data.value); break;
        case 'UPDATE_PLOTTED_HIT': setPlottedHit(data.value); break;
        case 'UPDATE_PERSPECTIVE': setCoursePerspective(data.value); break;
        case 'UPDATE_HOTKEYS_ENABLED': setHotkeysEnabled(data.value); break;
        case 'UPDATE_PRESELECTED_LABELS': setPreSelectedLabels(data.value); break;

        // New update cases from Code Window
        case 'UPDATE_INNING_NUM': setInningNum(data.value); break;
        case 'UPDATE_INNING_HALF': setInningHalf(data.value); break;
        case 'UPDATE_RUNNER1B_ID': setRunner1BId(data.value); break;
        case 'UPDATE_RUNNER2B_ID': setRunner2BId(data.value); break;
        case 'UPDATE_RUNNER3B_ID': setRunner3BId(data.value); break;
        case 'UPDATE_CATCHER_ID':
          if ((data.inningHalf || inningHalf) === 'top') setCatcherIdA(data.value);
          else setCatcherIdB(data.value);
          break;
        case 'UPDATE_INF1_ID':
          if ((data.inningHalf || inningHalf) === 'top') setInf1IdA(data.value);
          else setInf1IdB(data.value);
          break;
        case 'UPDATE_INF2_ID':
          if ((data.inningHalf || inningHalf) === 'top') setInf2IdA(data.value);
          else setInf2IdB(data.value);
          break;
        case 'UPDATE_INF3_ID':
          if ((data.inningHalf || inningHalf) === 'top') setInf3IdA(data.value);
          else setInf3IdB(data.value);
          break;
        case 'UPDATE_INF4_ID':
          if ((data.inningHalf || inningHalf) === 'top') setInf4IdA(data.value);
          else setInf4IdB(data.value);
          break;
        case 'UPDATE_LF_ID':
          if ((data.inningHalf || inningHalf) === 'top') setLfIdA(data.value);
          else setLfIdB(data.value);
          break;
        case 'UPDATE_CF_ID':
          if ((data.inningHalf || inningHalf) === 'top') setCfIdA(data.value);
          else setCfIdB(data.value);
          break;
        case 'UPDATE_RF_ID':
          if ((data.inningHalf || inningHalf) === 'top') setRfIdA(data.value);
          else setRfIdB(data.value);
          break;
        case 'UPDATE_DH_ID':
          if ((data.inningHalf || inningHalf) === 'top') setDhIdA(data.value);
          else setDhIdB(data.value);
          break;

        // Sync cases from Code Window back to Main Window
        case 'SYNC_CUSTOM_PRESETS':
          setCustomPresets(data.presets);
          localStorage.setItem('sportscode_custom_presets', JSON.stringify(data.presets));
          break;
        case 'SYNC_ACTIVE_PRESET_ID':
          localStorage.setItem('sportscode_active_preset_id', data.id);
          break;
        case 'SYNC_BUTTONS':
          setButtons(data.buttons);
          localStorage.setItem('sportscode_designer_layout', JSON.stringify(data.buttons));
          break;
        case 'UPDATE_PLAYERS':
          setPlayers(prev => {
            if (arePlayersEqual(prev, data.players)) return prev;
            return data.players;
          });
          break;

        case 'REQUEST_SYNC_ON_LOAD':
          // Read absolute latest saved values from localStorage to prevent sending stale memory state!
          const latestCustomPresets = (() => {
            try {
              const s = localStorage.getItem('sportscode_custom_presets');
              if (s) return JSON.parse(s);
            } catch {}
            return customPresets;
          })();
          const latestActivePresetId = localStorage.getItem('sportscode_active_preset_id') || '';

          channel.postMessage({ type: 'SYNC_PLAYERS', players });
          channel.postMessage({ type: 'SYNC_BUTTONS', buttons });
          channel.postMessage({ type: 'SYNC_PRESET_NAME', name: activePresetName });
          channel.postMessage({ type: 'SYNC_CUSTOM_PRESETS', presets: latestCustomPresets });
          channel.postMessage({ type: 'SYNC_ACTIVE_PRESET_ID', id: latestActivePresetId });
          channel.postMessage({ type: 'SYNC_SCOREBOARD', balls, strikes, outs });
          channel.postMessage({ type: 'SYNC_ACTIVE_PLAYER', activePlayerId });
          channel.postMessage({ type: 'SYNC_TEAMA_NAME', value: teamAName });
          channel.postMessage({ type: 'SYNC_TEAMB_NAME', value: teamBName });
          channel.postMessage({ type: 'SYNC_TEAMA_COLOR', value: teamAColor });
          channel.postMessage({ type: 'SYNC_TEAMB_COLOR', value: teamBColor });
          channel.postMessage({
            type: 'SYNC_BASEBALL_METADATA',
            pitcherA, pitcherB, selectedCourse, plottedHit, coursePerspective, hotkeysEnabled, preSelectedLabels,
            inningNum, inningHalf, runner1BId, runner2BId, runner3BId,
            catcherIdA, catcherIdB, inf1IdA, inf1IdB, inf2IdA, inf2IdB, inf3IdA, inf3IdB, inf4IdA, inf4IdB,
            lfIdA, lfIdB, cfIdA, cfIdB, rfIdA, rfIdB,
            defenseA, defenseB, dhIdA, dhIdB
          });
          break;
        case 'SYNC_USER_LOGGED_IN':
        case 'SYNC_USER_LOGGED_OUT':
          window.location.reload();
          break;
      }
    }
  };

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;

    const handleMessage = (e: MessageEvent) => {
      handleMessageRef.current?.(e);
    };

    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
    };
  }, []);

  // One-time REQUEST_SYNC_ON_LOAD trigger from Code Window on mount
  useEffect(() => {
    if (isCodeWindow) {
      const timer = setTimeout(() => {
        channelRef.current?.postMessage({ type: 'REQUEST_SYNC_ON_LOAD' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isCodeWindow]);

  // Synchronize Player, Scoreboard, Layout updates from Main Window to Code Window
  useEffect(() => {
    if (isCodeWindow) return;
    channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players });
  }, [players, isCodeWindow]);

  // Save players state to localStorage automatically on update (on Main Window)
  useEffect(() => {
    if (isCodeWindow) return;
    localStorage.setItem('sportscode_players', JSON.stringify(players));
    localStorage.setItem('sportscode_designer_roster', JSON.stringify(players));
    if (videoName) {
      localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(players));
    }
  }, [players, videoName, isCodeWindow]);

  // Save global team settings on changes (Main Window only)
  useEffect(() => {
    if (isCodeWindow) return;
    localStorage.setItem('sportscode_teama_name', teamAName);
    localStorage.setItem('sportscode_teamb_name', teamBName);
    localStorage.setItem('sportscode_teama_color', teamAColor);
    localStorage.setItem('sportscode_teamb_color', teamBColor);
  }, [teamAName, teamBName, teamAColor, teamBColor, isCodeWindow]);

  // Send UPDATE_PLAYERS message to Main Window when updated on Code Window
  useEffect(() => {
    if (!isCodeWindow) return;
    channelRef.current?.postMessage({ type: 'UPDATE_PLAYERS', players });
  }, [players, isCodeWindow]);

  useEffect(() => {
    if (isCodeWindow) return;
    channelRef.current?.postMessage({ type: 'SYNC_SCOREBOARD', balls, strikes, outs });
  }, [balls, strikes, outs, isCodeWindow]);

  useEffect(() => {
    if (isCodeWindow) return;
    channelRef.current?.postMessage({ type: 'SYNC_ACTIVE_PLAYER', activePlayerId });
  }, [activePlayerId, isCodeWindow]);

  // Restore current team's active batter when inning switches (Top: Team A, Bottom: Team B)
  useEffect(() => {
    if (isCodeWindow) return;
    if (inningHalf === 'top') {
      setActivePlayerId(activePlayerIdA);
    } else {
      setActivePlayerId(activePlayerIdB);
    }
  }, [inningHalf, isCodeWindow]);

  // Save changes to activePlayerId to the corresponding team A/B storage
  useEffect(() => {
    if (isCodeWindow) return;
    if (inningHalf === 'top') {
      setActivePlayerIdA(activePlayerId);
    } else {
      setActivePlayerIdB(activePlayerId);
    }
  }, [activePlayerId, inningHalf, isCodeWindow]);

  useEffect(() => {
    if (isCodeWindow) return;
    channelRef.current?.postMessage({ type: 'SYNC_TEAMA_NAME', value: teamAName });
  }, [teamAName, isCodeWindow]);

  useEffect(() => {
    if (isCodeWindow) return;
    channelRef.current?.postMessage({ type: 'SYNC_TEAMB_NAME', value: teamBName });
  }, [teamBName, isCodeWindow]);

  useEffect(() => {
    if (isCodeWindow) return;
    channelRef.current?.postMessage({
      type: 'SYNC_BASEBALL_METADATA',
      pitcherA, pitcherB, selectedCourse, plottedHit, coursePerspective, hotkeysEnabled, preSelectedLabels,
      inningNum, inningHalf, runner1BId, runner2BId, runner3BId,
      catcherIdA, catcherIdB, inf1IdA, inf1IdB, inf2IdA, inf2IdB, inf3IdA, inf3IdB, inf4IdA, inf4IdB,
      lfIdA, lfIdB, cfIdA, cfIdB, rfIdA, rfIdB,
      defenseA, defenseB, dhIdA, dhIdB
    });
  }, [pitcherA, pitcherB, selectedCourse, plottedHit, coursePerspective, hotkeysEnabled, preSelectedLabels, isCodeWindow, inningNum, inningHalf, runner1BId, runner2BId, runner3BId, catcherIdA, catcherIdB, inf1IdA, inf1IdB, inf2IdA, inf2IdB, inf3IdA, inf3IdB, inf4IdA, inf4IdB, lfIdA, lfIdB, cfIdA, cfIdB, rfIdA, rfIdB, defenseA, defenseB, dhIdA, dhIdB]);

  // Keep timelineTrackOrder populated with any new actionNames found in events
  useEffect(() => {
    const uniqueTracks = Array.from(new Set(events.map(e => e.actionName)));
    setTimelineTrackOrder(prev => {
      const next = [...prev];
      let changed = false;
      uniqueTracks.forEach(t => {
        if (!next.includes(t)) {
          next.push(t);
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem('timeline_track_order', JSON.stringify(next));
      }
      return next;
    });
  }, [events]);

  // Global Keyboard hotkey listener (Main Window only)
  useEffect(() => {
    if (isCodeWindow) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Check if keyboard hotkeys are globally disabled/locked
      if (!hotkeysEnabled) return;

      const toHalfWidth = (str: string) => {
        return str.replace(/[！-～]/g, (r) => String.fromCharCode(r.charCodeAt(0) - 0xFEE0))
                  .replace(/　/g, ' ');
      };
      const rawKey = e.key.toLowerCase();
      const key = toHalfWidth(rawKey);

      // Space: play/pause
      if (e.code === 'Space' && !(e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/i)) {
        e.preventDefault();
        if (videoPlayerRef.current) {
          videoPlayerRef.current.togglePlay();
        }
      }

      // ArrowLeft / ArrowRight: Frame step (0.1s back / forward)
      if (e.key === 'ArrowLeft' && !(e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/i)) {
        e.preventDefault();
        const video = videoPlayerRef.current?.getVideoElement();
        if (video) {
          video.currentTime = Math.max(0, video.currentTime - 0.1);
        }
      }
      if (e.key === 'ArrowRight' && !(e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/i)) {
        e.preventDefault();
        const video = videoPlayerRef.current?.getVideoElement();
        if (video) {
          video.currentTime = Math.min(video.duration || 99999, video.currentTime + 0.1);
        }
      }

      // Cmd+Z or Ctrl+Z: Undo Event Deletion / Event Tag changes
      const isCmdZ = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z';
      if (isCmdZ) {
        e.preventDefault();
        setEventsUndoStack(prevStack => {
          if (prevStack.length === 0) return prevStack;
          const nextStack = [...prevStack];
          const prevEvents = nextStack.pop()!;
          setEvents(prevEvents);
          channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: prevEvents });
          return nextStack;
        });
        return;
      }

      // Backspace or Delete key: If an event is selected, delete that selected event! If not, delete last tagged event
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        pushEventsUndo(events);
        if (selectedEventId) {
          setEvents(prev => {
            const next = prev.filter(ev => ev.id !== selectedEventId);
            channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: next });
            return next;
          });
          setSelectedEventId(null);
        } else {
          setEvents(prev => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated.shift();
            channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: updated });
            return updated;
          });
          setActiveEventId(null);
        }
        return;
      }

      const matchedBtn = buttons.find(btn => btn.hotkey === key);
      if (matchedBtn) {
        e.preventDefault();

        // Flash the button in the canvas (broadcast to CodeWindowDesigner)
        try {
          const flashCh = new BroadcastChannel('sportscode_multiwindow_sync');
          flashCh.postMessage({ type: 'FLASH_BUTTON_BY_HOTKEY', hotkey: key });
          flashCh.close();
        } catch (_) {}

        // Resolve active pitcher and defenders locally based on target player team / inning half
        const activePlayerObj = players.find(p => p.id === activePlayerId);
        const isTeamAActive = activePlayerObj?.teamName === teamAName;
        const isTeamBActive = activePlayerObj?.teamName === teamBName;
        const activePitcher = isTeamAActive 
          ? pitcherB 
          : isTeamBActive 
            ? pitcherA 
            : (pitcherA || pitcherB || '');

        const activeCatcherId = inningHalf === 'top' ? catcherIdA : catcherIdB;
        const activeSSId = inningHalf === 'top' ? inf1IdA : inf1IdB;
        const active2BId = inningHalf === 'top' ? inf2IdA : inf2IdB;
        const active3BId = inningHalf === 'top' ? inf3IdA : inf3IdB;
        const active1BId = inningHalf === 'top' ? inf4IdA : inf4IdB;
        const activeLFId = inningHalf === 'top' ? lfIdA : lfIdB;
        const activeCFId = inningHalf === 'top' ? cfIdA : cfIdB;
        const activeRFId = inningHalf === 'top' ? rfIdA : rfIdB;
        const activeDefenseNotes = inningHalf === 'top' ? defenseA : defenseB;

        handleTriggerButtonFromSyncRef.current(
          matchedBtn, activePlayerId, balls, strikes, outs,
          activePitcher, activeDefenseNotes, selectedCourse, plottedHit, coursePerspective,
          inningNum, inningHalf, runner1BId, runner2BId, runner3BId, activeCatcherId, activeSSId, active2BId, active3BId, active1BId,
          activeLFId, activeCFId, activeRFId
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [players, buttons, activePlayerId, activeEventId, balls, strikes, outs, pitcherA, pitcherB, selectedCourse, plottedHit, coursePerspective, hotkeysEnabled, isCodeWindow, inningNum, inningHalf, runner1BId, runner2BId, runner3BId, catcherIdA, catcherIdB, inf1IdA, inf1IdB, inf2IdA, inf2IdB, inf3IdA, inf3IdB, inf4IdA, inf4IdB, lfIdA, lfIdB, cfIdA, cfIdB, rfIdA, rfIdB, defenseA, defenseB, teamAName, teamBName, events, selectedEventId]);

  // --- Organizer export and preview utility functions (Integrated to App.tsx) ---
  const exportClipBrowser = async (clip: TaggedEvent, index: number) => {
    const video = videoPlayerRef.current?.getVideoElement();
    if (!video || !videoUrl) return;
    
    video.pause();
    
    setExportProgress(`クリップ ${index + 1} (${clip.actionName}) を抽出中...`);

    try {
      video.currentTime = clip.startTime;
      await new Promise((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve(null);
        };
        video.addEventListener('seeked', onSeeked);
      });

      // @ts-ignore
      const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream ? video.mozCaptureStream() : null;
      if (!stream) throw new Error("このブラウザ・環境はビデオキャプチャに対応していません。");

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

      const recordingPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/mp4' }));
      });

      recorder.start();
      video.play().catch(() => {});
      
      const durationMs = (clip.endTime - clip.startTime) * 1000;
      await new Promise((resolve) => setTimeout(resolve, durationMs));

      video.pause();
      recorder.stop();
      
      const fileBlob = await recordingPromise;
      const downloadUrl = URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `clip_${index + 1}_${clip.playerName || 'pitch'}_${clip.labels['Result'] || 'out'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
      setExportProgress(null);
    } catch (err: any) {
      console.error(err);
      alert(`切り出しエラー: ${err.message || err}`);
      setExportProgress(null);
    }
  };

  const exportClipsCombinedBrowser = async (clips: TaggedEvent[]) => {
    const video = videoPlayerRef.current?.getVideoElement();
    if (!video || !videoUrl || clips.length === 0) return;
    
    video.pause();
    setExportProgress(`全 ${clips.length} 件を結合したダイジェスト動画を生成中...`);

    try {
      // @ts-ignore
      const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream ? video.mozCaptureStream() : null;
      if (!stream) throw new Error("このブラウザ・環境はビデオキャプチャに対応していません。");

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

      const recordingPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/mp4' }));
      });

      recorder.start();

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        setExportProgress(`ダイジェスト動画録画中: ${i + 1}/${clips.length} (${clip.actionName})`);
        
        video.currentTime = clip.startTime;
        await new Promise((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve(null);
          };
          video.addEventListener('seeked', onSeeked);
        });

        video.play().catch(() => {});
        const clipDurationMs = (clip.endTime - clip.startTime) * 1000;
        await new Promise((resolve) => setTimeout(resolve, clipDurationMs));
        video.pause();
      }

      recorder.stop();
      const combinedBlob = await recordingPromise;
      const downloadUrl = URL.createObjectURL(combinedBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `combined_digest_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setExportProgress(null);
    } catch (err: any) {
      console.error(err);
      alert(`結合エクスポートエラー: ${err.message || err}`);
      setExportProgress(null);
    }
  };

  const handleExportSelectedClips = async () => {
    const list = events.filter(ev => selectedIds.has(ev.id)).sort((a, b) => a.startTime - b.startTime);
    if (list.length === 0) return;
    
    if (exportMode === 'combined') {
      await exportClipsCombinedBrowser(list);
    } else {
      for (let i = 0; i < list.length; i++) {
        await exportClipBrowser(list[i], i);
      }
    }
  };

  const handleGenerateFFmpegScript = () => {
    const selectedClips = events.filter(ev => selectedIds.has(ev.id)).sort((a, b) => a.startTime - b.startTime);
    if (selectedClips.length === 0) {
      alert("FFmpegスクリプトを生成するには、グリッド上でタグ行を選択（チェック）してください。");
      return;
    }

    const scriptName = videoName ? videoName.substring(0, videoName.lastIndexOf('.')) : 'video';
    const originalVideoPath = videoName || 'input.mp4';
    
    let content = `#!/bin/bash\n# Sportscode Baseball Clips Lossless Sorter Export Script\n`;
    content += `echo "-----------------------------------------------"\n`;
    content += `echo "Sportscode Elite: FFmpeg 無劣化クリップ切り出しを開始します"\n`;
    content += `echo "元動画: ${originalVideoPath}"\n`;
    content += `echo "-----------------------------------------------"\n\n`;
    content += `mkdir -p clips_output\n\n`;

    const concatFileList: string[] = [];
    selectedClips.forEach((ev, idx) => {
      const clipDuration = ev.endTime - ev.startTime;
      const cleanPlayer = (ev.playerName || 'unassigned').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanResult = (ev.labels['Result'] || 'pitch').toString().replace(/[^a-zA-Z0-9_-]/g, '_');
      const outputName = `clips_output/clip_${idx + 1}_${cleanPlayer}_${cleanResult}.mp4`;
      
      content += `ffmpeg -y -ss ${ev.startTime.toFixed(2)} -i "${originalVideoPath}" -t ${clipDuration.toFixed(2)} -c copy "${outputName}"\n`;
      concatFileList.push(outputName);
    });

    content += `\n# --- 結合用ダイジェストビデオの作成 ---\n`;
    content += `echo "クリップの切り出し完了。次にダイジェスト動画を結合します..."\n`;
    content += `cat << 'EOF' > clips_output/concat_list.txt\n`;
    concatFileList.forEach(file => {
      content += `file '${file.replace('clips_output/', '')}'\n`;
    });
    content += `EOF\n\n`;
    content += `ffmpeg -y -f concat -safe 0 -i clips_output/concat_list.txt -c copy "clips_output/digest_combined_${scriptName}.mp4"\n\n`;
    content += `echo "すべて完了しました！ clips_output フォルダをご確認ください。"\n`;

    logAccessEvent(currentUser || 'guest', 'VIDEO_EXPORT', 'success', { clipCount: selectedClips.length, videoName: originalVideoPath });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `lossless_ffmpeg_export_${scriptName}.command`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  const handlePreviewClip = (clip: TaggedEvent) => {
    const video = videoPlayerRef.current?.getVideoElement();
    if (video) {
      if (prePreviewTime === null) {
        setPrePreviewTime(video.currentTime);
      }
      setActivePreviewClip(clip);
      try {
        if (video.readyState >= 1) {
          video.currentTime = clip.startTime;
        }
      } catch {}
      video.play().catch(() => {});
    }
  };

  const handleOpenMatrixPlayer = (clips: TaggedEvent[], title: string) => {
    const video = videoPlayerRef.current?.getVideoElement();
    if (video) {
      video.pause();
    }
    setMatrixPlayerClips(clips);
    setMatrixPlayerTitle(title);
    setIsMatrixPlayerOpen(true);
  };


  const handleViewChange = (newView: 'tagger' | 'analytics' | 'organizer' | 'matrix' | 'live_tagger' | 'ai_receiver') => {
    try {
      const video = videoPlayerRef.current?.getVideoElement();
      if (video) {
        if (currentView === 'tagger') {
          setTaggerTime(video.currentTime);
          setIsTaggerPlaying(!video.paused);
        } else if (currentView === 'organizer') {
          setOrganizerTime(video.currentTime);
          setIsOrganizerPlaying(!video.paused);
        }

        video.pause();

        const targetTime = newView === 'tagger' ? taggerTime : newView === 'organizer' ? organizerTime : 0;
        const targetPlaying = newView === 'tagger' ? isTaggerPlaying : newView === 'organizer' ? isOrganizerPlaying : false;

        setActivePreviewClip(null);
        setPrePreviewTime(null);

        if (video.readyState >= 1) {
          video.currentTime = targetTime;
        }
        setCurrentTime(targetTime);

        if (targetPlaying && newView !== 'analytics') {
          setTimeout(() => {
            const v = videoPlayerRef.current?.getVideoElement();
            if (v) v.play().catch(() => {});
          }, 50);
        }
      }
    } catch (err) {
      console.warn("Error seeking in handleViewChange:", err);
    }
    setCurrentView(newView);
  };

  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll playhead tracking based on time and zoom level
  useEffect(() => {
    const container = timelineScrollRef.current;
    if (!container || timelineZoom === 100) return;
    const totalD = Math.max(videoDuration, 60);
    const ratio = currentTime / totalD;
    const playheadX = ratio * (container.scrollWidth - 112) + 112; // 112px is track header width
    const targetScroll = playheadX - container.clientWidth / 2;
    container.scrollLeft = targetScroll;
  }, [currentTime, timelineZoom, videoDuration]);

  // Non-passive wheel event listener for trackpad pinch zoom guestures
  useEffect(() => {
    const container = timelineScrollRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 50 : -50;
        setTimelineZoom(prev => Math.max(100, Math.min(2000, prev + zoomDelta)));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleApplyTimeShift = async () => {
    const offset = parseFloat(timeShiftOffset);
    if (isNaN(offset)) return;

    const targetIds = timeShiftTarget === 'selected' ? timelineSelectedIds : new Set(events.map(e => e.id));
    if (targetIds.size === 0) return;

    const updatedEvents = events.map(ev => {
      if (targetIds.has(ev.id)) {
        const nextStart = Math.max(0, ev.startTime + offset);
        const nextEnd = Math.max(0.1, ev.endTime + offset);
        return { ...ev, startTime: nextStart, endTime: nextEnd };
      }
      return ev;
    });

    setEvents(updatedEvents);
    setIsTimeShiftModalOpen(false);
    setTimeShiftOffset('');

    // Broadcast update
    channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: updatedEvents });

    // Sync changes to Supabase
    if (supabase && videoName) {
      for (const ev of updatedEvents) {
        if (targetIds.has(ev.id)) {
          await syncEventToSupabase(ev);
        }
      }
    }
  };

  const syncEventToSupabase = async (ev: TaggedEvent) => {
    if (!supabase || !videoName) return;
    try {
      await supabase.from('events').upsert({
        id: ev.id,
        video_name: videoName,
        action_name: ev.actionName,
        start_time: ev.startTime,
        end_time: ev.endTime,
        player_name: ev.playerName || null,
        labels: ev.labels,
        owner: currentUser || null
      });
    } catch (err) {
      console.warn("Supabase upsert failed:", err);
    }
  };

  const deleteEventFromSupabase = async (id: string) => {
    if (!supabase) return;
    try {
      await supabase.from('events').delete().eq('id', id);
    } catch (err) {
      console.warn("Supabase delete failed:", err);
    }
  };

  // Automatically load events from Supabase or LocalStorage on video load
  useEffect(() => {
    if (!videoName) return;
    if (isCodeWindow) return;

    const loadData = async () => {
      isMetadataLoadedRef.current = false;
      let hasLoadedEvents = false;

      if (supabase) {
        try {
          let query = supabase
            .from('events')
            .select('*')
            .eq('video_name', videoName);
          
          if (currentUser) {
            query = query.eq('owner', currentUser);
          }

          const { data, error } = await query;

          if (!error && data) {
            const loaded: TaggedEvent[] = data.map(d => ({
              id: d.id,
              actionName: d.action_name,
              startTime: d.start_time,
              endTime: d.end_time,
              playerName: d.player_name || undefined,
              labels: d.labels || {},
              timestamp: d.start_time,
              actionId: '',
              color: 'emerald',
              createdAt: d.created_at ? new Date(d.created_at).getTime() : Date.now()
            }));
            setEvents(loaded);
            channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: loaded });
            hasLoadedEvents = true;
          }
        } catch (err) {
          console.warn("Supabase load failed, falling back to LocalStorage:", err);
        }
      }

      if (!hasLoadedEvents) {
        try {
          const saved = localStorage.getItem(`sportscode_tags_${videoName}`);
          if (saved) {
            const loaded = JSON.parse(saved);
            setEvents(loaded);
            channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: loaded });
          } else {
            setEvents([]);
            channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: [] });
          }
        } catch {}
      }

      // Load video-specific roster
      let activeRoster: Player[] = [];
      try {
        const savedRoster = localStorage.getItem(`sportscode_players_${videoName}`);
        if (savedRoster) {
          const loadedRoster: Player[] = JSON.parse(savedRoster);

          // Migrate battingOrder values from any older rosters that may have them set
          // (matches by player name across all stored rosters)
          const allKnownPlayers: Player[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sportscode_players') || key === 'sportscode_designer_roster')) {
              try {
                const val = localStorage.getItem(key);
                if (val) {
                  const list: Player[] = JSON.parse(val);
                  if (Array.isArray(list)) {
                    list.forEach(p => {
                      if (p && p.name && p.battingOrder !== undefined) {
                        allKnownPlayers.push(p);
                      }
                    });
                  }
                }
              } catch {}
            }
          }

          const healedRoster = loadedRoster.map(p => {
            if (p.battingOrder !== undefined) return p; // Already has order
            const known = allKnownPlayers.find(k => k.name === p.name && k.teamName === p.teamName && k.battingOrder !== undefined);
            if (known) return { ...p, battingOrder: known.battingOrder };
            return p;
          });

          setPlayers(healedRoster);
          activeRoster = healedRoster;
          // Persist healed roster
          localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(healedRoster));
          channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: healedRoster });
        } else {
          if (videoName && players.length > 0) {
            localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(players));
            activeRoster = players;
          }
        }
      } catch {}

      // Helper to automatically heal saved IDs to names
      const healId = (id: string): string => {
        if (!id) return '';
        if (!id.startsWith('p_')) return id; // Already a name or empty

        // 1. Try to find in the active roster loaded for this video
        const p1 = activeRoster.find(p => p.id === id);
        if (p1) return p1.name;

        // 2. Try to find in any other players list in localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sportscode_players') || key === 'sportscode_designer_roster')) {
            try {
              const val = localStorage.getItem(key);
              if (val) {
                const list = JSON.parse(val);
                if (Array.isArray(list)) {
                  const p2 = list.find((p: any) => p && p.id === id);
                  if (p2 && p2.name) return p2.name;
                }
              }
            } catch {}
          }
        }
        return id; // Fallback
      };

      // Load video-specific baseball metadata
      try {
        const savedMetadata = localStorage.getItem(`sportscode_metadata_${videoName}`);
        if (savedMetadata) {
          const m = JSON.parse(savedMetadata);
          const hPitcherA = healId(m.pitcherA || '');
          const hPitcherB = healId(m.pitcherB || '');
          const hCatcherA = healId(m.catcherIdA || '');
          const hCatcherB = healId(m.catcherIdB || '');
          const hInf1A = healId(m.inf1IdA || '');
          const hInf1B = healId(m.inf1IdB || '');
          const hInf2A = healId(m.inf2IdA || '');
          const hInf2B = healId(m.inf2IdB || '');
          const hInf3A = healId(m.inf3IdA || '');
          const hInf3B = healId(m.inf3IdB || '');
          const hInf4A = healId(m.inf4IdA || '');
          const hInf4B = healId(m.inf4IdB || '');
          const hLfA = healId(m.lfIdA || '');
          const hLfB = healId(m.lfIdB || '');
          const hCfA = healId(m.cfIdA || '');
          const hCfB = healId(m.cfIdB || '');
          const hRfA = healId(m.rfIdA || '');
          const hRfB = healId(m.rfIdB || '');
          const hDhA = healId(m.dhIdA || '');
          const hDhB = healId(m.dhIdB || '');

          setPitcherA(hPitcherA);
          setPitcherB(hPitcherB);
          setInningNum(m.inningNum || 1);
          setInningHalf(m.inningHalf || 'top');
          setRunner1BId(m.runner1BId || '');
          setRunner2BId(m.runner2BId || '');
          setRunner3BId(m.runner3BId || '');
          setCatcherIdA(hCatcherA);
          setCatcherIdB(hCatcherB);
          setInf1IdA(hInf1A);
          setInf1IdB(hInf1B);
          setInf2IdA(hInf2A);
          setInf2IdB(hInf2B);
          setInf3IdA(hInf3A);
          setInf3IdB(hInf3B);
          setInf4IdA(hInf4A);
          setInf4IdB(hInf4B);
          setLfIdA(hLfA);
          setLfIdB(hLfB);
          setCfIdA(hCfA);
          setCfIdB(hCfB);
          setRfIdA(hRfA);
          setRfIdB(hRfB);
          setDhIdA(hDhA);
          setDhIdB(hDhB);
          setDefenseA(m.defenseA || '');
          setDefenseB(m.defenseB || '');
          setBalls(m.balls || 0);
          setStrikes(m.strikes || 0);
          setOuts(m.outs || 0);

          if (m.teamAName) {
            setTeamAName(m.teamAName);
            channelRef.current?.postMessage({ type: 'UPDATE_TEAMA_NAME', value: m.teamAName });
          }
          if (m.teamBName) {
            setTeamBName(m.teamBName);
            channelRef.current?.postMessage({ type: 'UPDATE_TEAMB_NAME', value: m.teamBName });
          }
          if (m.teamAColor) {
            setTeamAColor(m.teamAColor);
            channelRef.current?.postMessage({ type: 'UPDATE_TEAMA_COLOR', value: m.teamAColor });
          }
          if (m.teamBColor) {
            setTeamBColor(m.teamBColor);
            channelRef.current?.postMessage({ type: 'UPDATE_TEAMB_COLOR', value: m.teamBColor });
          }

          channelRef.current?.postMessage({
            type: 'SYNC_BASEBALL_METADATA',
            pitcherA: hPitcherA, pitcherB: hPitcherB,
            selectedCourse: '', plottedHit: null, coursePerspective: 'catcher', hotkeysEnabled, preSelectedLabels: [],
            inningNum: m.inningNum || 1, inningHalf: m.inningHalf || 'top',
            runner1BId: m.runner1BId || '', runner2BId: m.runner2BId || '', runner3BId: m.runner3BId || '',
            catcherIdA: hCatcherA, catcherIdB: hCatcherB,
            inf1IdA: hInf1A, inf1IdB: hInf1B,
            inf2IdA: hInf2A, inf2IdB: hInf2B,
            inf3IdA: hInf3A, inf3IdB: hInf3B,
            inf4IdA: hInf4A, inf4IdB: hInf4B,
            lfIdA: hLfA, lfIdB: hLfB,
            cfIdA: hCfA, cfIdB: hCfB,
            rfIdA: hRfA, rfIdB: hRfB,
            defenseA: m.defenseA || '', defenseB: m.defenseB || '',
            dhIdA: hDhA, dhIdB: hDhB
          });
          channelRef.current?.postMessage({
            type: 'SYNC_SCOREBOARD',
            balls: m.balls || 0, strikes: m.strikes || 0, outs: m.outs || 0
          });
        } else {
          // Initialize/Reset video metadata
          setPitcherA(''); setPitcherB('');
          setInningNum(1); setInningHalf('top');
          setRunner1BId(''); setRunner2BId(''); setRunner3BId('');
          setCatcherIdA(''); setCatcherIdB('');
          setInf1IdA(''); setInf1IdB('');
          setInf2IdA(''); setInf2IdB('');
          setInf3IdA(''); setInf3IdB('');
          setInf4IdA(''); setInf4IdB('');
          setLfIdA(''); setLfIdB('');
          setCfIdA(''); setCfIdB('');
          setRfIdA(''); setRfIdB('');
          setDhIdA(''); setDhIdB('');
          setDefenseA(''); setDefenseB('');
          setBalls(0); setStrikes(0); setOuts(0);
          setTeamAName('');
          setTeamBName('');
          setTeamAColor('#e0e0e0');
          setTeamBColor('#e0e0e0');
          channelRef.current?.postMessage({ type: 'UPDATE_TEAMA_NAME', value: '' });
          channelRef.current?.postMessage({ type: 'UPDATE_TEAMB_NAME', value: '' });
          channelRef.current?.postMessage({ type: 'UPDATE_TEAMA_COLOR', value: '#e0e0e0' });
          channelRef.current?.postMessage({ type: 'UPDATE_TEAMB_COLOR', value: '#e0e0e0' });

          channelRef.current?.postMessage({
            type: 'SYNC_BASEBALL_METADATA',
            pitcherA: '', pitcherB: '',
            selectedCourse: '', plottedHit: null, coursePerspective: 'catcher', hotkeysEnabled, preSelectedLabels: [],
            inningNum: 1, inningHalf: 'top',
            runner1BId: '', runner2BId: '', runner3BId: '',
            catcherIdA: '', catcherIdB: '',
            inf1IdA: '', inf1IdB: '', inf2IdA: '', inf2IdB: '', inf3IdA: '', inf3IdB: '', inf4IdA: '', inf4IdB: '',
            lfIdA: '', lfIdB: '', cfIdA: '', cfIdB: '', rfIdA: '', rfIdB: '',
            defenseA: '', defenseB: '', dhIdA: '', dhIdB: ''
          });
          channelRef.current?.postMessage({
            type: 'SYNC_SCOREBOARD',
            balls: 0, strikes: 0, outs: 0
          });
        }
      } catch {}
      isMetadataLoadedRef.current = true;
    };

    loadData();
  }, [videoName]);

  // Save video-specific baseball metadata on changes (Main Window only)
  useEffect(() => {
    if (isCodeWindow || !videoName) return;
    if (!isMetadataLoadedRef.current) return; // Prevent overwriting existing storage during load
    const metadata = {
      pitcherA, pitcherB, inningNum, inningHalf, runner1BId, runner2BId, runner3BId,
      catcherIdA, catcherIdB, inf1IdA, inf1IdB, inf2IdA, inf2IdB, inf3IdA, inf3IdB, inf4IdA, inf4IdB,
      lfIdA, lfIdB, cfIdA, cfIdB, rfIdA, rfIdB,
      defenseA, defenseB, dhIdA, dhIdB,
      balls, strikes, outs,
      teamAName, teamBName, teamAColor, teamBColor
    };
    localStorage.setItem(`sportscode_metadata_${videoName}`, JSON.stringify(metadata));
  }, [
    pitcherA, pitcherB, inningNum, inningHalf, runner1BId, runner2BId, runner3BId,
    catcherIdA, catcherIdB, inf1IdA, inf1IdB, inf2IdA, inf2IdB, inf3IdA, inf3IdB, inf4IdA, inf4IdB,
    lfIdA, lfIdB, cfIdA, cfIdB, rfIdA, rfIdB,
    defenseA, defenseB, dhIdA, dhIdB,
    balls, strikes, outs,
    teamAName, teamBName, teamAColor, teamBColor,
    videoName, isCodeWindow
  ]);

  // Save video-specific event tags on changes (Main Window only)
  useEffect(() => {
    if (isCodeWindow || !videoName) return;
    if (!isMetadataLoadedRef.current) return; // Prevent overwriting existing storage during load
    localStorage.setItem(`sportscode_tags_${videoName}`, JSON.stringify(events));
  }, [events, videoName, isCodeWindow]);

  // Automatically save players roster (locally and video-specifically) on changes
  useEffect(() => {
    if (isCodeWindow) return;
    localStorage.setItem('sportscode_designer_roster', JSON.stringify(players));
    localStorage.setItem('sportscode_players', JSON.stringify(players));
    if (videoName) {
      localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(players));
    }
  }, [players, videoName, isCodeWindow]);

  const updatePlayerHandednessHistory = (name: string, throws?: 'R' | 'L', bats?: 'R' | 'L' | 'S', csvName?: string) => {
    try {
      const saved = localStorage.getItem('sportscode_player_handedness_history');
      const history = saved ? JSON.parse(saved) : {};
      const key = name.trim().toLowerCase();
      const finalKey = csvName ? `${csvName.trim().toLowerCase()}___${key}` : key;
      history[finalKey] = {
        throws: throws || history[finalKey]?.throws || 'R',
        bats: bats || history[finalKey]?.bats || 'R'
      };
      localStorage.setItem('sportscode_player_handedness_history', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to update handedness history", e);
    }
  };

  const getHandednessFromHistory = (name: string, fallbackThrows: 'R' | 'L' = 'R', fallbackBats: 'R' | 'L' | 'S' = 'R', csvName?: string) => {
    try {
      const saved = localStorage.getItem('sportscode_player_handedness_history');
      if (saved) {
        const history = JSON.parse(saved);
        const key = name.trim().toLowerCase();
        
        if (csvName) {
          const csvKey = `${csvName.trim().toLowerCase()}___${key}`;
          if (history[csvKey]) {
            return {
              throws: (history[csvKey].throws || fallbackThrows) as 'R' | 'L',
              bats: (history[csvKey].bats || fallbackBats) as 'R' | 'L' | 'S',
              hand: (history[csvKey].bats || fallbackBats) as 'R' | 'L' | 'S'
            };
          }
        }
        
        if (history[key]) {
          return {
            throws: (history[key].throws || fallbackThrows) as 'R' | 'L',
            bats: (history[key].bats || fallbackBats) as 'R' | 'L' | 'S',
            hand: (history[key].bats || fallbackBats) as 'R' | 'L' | 'S'
          };
        }
      }
    } catch {}
    return { throws: fallbackThrows, bats: fallbackBats, hand: fallbackBats };
  };

  const handleVideoLoaded = (file: File, url: string) => {
    setVideoUrl(url);
    setVideoName(file.name);
    setVideoDuration(0);
    handleViewChange('tagger');
    showToast(`🎬 動画「${file.name}」を読み込みました`);
  };

  const handleAddPlayer = (
    name: string,
    number?: string,
    teamName?: string,
    throws: 'R' | 'L' = 'R',
    bats: 'R' | 'L' | 'S' = 'R',
    positionType: 'batter' | 'pitcher' | 'both' = 'batter',
    battingOrder?: number
  ) => {
    const nextNum = (players.length + 1).toString();
    const newPlayer: Player = {
      id: `p_${Date.now()}`,
      name,
      number,
      hotkey: players.length < 9 ? nextNum : '-',
      teamName: teamName || teamAName,
      hand: throws,
      throws,
      bats,
      positionType,
      battingOrder
    };
    updatePlayerHandednessHistory(name, throws, bats);
    const updated = [...players, newPlayer];
    updatePlayersAndSync(updated);
    if (videoName) {
      localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(updated));
    } else {
      localStorage.setItem('sportscode_designer_roster', JSON.stringify(updated));
    }
    channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: updated });
  };

  const handleDeletePlayer = (id: string) => {
    const updated = players.filter(p => p.id !== id);
    updatePlayersAndSync(updated);
    channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: updated });
    if (activePlayerId === id) {
      setActivePlayerId(null);
    }
  };

  const handleUpdateTeamAName = (newVal: string) => {
    const oldVal = teamAName;
    setTeamAName(newVal);
    channelRef.current?.postMessage({ type: 'UPDATE_TEAMA_NAME', value: newVal });

    updatePlayersAndSync(prev => {
      const updated = prev.map(p => {
        if (p.teamName === oldVal) {
          return { ...p, teamName: newVal };
        }
        return p;
      });
      if (videoName) {
        localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(updated));
      } else {
        localStorage.setItem('sportscode_designer_roster', JSON.stringify(updated));
      }
      channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: updated });
      return updated;
    });
  };

  const handleUpdateTeamBName = (newVal: string) => {
    const oldVal = teamBName;
    setTeamBName(newVal);
    channelRef.current?.postMessage({ type: 'UPDATE_TEAMB_NAME', value: newVal });

    updatePlayersAndSync(prev => {
      const updated = prev.map(p => {
        if (p.teamName === oldVal) {
          return { ...p, teamName: newVal };
        }
        return p;
      });
      if (videoName) {
        localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(updated));
      } else {
        localStorage.setItem('sportscode_designer_roster', JSON.stringify(updated));
      }
      channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: updated });
      return updated;
    });
  };

  const handleClearRoster = () => {
    updatePlayersAndSync([]);
    if (videoName) {
      localStorage.removeItem(`sportscode_players_${videoName}`);
    } else {
      localStorage.removeItem('sportscode_designer_roster');
    }
    channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: [] });
  };

  // Button config updates
  const handleAddButton = (btn: ButtonConfig) => {
    setButtons(prev => {
      const next = [...prev, btn];
      localStorage.setItem('sportscode_designer_layout', JSON.stringify(next));
      channelRef.current?.postMessage({ type: 'SYNC_BUTTONS', buttons: next });
      return next;
    });
  };

  const handleUpdateButton = (updatedBtn: ButtonConfig) => {
    setButtons(prev => {
      const next = prev.map(btn => btn.id === updatedBtn.id ? updatedBtn : btn);
      localStorage.setItem('sportscode_designer_layout', JSON.stringify(next));
      channelRef.current?.postMessage({ type: 'SYNC_BUTTONS', buttons: next });
      return next;
    });
  };

  const handleDeleteButton = (id: string) => {
    setButtons(prev => {
      const next = prev.filter(btn => btn.id !== id);
      localStorage.setItem('sportscode_designer_layout', JSON.stringify(next));
      channelRef.current?.postMessage({ type: 'SYNC_BUTTONS', buttons: next });
      return next;
    });
  };

  const handleUpdateButtons = (updatedBtns: ButtonConfig[]) => {
    setButtons(updatedBtns);
    localStorage.setItem('sportscode_designer_layout', JSON.stringify(updatedBtns));
    channelRef.current?.postMessage({ type: 'SYNC_BUTTONS', buttons: updatedBtns });
  };

  const handleUpdatePlayerHand = (id: string, hand: 'R' | 'L' | 'S') => {
    updatePlayersAndSync(prev => {
      const next = prev.map(p => {
        if (p.id === id) {
          updatePlayerHandednessHistory(p.name, hand === 'S' ? 'R' : hand, hand, p.sourceCsvName);
          return { ...p, hand, throws: hand === 'S' ? 'R' : hand, bats: hand };
        }
        return p;
      });
      if (videoName) {
        localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(next));
      } else {
        localStorage.setItem('sportscode_designer_roster', JSON.stringify(next));
      }
      channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: next });
      return next;
    });
  };

  const handleUpdatePlayerThrows = (id: string, throws: 'R' | 'L') => {
    updatePlayersAndSync(prev => {
      const next = prev.map(p => {
        if (p.id === id) {
          updatePlayerHandednessHistory(p.name, throws, p.bats, p.sourceCsvName);
          return { ...p, throws };
        }
        return p;
      });
      if (videoName) {
        localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(next));
      } else {
        localStorage.setItem('sportscode_designer_roster', JSON.stringify(next));
      }
      channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: next });
      return next;
    });
  };

  const handleUpdatePlayerBats = (id: string, bats: 'R' | 'L' | 'S') => {
    updatePlayersAndSync(prev => {
      const next = prev.map(p => {
        if (p.id === id) {
          updatePlayerHandednessHistory(p.name, p.throws, bats, p.sourceCsvName);
          return { ...p, bats };
        }
        return p;
      });
      if (videoName) {
        localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(next));
      } else {
        localStorage.setItem('sportscode_designer_roster', JSON.stringify(next));
      }
      channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: next });
      return next;
    });
  };

  const handleUpdatePlayerBattingOrder = (id: string, order: number | undefined) => {
    updatePlayersAndSync(prev => {
      const targetPlayer = prev.find(p => p.id === id);
      const next = prev.map(p => {
        if (p.id === id) {
          return { ...p, battingOrder: order };
        }
        // Clear battingOrder if another player in the same team has it to prevent duplicates
        if (targetPlayer && p.teamName === targetPlayer.teamName && p.battingOrder === order && order !== undefined) {
          return { ...p, battingOrder: undefined };
        }
        return p;
      });
      if (videoName) {
        localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(next));
      } else {
        localStorage.setItem('sportscode_designer_roster', JSON.stringify(next));
      }
      channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: next });
      return next;
    });
  };

  const handleTogglePlayerPosition = (id: string) => {
    updatePlayersAndSync(prev => {
      const next = prev.map(p => {
        if (p.id !== id) return p;
        let nextPos: 'batter' | 'pitcher' | 'both' = 'pitcher';
        if (p.positionType === 'pitcher') nextPos = 'both';
        else if (p.positionType === 'both') nextPos = 'batter';
        else nextPos = 'pitcher';
        return { ...p, positionType: nextPos };
      });
      channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: next });
      return next;
    });
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Revoke old URL to free GPU/RAM memory leaks
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }
    
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoName(file.name);
    setCurrentTime(0);
    setVideoDuration(0);
    e.target.value = '';
    handleViewChange('tagger');
    showToast(`🎬 動画「${file.name}」を読み込みました`);
  };

  const handleToggleEventTag = (eventId: string, groupKey: string, tagVal: string) => {
    pushEventsUndo(events);
    setEvents(prev => {
      const next = prev.map(ev => {
        if (ev.id !== eventId) return ev;
        const labels = { ...ev.labels };
        if (labels[groupKey] === tagVal) {
          delete labels[groupKey];
        } else {
          labels[groupKey] = tagVal;
        }
        const updated = { ...ev, labels };
        syncEventToSupabase(updated);
        return updated;
      });
      channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: next });
      return next;
    });
  };

  const handleDeleteSelectedEvent = (eventId: string) => {
    pushEventsUndo(events);
    setEvents(prev => {
      const next = prev.filter(ev => ev.id !== eventId);
      channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: next });
      return next;
    });
    if (selectedEventId === eventId) setSelectedEventId(null);
    setContextMenu(null);
    deleteEventFromSupabase(eventId);
  };

  const handleExportCSV = () => {
    if (events.length === 0) return;

    // Dynamically extract all unique groupNames defined in the buttons canvas, preserving their exact casing and characters
    const customGroups = Array.from(
      new Set(
        buttons
          .map(b => b.groupName)
          .filter((g): g is string => !!g && g.trim() !== '')
      )
    );

    const baseHeaders = [
      '投手名',
      '打者名',
      '回',
      '表・裏',
      'カウント',
      '攻撃チーム',
      '1塁ランナー',
      '2塁ランナー',
      '3塁ランナー',
      '得点',
      '打球X',
      '打球Y',
      '打', // Batter Handedness (R B / L B / S B)
      '投'  // Pitcher Handedness (R P / L P / S P)
    ];

    const headers = [...baseHeaders, ...customGroups];

    const rows = events.map(ev => {
      const batterName = ev.labels.Batter || '-';
      const count = ev.labels.Count || '-';
      const team = ev.labels.Team || '-';
      
      const runner1B = ev.labels['Runner 1B'] || 'None';
      const runner2B = ev.labels['Runner 2B'] || 'None';
      const runner3B = ev.labels['Runner 3B'] || 'None';

      let runs = '';
      const rbiVal = ev.labels.RBI || '';
      if (rbiVal.includes('1') || rbiVal.includes('１') || rbiVal.includes('1打点')) runs = '1';
      else if (rbiVal.includes('2') || rbiVal.includes('２') || rbiVal.includes('2打点')) runs = '2';
      else if (rbiVal.includes('3') || rbiVal.includes('３') || rbiVal.includes('3打点')) runs = '3';
      else if (rbiVal.includes('4') || rbiVal.includes('４') || rbiVal.includes('4打点')) runs = '4';

      const batterObj = players.find(p => p.name === batterName);
      const batterHand = batterObj?.hand === 'L' ? 'L B' : batterObj?.hand === 'S' ? 'S B' : 'R B';

      const pitcherName = ev.labels.Pitcher || ev.actionName || '-';
      const pitcherObj = players.find(p => p.name === pitcherName);
      const pitcherHand = pitcherObj?.hand === 'L' ? 'L P' : pitcherObj?.hand === 'S' ? 'S P' : 'R P';

      const hitPlotRaw = ev.labels.Hit_Plot || '';
      const hitPlotParts = hitPlotRaw.split(',');
      const hitPlotX = hitPlotParts[0]?.trim() || '-';
      const hitPlotY = hitPlotParts[1]?.trim() || '-';

      const inningNumVal = ev.labels.Inning_Num || (ev.labels.Inning ? (ev.labels.Inning.match(/(\d+)回/)?.[1] || '-') : '-');
      const inningHalfVal = ev.labels.Inning_Half || (ev.labels.Inning ? (ev.labels.Inning.includes('表') ? '表' : ev.labels.Inning.includes('裏') ? '裏' : '-') : '-');

      const row = [
        pitcherName,
        batterName,
        inningNumVal,
        inningHalfVal,
        count,
        team,
        runner1B,
        runner2B,
        runner3B,
        runs,
        hitPlotX,
        hitPlotY,
        batterHand,
        pitcherHand
      ];

      // Dynamically append values using exact groupName keys
      customGroups.forEach(group => {
        const val = ev.labels[group] || '-';
        row.push(val);
      });

      return row;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    logAccessEvent(currentUser || 'guest', 'CSV_EXPORT', 'success', { recordCount: events.length, fileName: `WBC_GameLog_${Date.now()}.csv` });
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `WBC_GameLog_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (events.length === 0) return;
    const dataStr = JSON.stringify(events, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sportscode_tags_${videoName ? videoName.substring(0, videoName.lastIndexOf('.')) : 'export'}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXML = () => {
    if (events.length === 0) return;
    const xmlRows = events.map(ev => `
      <instance>
        <ID>${ev.id}</ID>
        <start>${ev.startTime.toFixed(2)}</start>
        <end>${ev.endTime.toFixed(2)}</end>
        <code_name>${ev.actionName}</code_name>
        ${Object.entries(ev.labels).map(([k, v]) => `<label><category>${k}</category><text>${v}</text></label>`).join('')}
      </instance>`).join('');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<file>
  <ALL_INSTANCES>${xmlRows}
  </ALL_INSTANCES>
</file>`;

    const blob = new Blob([xmlContent], { type: 'text/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sportscode_tags_${gameDate || 'export'}.xml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as TaggedEvent[];
        if (Array.isArray(imported)) {
          setEvents(imported);
          channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: imported });
          if (supabase && videoName) {
            for (const ev of imported) {
              await syncEventToSupabase(ev);
            }
          }
          alert(`タグデータを正常に ${imported.length} 件インポートしました。`);
        }
      } catch (err) {
        alert("インポートに失敗しました。");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadTemplate = (type: 'baseball' | 'football' | 'blank') => {
    if (type === 'baseball') {
      saveLayout(BASEBALL_TEMPLATE);
      handleActivePresetChange('baseball');
    } else if (type === 'football') {
      saveLayout(FOOTBALL_TEMPLATE);
      handleActivePresetChange('football');
    } else {
      saveLayout([]);
      handleActivePresetChange('blank');
    }
    setEvents([]);
    setActiveEventId(null);
  };

  // Custom Button Layout Presets — Save / Load / Delete (Supports overwrite or new)
  const handleSaveCustomPreset = (name: string, targetId?: string, currentButtons?: ButtonConfig[]) => {
    const btnsToSave = (currentButtons && currentButtons.length > 0) ? currentButtons : buttons;
    const existing = customPresets.find(p => (targetId && p.id === targetId) || p.name === name);
    let next: CustomPreset[];
    let savedId = '';
    // Strip "(デフォルト)" suffix if updated by user so it displays cleanly as user's pattern
    const cleanName = name.replace(/\s*\(デフォルト\)/g, '');
    
    if (existing) {
      savedId = existing.id;
      next = customPresets.map(p => p.id === existing.id ? { ...p, name: cleanName, buttons: [...btnsToSave] } : p);
    } else {
      savedId = `preset_${Date.now()}`;
      const newPreset: CustomPreset = { id: savedId, name: cleanName, buttons: [...btnsToSave] };
      next = [...customPresets, newPreset];
    }
    
    setCustomPresets(next);
    setButtons(btnsToSave);
    localStorage.setItem('sportscode_custom_presets', JSON.stringify(next));
    localStorage.setItem('sportscode_active_preset_id', savedId);
    localStorage.setItem('sportscode_designer_layout', JSON.stringify(btnsToSave));

    channelRef.current?.postMessage({ type: 'SYNC_CUSTOM_PRESETS', presets: next });
    channelRef.current?.postMessage({ type: 'SYNC_ACTIVE_PRESET_ID', id: savedId });
    channelRef.current?.postMessage({ type: 'SYNC_BUTTONS', buttons: btnsToSave });
    return savedId;
  };

  const handleLoadCustomPreset = (id: string) => {
    const preset = customPresets.find(p => p.id === id);
    if (preset) {
      saveLayout(preset.buttons);
      localStorage.setItem('sportscode_active_preset_id', id);
      channelRef.current?.postMessage({ type: 'SYNC_ACTIVE_PRESET_ID', id });
    }
  };

  const handleDeleteCustomPreset = (id: string) => {
    const next = customPresets.filter(p => p.id !== id);
    setCustomPresets(next);
    localStorage.setItem('sportscode_custom_presets', JSON.stringify(next));
    channelRef.current?.postMessage({ type: 'SYNC_CUSTOM_PRESETS', presets: next });
  };

  // Import CSV roster callback
  const handleImportRoster = (
    teamKey: 'teamA' | 'teamB',
    teamNameVal: string,
    importedPlayers: Omit<Player, 'id'>[],
    isMultiTeam = false,
    csvFileName?: string
  ) => {
    const normTeamNameVal = teamNameVal.trim().toUpperCase();

    if (isMultiTeam) {
      // Find unique team names in importedPlayers
      const uniqueTeams = Array.from(new Set(importedPlayers.map(p => p.teamName ? p.teamName.trim().toUpperCase() : '')));
      const nameA = uniqueTeams[0] || 'TEAM A';
      const nameB = uniqueTeams[1] || 'TEAM B';

      setTeamAName(nameA);
      setTeamBName(nameB);
      channelRef.current?.postMessage({ type: 'UPDATE_TEAMA_NAME', value: nameA });
      channelRef.current?.postMessage({ type: 'UPDATE_TEAMB_NAME', value: nameB });

      setPlayers(() => {
        const formattedImported = importedPlayers.map((p, idx) => {
          const hist = getHandednessFromHistory(p.name, p.throws || 'R', p.bats || 'R', csvFileName);
          const cleanName = p.name.trim().replace(/[\s\u3000.\-']+/g, '_');
          const cleanTeam = (p.teamName ? p.teamName.trim().toUpperCase() : nameA).replace(/[\s\u3000.\-']+/g, '_');
          const cleanNum = p.number ? p.number.trim() : idx.toString();
          const detId = `p_imported_${cleanTeam}_${cleanNum}_${cleanName}`;
          return {
            ...p,
            id: detId,
            teamName: p.teamName ? p.teamName.trim().toUpperCase() : nameA,
            throws: hist.throws,
            bats: hist.bats,
            hand: hist.hand,
            sourceCsvName: csvFileName
          };
        });
        return formattedImported;
      });
      return;
    }

    if (teamKey === 'teamA') {
      setTeamAName(normTeamNameVal);
      channelRef.current?.postMessage({ type: 'UPDATE_TEAMA_NAME', value: normTeamNameVal });
    } else {
      setTeamBName(normTeamNameVal);
      channelRef.current?.postMessage({ type: 'UPDATE_TEAMB_NAME', value: normTeamNameVal });
    }

    const oldTeamName = teamKey === 'teamA' ? teamAName : teamBName;
    const normOldTeam = oldTeamName ? oldTeamName.trim().toUpperCase() : '';

    setPlayers(prev => {
      // 大文字・トリム比較により、既存選手を確実に削除して重複を防ぐ
      const filtered = prev.filter(p => {
        if (!p.teamName) return true;
        return p.teamName.trim().toUpperCase() !== normOldTeam;
      });
      const formattedImported = importedPlayers.map((p, idx) => {
        const hist = getHandednessFromHistory(p.name, p.throws || 'R', p.bats || 'R', csvFileName);
        const cleanName = p.name.trim().replace(/[\s\u3000.\-']+/g, '_');
        const cleanTeam = normTeamNameVal.replace(/[\s\u3000.\-']+/g, '_');
        const cleanNum = p.number ? p.number.trim() : idx.toString();
        const detId = `p_imported_${cleanTeam}_${cleanNum}_${cleanName}`;
        return {
          ...p,
          id: detId,
          teamName: p.teamName ? p.teamName.trim().toUpperCase() : normTeamNameVal,
          throws: hist.throws,
          bats: hist.bats,
          hand: hist.hand,
          sourceCsvName: csvFileName
        };
      });
      const nextPlayers = [...filtered, ...formattedImported];
      return nextPlayers;
    });
  };

  // Standalone triggers from Code Window (broadcasting to Main Window)
  const handleTriggerButtonFromCodeWindow = (btn: ButtonConfig) => {
    // Resolve active pitcher locally before broadcasting
    const activePlayerObj = players.find(p => p.id === activePlayerId);
    const isTeamAActive = activePlayerObj?.teamName === teamAName;
    const isTeamBActive = activePlayerObj?.teamName === teamBName;
    const activePitcher = isTeamAActive 
      ? pitcherB 
      : isTeamBActive 
        ? pitcherA 
        : (pitcherA || pitcherB || '');

    const activeCatcherId = inningHalf === 'top' ? catcherIdA : catcherIdB;
    const activeSSId = inningHalf === 'top' ? inf1IdA : inf1IdB;
    const active2BId = inningHalf === 'top' ? inf2IdA : inf2IdB;
    const active3BId = inningHalf === 'top' ? inf3IdA : inf3IdB;
    const active1BId = inningHalf === 'top' ? inf4IdA : inf4IdB;
    const activeLFId = inningHalf === 'top' ? lfIdA : lfIdB;
    const activeCFId = inningHalf === 'top' ? cfIdA : cfIdB;
    const activeRFId = inningHalf === 'top' ? rfIdA : rfIdB;
    const activeDefenseNotes = inningHalf === 'top' ? defenseA : defenseB;

    channelRef.current?.postMessage({
      type: 'TRIGGER_BUTTON',
      btn,
      activePlayerId,
      activeEventId,
      balls,
      strikes,
      outs,
      pitcher: activePitcher,
      defense: activeDefenseNotes,
      selectedCourse,
      plottedHit,
      coursePerspective,
      
      // New parameters
      inningNum,
      inningHalf,
      runner1BId,
      runner2BId,
      runner3BId,
      catcherId: activeCatcherId,
      inf1Id: activeSSId,
      inf2Id: active2BId,
      inf3Id: active3BId,
      inf4Id: active1BId,
      lfId: activeLFId,
      cfId: activeCFId,
      rfId: activeRFId
    });

    // Local instant feedback update
    if (btn.type === 'label' && btn.groupName) {
      if (activeEventId) {
        setEvents(prevEvents => 
          prevEvents.map(ev => {
            if (ev.id === activeEventId) {
              return {
                ...ev,
                labels: {
                  ...ev.labels,
                  [btn.groupName!]: btn.name
                }
              };
            }
            return ev;
          })
        );
      } else {
        setPreSelectedLabels(prev => {
          const filtered = prev.filter(id => {
            const b = buttons.find(x => x.id === id);
            return b ? b.groupName !== btn.groupName : true;
          });
          return [...filtered, btn.id];
        });
        // Auto-clear after 200ms flash
        setTimeout(() => {
          setPreSelectedLabels(prev => prev.filter(id => id !== btn.id));
          channelRef.current?.postMessage({ type: 'UPDATE_PRESELECTED_LABELS', value: [] });
        }, 200);
      }
    } else if (btn.type === 'code') {
      const tempId = `temp_event_${Date.now()}`;
      setActiveEventId(tempId);
      setSelectedCourse('');
      setPlottedHit(null);
      setPreSelectedLabels([]);
    }
  };

  // Live tagger: direct trigger (no BroadcastChannel needed since it's not a separate code window)
  const handleTriggerButtonDirectly = (btn: ButtonConfig) => {
    if (handleTriggerButtonFromSyncRef.current) {
      const activePlayerObj = players.find(p => p.id === activePlayerId);
      const isTeamAActive = activePlayerObj?.teamName === teamAName;
      const activePitcher = isTeamAActive ? pitcherB : (pitcherA || '');
      const activeCatcherId = inningHalf === 'top' ? catcherIdA : catcherIdB;
      handleTriggerButtonFromSyncRef.current(
        btn, activePlayerId, balls, strikes, outs,
        activePitcher, inningHalf === 'top' ? defenseA : defenseB,
        selectedCourse, plottedHit, coursePerspective,
        inningNum, inningHalf,
        runner1BId, runner2BId, runner3BId,
        activeCatcherId,
        inningHalf === 'top' ? inf1IdA : inf1IdB,
        inningHalf === 'top' ? inf2IdA : inf2IdB,
        inningHalf === 'top' ? inf3IdA : inf3IdB,
        inningHalf === 'top' ? inf4IdA : inf4IdB,
        inningHalf === 'top' ? lfIdA : lfIdB,
        inningHalf === 'top' ? cfIdA : cfIdB,
        inningHalf === 'top' ? rfIdA : rfIdB,
        activeEventId || undefined
      );
    }
  };

  // Main Window trigger evaluator
  const handleTriggerButtonFromSync = (
    btn: ButtonConfig, 
    targetPlayerId: string | null, 
    bCount: number, 
    sCount: number, 
    oCount: number,
    pitcherName: string,
    defenseNotes: string,
    course: string,
    hitLocation: { x: number, y: number } | null,
    _perspective: 'pitcher' | 'catcher',
    
    iNum?: number,
    iHalf?: 'top' | 'bottom',
    r1Id?: string,
    r2Id?: string,
    r3Id?: string,
    cId?: string,
    i1Id?: string,
    i2Id?: string,
    i3Id?: string,
    i4Id?: string,
    lfId?: string,
    cfId?: string,
    rfId?: string,
    
    targetEventId?: string
  ) => {
    if (isCodeWindow) return;

    const resolvedInningNum = iNum !== undefined ? iNum : inningNum;
    const resolvedInningHalf = iHalf !== undefined ? iHalf : inningHalf;
    const resolvedR1Id = r1Id !== undefined ? r1Id : runner1BId;
    const resolvedR2Id = r2Id !== undefined ? r2Id : runner2BId;
    const resolvedR3Id = r3Id !== undefined ? r3Id : runner3BId;
    const resolvedCId = cId !== undefined ? cId : (resolvedInningHalf === 'top' ? catcherIdA : catcherIdB);
    const resolvedI1Id = i1Id !== undefined ? i1Id : (resolvedInningHalf === 'top' ? inf1IdA : inf1IdB);
    const resolvedI2Id = i2Id !== undefined ? i2Id : (resolvedInningHalf === 'top' ? inf2IdA : inf2IdB);
    const resolvedI3Id = i3Id !== undefined ? i3Id : (resolvedInningHalf === 'top' ? inf3IdA : inf3IdB);
    const resolvedI4Id = i4Id !== undefined ? i4Id : (resolvedInningHalf === 'top' ? inf4IdA : inf4IdB);
    const resolvedLFId = lfId !== undefined ? lfId : (resolvedInningHalf === 'top' ? lfIdA : lfIdB);
    const resolvedCFId = cfId !== undefined ? cfId : (resolvedInningHalf === 'top' ? cfIdA : cfIdB);
    const resolvedRFId = rfId !== undefined ? rfId : (resolvedInningHalf === 'top' ? rfIdA : rfIdB);

    const isResultAction = (b: ButtonConfig) => {
      return b.linkTrigger === 'hit' || b.linkTrigger === 'out' || b.linkTrigger === 'walk';
    };

    const advanceToNextBatter = (currentPlayerId: string | null) => {
      const battingTeam = resolvedInningHalf === 'top' ? teamAName : teamBName;
      const battingPlayers = players
        .filter(p => {
          if (p.teamName !== battingTeam) return false;
          return p.battingOrder !== undefined && p.battingOrder >= 1 && p.battingOrder <= 9;
        })
        .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0));

      if (battingPlayers.length === 0) return;

      const currentIndex = battingPlayers.findIndex(p => p.id === currentPlayerId);
      let nextIndex = currentIndex + 1;
      if (nextIndex >= battingPlayers.length) nextIndex = 0;

      const nextPlayerId = battingPlayers[nextIndex].id;
      setActivePlayerId(nextPlayerId);
      channelRef.current?.postMessage({ type: 'UPDATE_ACTIVE_PLAYER', activePlayerId: nextPlayerId });
    };

    if (btn.type === 'code') {
      const timestamp = videoPlayerRef.current ? videoPlayerRef.current.getCurrentTime() : liveTimerSeconds;
      
      const startTime = Math.max(0, timestamp - (btn.leadIn || 0));
      const endTime = videoDuration > 0 
        ? Math.min(videoDuration, timestamp + (btn.leadOut || 0)) 
        : timestamp + (btn.leadOut || 0);

      const activePlayerObj = players.find(p => p.id === targetPlayerId);
      
      const baseballLabels: Record<string, string> = {
        'Count': `${bCount}-${sCount}`,
        'Outs': `${oCount.toString()}`,
        'Inning': `${resolvedInningNum}回${resolvedInningHalf === 'top' ? '表' : '裏'}`,
        'Inning_Num': `${resolvedInningNum}`,
        'Inning_Half': resolvedInningHalf === 'top' ? '表' : '裏',
        'Batter': activePlayerObj ? activePlayerObj.name : '-',
        'Pitcher': pitcherName || '-',
        'Defense': defenseNotes || '-',
        'Course': course || '-',
        'Hit_Plot': hitLocation ? `${Math.floor(hitLocation.x)},${Math.floor(hitLocation.y)}` : '-',
        'Team': activePlayerObj?.teamName || '-',
        'Pitch Speed': pitchSpeedInput ? (pitchSpeedInput.endsWith('km/h') ? pitchSpeedInput : `${pitchSpeedInput}km/h`) : '-',
        '球速': pitchSpeedInput ? (pitchSpeedInput.endsWith('km/h') ? pitchSpeedInput : `${pitchSpeedInput}km/h`) : '-',
        'PITCH_SPEED': pitchSpeedInput ? (pitchSpeedInput.endsWith('km/h') ? pitchSpeedInput : `${pitchSpeedInput}km/h`) : '-',

        'Runner 1B': resolvedR1Id ? (players.find(p => p.id === resolvedR1Id || p.name === resolvedR1Id)?.name || resolvedR1Id) : 'None',
        'Runner 2B': resolvedR2Id ? (players.find(p => p.id === resolvedR2Id || p.name === resolvedR2Id)?.name || resolvedR2Id) : 'None',
        'Runner 3B': resolvedR3Id ? (players.find(p => p.id === resolvedR3Id || p.name === resolvedR3Id)?.name || resolvedR3Id) : 'None',

        'Catcher': resolvedCId ? (players.find(p => p.id === resolvedCId || p.name === resolvedCId)?.name || resolvedCId) : '-',
        'Shortstop': resolvedI1Id ? (players.find(p => p.id === resolvedI1Id || p.name === resolvedI1Id)?.name || resolvedI1Id) : '-',
        '2nd Base': resolvedI2Id ? (players.find(p => p.id === resolvedI2Id || p.name === resolvedI2Id)?.name || resolvedI2Id) : '-',
        '3rd Base': resolvedI3Id ? (players.find(p => p.id === resolvedI3Id || p.name === resolvedI3Id)?.name || resolvedI3Id) : '-',
        '1st Base': resolvedI4Id ? (players.find(p => p.id === resolvedI4Id || p.name === resolvedI4Id)?.name || resolvedI4Id) : '-',
        'Left Field': resolvedLFId ? (players.find(p => p.id === resolvedLFId || p.name === resolvedLFId)?.name || resolvedLFId) : '-',
        'Center Field': resolvedCFId ? (players.find(p => p.id === resolvedCFId || p.name === resolvedCFId)?.name || resolvedCFId) : '-',
        'Right Field': resolvedRFId ? (players.find(p => p.id === resolvedRFId || p.name === resolvedRFId)?.name || resolvedRFId) : '-'
      };

      // 🧤 センターカメラ映像自動認識 ＆ キャッチャーミット（構え vs 捕球）データ自動抽出
      const videoEl = videoPlayerRef.current?.getVideoElement();
      if (videoEl) {
        const mittData = getMittDisplacementAtCatch(videoEl);
        if (mittData) {
          baseballLabels['構え(Target)'] = mittData.targetCourse;
          baseballLabels['着弾(Actual)'] = mittData.actualCourse;
          baseballLabels['ズレ(cm)'] = `${mittData.missDistanceCm}`;
          baseballLabels['ズレ_X(cm)'] = `${mittData.dxCm}`;
          baseballLabels['ズレ_Y(cm)'] = `${mittData.dyCm}`;
          baseballLabels['逆球'] = mittData.isOpposite ? 'YES' : 'NO';
        }
      }

      preSelectedLabels.forEach((lblId) => {
        const lblBtn = buttons.find(b => b.id === lblId);
        if (lblBtn && lblBtn.groupName) {
          let targetKey = lblBtn.groupName;
          const normKey = targetKey.toLowerCase().trim();
          if (normKey === 'result' || normKey === '判定' || normKey === '判定/結果') targetKey = 'Result';
          else if (normKey === 'pitch type' || normKey === '球種') targetKey = 'Pitch Type';
          else if (normKey === 'course' || normKey === 'コース') targetKey = 'Course';
          else if (normKey === 'hit_plot' || normKey === '打球位置') targetKey = 'Hit_Plot';

          baseballLabels[targetKey] = lblBtn.name;
        }
      });

      const eventName = btn.name;

      const newEvent: TaggedEvent = {
        id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        startTime,
        endTime,
        playerId: activePlayerObj?.id,
        playerName: activePlayerObj?.name,
        actionId: btn.id,
        actionName: eventName,
        color: btn.color,
        labels: baseballLabels,
        createdAt: Date.now(),
        gameDate: gameDate || undefined
      };

      pushEventsUndo(events);
      setEvents(prev => [newEvent, ...prev]);
      setActiveEventId(newEvent.id);
      syncEventToSupabase(newEvent);

      // Auto-clear Strike Zone grid selections, outfield plots, and pitch speed input!
      setSelectedCourse('');
      setPlottedHit(null);
      setPreSelectedLabels([]);
      setPitchSpeedInput('');
      channelRef.current?.postMessage({ type: 'UPDATE_PITCH_SPEED', value: '' });
      channelRef.current?.postMessage({ type: 'UPDATE_COURSE', value: '' });
      channelRef.current?.postMessage({ type: 'UPDATE_PLOTTED_HIT', value: null });
      channelRef.current?.postMessage({ type: 'UPDATE_PRESELECTED_LABELS', value: [] });

      // Auto-advance batter if a Result label was preselected or code button itself is a Result
      const hasResultPreselected = preSelectedLabels.some(lblId => {
        const lblBtn = buttons.find(b => b.id === lblId);
        return lblBtn ? isResultAction(lblBtn) : false;
      }) || isResultAction(btn);

      if (hasResultPreselected) {
        advanceToNextBatter(targetPlayerId);
      }

    } else if (btn.type === 'label' && btn.groupName) {
      const resolvedActiveEventId = targetEventId || activeEventId;
      if (resolvedActiveEventId) {
        setEvents(prevEvents => 
          prevEvents.map(ev => {
            if (ev.id === resolvedActiveEventId) {
              let targetKey = btn.groupName!;
              const normKey = targetKey.toLowerCase().trim();
              if (normKey === 'result' || normKey === '判定' || normKey === '判定/結果') {
                targetKey = 'Result';
              } else if (normKey === 'pitch type' || normKey === '球種') {
                targetKey = 'Pitch Type';
              } else if (normKey === 'course' || normKey === 'コース') {
                targetKey = 'Course';
              } else if (normKey === 'hit_plot' || normKey === '打球位置') {
                targetKey = 'Hit_Plot';
              }

              const newLabels = {
                ...ev.labels,
                [targetKey]: btn.name
              };

              // Sync course information if selected and not yet populated
              if (course && (!ev.labels.Course || ev.labels.Course === '-')) {
                newLabels['Course'] = course;
              }
              // Sync plot location if selected and not yet populated
              if (hitLocation && (!ev.labels.Hit_Plot || ev.labels.Hit_Plot === '-')) {
                newLabels['Hit_Plot'] = `${Math.floor(hitLocation.x)},${Math.floor(hitLocation.y)}`;
              }

              const updated = {
                ...ev,
                labels: newLabels
              };
              syncEventToSupabase(updated);
              return updated;
            }
            return ev;
          })
        );

        // Auto-clear Strike Zone grid selections and outfield plots on successful label sync
        setSelectedCourse('');
        setPlottedHit(null);
        channelRef.current?.postMessage({ type: 'UPDATE_COURSE', value: '' });
        channelRef.current?.postMessage({ type: 'UPDATE_PLOTTED_HIT', value: null });

        // Auto-increment Balls and Strikes based on triggered label names (skip Course and Hit Plot groups)
        const normGroup = (btn.groupName || '').toLowerCase().trim();
        const isCourseOrPlot = normGroup === 'course' || normGroup === 'コース' || normGroup === 'hit_plot' || normGroup === '打球位置';

        if (!isCourseOrPlot) {
          const lowerName = btn.name.toLowerCase();
          if (lowerName.includes('ストライク') || lowerName.includes('空振り') || lowerName.includes('見逃し') || lowerName.includes('ファール') || lowerName.includes('foul') || lowerName.includes('strike')) {
            if (lowerName.includes('ファール') || lowerName.includes('foul')) {
              if (strikes < 2) {
                const nextS = strikes + 1;
                setStrikes(nextS);
                channelRef.current?.postMessage({ type: 'UPDATE_SCOREBOARD', balls, strikes: nextS, outs });
              }
            } else {
              const nextS = strikes + 1;
              if (nextS >= 3) {
                setStrikes(0);
                setBalls(0);
                const nextO = (outs + 1) % 3;
                setOuts(nextO);
                channelRef.current?.postMessage({ type: 'UPDATE_SCOREBOARD', balls: 0, strikes: 0, outs: nextO });
              } else {
                setStrikes(nextS);
                channelRef.current?.postMessage({ type: 'UPDATE_SCOREBOARD', balls, strikes: nextS, outs });
              }
            }
          } else if (
            lowerName.includes('四球') || 
            lowerName.includes('死球') || 
            lowerName.includes('デッドボール') || 
            lowerName.includes('walk') || 
            lowerName.includes('hbp') || 
            lowerName.includes('hit by pitch') || 
            lowerName.includes('hitbypitch')
          ) {
            setBalls(0);
            setStrikes(0);
            channelRef.current?.postMessage({ type: 'UPDATE_SCOREBOARD', balls: 0, strikes: 0, outs });
          } else if (lowerName.includes('ボール') || lowerName.includes('ball')) {
            const nextB = balls + 1;
            if (nextB >= 4) {
              setBalls(0);
              setStrikes(0);
              channelRef.current?.postMessage({ type: 'UPDATE_SCOREBOARD', balls: 0, strikes: 0, outs });
            } else {
              setBalls(nextB);
              channelRef.current?.postMessage({ type: 'UPDATE_SCOREBOARD', balls: nextB, strikes, outs });
            }
          }
        }

        if (isResultAction(btn)) {
          advanceToNextBatter(targetPlayerId || activePlayerId);
        }
      } else {
        setPreSelectedLabels(prev => {
          const filtered = prev.filter(id => {
            const b = buttons.find(x => x.id === id);
            return b ? b.groupName !== btn.groupName : true;
          });
          const next = [...filtered, btn.id];
          channelRef.current?.postMessage({ type: 'UPDATE_PRESELECTED_LABELS', value: next });
          return next;
        });
        // Auto-clear after 200ms flash
        setTimeout(() => {
          setPreSelectedLabels(prev => prev.filter(id => id !== btn.id));
          channelRef.current?.postMessage({ type: 'UPDATE_PRESELECTED_LABELS', value: [] });
        }, 200);
      }
    }
  };

  useEffect(() => {
    handleTriggerButtonFromSyncRef.current = handleTriggerButtonFromSync;
  });

  const handleSeek = (time: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(time);
    }
  };

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const ruler = e.currentTarget;
    
    const updateTimeFromX = (clientX: number) => {
      const rect = ruler.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const totalD = Math.max(videoDuration, 60);
      const targetTime = pct * totalD;
      
      if (videoPlayerRef.current) {
        videoPlayerRef.current.seekTo(targetTime);
      }
    };

    updateTimeFromX(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateTimeFromX(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Convert seconds to clean clock format (mm:ss.ms)
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // --- DEDICATED URL PASSWORD RESET VIEW (From Email Link) ---
  const isResetURL = window.location.hash.includes('reset-password') 
    || window.location.search.includes('type=recovery')
    || window.location.search.includes('reset_token');

  if (isResetURL) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black z-50 flex items-center justify-center p-4">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col gap-6 backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-950/40">
              🔑
            </div>
            <h2 className="text-lg font-black text-white mt-4 tracking-tight">パスワードの再設定</h2>
            <p className="text-xs text-zinc-400 mt-1">
              メールリンク認証が完了しました。新しいパスワードを2回入力してください。（※メールアドレスの再入力は不要です）
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400">新しいパスワード</label>
              <input
                type="password"
                placeholder="新しいパスワード"
                value={changeNewPass}
                onChange={(e) => setChangeNewPass(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400">確認のため再入力 (2回目)</label>
              <input
                type="password"
                placeholder="もう一度パスワードを入力"
                value={changeConfirmPass}
                onChange={(e) => setChangeConfirmPass(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold font-mono"
              />
            </div>

            {changePassError && (
              <p className="text-[10px] text-rose-500 font-bold text-center bg-rose-950/20 p-2 rounded-lg border border-rose-900/30">
                ⚠️ {changePassError}
              </p>
            )}
          </div>

          <button
            onClick={handleChangeOwnPassword}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-950/30 hover:shadow-emerald-950/50 cursor-pointer text-center active:scale-95"
          >
            新しいパスワードを保存
          </button>
        </div>
      </div>
    );
  }

  // --- USER AUTHENTICATION / LOGIN & SIGNUP OVERLAY (Blocks Main & Code Windows if not logged in) ---
  if (!isLoggedIn) {
    if (isRegisterMode) {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900/95 border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col gap-5 relative overflow-hidden backdrop-blur-xl max-h-[95vh] overflow-y-auto">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-600/10 rounded-full blur-2xl pointer-events-none" />

            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-emerald-950/40">
                📝
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-3 tracking-tight">新規チーム・アカウント利用申請</h2>
              <p className="text-[11px] text-zinc-400 mt-1">
                ご希望のID・秘密のパスワードを入力して申請してください。<br className="hidden sm:inline" />
                運営者の承認後にすぐご利用いただけます。
              </p>
            </div>

            {regSuccess ? (
              <div className="bg-emerald-950/40 border border-emerald-800/60 p-5 rounded-2xl text-center space-y-3 animate-in fade-in zoom-in duration-200">
                <div className="text-3xl">🎉</div>
                <h3 className="text-sm font-black text-emerald-300">利用申請を受け付けました！</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  ユーザーID「<span className="font-mono font-bold text-white">{regUserId}</span>」の申請を送信しました。<br />
                  管理者による承認完了後、ご自身で設定されたパスワードでログイン可能になります。
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setIsRegisterMode(false);
                      setInputUserId(regUserId);
                      setRegSuccess(false);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                  >
                    ログイン画面へ戻る
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* User ID */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-400">希望ユーザーID (半角英数・記号)</label>
                  <input
                    type="text"
                    placeholder="例: Team_Braves"
                    value={regUserId}
                    onChange={(e) => setRegUserId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold font-mono"
                  />
                </div>

                {/* Team Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-400">チーム名 / 組織名</label>
                  <input
                    type="text"
                    placeholder="例: ○○大学野球部"
                    value={regTeamName}
                    onChange={(e) => setRegTeamName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-400">ご連絡先メールアドレス (承認・復旧用)</label>
                  <input
                    type="email"
                    placeholder="例: coach@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400">パスワード (6文字以上)</label>
                    <input
                      type="password"
                      placeholder="パスワード"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-400">確認用パスワード</label>
                    <input
                      type="password"
                      placeholder="もう一度入力"
                      value={regPasswordConfirm}
                      onChange={(e) => setRegPasswordConfirm(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold font-mono"
                    />
                  </div>
                </div>

                {regError && (
                  <p className="text-[10px] text-rose-400 font-bold text-center bg-rose-950/30 p-2.5 rounded-xl border border-rose-900/40">
                    ⚠️ {regError}
                  </p>
                )}

                <button
                  onClick={handlePerformRegister}
                  disabled={regLoading}
                  className="w-full py-2.5 mt-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-950/30 cursor-pointer text-center active:scale-98"
                >
                  {regLoading ? '申請中...' : '利用申請を送信する'}
                </button>

                <div className="text-center pt-1 border-t border-zinc-800/80">
                  <button
                    onClick={() => {
                      setIsRegisterMode(false);
                      setRegError(null);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-emerald-400 font-bold transition-colors cursor-pointer"
                  >
                    ◀ 既にアカウントをお持ちの方（ログインはこちら）
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black z-50 flex items-center justify-center p-4">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col gap-6 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-sky-600/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="text-center">
            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-950/40">
              ⚾
            </div>
            <h2 className="text-lg font-black text-white mt-4 tracking-tight">SportsVideoAnalysis</h2>
            <p className="text-xs text-zinc-400 mt-1">IDとパスワードを入力してログインしてください</p>
          </div>

          <div className="space-y-4">
            {/* User ID Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400">ユーザーID (アカウントID)</label>
              <input
                type="text"
                placeholder="ユーザーIDを入力"
                value={inputUserId}
                onChange={(e) => setInputUserId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePerformLogin();
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold font-mono"
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400">パスワード</label>
              <input
                type="password"
                placeholder="パスワードを入力"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePerformLogin();
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold font-mono"
              />
            </div>

            {loginError && (
              <p className="text-[10px] text-rose-500 font-bold text-center bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/30">
                ⚠️ {loginError}
              </p>
            )}
          </div>

          <button
            onClick={handlePerformLogin}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-950/30 hover:shadow-emerald-950/50 cursor-pointer text-center active:scale-95"
          >
            ログイン
          </button>

          <div className="text-center pt-2 border-t border-zinc-800/80">
            <button
              onClick={() => {
                setIsRegisterMode(true);
                setLoginError(null);
              }}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
            >
              <span>✨ アカウントをお持ちでない方（新規利用申請）</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER ROUTER: CODE WINDOW ONLY ---
  if (isCodeWindow) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex flex-col justify-between">
        <CodeWindowDesigner
          buttons={buttons}
          onAddButton={handleAddButton}
          onUpdateButton={handleUpdateButton}
          onDeleteButton={handleDeleteButton}
          onUpdateButtons={handleUpdateButtons}
          onLoadTemplate={handleLoadTemplate}
          onTriggerButton={handleTriggerButtonFromCodeWindow}
          activeEventName={activeEventName}
          preSelectedLabels={preSelectedLabels}
          
          players={players}
          onUpdatePlayerHand={handleUpdatePlayerHand}
          onUpdatePlayerThrows={handleUpdatePlayerThrows}
          onUpdatePlayerBats={handleUpdatePlayerBats}
          activePlayerId={activePlayerId}
          onSelectPlayer={(id) => {
            if (isCodeWindow) {
              setActivePlayerId(id);
              channelRef.current?.postMessage({ type: 'UPDATE_ACTIVE_PLAYER', activePlayerId: id });
            } else {
              setActivePlayerId(id);
            }
          }}

          pitchSpeedInput={pitchSpeedInput}
          onUpdatePitchSpeedInput={(val) => {
            setPitchSpeedInput(val);
            channelRef.current?.postMessage({ type: 'UPDATE_PITCH_SPEED', value: val });
            const formattedVal = val ? (val.endsWith('km/h') ? val : `${val}km/h`) : '';
            const targetId = selectedEventId || activeEventId;
            if (targetId && formattedVal) {
              setEvents(prevEvents =>
                prevEvents.map(ev => {
                  if (ev.id === targetId) {
                    return {
                      ...ev,
                      labels: {
                        ...ev.labels,
                        '球速': formattedVal,
                        'Pitch Speed': formattedVal,
                        'PITCH_SPEED': formattedVal
                      }
                    };
                  }
                  return ev;
                })
              );
            }
          }}

          balls={balls}
          strikes={strikes}
          outs={outs}
          onIncrementBall={() => {
            if (isCodeWindow) {
              const next = (balls + 1) % 4;
              setBalls(next);
              channelRef.current?.postMessage({ type: 'UPDATE_SCOREBOARD', balls: next, strikes, outs });
            } else {
              setBalls(prev => (prev + 1) % 4);
            }
          }}
          onIncrementStrike={() => {
            if (isCodeWindow) {
              const next = (strikes + 1) % 3;
              setStrikes(next);
              channelRef.current?.postMessage({ type: 'UPDATE_SCOREBOARD', balls, strikes: next, outs });
            } else {
              setStrikes(prev => (prev + 1) % 3);
            }
          }}
          onIncrementOut={() => {
            if (isCodeWindow) {
              const next = (outs + 1) % 3;
              setOuts(next);
              channelRef.current?.postMessage({ type: 'UPDATE_SCOREBOARD', balls, strikes, outs: next });
            } else {
              setOuts(prev => (prev + 1) % 3);
            }
          }}
          onResetScoreboard={() => {
            if (isCodeWindow) {
              setBalls(0);
              setStrikes(0);
              setOuts(0);
              channelRef.current?.postMessage({ type: 'UPDATE_SCOREBOARD', balls: 0, strikes: 0, outs: 0 });
            } else {
              setBalls(0);
              setStrikes(0);
              setOuts(0);
            }
          }}

          pitcherA={pitcherA}
          onUpdatePitcherA={(val) => {
            if (isCodeWindow) {
              setPitcherA(val);
              channelRef.current?.postMessage({ type: 'UPDATE_PITCHERA', value: val });
            } else {
              setPitcherA(val);
            }
          }}
          pitcherB={pitcherB}
          onUpdatePitcherB={(val) => {
            if (isCodeWindow) {
              setPitcherB(val);
              channelRef.current?.postMessage({ type: 'UPDATE_PITCHERB', value: val });
            } else {
              setPitcherB(val);
            }
          }}
          defense={inningHalf === 'top' ? defenseB : defenseA}
          onUpdateDefense={(val) => {
            if (isCodeWindow) {
              if (inningHalf === 'top') setDefenseB(val);
              else setDefenseA(val);
              channelRef.current?.postMessage({ type: 'UPDATE_DEFENSE', value: val });
            } else {
              if (inningHalf === 'top') setDefenseB(val);
              else setDefenseA(val);
            }
          }}
          selectedCourse={selectedCourse}
          onSelectCourse={(val) => {
            if (isCodeWindow) {
              setSelectedCourse(val);
              channelRef.current?.postMessage({ type: 'UPDATE_COURSE', value: val });
            } else {
              setSelectedCourse(val);
            }
          }}
          plottedHit={plottedHit}
          onUpdatePlottedHit={(val) => {
            if (isCodeWindow) {
              setPlottedHit(val);
              channelRef.current?.postMessage({ type: 'UPDATE_PLOTTED_HIT', value: val });
            } else {
              setPlottedHit(val);
            }
          }}
          coursePerspective={coursePerspective}
          onTogglePerspective={() => {
            const next = coursePerspective === 'pitcher' ? 'catcher' : 'pitcher';
            if (isCodeWindow) {
              setCoursePerspective(next);
              channelRef.current?.postMessage({ type: 'UPDATE_PERSPECTIVE', value: next });
            } else {
              setCoursePerspective(next);
            }
          }}
          teamAName={teamAName}
          teamBName={teamBName}
          
          hotkeysEnabled={hotkeysEnabled}
          onToggleHotkeys={() => {
            const next = !hotkeysEnabled;
            if (isCodeWindow) {
              setHotkeysEnabled(next);
              channelRef.current?.postMessage({ type: 'UPDATE_HOTKEYS_ENABLED', value: next });
            } else {
              setHotkeysEnabled(next);
            }
          }}

          // New Inning & Runner & Defenders Props
          inningNum={inningNum}
          onUpdateInningNum={(val) => {
            if (isCodeWindow) {
              setInningNum(val);
              channelRef.current?.postMessage({ type: 'UPDATE_INNING_NUM', value: val });
            } else {
              setInningNum(val);
            }
          }}
          inningHalf={inningHalf}
          onUpdateInningHalf={(val) => {
            if (isCodeWindow) {
              setInningHalf(val);
              channelRef.current?.postMessage({ type: 'UPDATE_INNING_HALF', value: val });
            } else {
              setInningHalf(val);
            }
          }}
          runner1BId={runner1BId}
          onUpdateRunner1BId={(val) => {
            if (isCodeWindow) {
              setRunner1BId(val);
              channelRef.current?.postMessage({ type: 'UPDATE_RUNNER1B_ID', value: val });
            } else {
              setRunner1BId(val);
            }
          }}
          runner2BId={runner2BId}
          onUpdateRunner2BId={(val) => {
            if (isCodeWindow) {
              setRunner2BId(val);
              channelRef.current?.postMessage({ type: 'UPDATE_RUNNER2B_ID', value: val });
            } else {
              setRunner2BId(val);
            }
          }}
          runner3BId={runner3BId}
          onUpdateRunner3BId={(val) => {
            if (isCodeWindow) {
              setRunner3BId(val);
              channelRef.current?.postMessage({ type: 'UPDATE_RUNNER3B_ID', value: val });
            } else {
              setRunner3BId(val);
            }
          }}
          catcherId={inningHalf === 'top' ? catcherIdB : catcherIdA}
          onUpdateCatcherId={(val) => {
            if (inningHalf === 'top') setCatcherIdB(val);
            else setCatcherIdA(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_CATCHER_ID', value: val, inningHalf });
          }}
          inf1Id={inningHalf === 'top' ? inf1IdB : inf1IdA}
          onUpdateInf1Id={(val) => {
            if (inningHalf === 'top') setInf1IdB(val);
            else setInf1IdA(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_INF1_ID', value: val, inningHalf });
          }}
          inf2Id={inningHalf === 'top' ? inf2IdB : inf2IdA}
          onUpdateInf2Id={(val) => {
            if (inningHalf === 'top') setInf2IdB(val);
            else setInf2IdA(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_INF2_ID', value: val, inningHalf });
          }}
          inf3Id={inningHalf === 'top' ? inf3IdB : inf3IdA}
          onUpdateInf3Id={(val) => {
            if (inningHalf === 'top') setInf3IdB(val);
            else setInf3IdA(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_INF3_ID', value: val, inningHalf });
          }}
          inf4Id={inningHalf === 'top' ? inf4IdB : inf4IdA}
          onUpdateInf4Id={(val) => {
            if (inningHalf === 'top') setInf4IdB(val);
            else setInf4IdA(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_INF4_ID', value: val, inningHalf });
          }}
          lfId={inningHalf === 'top' ? lfIdB : lfIdA}
          onUpdateLfId={(val) => {
            if (inningHalf === 'top') setLfIdB(val);
            else setLfIdA(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_LF_ID', value: val, inningHalf });
          }}
          cfId={inningHalf === 'top' ? cfIdB : cfIdA}
          onUpdateCfId={(val) => {
            if (inningHalf === 'top') setCfIdB(val);
            else setCfIdA(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_CF_ID', value: val, inningHalf });
          }}
          rfId={inningHalf === 'top' ? rfIdB : rfIdA}
          onUpdateRfId={(val) => {
            if (inningHalf === 'top') setRfIdB(val);
            else setRfIdA(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_RF_ID', value: val, inningHalf });
          }}
          dhId={inningHalf === 'top' ? dhIdB : dhIdA}
          onUpdateDhId={(val) => {
            if (inningHalf === 'top') setDhIdB(val);
            else setDhIdA(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_DH_ID', value: val, inningHalf });
          }}
          onUpdatePlayerBattingOrder={handleUpdatePlayerBattingOrder}
          customPresets={customPresets}
          onSaveCustomPreset={handleSaveCustomPreset}
          onLoadCustomPreset={handleLoadCustomPreset}
          onDeleteCustomPreset={handleDeleteCustomPreset}
        />
        <footer className="mt-4 text-center text-[9px] text-zinc-650 bg-zinc-950/45 py-2 border-t border-zinc-900">
          <p>Sportscode Custom Draggable Tagger. Linked with Main Workspace.</p>
        </footer>
      </div>
    );
  }

  const handleTrackDragStart = (e: React.DragEvent, trackName: string) => {
    setDraggedTrackName(trackName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTrackDragOver = (e: React.DragEvent, trackName: string) => {
    e.preventDefault();
    setDragOverTrackName(trackName);
  };

  const handleTrackDrop = (e: React.DragEvent, targetTrackName: string, allTracks: string[]) => {
    e.preventDefault();
    if (!draggedTrackName || draggedTrackName === targetTrackName) return;

    const nextOrder = [...allTracks];
    const fromIdx = nextOrder.indexOf(draggedTrackName);
    const toIdx = nextOrder.indexOf(targetTrackName);

    if (fromIdx !== -1 && toIdx !== -1) {
      nextOrder.splice(fromIdx, 1);
      nextOrder.splice(toIdx, 0, draggedTrackName);
      setTimelineTrackOrder(nextOrder);
      localStorage.setItem('timeline_track_order', JSON.stringify(nextOrder));
    }
  };

  const handleTrackDragEnd = () => {
    setDraggedTrackName(null);
    setDragOverTrackName(null);
  };

  const handlePopoutCodeWindow = () => {
    const width = Math.floor(window.screen.width * 0.45);
    const height = Math.floor(window.screen.height * 0.9);
    const left = window.screen.width - width;
    const top = 20;
    window.open('#code', 'Sportscode Code Window', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
  };

  // --- RENDER ROUTER: MAIN WORKSPACE (Video Player & Simple Tag Logs list) ---
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased relative">
      {/* Global Toast Notification */}
      {globalToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/95 border border-emerald-500/80 text-emerald-200 px-4 py-2 rounded-xl shadow-2xl font-extrabold text-xs flex items-center gap-2 backdrop-blur animate-bounce pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span>{globalToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <header className="px-3 py-2 xl:px-4 xl:py-2 bg-zinc-900/90 border-b border-zinc-850 backdrop-blur-md flex flex-wrap gap-2 items-center justify-between sticky top-0 z-40 w-full max-w-full overflow-x-hidden">
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-emerald-600 p-1.5 rounded-lg text-white shadow-lg shadow-emerald-900/30 shrink-0">
            <Tv className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5 truncate">
              <span>{appLanguage === 'en' ? 'Sports Video Tagger & Stats Logger' : 'スポーツビデオタグ＆スタッツロガー'}</span>
            </h1>
          </div>
        </div>

        {/* Workspace select tab and popout buttons */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0 max-w-full">
          <div className="flex flex-wrap bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 shadow-inner select-none gap-0.5">
            <button
              onClick={() => handleViewChange('tagger')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                currentView === 'tagger'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              📹 {appLanguage === 'en' ? 'Tagger' : 'タグ記録'}
            </button>
            <button
              onClick={() => handleViewChange('organizer')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                currentView === 'organizer'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              📁 {appLanguage === 'en' ? 'Organizer' : 'オーガナイザー'}
            </button>
            <button
              onClick={() => handleViewChange('matrix')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                currentView === 'matrix'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              🧮 {appLanguage === 'en' ? 'Matrix' : 'マトリックス'}
            </button>
            <button
              onClick={() => handleViewChange('analytics')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                currentView === 'analytics'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              📊 {appLanguage === 'en' ? 'Analytics' : '自動分析'}
            </button>
            <button
              onClick={() => handleViewChange('live_tagger')}
              className={`px-2 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer border ${
                currentView === 'live_tagger'
                  ? 'bg-gradient-to-r from-amber-600 to-emerald-600 border-amber-400 text-white shadow shadow-amber-950'
                  : 'bg-zinc-900/80 border-amber-900/50 text-amber-300 hover:text-white hover:bg-zinc-800'
              }`}
              title="動画ファイルを使わずに、タイマーに合わせてリアルタイムに打刻・記録します"
            >
              ⏱️ {appLanguage === 'en' ? 'No-Video Tagger' : '動画なし打刻 (現地)'}
            </button>
            <button
              onClick={() => handleViewChange('ai_receiver')}
              className={`px-2 py-1 rounded text-[10px] font-extrabold transition-all cursor-pointer border ${
                currentView === 'ai_receiver'
                  ? 'bg-gradient-to-r from-sky-600 to-indigo-600 border-sky-400 text-white shadow shadow-sky-950'
                  : 'bg-zinc-900/80 border-sky-900/50 text-sky-300 hover:text-white hover:bg-zinc-800'
              }`}
              title="Python画像解析AIからローカルPOSTされる投球判定をリアルタイム受信し、1タップで即座に修正します"
            >
              🤖 {appLanguage === 'en' ? 'AI Live Receiver' : 'AI自動受信・修正'}
            </button>
          </div>

          {/* Change / Open Video Button */}
          <button
            onClick={() => videoFileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-900 text-[9px] font-bold text-emerald-300 hover:text-white rounded-lg cursor-pointer transition-colors shadow"
            title="新しい動画ファイルを読み込みます"
          >
            <Upload className="w-3 h-3 text-emerald-400" />
            {appLanguage === 'en' ? 'Open Video' : '動画変更'}
          </button>
          <input
            type="file"
            ref={videoFileInputRef}
            onChange={handleVideoFileChange}
            accept="video/*"
            className="hidden"
          />

          {/* Code Window popout button */}
          <button
            onClick={handlePopoutCodeWindow}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[9px] font-bold text-sky-400 hover:text-sky-300 rounded-lg cursor-pointer transition-colors"
            title="コード入力画面を別ウィンドウで開きます"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            {appLanguage === 'en' ? 'Code Window' : 'コード画面'}
          </button>

          {/* Update button: ONLY show on Desktop Electron app */}
          {typeof window !== 'undefined' && !!(window as any).electronAPI && (
            <button
              onClick={handleCheckForUpdates}
              className={`flex items-center gap-1 px-2 py-1 border text-[9px] font-bold rounded-lg cursor-pointer transition-colors shadow ${
                updateStatus === 'ready'
                  ? 'bg-emerald-700 border-emerald-500 text-white hover:bg-emerald-600 animate-pulse'
                  : updateStatus === 'available'
                  ? 'bg-amber-700/80 border-amber-500 text-white hover:bg-amber-600'
                  : updateStatus === 'downloading'
                  ? 'bg-sky-900/60 border-sky-700 text-sky-300 cursor-not-allowed'
                  : 'bg-rose-950/40 border-rose-800/80 hover:bg-rose-900/60 text-rose-400 hover:text-white'
              }`}
              title="アプリの更新を確認します"
              disabled={updateStatus === 'downloading' || updateStatus === 'checking'}
            >
              <RefreshCw className={`w-2.5 h-2.5 ${
                updateStatus === 'checking' || updateStatus === 'downloading'
                  ? 'animate-spin text-sky-400'
                  : updateStatus === 'ready' ? 'text-emerald-300'
                  : 'text-rose-500'
              }`} />
              {updateStatus === 'idle' && (appLanguage === 'en' ? 'Check Updates' : '更新確認')}
              {updateStatus === 'checking' && '確認中...'}
              {updateStatus === 'not-available' && '最新版です'}
              {updateStatus === 'available' && `v${updateInfo?.version}更新`}
              {updateStatus === 'downloading' && `${updateProgress}%`}
              {updateStatus === 'ready' && '適用して再起動'}
            </button>
          )}

          {/* User profile & Settings */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[9px] shrink-0">
            <span className="font-bold text-zinc-300 truncate max-w-[80px] sm:max-w-[120px]">
              👤 {usersDb[currentUser]?.name || currentUser}
            </span>

            {/* ⚙️ App Settings button */}
            <button
              onClick={() => {
                setSettingsTab('password');
                setIsSettingsModalOpen(true);
              }}
              className="flex items-center gap-0.5 bg-zinc-800 hover:bg-zinc-700 text-[9px] font-bold text-zinc-300 hover:text-white px-1.5 py-0.5 rounded cursor-pointer transition-colors border border-zinc-750"
              title="設定・パスワード変更・お問い合わせを開きます"
            >
              ⚙️ {appLanguage === 'en' ? 'Settings' : '設定'}
            </button>

            {currentUser === 'admin' && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-1 bg-emerald-700/80 hover:bg-emerald-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                title="アカウント契約・ライセンス管理を開きます"
              >
                <Users className="w-2.5 h-2.5" />
                {appLanguage === 'en' ? 'Admin' : '管理'}
              </button>
            )}

            <button
              onClick={() => {
                window.localStorage.removeItem('sportscode_current_user');
                window.localStorage.setItem('sportscode_is_logged_in', 'false');
                setIsLoggedIn(false);
                setCurrentUser('');
                channelRef.current?.postMessage({ type: 'SYNC_USER_LOGGED_OUT' });
                window.location.reload();
              }}
              className="font-black text-rose-400 hover:text-rose-300 ml-0.5 hover:underline cursor-pointer bg-transparent border-0 p-0 text-[9px]"
              title="ログアウトします"
            >
              {appLanguage === 'en' ? 'Logout' : 'ログアウト'}
            </button>
          </div>
        </div>
      </header>

      {/* 🔑 自身のパスワード変更モーダル (一時パスワードでのログイン時、またはヘッダーボタンより動起) */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 relative">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span className="text-emerald-400">🔑</span> パスワードの設定・変更
              </h3>
              <p className="text-[10px] text-zinc-400 mt-1">
                {window.localStorage.getItem('sportscode_logged_in_with_temp') === 'true'
                  ? '⚠️ 一時パスワードでログインされています。セキュリティのため、ご希望の新しい本パスワードを設定してください。'
                  : '新しいパスワードを入力して更新してください。'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-400">新しいパスワード</label>
                <input
                  type="password"
                  placeholder="新しいパスワードを入力"
                  value={changeNewPass}
                  onChange={(e) => setChangeNewPass(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-400">確認のため再入力</label>
                <input
                  type="password"
                  placeholder="もう一度入力"
                  value={changeConfirmPass}
                  onChange={(e) => setChangeConfirmPass(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              {changePassError && (
                <p className="text-[10px] text-rose-400 font-bold bg-rose-950/30 border border-rose-900/30 p-2 rounded-lg">
                  ⚠️ {changePassError}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                {window.localStorage.getItem('sportscode_logged_in_with_temp') !== 'true' && (
                  <button
                    onClick={() => {
                      setShowPasswordChangeModal(false);
                      setChangePassError(null);
                    }}
                    className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    キャンセル
                  </button>
                )}
                <button
                  onClick={handleChangeOwnPassword}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow cursor-pointer"
                >
                  保存して更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. SHARED PERSISTENT VIDEO CONTAINER (Never unmounted, prevents black screen/reset bugs) */}
      {videoUrl && (
        <div 
          style={{ display: currentView === 'analytics' || currentView === 'matrix' || currentView === 'live_tagger' || currentView === 'ai_receiver' ? 'none' : 'block' }}
          className={`shrink-0 w-full transition-all duration-300 ${
            currentView === 'organizer' && activeOrganizerTab === 'grid'
              ? 'sticky top-[52px] z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 shadow-xl max-w-full px-4 py-3'
              : currentView === 'organizer'
              ? (activeOrganizerTab === 'grid' ? 'max-w-2xl mx-auto p-2 lg:p-4' : 'max-w-7xl mx-auto p-2 lg:p-4')
              : 'max-w-5xl mx-auto p-4'
          }`}
        >
          <div className={currentView === 'organizer' && activeOrganizerTab === 'organizer' ? "grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch" : currentView === 'organizer' && activeOrganizerTab === 'grid' ? "max-w-3xl mx-auto" : ""}>
            <div className={currentView === 'organizer' && activeOrganizerTab === 'organizer' ? "lg:col-span-2 relative" : "relative"}>
              {currentView === 'organizer' && activeOrganizerTab === 'organizer' && orderedSelectedClips.length > 0 && !activePreviewClip && (
                <div className="absolute top-2 left-2 z-30 bg-emerald-950/90 border border-emerald-500/80 px-2.5 py-1 rounded-lg text-[9px] font-bold text-emerald-400 flex items-center gap-1.5 shadow-lg backdrop-blur">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping shrink-0" />
                  🎬 選択タグのみを連続再生中 (Sportscodeスキップ再生)
                </div>
              )}
              {activePreviewClip && (
                <div className="absolute top-2 left-2 z-30 bg-amber-950/90 border border-amber-500/80 px-2.5 py-1 rounded-lg text-[9px] font-bold text-amber-400 flex items-center gap-1.5 shadow-lg backdrop-blur">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shrink-0" />
                  🔂 クリップ個別ループ再生中 ({activePreviewClip.actionName})
                </div>
              )}
              <VideoPlayer
                ref={videoPlayerRef}
                onVideoLoaded={handleVideoLoaded}
                videoUrl={videoUrl}
                videoName={videoName}
                onTimeUpdate={(time) => {
                  setCurrentTime(time);
                  
                  // 1. Loop preview handler if active preview clip is playing
                  if (activePreviewClip) {
                    setNowPlayingClipId(activePreviewClip.id);
                    const video = videoPlayerRef.current?.getVideoElement();
                    if (video && time >= activePreviewClip.endTime) {
                      video.pause();
                      try {
                        if (video.readyState >= 1) {
                          video.currentTime = activePreviewClip.startTime;
                        }
                      } catch {}
                      // Loop replay
                      video.play().catch(() => {});
                    }
                    return; // Skip playlist logic during individual loop preview
                  }

                  // 2. Play only selected clips continuously (Organizer Playlist Mode)
                  if (currentView === 'organizer' && activeOrganizerTab === 'organizer' && orderedSelectedClips.length > 0) {
                    const video = videoPlayerRef.current?.getVideoElement();
                    if (video && !video.paused) {
                      // Find if playhead is currently inside any of the selected clips
                      const currentClip = orderedSelectedClips.find((clip: TaggedEvent) => time >= clip.startTime - 0.1 && time <= clip.endTime);

                      if (currentClip) {
                        setNowPlayingClipId(currentClip.id);
                        // If current clip ends, skip to next clip's startTime immediately
                        if (time >= currentClip.endTime - 0.05) {
                          const nextIdx = orderedSelectedClips.indexOf(currentClip) + 1;
                          if (nextIdx < orderedSelectedClips.length) {
                            const nextClip = orderedSelectedClips[nextIdx];
                            setNowPlayingClipId(nextClip.id);
                            try {
                              if (video.readyState >= 1) {
                                video.currentTime = nextClip.startTime;
                              }
                            } catch {}
                          } else {
                            // End of playlist: pause and rewind to first selected clip
                            video.pause();
                            setNowPlayingClipId(null);
                            try {
                              if (video.readyState >= 1) {
                                video.currentTime = orderedSelectedClips[0].startTime;
                              }
                            } catch {}
                          }
                        }
                      } else {
                        // If currently playing in an unselected gap, skip forward to the next future selected clip
                        const nextClip = orderedSelectedClips.find((clip: TaggedEvent) => clip.startTime > time);
                        if (nextClip) {
                          setNowPlayingClipId(nextClip.id);
                          try {
                            if (video.readyState >= 1) {
                              video.currentTime = nextClip.startTime;
                            }
                          } catch {}
                        } else {
                          // No future selected clips: pause and rewind to the very first one
                          video.pause();
                          setNowPlayingClipId(null);
                          try {
                            if (video.readyState >= 1) {
                              video.currentTime = orderedSelectedClips[0].startTime;
                            }
                          } catch {}
                        }
                      }
                    } else {
                      setNowPlayingClipId(null);
                    }
                  } else {
                    setNowPlayingClipId(null);
                  }
                }}
              />
            </div>

            {/* Live Tagging Timer Panel (When no video file is loaded) */}
            {!videoUrl && (
              <div className="bg-zinc-900/90 border border-emerald-800/60 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-950 border border-emerald-700/80 rounded-xl text-emerald-400 font-extrabold text-lg">
                    ⏱️
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      ライブ打刻モード
                      <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-400 text-[8px] font-bold rounded-full">
                        LIVE
                      </span>
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      リアルタイムタイマーに連動して打刻・記録できます。
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono">
                    <span className="text-2xl font-black text-emerald-400">
                      {formatTime(liveTimerSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsLiveTimerRunning(!isLiveTimerRunning)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all shadow active:scale-95 ${
                        isLiveTimerRunning
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isLiveTimerRunning ? '⏸️ 一時停止' : '▶️ ライブタイマースタート'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLiveTimerRunning(false);
                        setLiveTimerSeconds(0);
                      }}
                      className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer"
                      title="経過時間を00:00にリセット"
                    >
                      ↺ リセット
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Clip Organizer Tools panel */}
            {currentView === 'organizer' && activeOrganizerTab === 'organizer' && (
              <div className="bg-[#111827] border border-zinc-800/80 p-4 rounded-2xl shadow-xl flex flex-col justify-between gap-3 max-h-[220px] sm:max-h-[260px] md:max-h-[280px] overflow-y-auto">
                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/40 shrink-0">
                  <button
                    onClick={() => setIsGuideOpen(!isGuideOpen)}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-xs font-bold text-zinc-355 hover:text-white transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 text-[10px]">
                      <Command className="w-3 h-3 text-emerald-400" />
                      ❓ 操作ガイドを表示/閉じる
                    </span>
                    <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform duration-300 ${isGuideOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isGuideOpen && (
                    <div className="px-3 pb-2 text-[10px] text-zinc-400 space-y-1 border-t border-zinc-850 pt-1.5 bg-zinc-950/20">
                      <p><strong className="text-emerald-400">ダブルクリックプレビュー:</strong> カードをダブルクリックするとクリップ区間（In〜Out）をループ再生します。</p>
                      <p><strong className="text-emerald-400">連続スキップ再生:</strong> グリッドでチェックを入れた状態で再生すると、チェックしたプレイ区間のみを自動でスキップしながら連続再生します。</p>
                      <p><strong className="text-emerald-400">トリマー:</strong> カード下部の「IN/OUT」の「+/-」で開始・終了秒を微調整できます。</p>
                      <p><strong className="text-emerald-400">エクスポート:</strong> 個別出力か結合（ダイジェスト）かを選んでダウンロード可能です。</p>
                    </div>
                  )}
                </div>

                <div className="bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-855 flex flex-col gap-1 shrink-0">
                  <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 block leading-none">
                    📁 エクスポート設定
                  </span>
                  <div className="flex gap-4 mt-0.5">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="radio"
                        name="exportMode"
                        checked={exportMode === 'individual'}
                        onChange={() => setExportMode('individual')}
                        className="accent-emerald-500 w-3.5 h-3.5"
                      />
                      個別ファイル
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="radio"
                        name="exportMode"
                        checked={exportMode === 'combined'}
                        onChange={() => setExportMode('combined')}
                        className="accent-emerald-500 w-3.5 h-3.5"
                      />
                      1つに結合 (ダイジェスト)
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-auto shrink-0">
                  <button
                    onClick={handleExportSelectedClips}
                    disabled={selectedIds.size === 0}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all shadow ${
                      selectedIds.size > 0
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 cursor-pointer shadow-lg'
                        : 'bg-zinc-900/50 text-zinc-650 border border-zinc-900 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {exportMode === 'combined' ? 'ダイジェスト動画として結合書き出し' : '選択クリップをMP4書き出し'}
                  </button>

                  <button
                    onClick={handleGenerateFFmpegScript}
                    disabled={selectedIds.size === 0}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      selectedIds.size > 0
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-sky-400 border border-zinc-700 active:scale-95 cursor-pointer'
                        : 'bg-zinc-900/50 text-zinc-655 border border-zinc-900 cursor-not-allowed opacity-40'
                    }`}
                  >
                    <Scissors className="w-3 h-3 text-sky-400" />
                    FFmpeg高速無劣化抽出 (.command)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. RENDER ACTIVE SCREEN VIEW */}
      {currentView === 'organizer' ? (
        <OrganizerView
          events={events}
          videoDuration={videoDuration}
          onSeek={handleSeek}
          onUpdateEvents={(updatedEvents) => {
            setEvents(updatedEvents);
            channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: updatedEvents });
          }}
          activeTab={activeOrganizerTab}
          onChangeTab={(tab) => {
            setActiveOrganizerTab(tab);
            if (tab === 'grid' && activePreviewClip) {
              setActivePreviewClip(null);
              const video = videoPlayerRef.current?.getVideoElement();
              if (video) {
                video.pause();
                if (prePreviewTime !== null) {
                  video.currentTime = prePreviewTime;
                  setCurrentTime(prePreviewTime);
                  setPrePreviewTime(null);
                }
              }
            }
          }}
          selectedIds={selectedIds}
          onUpdateSelectedIds={setSelectedIds}
          exportProgress={exportProgress}
          activePreviewClip={activePreviewClip}
          nowPlayingClipId={nowPlayingClipId}
          onPreviewClip={handlePreviewClip}
          onClearPreviewClip={() => {
            setActivePreviewClip(null);
            const video = videoPlayerRef.current?.getVideoElement();
            if (video) {
              video.pause();
              if (prePreviewTime !== null) {
                video.currentTime = prePreviewTime;
                setCurrentTime(prePreviewTime);
                setPrePreviewTime(null);
              }
            }
          }}
          onSetTimePoint={(eventId, type) => {
            const video = videoPlayerRef.current?.getVideoElement();
            if (video) {
              const cur = Number(video.currentTime.toFixed(2));
              const updated = events.map(ev => {
                if (ev.id !== eventId) return ev;
                if (type === 'start') {
                  return { ...ev, startTime: Math.min(cur, ev.endTime - 0.2) };
                } else {
                  return { ...ev, endTime: Math.max(cur, ev.startTime + 0.2) };
                }
              });
              setEvents(updated);
              if (activePreviewClip && activePreviewClip.id === eventId) {
                const found = updated.find(ev => ev.id === eventId);
                if (found) setActivePreviewClip(found);
              }
            }
          }}
        />
      ) : currentView === 'matrix' ? (
        <MatrixView
          events={events}
          onOpenMatrixPlayer={handleOpenMatrixPlayer}
        />
      ) : currentView === 'analytics' ? (
        <AnalyticsDashboard
          currentEvents={events}
          players={players}
          teamAName={teamAName}
          teamBName={teamBName}
          currentUser={currentUser}
        />
      ) : currentView === 'ai_receiver' ? (
        /* 🤖 外部AI リアルタイム自動受信 ＆ ワンタップ即時修正画面 */
        <AiLiveStatReceiver
          events={events}
          players={players}
          teamAName={teamAName || '先攻チーム'}
          teamBName={teamBName || '後攻チーム'}
          initialPitcherA={pitcherA || '投手A'}
          initialPitcherB={pitcherB || '投手B'}
          pitcherA={pitcherA}
          pitcherB={pitcherB}
          onUpdatePitcherA={(val) => {
            setPitcherA(val);
            channelRef.current?.postMessage({ type: 'UPDATE_PITCHER_A', value: val });
          }}
          onUpdatePitcherB={(val) => {
            setPitcherB(val);
            channelRef.current?.postMessage({ type: 'UPDATE_PITCHER_B', value: val });
          }}
          defense={inningHalf === 'top' ? defenseB : defenseA}
          onUpdateDefense={(val) => {
            if (inningHalf === 'top') {
              setDefenseB(val);
              channelRef.current?.postMessage({ type: 'UPDATE_DEFENSE_B', value: val });
            } else {
              setDefenseA(val);
              channelRef.current?.postMessage({ type: 'UPDATE_DEFENSE_A', value: val });
            }
          }}
          catcherId={inningHalf === 'top' ? catcherIdB : catcherIdA}
          onUpdateCatcherId={id => inningHalf === 'top' ? setCatcherIdB(id) : setCatcherIdA(id)}
          inf1Id={inningHalf === 'top' ? inf1IdB : inf1IdA}
          onUpdateInf1Id={id => inningHalf === 'top' ? setInf1IdB(id) : setInf1IdA(id)}
          inf2Id={inningHalf === 'top' ? inf2IdB : inf2IdA}
          onUpdateInf2Id={id => inningHalf === 'top' ? setInf2IdB(id) : setInf2IdA(id)}
          inf3Id={inningHalf === 'top' ? inf3IdB : inf3IdA}
          onUpdateInf3Id={id => inningHalf === 'top' ? setInf3IdB(id) : setInf3IdA(id)}
          inf4Id={inningHalf === 'top' ? inf4IdB : inf4IdA}
          onUpdateInf4Id={id => inningHalf === 'top' ? setInf4IdB(id) : setInf4IdA(id)}
          lfId={inningHalf === 'top' ? lfIdB : lfIdA}
          onUpdateLfId={id => inningHalf === 'top' ? setLfIdB(id) : setLfIdA(id)}
          cfId={inningHalf === 'top' ? cfIdB : cfIdA}
          onUpdateCfId={id => inningHalf === 'top' ? setCfIdB(id) : setCfIdA(id)}
          rfId={inningHalf === 'top' ? rfIdB : rfIdA}
          onUpdateRfId={id => inningHalf === 'top' ? setRfIdB(id) : setRfIdA(id)}
          dhId={inningHalf === 'top' ? dhIdB : dhIdA}
          onUpdateDhId={id => inningHalf === 'top' ? setDhIdB(id) : setDhIdA(id)}
          onUpdatePlayerBattingOrder={handleUpdatePlayerBattingOrder}
          onUpdatePlayerHand={handleUpdatePlayerHand}
          onUpdatePlayerThrows={handleUpdatePlayerThrows}
          onUpdatePlayerBats={handleUpdatePlayerBats}
          activePlayerId={activePlayerId}
          onSelectPlayer={(id) => {
            setActivePlayerId(id);
            channelRef.current?.postMessage({ type: 'UPDATE_ACTIVE_PLAYER', activePlayerId: id });
          }}
          currentTime={currentTime}
          inningNum={inningNum}
          inningHalf={inningHalf}
          videoUrl={videoUrl}
          videoName={videoName}
          onSeek={(time) => {
            const video = videoPlayerRef.current?.getVideoElement();
            if (video) video.currentTime = time;
          }}
          onUpdateInning={(num, half) => {
            setInningNum(num);
            setInningHalf(half);
          }}
          onNavigateToMatrix={() => handleViewChange('matrix')}
          onNavigateToOrganizer={() => handleViewChange('organizer')}
          onAddEvent={(newEvent) => {
            // Use startTime/endTime and resolved playerName from AI
            const ev: TaggedEvent = {
              id: newEvent.id || `event_ai_${Date.now()}`,
              timestamp: newEvent.timestamp ?? newEvent.startTime ?? currentTime,
              startTime: newEvent.startTime ?? Math.max(0, currentTime - 2),
              endTime: newEvent.endTime ?? (currentTime + 3),
              actionId: newEvent.actionId || 'btn_pitch',
              actionName: newEvent.actionName || '投球',
              color: newEvent.color || 'bg-amber-600',
              playerName: newEvent.playerName || (inningHalf === 'top' ? (pitcherB || '投手B') : (pitcherA || '投手A')),
              labels: newEvent.labels || {},
              createdAt: Date.now(),
              gameDate: gameDate || new Date().toISOString().split('T')[0]
            };
            setEvents(prev => [...prev, ev]);
            channelRef.current?.postMessage({ type: 'SYNC_EVENTS', events: [...events, ev] });
          }}
        />
      ) : currentView === 'live_tagger' ? (
        /* ⏱️ 動画なし・超軽量ライブタギング専用画面 (Memory Leak & Crash FREE) */
        <main className="flex-1 p-4 lg:p-6 max-w-[1700px] mx-auto w-full flex flex-col gap-5 min-w-0">
          {/* Header Timer Bar */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-amber-900/50 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-amber-950/80 border border-amber-800/80 rounded-2xl text-amber-400 font-extrabold text-2xl shadow">
                ⏱️
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  動画なし・現地ライブ打刻
                  <span className="px-2.5 py-0.5 bg-amber-950/90 border border-amber-800 text-amber-400 text-[9px] font-bold rounded-full">
                    動画不要モード
                  </span>
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  動画ファイルを使わずに、試合タイマーに合わせて現地でリアルタイムに投球・打撃ログを打刻・記録できます。
                </p>
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-2.5 sm:gap-3 w-full md:w-auto">
              <div className="text-center md:text-right font-mono bg-black/70 border border-zinc-800 px-4 py-1.5 rounded-xl shadow-inner min-w-[130px]">
                <span className="text-2xl sm:text-3xl font-black text-amber-400">
                  {formatTime(liveTimerSeconds)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setIsLiveTimerRunning(!isLiveTimerRunning)}
                  className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all shadow-lg active:scale-95 flex items-center gap-1.5 ${
                    isLiveTimerRunning
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                  }`}
                >
                  {isLiveTimerRunning ? '⏸️ 一時停止' : '▶️ スタート'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLiveTimerRunning(false);
                    setLiveTimerSeconds(0);
                  }}
                  className="px-3 py-2 sm:py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer active:scale-95"
                  title="タイマーを00:00にリセット"
                >
                  ↺ リセット
                </button>
                
                {/* Download / Export Data Buttons */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-2.5 py-2 sm:px-3 sm:py-2.5 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow flex items-center gap-1 active:scale-95 border border-sky-500/50"
                  title="全打刻データをCSVファイルとして保存"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="px-2.5 py-2 sm:px-3 sm:py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow flex items-center gap-1 active:scale-95 border border-indigo-500/50"
                  title="全打刻データをJSON形式で保存"
                >
                  <Download className="w-3.5 h-3.5" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={handleExportXML}
                  className="px-2.5 py-2 sm:px-3 sm:py-2.5 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow flex items-center gap-1 active:scale-95 border border-purple-500/50"
                  title="XMLフォーマットで保存"
                >
                  <Download className="w-3.5 h-3.5" />
                  XML
                </button>
              </div>
            </div>
          </div>

          {/* Visual Timeline Section for Live Tagger (コードウィンドウの上に配置) */}
          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-white flex items-center gap-2">
                <span>📊 ビジュアルタイムライン (リアルタイム打刻ログ)</span>
                <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                  LIVE EDITABLE
                </span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLiveRosterOpen(!isLiveRosterOpen)}
                  className="px-2.5 py-1 bg-amber-950/80 border border-amber-800/80 hover:bg-amber-900 text-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow"
                >
                  <Users className="w-3 h-3" /> {isLiveRosterOpen ? '✕ 選手管理を閉じる' : '👥 選手・チーム登録'}
                </button>
                <span className="text-[9.5px] text-zinc-400">
                  打刻したタグの編集・微調整が可能です
                </span>
              </div>
            </div>

            {/* Inline Player & Roster Manager Panel for Live Tagger */}
            {isLiveRosterOpen && (
              <div className="bg-zinc-900/90 border border-amber-900/60 rounded-xl p-4 mt-1 animate-fadeIn">
                <h4 className="text-xs font-black text-amber-400 mb-3 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> チーム＆選手名簿の登録・編集
                </h4>
                <PlayerManager
                  players={players}
                  activePlayerId={activePlayerId}
                  onSelectPlayer={setActivePlayerId}
                  onAddPlayer={handleAddPlayer}
                  onDeletePlayer={handleDeletePlayer}
                  teamAName={teamAName}
                  teamBName={teamBName}
                  onUpdateTeamAName={handleUpdateTeamAName}
                  onUpdateTeamBName={handleUpdateTeamBName}
                  teamAColor={teamAColor}
                  teamBColor={teamBColor}
                  onUpdateTeamAColor={(val) => { setTeamAColor(val); channelRef.current?.postMessage({ type: 'UPDATE_TEAMA_COLOR', value: val }); }}
                  onUpdateTeamBColor={(val) => { setTeamBColor(val); channelRef.current?.postMessage({ type: 'UPDATE_TEAMB_COLOR', value: val }); }}
                  onImportRoster={handleImportRoster}
                  onTogglePlayerPosition={handleTogglePlayerPosition}
                  onClearRoster={handleClearRoster}
                  onUpdatePlayerThrows={handleUpdatePlayerThrows}
                  onUpdatePlayerBats={handleUpdatePlayerBats}
                />
              </div>
            )}

            <EventTimeline
              events={events}
              players={players}
              videoDuration={Math.max(
                events.reduce((mx, e) => Math.max(mx, e.endTime), 0) + 30,
                liveTimerSeconds + 30,
                60
              )}
              currentVideoTime={liveTimerSeconds}
              onSeek={(t) => setLiveTimerSeconds(t)}
              onDeleteEvent={handleDeleteSelectedEvent}
              onContextMenu={(e, eventId, activeGroup) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, eventId, activeGroup });
              }}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
            />
          </div>

          {/* Direct Code Window Controls (タイムラインの下に配置) */}
          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850 shadow-xl">
            <CodeWindowDesigner
              buttons={buttons}
              onAddButton={handleAddButton}
              onUpdateButton={handleUpdateButton}
              onDeleteButton={handleDeleteButton}
              onUpdateButtons={handleUpdateButtons}
              onLoadTemplate={handleLoadTemplate}
              onTriggerButton={handleTriggerButtonDirectly}
              activeEventName={activeEventName}
              preSelectedLabels={preSelectedLabels}

              players={players}
              onUpdatePlayerHand={handleUpdatePlayerHand}
              onUpdatePlayerThrows={handleUpdatePlayerThrows}
              onUpdatePlayerBats={handleUpdatePlayerBats}
              activePlayerId={activePlayerId}
              onSelectPlayer={setActivePlayerId}

              pitchSpeedInput={pitchSpeedInput}
              onUpdatePitchSpeedInput={(val) => {
                setPitchSpeedInput(val);
                const formattedVal = val ? (val.endsWith('km/h') ? val : `${val}km/h`) : '';
                const targetId = selectedEventId || activeEventId;
                if (targetId && formattedVal) {
                  setEvents(prevEvents =>
                    prevEvents.map(ev => {
                      if (ev.id === targetId) {
                        return {
                          ...ev,
                          labels: {
                            ...ev.labels,
                            '球速': formattedVal,
                            'Pitch Speed': formattedVal,
                            'PITCH_SPEED': formattedVal
                          }
                        };
                      }
                      return ev;
                    })
                  );
                }
              }}

              balls={balls}
              strikes={strikes}
              outs={outs}
              onIncrementBall={() => setBalls(prev => (prev + 1) % 4)}
              onIncrementStrike={() => setStrikes(prev => (prev + 1) % 3)}
              onIncrementOut={() => setOuts(prev => (prev + 1) % 3)}
              onResetScoreboard={() => { setBalls(0); setStrikes(0); setOuts(0); }}

              pitcherA={pitcherA}
              onUpdatePitcherA={setPitcherA}
              pitcherB={pitcherB}
              onUpdatePitcherB={setPitcherB}
              defense={inningHalf === 'top' ? defenseB : defenseA}
              onUpdateDefense={val => inningHalf === 'top' ? setDefenseB(val) : setDefenseA(val)}
              selectedCourse={selectedCourse}
              onSelectCourse={setSelectedCourse}
              plottedHit={plottedHit}
              onUpdatePlottedHit={setPlottedHit}
              coursePerspective={coursePerspective}
              onTogglePerspective={() => setCoursePerspective(prev => prev === 'pitcher' ? 'catcher' : 'pitcher')}
              hotkeysEnabled={hotkeysEnabled}
              onToggleHotkeys={() => setHotkeysEnabled(!hotkeysEnabled)}

              teamAName={teamAName}
              teamBName={teamBName}

              inningNum={inningNum}
              onUpdateInningNum={setInningNum}
              inningHalf={inningHalf}
              onUpdateInningHalf={setInningHalf}
              runner1BId={runner1BId}
              onUpdateRunner1BId={setRunner1BId}
              runner2BId={runner2BId}
              onUpdateRunner2BId={setRunner2BId}
              runner3BId={runner3BId}
              onUpdateRunner3BId={setRunner3BId}

              catcherId={inningHalf === 'top' ? catcherIdB : catcherIdA}
              onUpdateCatcherId={id => inningHalf === 'top' ? setCatcherIdB(id) : setCatcherIdA(id)}
              inf1Id={inningHalf === 'top' ? inf1IdB : inf1IdA}
              onUpdateInf1Id={id => inningHalf === 'top' ? setInf1IdB(id) : setInf1IdA(id)}
              inf2Id={inningHalf === 'top' ? inf2IdB : inf2IdA}
              onUpdateInf2Id={id => inningHalf === 'top' ? setInf2IdB(id) : setInf2IdA(id)}
              inf3Id={inningHalf === 'top' ? inf3IdB : inf3IdA}
              onUpdateInf3Id={id => inningHalf === 'top' ? setInf3IdB(id) : setInf3IdA(id)}
              inf4Id={inningHalf === 'top' ? inf4IdB : inf4IdA}
              onUpdateInf4Id={id => inningHalf === 'top' ? setInf4IdB(id) : setInf4IdA(id)}

              lfId={inningHalf === 'top' ? lfIdB : lfIdA}
              onUpdateLfId={id => inningHalf === 'top' ? setLfIdB(id) : setLfIdA(id)}
              cfId={inningHalf === 'top' ? cfIdB : cfIdA}
              onUpdateCfId={id => inningHalf === 'top' ? setCfIdB(id) : setCfIdA(id)}
              rfId={inningHalf === 'top' ? rfIdB : rfIdA}
              onUpdateRfId={id => inningHalf === 'top' ? setRfIdB(id) : setRfIdA(id)}

              dhId={inningHalf === 'top' ? dhIdB : dhIdA}
              onUpdateDhId={id => inningHalf === 'top' ? setDhIdB(id) : setDhIdA(id)}
              onUpdatePlayerBattingOrder={handleUpdatePlayerBattingOrder}
            />
          </div>
        </main>
      ) : (
        /* RENDER TAGGER WORKSPACE VIEW */
        <main className="flex-1 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto w-full flex flex-col gap-4 lg:gap-6 min-w-0 overflow-x-hidden">

          {/* Game Date Bar */}
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 shadow">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">📅 試合日</span>
            <input
              type="date"
              value={gameDate}
              onChange={e => {
                setGameDate(e.target.value);
                localStorage.setItem('sportscode_game_date', e.target.value);
              }}
              className="bg-zinc-950 border border-zinc-700 text-white font-mono text-sm px-3 py-1 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
            />
            {gameDate && (
              <span className="text-[10px] text-emerald-400 font-bold">
                ✓ この日付でタグが記録されます
              </span>
            )}
            {!gameDate && (
              <span className="text-[10px] text-zinc-600">
                ← 試合日を設定してからタグを打ってください
              </span>
            )}
            {gameDate && (
              <button
                onClick={() => {
                  setGameDate('');
                  localStorage.removeItem('sportscode_game_date');
                }}
                className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
              >
                ✕ クリア
              </button>
            )}
          </div>
        {/* Visual Timeline (Sportscode Style) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow">
          {/* Header */}
          <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-850 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-zinc-400 flex items-center gap-2">
              <Film className="w-4 h-4 text-emerald-400" />
              ビジュアルタイムライン (Sportscodeスタイル)
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 select-none">
              {/* Batch Mass Delete Selected Tags Button */}
              {timelineSelectedIds.size > 0 && (
                <button
                  onClick={handleBatchDeleteSelectedEvents}
                  className="px-2.5 py-1 bg-rose-950/90 border border-rose-800 text-rose-300 hover:text-white hover:bg-rose-900 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all shadow shadow-rose-950/60 active:scale-95 animate-pulse"
                  title="選択されている複数のタグを一括消去します"
                >
                  🗑️ 選択タグをまとめて削除 ({timelineSelectedIds.size}件)
                </button>
              )}

              {/* Zoom controls */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 gap-1.5 text-zinc-400">
                <span className="text-[9px] font-bold">🔍 ズーム: {timelineZoom}%</span>
                <button 
                  onClick={() => setTimelineZoom(prev => Math.max(100, prev - 100))}
                  className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px] font-bold flex items-center justify-center cursor-pointer active:scale-95"
                  title="ズームアウト (トラックパッドピンチでも可)"
                >-</button>
                <button 
                  onClick={() => setTimelineZoom(prev => Math.min(2000, prev + 100))}
                  className="w-5 h-5 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[10px] font-bold flex items-center justify-center cursor-pointer active:scale-95"
                  title="ズームイン (トラックパッドピンチでも可)"
                >+</button>
                <button 
                  onClick={() => setTimelineZoom(100)}
                  className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-350 hover:text-white rounded text-[8px] font-bold flex items-center justify-center cursor-pointer"
                >全体</button>
              </div>

              {/* Time Shift Control */}
              <button
                onClick={() => setIsTimeShiftModalOpen(true)}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sky-400 hover:text-sky-300 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95"
                title="タグの開始・終了時間を一括並行移動して同期"
              >
                ⏰ タイムシフト同期
              </button>

              {/* JSON Tags Import / Export */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-1.5 py-1 gap-1">
                <button
                  onClick={handleExportJSON}
                  disabled={events.length === 0}
                  className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                    events.length > 0
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 cursor-pointer'
                      : 'text-zinc-650 cursor-not-allowed'
                  }`}
                  title="軽量タグファイル(.json)を書き出す"
                >📤 保存</button>
                
                <label className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-[8px] font-bold cursor-pointer flex items-center justify-center">
                  📥 読込
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden" 
                  />
                </label>
              </div>

              <span className="text-[9px] font-mono bg-zinc-950 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded select-none">
                再生位置: {formatTime(currentTime)} / {formatTime(videoDuration)}
              </span>
            </div>
          </div>

          <div 
            ref={timelineScrollRef}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              const target = e.target as HTMLElement;
              if (target.closest('.timeline-tag-block')) return;
              const rect = timelineScrollRef.current?.getBoundingClientRect();
              if (!rect) return;
              const startX = e.clientX - rect.left + (timelineScrollRef.current?.scrollLeft || 0);
              const startY = e.clientY - rect.top;
              setIsBoxSelecting(true);
              setBoxSelectRect({ startX, startY, currentX: startX, currentY: startY });
              if (!e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
                setTimelineSelectedIds(new Set());
              }
            }}
            onMouseMove={(e) => {
              if (!isBoxSelecting || !boxSelectRect || !timelineScrollRef.current) return;
              const rect = timelineScrollRef.current.getBoundingClientRect();
              const currentX = e.clientX - rect.left + (timelineScrollRef.current.scrollLeft || 0);
              const currentY = e.clientY - rect.top;
              setBoxSelectRect(prev => prev ? ({ ...prev, currentX, currentY }) : null);

              const minX = Math.min(boxSelectRect.startX, currentX);
              const maxX = Math.max(boxSelectRect.startX, currentX);
              const totalD = Math.max(videoDuration, 60);
              const scrollW = timelineScrollRef.current.scrollWidth;
              const containerW = scrollW - 112;

              const nextSelected = new Set(timelineSelectedIds);
              events.forEach(ev => {
                const leftPx = 112 + (ev.startTime / totalD) * containerW;
                const rightPx = 112 + (ev.endTime / totalD) * containerW;
                if (rightPx >= minX && leftPx <= maxX) {
                  nextSelected.add(ev.id);
                }
              });
              setTimelineSelectedIds(nextSelected);
            }}
            onMouseUp={() => {
              setIsBoxSelecting(false);
              setBoxSelectRect(null);
            }}
            className="flex flex-col bg-zinc-950/45 p-1 select-none overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-850 scrollbar-track-transparent relative"
          >
            <div 
              className="min-w-full flex flex-col relative h-fit"
              style={{ width: `${timelineZoom}%` }}
            >
              {/* Rubberband Drag Box Selection Overlay */}
              {isBoxSelecting && boxSelectRect && (
                <div
                  className="absolute border border-emerald-400 bg-emerald-500/20 z-40 pointer-events-none rounded shadow-lg shadow-emerald-950/50"
                  style={{
                    left: `${Math.min(boxSelectRect.startX, boxSelectRect.currentX)}px`,
                    top: `${Math.min(boxSelectRect.startY, boxSelectRect.currentY)}px`,
                    width: `${Math.abs(boxSelectRect.currentX - boxSelectRect.startX)}px`,
                    height: `${Math.abs(boxSelectRect.currentY - boxSelectRect.startY)}px`
                  }}
                />
              )}
              {/* Playhead line (spans all tracks including Ruler) */}
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-30 pointer-events-none transition-all duration-75"
                style={{ 
                  left: `calc(112px + ${(currentTime / Math.max(videoDuration, 60)) * 100}% * (100% - 112px) / 100)`,
                  height: '100%'
                }}
              >
                {/* Red playhead handle triangle at top */}
                <div className="absolute top-0 -left-1 w-2.5 h-2.5 bg-rose-500 rotate-45 border-b border-r border-rose-600"></div>
              </div>

              {/* Timeline Ruler Row */}
              <div className="flex border-b border-zinc-850 w-full">
                <div className="w-28 border-r border-zinc-850 flex items-center justify-center bg-zinc-950 text-[9px] font-black text-zinc-550 select-none shrink-0">
                  コード行
                </div>
                <div 
                  onMouseDown={handleRulerMouseDown}
                  className="flex-1 h-6 relative bg-zinc-950/80 text-[8px] font-mono text-zinc-500 overflow-hidden cursor-ew-resize select-none"
                >
                  {(() => {
                    const totalD = Math.max(videoDuration, 60);
                    
                    // Estimate width of the ruler area to calculate maximum safe tick count (prevent text overlapping)
                    const baseWidth = 800; // Estimated timeline base width at 100%
                    const currentWidth = baseWidth * (timelineZoom / 100);
                    const maxTicks = Math.floor(currentWidth / 75); // Ensure at least 75px per text label

                    // Determine the best step size based on zoom and total duration
                    const candidateSteps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];
                    let tickStep = 60;
                    for (const step of candidateSteps) {
                      if (totalD / step <= maxTicks) {
                        tickStep = step;
                        break;
                      }
                    }

                    const ticks = [];
                    for (let t = 0; t < totalD; t += tickStep) ticks.push(t);

                    return ticks.map(t => (
                      <div 
                        key={t} 
                        className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center h-full pt-1"
                        style={{ left: `${(t / totalD) * 100}%` }}
                      >
                        <span>{formatTime(t)}</span>
                        <div className="w-[1px] h-1 bg-zinc-800 mt-0.5"></div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Tracks Container */}
              <div className="relative flex flex-col w-full">

              {(() => {
                const presentActionNames = Array.from(new Set(events.map(e => e.actionName)));
                if (presentActionNames.length === 0) {
                  presentActionNames.push(activePresetName === 'baseball' ? 'Pitch (投球)' : 'Pitch');
                }

                // Resolve timeline sorting order
                const tracks = timelineTrackOrder.filter(t => presentActionNames.includes(t));
                presentActionNames.forEach(t => {
                  if (!tracks.includes(t)) {
                    tracks.push(t);
                  }
                });

                return tracks.map((trackName) => {
                  const trackEvents = events.filter(e => e.actionName === trackName);
                  const totalD = Math.max(videoDuration, 60);

                  const player = players.find(p => p.name === trackName);
                  const isTeamA = player ? player.teamName === teamAName : false;
                  const isTeamB = player ? player.teamName === teamBName : false;

                  const COLOR_THEMES: Record<string, { header: string, block: string }> = {
                    amber: {
                      header: 'text-amber-400 font-extrabold bg-amber-950/20',
                      block: 'bg-amber-650/80 border-amber-500/30 hover:bg-amber-500/90 text-amber-50 shadow-amber-950/25'
                    },
                    sky: {
                      header: 'text-sky-400 font-extrabold bg-sky-950/20',
                      block: 'bg-sky-600/80 border-sky-500/30 hover:bg-sky-500/90 text-sky-50 shadow-sky-950/25'
                    },
                    emerald: {
                      header: 'text-emerald-400 font-extrabold bg-emerald-950/20',
                      block: 'bg-emerald-650/80 border-emerald-500/30 hover:bg-emerald-500/90 text-emerald-50 shadow-emerald-950/25'
                    },
                    red: {
                      header: 'text-red-400 font-bold bg-red-950/20',
                      block: 'bg-red-650/80 border-red-500/30 hover:bg-red-500/90 text-red-50 shadow-red-950/25'
                    },
                    blue: {
                      header: 'text-blue-400 font-extrabold bg-blue-950/20',
                      block: 'bg-blue-600/80 border-blue-500/30 hover:bg-blue-500/90 text-blue-50 shadow-blue-950/25'
                    },
                    indigo: {
                      header: 'text-indigo-400 font-extrabold bg-indigo-950/20',
                      block: 'bg-indigo-650/80 border-indigo-500/30 hover:bg-indigo-500/90 text-indigo-50 shadow-indigo-950/25'
                    },
                    purple: {
                      header: 'text-purple-400 font-extrabold bg-purple-950/20',
                      block: 'bg-purple-600/80 border-purple-500/30 hover:bg-purple-500/90 text-purple-50 shadow-purple-950/25'
                    },
                    zinc: {
                      header: 'text-zinc-300 font-extrabold bg-zinc-900/40',
                      block: 'bg-zinc-700/80 border-zinc-600/30 hover:bg-zinc-600/90 text-zinc-100 shadow-zinc-950/25'
                    }
                  };

                  const themeA = COLOR_THEMES[teamAColor] || COLOR_THEMES.amber;
                  const themeB = COLOR_THEMES[teamBColor] || COLOR_THEMES.sky;
                  const themeDefault = COLOR_THEMES.emerald;

                  let trackHeaderStyle = 'text-zinc-400 bg-zinc-950/60';
                  let defaultBlockColor = themeDefault.block;
                  
                  if (isTeamA) {
                    trackHeaderStyle = themeA.header;
                    defaultBlockColor = themeA.block;
                  } else if (isTeamB) {
                    trackHeaderStyle = themeB.header;
                    defaultBlockColor = themeB.block;
                  }

                  const trackDisplayName = player ? `${player.name} [${player.teamName}]` : trackName;
                  
                  const isTrackDragging = draggedTrackName === trackName;
                  const isTrackDragOver = dragOverTrackName === trackName;

                  return (
                    <div 
                      key={trackName} 
                      className={`flex border-b border-zinc-850/60 last:border-0 hover:bg-zinc-900/30 transition-all ${
                        isTrackDragging ? 'opacity-30 bg-zinc-950' : ''
                      } ${isTrackDragOver ? 'border-t-2 border-t-amber-500 bg-zinc-900/50' : ''}`}
                    >
                      {/* Track Header Label */}
                      <div 
                        draggable
                        onDragStart={(e) => handleTrackDragStart(e, trackName)}
                        onDragOver={(e) => handleTrackDragOver(e, trackName)}
                        onDrop={(e) => handleTrackDrop(e, trackName, tracks)}
                        onDragEnd={handleTrackDragEnd}
                        className={`w-28 border-r border-zinc-850 text-[9px] font-bold p-2 flex items-center gap-1 cursor-ns-resize truncate select-none ${trackHeaderStyle}`}
                        title="ドラッグしてトラックを上下に並び替え"
                      >
                        <span className="text-zinc-600 font-bold select-none text-[8px]">☰</span>
                        <span className="truncate">{trackDisplayName}</span>
                      </div>
                      
                      {/* Track Block Area */}
                      <div className="flex-1 h-9 relative overflow-hidden bg-zinc-900/30">
                        {trackEvents.map((ev) => {
                          const leftPct = (ev.startTime / totalD) * 100;
                          const widthPct = ((ev.endTime - ev.startTime) / totalD) * 100;

                          const labelText = [
                            ev.labels.Result || '',
                            ev.labels['Pitch Type'] || ev.labels.Action || ''
                          ].filter(Boolean).join(' ');

                          const isSelected = selectedEventId === ev.id || timelineSelectedIds.has(ev.id);

                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSeek(ev.startTime);
                                setSelectedEventId(ev.id);

                                const next = new Set(timelineSelectedIds);
                                if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) {
                                  if (next.has(ev.id)) next.delete(ev.id);
                                  else next.add(ev.id);
                                } else {
                                  next.clear();
                                  next.add(ev.id);
                                }
                                setTimelineSelectedIds(next);
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                const ids = timelineSelectedIds.has(ev.id) ? timelineSelectedIds : new Set([ev.id]);
                                const selectedClips = events.filter(item => ids.has(item.id));
                                handleOpenMatrixPlayer(selectedClips, `タイムライン選択プレイリスト再生 (${selectedClips.length}件)`);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedEventId(ev.id);
                                setContextMenu({ x: e.clientX, y: e.clientY, eventId: ev.id });
                              }}
                              className={`timeline-tag-block absolute h-7 top-1 rounded border text-[8px] font-extrabold text-white flex items-center justify-center px-1 shadow cursor-pointer transition-all select-none overflow-hidden text-ellipsis whitespace-nowrap ${
                                isSelected
                                  ? 'bg-amber-500 border-amber-300 ring-2 ring-amber-400 font-black shadow-lg shadow-amber-950/80 z-20 scale-[1.04]'
                                  : defaultBlockColor
                              }`}
                              style={{
                                left: `${leftPct}%`,
                                width: `max(12px, ${widthPct}%)`
                              }}
                              title={`${ev.actionName} - ${labelText} (${formatTime(ev.startTime)} - ${formatTime(ev.endTime)})\n打者: ${ev.labels.Batter || '-'}\n投手: ${ev.labels.Pitcher || '-'}\n(クリックで選択・BSキーで削除・右クリックでタグ編集)`}
                            >
                              {labelText || ev.actionName}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          </div>
        </div>

        {/* 2. Simplified Event Tag Logs Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow">
          {/* Table Header */}
          <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-850 flex items-center justify-between">
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-zinc-400">
              打刻イベント履歴 (タイムライン)
            </h3>
            <div className="flex items-center gap-2">
              {events.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2.5 py-1 rounded font-bold shadow transition-all cursor-pointer"
                >
                  CSVエクスポート
                </button>
              )}
              <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-900 px-1.5 py-0.5 rounded font-bold">
                合計 {events.length} 球
              </span>
            </div>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-center py-10 text-xs text-zinc-550">イベントがまだ記録されていません。動画ファイルを読み込み、タグ付けを開始してください。</p>
            ) : (() => {
              const customGroups = Array.from(
                new Set(
                  buttons
                    .map(b => b.groupName)
                    .filter((g): g is string => !!g && g.trim() !== '')
                )
              );

              return (
                <table className="w-full text-left text-xs text-zinc-350 text-nowrap">
                  <thead>
                    <tr className="bg-zinc-950/60 text-zinc-500 font-bold border-b border-zinc-850 select-none">
                      <th className="px-4 py-2">タイムコード</th>
                      <th className="px-4 py-2">回</th>
                      <th className="px-4 py-2">表・裏</th>
                      <th className="px-4 py-2">投手</th>
                      <th className="px-4 py-2">打者</th>
                      <th className="px-4 py-2">走者 (1塁, 2塁, 3塁)</th>
                      {customGroups.map(group => (
                        <th key={group} className="px-4 py-2">{group}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {events.map((ev) => {
                      const runnerList = [
                        ev.labels['Runner 1B'] !== 'None' ? `1塁:${ev.labels['Runner 1B']}` : '',
                        ev.labels['Runner 2B'] !== 'None' ? `2塁:${ev.labels['Runner 2B']}` : '',
                        ev.labels['Runner 3B'] !== 'None' ? `3塁:${ev.labels['Runner 3B']}` : ''
                      ].filter(Boolean).join(', ');

                      const isSelected = selectedEventId === ev.id;

                      return (
                        <tr 
                          key={ev.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSeek(ev.startTime);
                            setSelectedEventId(ev.id);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedEventId(ev.id);
                            setContextMenu({ x: e.clientX, y: e.clientY, eventId: ev.id });
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-amber-950/60 border-l-4 border-amber-400 text-amber-200 font-bold' 
                              : 'hover:bg-zinc-800/50'
                          }`}
                        >
                          <td className="px-4 py-2 font-mono font-bold text-sky-400">{formatTime(ev.timestamp)}</td>
                          <td className="px-4 py-2 font-semibold text-zinc-300">
                            {ev.labels.Inning_Num || (ev.labels.Inning ? (ev.labels.Inning.match(/(\d+)回/)?.[1] || '-') : '-')}
                          </td>
                          <td className="px-4 py-2 font-semibold text-zinc-300">
                            {ev.labels.Inning_Half || (ev.labels.Inning ? (ev.labels.Inning.includes('表') ? '表' : ev.labels.Inning.includes('裏') ? '裏' : '-') : '-')}
                          </td>
                          <td className="px-4 py-2 font-semibold text-zinc-200">{ev.labels.Pitcher || ev.actionName}</td>
                          <td className="px-4 py-2 text-zinc-300">{ev.labels.Batter}</td>
                          <td className="px-4 py-2 text-amber-450 font-medium">{runnerList || 'なし'}</td>
                          {customGroups.map(group => {
                            const val = ev.labels[group];
                            return (
                              <td key={group} className="px-4 py-2 text-zinc-300">
                                {val && val !== '-' ? (
                                  <span className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-250 text-[10px] border border-zinc-750/30">
                                    {val}
                                  </span>
                                ) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>

        {/* Hidden configuration panel for roster settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
          <h4 className="text-xs uppercase font-extrabold tracking-wider text-zinc-400">チーム設定・名簿管理</h4>
          <PlayerManager
            players={players}
            activePlayerId={activePlayerId}
            onSelectPlayer={setActivePlayerId}
            onAddPlayer={handleAddPlayer}
            onDeletePlayer={handleDeletePlayer}
            
            teamAName={teamAName}
            teamBName={teamBName}
            onUpdateTeamAName={handleUpdateTeamAName}
            onUpdateTeamBName={handleUpdateTeamBName}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
            onUpdateTeamAColor={(val) => { setTeamAColor(val); channelRef.current?.postMessage({ type: 'UPDATE_TEAMA_COLOR', value: val }); }}
            onUpdateTeamBColor={(val) => { setTeamBColor(val); channelRef.current?.postMessage({ type: 'UPDATE_TEAMB_COLOR', value: val }); }}
            onImportRoster={handleImportRoster}
            onTogglePlayerPosition={handleTogglePlayerPosition}
            onClearRoster={handleClearRoster}
            onUpdatePlayerThrows={handleUpdatePlayerThrows}
            onUpdatePlayerBats={handleUpdatePlayerBats}
          />
        </div>
        </main>
      )}

      {/* Footer Info */}
      <footer className="py-4 border-t border-zinc-900 text-center text-[10px] text-zinc-650 bg-zinc-950/40 mt-10">
        <p>© 2026 Sports analytics desktop logger. Built with React + Tailwind + Electron.</p>
      </footer>
      {/* Standalone Matrix/Timeline Playlist Popup Player Modal */}
      <MatrixPlayerModal
        isOpen={isMatrixPlayerOpen}
        title={matrixPlayerTitle}
        clips={matrixPlayerClips}
        videoUrl={videoUrl}
        videoName={videoName || ''}
        onClose={() => setIsMatrixPlayerOpen(false)}
      />

      {/* ⏰ タイムシフト一括調整モーダル */}
      {isTimeShiftModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span className="text-base">⏰</span> タイムシフト同期（一括位置調整）
              </h3>
              <p className="text-[10px] text-zinc-400 mt-1">
                白紙映像や別の時間軸で打ったタグを、現在の試合映像の開始位置に合わせて全体的に並行移動します。
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-400">オフセット秒数 (プラスで後ろ、マイナスで前へ移動)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="例: 15.5 または -30.0"
                  value={timeShiftOffset}
                  onChange={(e) => setTimeShiftOffset(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-550 font-mono font-bold"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-400">適用対象</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="timeShiftTarget"
                      checked={timeShiftTarget === 'all'}
                      onChange={() => setTimeShiftTarget('all')}
                      className="accent-sky-500"
                    />
                    すべてのタグ ({events.length}件)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="timeShiftTarget"
                      checked={timeShiftTarget === 'selected'}
                      onChange={() => setTimeShiftTarget('selected')}
                      disabled={timelineSelectedIds.size === 0}
                      className="accent-sky-500 disabled:opacity-30"
                    />
                    選択中のタグのみ ({timelineSelectedIds.size}件)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setIsTimeShiftModalOpen(false);
                  setTimeShiftOffset('');
                }}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={handleApplyTimeShift}
                disabled={!timeShiftOffset}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow active:scale-95 transition-all"
              >
                適用する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ アプリ設定・アカウント管理モーダル */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col overflow-hidden relative">
            {/* Modal Header & Navigation Tabs */}
            <div className="px-5 py-3.5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/60">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span className="text-emerald-400">⚙️</span> {appLanguage === 'en' ? 'App Settings' : 'アプリ設定・アカウント管理'}
              </h3>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer transition-all"
              >
                {appLanguage === 'en' ? 'Close' : '閉じる'}
              </button>
            </div>

            {/* Sub Tabs Navigation */}
            <div className="flex border-b border-zinc-800 bg-zinc-950/30 px-5 pt-2 gap-1 text-xs font-bold select-none overflow-x-auto">
              <button
                onClick={() => setSettingsTab('password')}
                className={`px-3 py-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  settingsTab === 'password'
                    ? 'border-emerald-500 text-emerald-400 font-black'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🔑 {appLanguage === 'en' ? 'Password' : 'パスワード変更'}
              </button>
              <button
                onClick={() => setSettingsTab('language')}
                className={`px-3 py-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  settingsTab === 'language'
                    ? 'border-emerald-500 text-emerald-400 font-black'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                🌐 {appLanguage === 'en' ? 'Language' : 'アプリ言語'}
              </button>
              <button
                onClick={() => setSettingsTab('support')}
                className={`px-3 py-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  settingsTab === 'support'
                    ? 'border-emerald-500 text-emerald-400 font-black'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                📩 {appLanguage === 'en' ? 'Support' : 'お問い合わせ'}
              </button>
              <button
                onClick={() => setSettingsTab('about')}
                className={`px-3 py-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  settingsTab === 'about'
                    ? 'border-emerald-500 text-emerald-400 font-black'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                ℹ️ {appLanguage === 'en' ? 'About' : 'アプリ情報'}
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Tab 1: Password Change */}
              {settingsTab === 'password' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-white mb-1">🔑 パスワードの変更</h4>
                    <p className="text-[10px] text-zinc-400">ログイン中のアカウント（{currentUser}）の新しいパスワードを入力してください。</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-400">新しいパスワード</label>
                      <input
                        type="password"
                        placeholder="新しいパスワードを入力"
                        value={changeNewPass}
                        onChange={(e) => setChangeNewPass(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-400">確認のため再入力 (2回目)</label>
                      <input
                        type="password"
                        placeholder="もう一度パスワードを入力"
                        value={changeConfirmPass}
                        onChange={(e) => setChangeConfirmPass(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                    </div>

                    {changePassError && (
                      <p className="text-[10px] text-rose-400 font-bold bg-rose-950/30 border border-rose-900/30 p-2 rounded-lg">
                        ⚠️ {changePassError}
                      </p>
                    )}

                    <button
                      onClick={handleChangeOwnPassword}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow transition-all cursor-pointer text-center mt-2"
                    >
                      パスワードを変更して保存
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Language Settings */}
              {settingsTab === 'language' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-white mb-1">🌐 {appLanguage === 'en' ? 'App Display Language' : '表示言語の設定'}</h4>
                    <p className="text-[10px] text-zinc-400">アプリケーション内のボタンやメニューの表示言語を選択します。</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setAppLanguage('ja');
                        window.localStorage.setItem('sportscode_app_language', 'ja');
                      }}
                      className={`p-4 rounded-xl border text-center font-bold flex flex-col items-center gap-2 cursor-pointer transition-all ${
                        appLanguage === 'ja'
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-lg'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-2xl">🇯🇵</span>
                      <span className="text-xs font-black">日本語 (Japanese)</span>
                    </button>

                    <button
                      onClick={() => {
                        setAppLanguage('en');
                        window.localStorage.setItem('sportscode_app_language', 'en');
                      }}
                      className={`p-4 rounded-xl border text-center font-bold flex flex-col items-center gap-2 cursor-pointer transition-all ${
                        appLanguage === 'en'
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-lg'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-2xl">🇺🇸</span>
                      <span className="text-xs font-black">English</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Contact & Support (In-App Messaging) */}
              {settingsTab === 'support' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-white mb-1">📩 サポート＆お問い合わせ窓口 (アプリ内完結)</h4>
                    <p className="text-[10px] text-zinc-400">ご質問・不具合報告・機能要望をアプリから直接送信できます。管理者からの返信もここに届きます。</p>
                  </div>

                  {/* Send New Inquiry Form */}
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-3">
                    <label className="text-[10px] font-bold text-zinc-300 block">💬 お問い合わせ本文を入力</label>
                    <textarea
                      rows={3}
                      placeholder="操作方法の質問、不具合の報告、追加機能のご要望などをお気軽にご記入ください"
                      value={userSupportMessageText}
                      onChange={(e) => setUserSupportMessageText(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                    />
                    <button
                      onClick={handleSendUserSupportMessage}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer text-center"
                    >
                      送信する
                    </button>
                  </div>

                  {/* Sent History & Admin Replies */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-zinc-400 text-[11px] flex items-center justify-between">
                      <span>📜 お問い合わせ・返信履歴</span>
                      <button
                        onClick={fetchUserSupportHistory}
                        className="text-[9px] text-sky-400 hover:underline cursor-pointer"
                      >
                        🔄 更新
                      </button>
                    </h5>

                    {userSupportHistory.length === 0 ? (
                      <p className="text-center py-4 text-[10px] text-zinc-600 border border-zinc-900 rounded-lg bg-zinc-950/40">
                        まだお問い合わせ履歴はありません。
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-44 overflow-y-auto">
                        {userSupportHistory.map((msg) => (
                          <div key={msg.id} className="bg-zinc-950/80 border border-zinc-850 p-3 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-[9px]">
                              <span className="text-zinc-400 font-bold">{new Date(msg.created_at).toLocaleString('ja-JP')}</span>
                              <span className={`px-1.5 py-0.5 rounded font-black ${
                                msg.status === 'replied'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                                  : 'bg-amber-950 text-amber-400 border border-amber-900'
                              }`}>
                                {msg.status === 'replied' ? '✅ 回答あり' : '⏳ 確認中'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-200 whitespace-pre-wrap">{msg.message}</p>
                            
                            {msg.reply && (
                              <div className="mt-2 pt-2 border-t border-zinc-800/60 bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30">
                                <p className="text-[9px] font-extrabold text-emerald-400 flex items-center gap-1 mb-1">
                                  <span>💬</span> 管理者からの返信 ({msg.replied_at ? new Date(msg.replied_at).toLocaleString('ja-JP') : ''})
                                </p>
                                <p className="text-xs text-emerald-200 font-bold whitespace-pre-wrap">{msg.reply}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: About App */}
              {settingsTab === 'about' && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-xl shadow-lg">
                    ⚾
                  </div>
                  <div>
                    <h4 className="font-black text-white text-sm">Sports Video Analysis</h4>
                    <p className="text-[10px] font-bold text-emerald-400 mt-0.5">Version 1.0.6</p>
                    <p className="text-[10px] text-zinc-500 mt-2">© 2026 Sports analytics desktop logger.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. ADMINISTRATOR PANEL MODAL */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            {/* Header with Tabs */}
            <div className="px-4 sm:px-6 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/80 gap-2 shrink-0">
              <div className="flex items-center gap-3 flex-wrap min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Users className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-sm font-extrabold text-white whitespace-nowrap">管理者コントロール</h3>
                </div>
                <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-xs font-bold shrink-0">
                  <button
                    onClick={() => setAdminTab("accounts")}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      adminTab === "accounts" 
                        ? "bg-emerald-600 text-white shadow" 
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    🔑 アカウント一覧
                  </button>
                  <button
                    onClick={() => { setAdminTab("logs"); fetchAdminAccessLogs(); }}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                      adminTab === "logs" 
                        ? "bg-emerald-600 text-white shadow" 
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    📜 操作ログ
                  </button>
                  <button
                    onClick={() => { setAdminTab("inquiries"); fetchAdminSupportList(); }}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      adminTab === "inquiries" 
                        ? "bg-emerald-600 text-white shadow" 
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span>📩 お問い合わせ</span>
                    {adminSupportList.filter(m => m.status === "pending").length > 0 && (
                      <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                        {adminSupportList.filter(m => m.status === "pending").length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="text-zinc-400 hover:text-white text-xs font-bold px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer transition-all shrink-0 border border-zinc-750"
              >
                ✕ 閉じる
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
              {adminTab === "accounts" ? (
                <>
                  {/* Account Creator Form (Compact) */}
                  <div className="bg-zinc-950/60 border border-zinc-850 p-3.5 sm:p-4 rounded-xl space-y-3">
                    <h4 className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
                      <span>➕</span> 新規チーム（アカウント）手動登録
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-zinc-400 font-bold">ユーザーID</label>
                        <input
                          type="text"
                          placeholder="例: Team_Braves"
                          value={newTeamId}
                          onChange={(e) => setNewTeamId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                          className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-zinc-400 font-bold">初期パスワード</label>
                        <input
                          type="text"
                          placeholder="パスワード"
                          value={newTeamPassword}
                          onChange={(e) => setNewTeamPassword(e.target.value)}
                          className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-zinc-400 font-bold">チーム表示名</label>
                        <input
                          type="text"
                          placeholder="例: ブレーブス"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                          className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-zinc-400 font-bold">メールアドレス (復旧・連絡用)</label>
                        <input
                          type="email"
                          placeholder="例: team@example.com"
                          value={newTeamEmail}
                          onChange={(e) => setNewTeamEmail(e.target.value)}
                          className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleAdminCreateTeam}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow transition-all cursor-pointer flex items-center gap-1.5 active:scale-98"
                      >
                        <span>💾</span> 新しいアカウントを保存
                      </button>
                    </div>
                  </div>

                  {/* Accounts List Table */}
                  <div className="space-y-3">
                    {/* Header & Filter Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase whitespace-nowrap">👥 登録済みのチーム一覧</h4>
                        {adminAccountsList.filter(a => a.status === "pending" || a.is_pending === true).length > 0 && (
                          <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse whitespace-nowrap">
                            🔔 新規承認待ち {adminAccountsList.filter(a => a.status === "pending" || a.is_pending === true).length} 件
                          </span>
                        )}
                      </div>

                      {/* Filter Buttons */}
                      <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-850 text-xs flex-wrap">
                        <button
                          onClick={() => setAdminAccountsFilter("ALL")}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                            adminAccountsFilter === "ALL" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          すべて ({adminAccountsList.length})
                        </button>
                        <button
                          onClick={() => setAdminAccountsFilter("PENDING")}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                            adminAccountsFilter === "PENDING" ? "bg-amber-900 text-amber-200 border border-amber-700" : "text-amber-400 hover:bg-amber-950/40"
                          }`}
                        >
                          🔔 承認待ち ({adminAccountsList.filter(a => a.status === "pending" || a.is_pending === true).length})
                        </button>
                        <button
                          onClick={() => setAdminAccountsFilter("ACTIVE")}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                            adminAccountsFilter === "ACTIVE" ? "bg-emerald-900 text-emerald-200 border border-emerald-700" : "text-emerald-400 hover:bg-emerald-950/40"
                          }`}
                        >
                          🟢 契約中 ({adminAccountsList.filter(a => a.is_active).length})
                        </button>
                        <button
                          onClick={() => setAdminAccountsFilter("INACTIVE")}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all whitespace-nowrap ${
                            adminAccountsFilter === "INACTIVE" ? "bg-rose-900 text-rose-200 border border-rose-700" : "text-rose-400 hover:bg-rose-950/40"
                          }`}
                        >
                          ⛔ 停止中 ({adminAccountsList.filter(a => !a.is_active && a.status !== "pending" && a.is_pending !== true).length})
                        </button>
                      </div>
                    </div>

                    {/* Pending Approval Notice Banner (Only show when there is actually pending approval) */}
                    {adminAccountsList.filter(a => a.status === "pending" || a.is_pending === true).length > 0 && adminAccountsFilter !== "ACTIVE" && (
                      <div className="bg-amber-950/30 border border-amber-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-amber-200">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🚨</span>
                          <span>新規利用申請（承認待ち）が <strong>{adminAccountsList.filter(a => a.status === "pending" || a.is_pending === true).length} 件</strong> あります。「✅ 承認して有効化」を押すと利用開始できます。</span>
                        </div>
                      </div>
                    )}

                    {adminPanelError && (
                      <p className="text-xs text-rose-500 font-bold bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-lg">
                        ⚠️ {adminPanelError}
                      </p>
                    )}
                    
                    <div className="border border-zinc-800 rounded-xl overflow-x-auto bg-zinc-950/40 shadow-inner">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-zinc-950/90 border-b border-zinc-800 text-zinc-400 font-bold whitespace-nowrap">
                            <th className="p-3 whitespace-nowrap">ユーザーID</th>
                            <th className="p-3 whitespace-nowrap min-w-[100px]">チーム名</th>
                            <th className="p-3 whitespace-nowrap min-w-[180px]">メールアドレス (編集可能)</th>
                            <th className="p-3 whitespace-nowrap min-w-[140px]">パスワード</th>
                            <th className="p-3 text-center whitespace-nowrap min-w-[90px]">契約状態</th>
                            <th className="p-3 text-right whitespace-nowrap min-w-[160px]">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-850">
                          {adminAccountsList
                            .filter(acc => {
                              const isPending = acc.status === "pending" || acc.is_pending === true;
                              if (adminAccountsFilter === "PENDING") return isPending;
                              if (adminAccountsFilter === "ACTIVE") return acc.is_active;
                              if (adminAccountsFilter === "INACTIVE") return !acc.is_active && !isPending;
                              return true;
                            })
                            .map((acc) => (
                              <AdminAccountRow
                                key={acc.id}
                                acc={acc}
                                onUpdatePassword={handleAdminUpdatePassword}
                                onUpdateEmail={handleAdminUpdateEmail}
                                onApprove={handleAdminApproveAccount}
                                onGenerateTempPassword={handleGenerateTempPassword}
                                onToggleActive={handleAdminToggleActive}
                                onDelete={setConfirmDeleteId}
                              />
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : adminTab === "logs" ? (
                /* ACCESS & AUDIT LOGS TAB */
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-[12px] font-bold text-white tracking-wider">📜 アクセス・操作ログ</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">ログイン成功・失敗やCSV/動画書き出しなどの操作履歴です。</p>
                    </div>
                    <button
                      onClick={fetchAdminAccessLogs}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold cursor-pointer transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      ログを最新化
                    </button>
                  </div>

                  {/* Filter bar */}
                  <div className="flex items-center gap-2 bg-zinc-950/60 p-2 rounded-xl border border-zinc-850 text-xs">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider px-1">絞り込み:</span>
                    <button
                      onClick={() => setAdminLogFilter("ALL")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${adminLogFilter === "ALL" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                      すべて ({adminLogsList.length})
                    </button>
                    <button
                      onClick={() => setAdminLogFilter("LOGIN_FAILED")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${adminLogFilter === "LOGIN_FAILED" ? "bg-rose-900 text-rose-200 border border-rose-700" : "text-rose-400 hover:bg-rose-950/40"}`}
                    >
                      🔴 ログイン失敗 ({adminLogsList.filter(l => l.action_type === "LOGIN_FAILED").length})
                    </button>
                    <button
                      onClick={() => setAdminLogFilter("LOGIN")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${adminLogFilter === "LOGIN" ? "bg-emerald-900 text-emerald-200 border border-emerald-700" : "text-emerald-400 hover:bg-emerald-950/40"}`}
                    >
                      🟢 ログイン成功 ({adminLogsList.filter(l => l.action_type === "LOGIN").length})
                    </button>
                    <button
                      onClick={() => setAdminLogFilter("CSV_EXPORT")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${adminLogFilter === "CSV_EXPORT" ? "bg-sky-900 text-sky-200 border border-sky-700" : "text-sky-400 hover:bg-sky-950/40"}`}
                    >
                      📁 CSV書き出し ({adminLogsList.filter(l => l.action_type === "CSV_EXPORT").length})
                    </button>
                    <button
                      onClick={() => setAdminLogFilter("VIDEO_EXPORT")}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${adminLogFilter === "VIDEO_EXPORT" ? "bg-purple-900 text-purple-200 border border-purple-700" : "text-purple-400 hover:bg-purple-950/40"}`}
                    >
                      📹 動画書き出し ({adminLogsList.filter(l => l.action_type === "VIDEO_EXPORT").length})
                    </button>
                  </div>

                  {/* Logs Table */}
                  <div className="border border-zinc-800 rounded-xl overflow-x-auto bg-zinc-950/40">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-950/90 border-b border-zinc-800 text-zinc-400 font-bold whitespace-nowrap">
                          <th className="p-3">日時</th>
                          <th className="p-3">チームID</th>
                          <th className="p-3">種別</th>
                          <th className="p-3">結果・ステータス</th>
                          <th className="p-3">詳細情報</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850 font-mono text-[11px]">
                        {adminLogsList
                          .filter(log => {
                            if (adminLogFilter === "LOGIN_FAILED") return log.action_type === "LOGIN_FAILED";
                            if (adminLogFilter === "LOGIN") return log.action_type === "LOGIN";
                            if (adminLogFilter === "CSV_EXPORT") return log.action_type === "CSV_EXPORT";
                            if (adminLogFilter === "VIDEO_EXPORT") return log.action_type === "VIDEO_EXPORT";
                            return true;
                          })
                          .map((log) => {
                            const isFail = log.status === "failure" || log.action_type === "LOGIN_FAILED";
                            return (
                              <tr key={log.id} className={`hover:bg-zinc-900/60 transition-colors ${isFail ? "bg-rose-950/15" : ""}`}>
                                <td className="p-3 text-zinc-400 whitespace-nowrap">
                                  {new Date(log.created_at).toLocaleString("ja-JP")}
                                </td>
                                <td className="p-3 font-bold text-white whitespace-nowrap">
                                  {log.team_id || "---"}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                    log.action_type === "LOGIN" ? "bg-emerald-950 text-emerald-400 border border-emerald-900" :
                                    log.action_type === "LOGIN_FAILED" ? "bg-rose-950 text-rose-400 border border-rose-900" :
                                    log.action_type === "CSV_EXPORT" ? "bg-sky-950 text-sky-400 border border-sky-900" :
                                    log.action_type === "VIDEO_EXPORT" ? "bg-purple-950 text-purple-400 border border-purple-900" :
                                    "bg-zinc-800 text-zinc-300"
                                  }`}>
                                    {log.action_type}
                                  </span>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    log.status === "success" ? "text-emerald-400" : "text-rose-400 font-black"
                                  }`}>
                                    {log.status === "success" ? "成功" : "失敗"}
                                  </span>
                                </td>
                                <td className="p-3 text-zinc-300 font-sans text-xs">
                                  {log.details ? (
                                    <span className="text-[10px] text-zinc-400">
                                      {log.details.reason && `理由: ${log.details.reason} `}
                                      {log.details.rowCount && `件数: ${log.details.rowCount}行 `}
                                      {log.details.clipCount && `クリップ数: ${log.details.clipCount}件 `}
                                      {log.details.fileName && `ファイル: ${log.details.fileName} `}
                                    </span>
                                  ) : "---"}
                                </td>
                              </tr>
                            );
                          })}

                        {adminLogsList.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-zinc-500 text-xs">
                              アクセス・操作ログはまだ記録されていません。
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Tab 3: Admin Inquiries List & Reply Form */
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">📩 利用者チームからの問い合わせ一覧</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">メッセージを確認し、その場でアプリ経由で返信を送信できます。</p>
                    </div>
                    <button
                      onClick={fetchAdminSupportList}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold cursor-pointer"
                    >
                      🔄 履歴を更新
                    </button>
                  </div>

                  {adminSupportList.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 text-xs border border-zinc-800 rounded-xl bg-zinc-950/40">
                      現在、到着しているお問い合わせはありません。
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {adminSupportList.map((msg) => (
                        <div key={msg.id} className={`p-4 rounded-xl border space-y-3 ${
                          msg.status === "pending"
                            ? "bg-zinc-900/90 border-amber-500/50 shadow-lg shadow-amber-950/20"
                            : "bg-zinc-950/60 border-zinc-800"
                        }`}>
                          <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-extrabold text-white text-xs px-2 py-0.5 bg-zinc-800 rounded border border-zinc-700">
                                チーム: {msg.team_id}
                              </span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                                msg.status === "replied"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                  : "bg-rose-950 text-rose-400 border border-rose-900 animate-pulse"
                              }`}>
                                {msg.status === "replied" ? "✅ 返信済み" : "🔴 未対応 (返信待ち)"}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {new Date(msg.created_at).toLocaleString("ja-JP")}
                            </span>
                          </div>

                          <div>
                            <p className="text-[10px] text-zinc-500 font-bold mb-1">💬 利用者からのメッセージ:</p>
                            <p className="text-xs text-zinc-200 bg-zinc-950 p-3 rounded-lg border border-zinc-850 font-sans whitespace-pre-wrap">
                              {msg.message}
                            </p>
                          </div>

                          {/* Existing Reply Display */}
                          {msg.reply && (
                            <div className="bg-emerald-950/30 border border-emerald-900/50 p-3 rounded-lg space-y-1">
                              <p className="text-[9px] text-emerald-400 font-extrabold flex items-center gap-1">
                                <span>💬</span> 管理者からの返信済みメッセージ ({msg.replied_at ? new Date(msg.replied_at).toLocaleString("ja-JP") : ""})
                              </p>
                              <p className="text-xs text-emerald-200 font-bold whitespace-pre-wrap">{msg.reply}</p>
                            </div>
                          )}

                          {/* Reply Form */}
                          <div className="pt-2 border-t border-zinc-850 space-y-2">
                            <label className="text-[10px] font-bold text-zinc-400 block">
                              ✍️ {msg.reply ? "返信内容を上書き・再更新する:" : "このチームへ返信を入力:"}
                            </label>
                            <textarea
                              rows={2}
                              placeholder="返信内容をご記入ください（送信すると利用者のアプリ画面に表示されます）"
                              value={adminReplyTextMap[msg.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAdminReplyTextMap(prev => ({ ...prev, [msg.id]: val }));
                              }}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                            />
                            <div className="flex justify-end">
                              <button
                                onClick={() => handleSendAdminReply(msg.id)}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow transition-all cursor-pointer flex items-center gap-1"
                              >
                                ✉️ 返信を送信する
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Account Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-rose-900/50 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-sm font-extrabold text-white">アカウント削除の確認</h3>
            </div>
            <p className="text-xs text-zinc-300 mb-1">
              以下のアカウントを完全に削除します。
            </p>
            <p className="text-sm font-black text-rose-400 font-mono bg-rose-950/30 border border-rose-900/30 px-3 py-2 rounded-lg mb-4">
              {confirmDeleteId}
            </p>
            <p className="text-[10px] text-zinc-500 mb-6">
              この操作は取り消せません。削除後、このIDでのログインは一切できなくなります。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-black cursor-pointer transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleAdminDeleteAccount(confirmDeleteId)}
                className="flex-1 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-black cursor-pointer transition-all shadow-lg shadow-rose-950/50"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL RIGHT-CLICK / DOUBLE-CLICK TAGGING CONTEXT MENU OVERLAY (Available across all screens) */}
      {contextMenu && (() => {
        const targetEv = events.find(e => e.id === contextMenu.eventId);
        if (!targetEv) return null;

        // Dynamically merge static TAG_GROUPS with all groupNames from custom buttons
        const allGroupMap: Record<string, string[]> = { ...TAG_GROUPS };
        buttons.forEach(b => {
          if (b.type === 'label' && b.groupName) {
            if (!allGroupMap[b.groupName]) {
              allGroupMap[b.groupName] = [];
            }
            if (!allGroupMap[b.groupName].includes(b.name)) {
              allGroupMap[b.groupName].push(b.name);
            }
          }
        });
        // Add any existing labels groups present on the event (including custom pitch speed values)
        Object.keys(targetEv.labels).forEach(g => {
          const val = targetEv.labels[g];
          if (val && val !== '-') {
            const canonicalGroup = (g === 'Pitch Speed' || g === 'PITCH_SPEED') ? '球速' : g;
            if (!allGroupMap[canonicalGroup]) {
              allGroupMap[canonicalGroup] = [];
            }
            if (!allGroupMap[canonicalGroup].includes(val)) {
              allGroupMap[canonicalGroup].push(val);
            }
          }
        });

        const resolveCurrentTagVal = (gName: string) => {
          if (gName === '球速') {
            return targetEv.labels['球速'] || targetEv.labels['Pitch Speed'] || targetEv.labels['PITCH_SPEED'] || '';
          }
          return targetEv.labels[gName] || targetEv.labels[gName.toLowerCase()] || '';
        };

        const activeTagList = activeSubmenuGroup ? (allGroupMap[activeSubmenuGroup.groupName] || []) : [];
        const activeCurrentTagVal = activeSubmenuGroup ? resolveCurrentTagVal(activeSubmenuGroup.groupName) : '';

        return (
          <>
            {/* Backdrop click cover */}
            <div 
              className="fixed inset-0 z-[998] bg-black/10" 
              onClick={() => {
                setContextMenu(null);
                setActiveSubmenuGroup(null);
              }} 
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu(null);
                setActiveSubmenuGroup(null);
              }}
            />
            
            {/* Main Context Menu Box */}
            <div 
              style={{ top: `${Math.min(contextMenu.y, window.innerHeight - 340)}px`, left: `${Math.min(contextMenu.x, window.innerWidth - 240)}px` }}
              className="fixed z-[1000] bg-zinc-950 border border-zinc-750 rounded-xl shadow-2xl p-1.5 text-xs w-56 text-zinc-200 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2.5 py-1.5 border-b border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 font-bold bg-zinc-900/80 rounded-t-lg">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span>🏷️</span> タグの追加・編集 ({targetEv.actionName})
                </span>
                <button onClick={() => { setContextMenu(null); setActiveSubmenuGroup(null); }} className="text-zinc-500 hover:text-white px-1">✕</button>
              </div>

              <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto py-1">
                {Object.entries(allGroupMap).map(([groupName]) => {
                  const currentTagVal = resolveCurrentTagVal(groupName);
                  const isActive = activeSubmenuGroup?.groupName === groupName;

                  return (
                    <div 
                      key={groupName}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        // Position submenu directly to the right of this item
                        let targetLeft = rect.right + 4;
                        if (targetLeft + 170 > window.innerWidth) {
                          targetLeft = rect.left - 170; // flip to left if too close to right window edge
                        }
                        setActiveSubmenuGroup({
                          groupName,
                          top: rect.top,
                          left: targetLeft
                        });
                      }}
                      className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer text-xs transition-colors ${
                        isActive ? 'bg-zinc-800 border border-zinc-700' : 'hover:bg-zinc-800'
                      } ${currentTagVal ? 'text-sky-300 font-bold' : 'text-zinc-300'}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold">{groupName}</span>
                        {currentTagVal && (
                          <span className="text-[9px] font-mono px-1 py-0.2 bg-sky-900/80 text-sky-200 rounded border border-sky-700/60 truncate max-w-[80px]">
                            {currentTagVal}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] ${isActive ? 'text-sky-400 font-extrabold' : 'text-zinc-500'}`}>▶</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-zinc-800 pt-1 mt-0.5">
                <div
                  onClick={() => {
                    handleDeleteSelectedEvent(contextMenu.eventId);
                    setContextMenu(null);
                    setActiveSubmenuGroup(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer text-xs text-red-400 hover:bg-red-950/60 hover:text-red-300 font-bold transition-colors"
                >
                  <span>イベントを削除</span>
                  <span>🗑️</span>
                </div>
              </div>
            </div>

            {/* FLOATING SUBMENU (Positioned with fixed viewport coordinates - Never clipped by parent overflow!) */}
            {activeSubmenuGroup && activeTagList.length > 0 && (
              <div
                style={{
                  top: `${Math.min(activeSubmenuGroup.top, window.innerHeight - 280)}px`,
                  left: `${activeSubmenuGroup.left}px`
                }}
                className="fixed z-[1010] bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl p-1 text-xs min-w-[165px] max-h-72 overflow-y-auto flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-75 select-none"
                onMouseEnter={() => {
                  // Keep submenu open while hovering inside it
                }}
                onMouseLeave={() => {
                  // Keep active until another item is hovered
                }}
              >
                <div className="px-2.5 py-1 text-[9px] font-black text-zinc-400 uppercase tracking-wider border-b border-zinc-850 bg-zinc-900/60 rounded-t-lg flex items-center justify-between">
                  <span>{activeSubmenuGroup.groupName}</span>
                  <span className="text-zinc-600 text-[8px]">一覧</span>
                </div>
                {activeTagList.map(tagName => {
                  const isChecked = activeCurrentTagVal === tagName || activeCurrentTagVal.split(', ').includes(tagName);

                  return (
                    <div
                      key={tagName}
                      onClick={() => {
                        handleToggleEventTag(contextMenu.eventId, activeSubmenuGroup.groupName, tagName);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer text-xs transition-all hover:bg-zinc-800 ${
                        isChecked ? 'bg-emerald-950/80 text-emerald-300 font-black border border-emerald-800/80' : 'text-zinc-300'
                      }`}
                    >
                      <span className="truncate pr-2">{tagName}</span>
                      {isChecked ? (
                        <span className="text-emerald-400 font-black text-sm">✔</span>
                      ) : (
                        <span className="text-zinc-700 text-xs">○</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

export default App;

// Admin Table Account Row Component with masked password editing, email inline editing, approve action, toggle eye, temp password support, and explicit save button
const AdminAccountRow = ({ acc, onUpdatePassword, onUpdateEmail, onApprove, onGenerateTempPassword, onToggleActive, onDelete }: any) => {
  const [pass, setPass] = useState(acc.password || "");
  const [showPass, setShowPass] = useState(false);
  const [isPassModified, setIsPassModified] = useState(false);

  const [emailVal, setEmailVal] = useState(acc.email || "");
  const [isEmailModified, setIsEmailModified] = useState(false);

  useEffect(() => {
    setPass(acc.password || "");
    setIsPassModified(false);
    setEmailVal(acc.email || "");
    setIsEmailModified(false);
  }, [acc.password, acc.email]);

  const handleSavePassword = () => {
    onUpdatePassword(acc.id, pass);
    setIsPassModified(false);
  };

  const handleSaveEmail = () => {
    onUpdateEmail(acc.id, emailVal);
    setIsEmailModified(false);
  };

  const hasValidTempPass = acc.temp_password 
    && acc.temp_password_expires_at 
    && new Date(acc.temp_password_expires_at).getTime() > Date.now();

  const tempMinutesLeft = hasValidTempPass 
    ? Math.ceil((new Date(acc.temp_password_expires_at).getTime() - Date.now()) / 60000)
    : 0;

  // Distinctly determine status: Active vs Pending Approval vs Manually Stopped
  const isPending = acc.status === "pending" || acc.is_pending === true;

  return (
    <tr className={`hover:bg-zinc-900/40 text-zinc-300 transition-colors whitespace-nowrap ${isPending ? "bg-amber-950/15" : !acc.is_active ? "bg-rose-950/10" : ""}`}>
      {/* ID & Badges */}
      <td className="p-3 font-mono font-bold text-white whitespace-nowrap">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span>{acc.id}</span>
          {acc.id === "admin" && (
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-900 text-[9px] px-1.5 py-0.5 rounded font-extrabold whitespace-nowrap">
              管理者
            </span>
          )}
          {isPending && (
            <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[9px] px-1.5 py-0.5 rounded font-black animate-pulse whitespace-nowrap">
              承認待ち
            </span>
          )}
        </div>
      </td>

      {/* Team Name */}
      <td className="p-3 font-bold text-zinc-200 whitespace-nowrap">{acc.team_name || "---"}</td>

      {/* Email Address with Inline Edit & Save */}
      <td className="p-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <input
            type="email"
            placeholder="メール未登録"
            value={emailVal}
            onChange={(e) => {
              setEmailVal(e.target.value);
              setIsEmailModified(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isEmailModified) {
                handleSaveEmail();
              }
            }}
            className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs font-mono text-zinc-200 w-44 focus:outline-none focus:border-emerald-500"
          />
          {isEmailModified && (
            <button
              onClick={handleSaveEmail}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              保存
            </button>
          )}
        </div>
      </td>

      {/* Password with Eye Toggle & Save */}
      <td className="p-3 whitespace-nowrap">
        <div className="flex flex-col gap-1 whitespace-nowrap">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <div className="relative flex items-center">
              <input
                type={showPass ? "text" : "password"}
                value={showPass && hasValidTempPass ? acc.temp_password : pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setIsPassModified(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && isPassModified) {
                    handleSavePassword();
                  }
                }}
                className={`bg-zinc-900 border ${hasValidTempPass ? "border-amber-600/70 text-amber-300" : "border-zinc-800 text-white"} rounded pl-2.5 pr-7 py-1 text-xs font-mono font-bold w-28 text-center focus:outline-none focus:border-emerald-500`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-1.5 text-zinc-400 hover:text-white p-0.5 cursor-pointer transition-colors"
                title={showPass ? "パスワードを隠す" : "パスワードを表示"}
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {isPassModified && (
              <button
                onClick={handleSavePassword}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold shadow transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                保存
              </button>
            )}
          </div>
          {hasValidTempPass && (
            <p className="text-[9px] text-amber-400 font-bold flex items-center gap-1 whitespace-nowrap">
              ⚡ 一時パス有効中 (残り{tempMinutesLeft}分)
            </p>
          )}
        </div>
      </td>

      {/* Distinct Subscription / Active Status Badge */}
      <td className="p-3 text-center whitespace-nowrap">
        {acc.is_active ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-900 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            契約中
          </span>
        ) : isPending ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-950 text-amber-300 border border-amber-800 whitespace-nowrap animate-pulse">
            <span>⏳</span>
            承認待ち
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-900 whitespace-nowrap">
            <span>⛔</span>
            停止中
          </span>
        )}
      </td>

      {/* Action Buttons */}
      <td className="p-3 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
          {/* Quick Approve Button for Pending Signup Accounts */}
          {isPending && (
            <button
              onClick={() => onApprove(acc.id)}
              className="px-3 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 flex items-center gap-1 active:scale-95 whitespace-nowrap"
              title="アカウントを承認して利用開始可能にします"
            >
              ✅ 承認して有効化
            </button>
          )}

          {/* Emergency Temporary Password Button */}
          <button
            onClick={() => onGenerateTempPassword(acc.id)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/60 flex items-center gap-1 whitespace-nowrap"
            title="30分間だけ有効な緊急・復旧用一時パスワードを発行します"
          >
            ⚡ 一時パス
          </button>

          {/* Toggle Active / Stop / Resume Button */}
          {acc.id !== "admin" && (
            acc.is_active ? (
              <button
                onClick={() => onToggleActive(acc.id, acc.is_active)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 border border-zinc-700 hover:border-rose-900 whitespace-nowrap"
              >
                契約停止
              </button>
            ) : !isPending ? (
              <button
                onClick={() => onToggleActive(acc.id, acc.is_active)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-900 whitespace-nowrap"
              >
                再開する
              </button>
            ) : null
          )}
          
          {/* Delete Account Button */}
          {acc.id !== "admin" && (
            <button
              onClick={() => onDelete(acc.id)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all bg-zinc-900 hover:bg-rose-950 text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:border-rose-900 whitespace-nowrap"
              title="アカウントを削除します"
            >
              🗑 削除
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
