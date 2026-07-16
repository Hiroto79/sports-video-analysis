import React, { useState, useRef } from 'react';
import { Trash2, Upload, Users } from 'lucide-react';
import type { Player } from '../types';

interface PlayerManagerProps {
  players: Player[];
  activePlayerId: string | null;
  onSelectPlayer: (id: string | null) => void;
  onAddPlayer: (
    name: string,
    number?: string,
    teamName?: string,
    throws?: 'R' | 'L',
    bats?: 'R' | 'L' | 'S',
    positionType?: 'batter' | 'pitcher' | 'both',
    battingOrder?: number
  ) => void;
  onDeletePlayer: (id: string) => void;
  onTogglePlayerPosition?: (id: string) => void;
  onUpdatePlayerThrows?: (id: string, hand: 'R' | 'L') => void;
  onUpdatePlayerBats?: (id: string, hand: 'R' | 'L' | 'S') => void;
  
  // Two-team properties
  teamAName: string;
  teamBName: string;
  onUpdateTeamAName: (name: string) => void;
  onUpdateTeamBName: (name: string) => void;
  teamAColor: string;
  teamBColor: string;
  onUpdateTeamAColor: (color: string) => void;
  onUpdateTeamBColor: (color: string) => void;
  onImportRoster: (teamKey: 'teamA' | 'teamB', teamName: string, players: Omit<Player, 'id'>[], isMultiTeam?: boolean, csvFileName?: string) => void;
  onClearRoster?: () => void;
}

const MLB_PITCHERS = new Set([
  // Mets
  'josebutto', 'jakediekman', 'edwindiaz', 'shintarofujinami', 'reedgarrett', 'granthartwig', 'adrianhouser', 'koltoningram', 'maxkranick', 'joeylucchesi', 'jorgelopez', 'seanmanaea', 'tylormegill', 'adamottavino', 'davidpeterson', 'josequintana', 'brooksraley', 'yohanramirez', 'seanreid-froley', 'seanreidfroley', 'kodaisenga', 'luisseverino', 'drewsmith', 'michaeltonkin', 'joshwalker',
  // Braves
  'iananderson', 'aaronbummer', 'jessechavez', 'dylandodd', 'bryceelder', 'maxfried', 'daysbelhernandez', 'raisellglesias', 'raiseliglesias', 'joejimenez', 'piercejohnson', 'raykerr', 'dylanlee', 'reynaldolopez', 'tylermatzek', 'asminter', 'charlimorton', 'charleymorton', 'angelperdomo', 'chrissale', 'ajsmith-shawver', 'ajsmithshawver', 'spencerstrider', 'dariusvines', 'allanwinans', 'huascarynoa',
  // Dodgers
  'ryanbrasier', 'walkerbuehler', 'jpfeyereisen', 'nickfraser', 'tylerglasnow', 'tonygonsolin', 'brusdargraterol', 'michaelgrove', 'danielhudson', 'kylehurt', 'joekelly', 'claytonkershoaw', 'claytonkershaw', 'landonknack', 'dinelsonlamet', 'dustinmay', 'bobbymiller', 'jamespaxton', 'nickramirez', 'emmetsheehan', 'rickyvanasco', 'gusvarland', 'blaketreiben', 'blaketreinen', 'evanphillips', 'gavinstone', 'alexvesta', 'alexvesia', 'yoshinobuyamamoto', 'ryanyarbrough',
  // Angels
  'tyleranderson', 'sambachman', 'kelvincaceres', 'griffincanning', 'adamclmber', 'adamclimber', 'adamcimber', 'josecisnero', 'davisdaniel', 'readdetmers', 'reiddetmers', 'carlosestevez', 'luisgarcia', 'jimmyherget', 'benjoyce', 'jackkochanowicz', 'victormederos', 'mattmoore', 'zachpiesac', 'zachplesac', 'josequijada', 'kennyrosenberg', 'patricksandoval', 'chasesilseth', 'josesoriano', 'robertstephenson', 'josesuarez', 'andrewwantz', 'guillermozuniga',
  // Yankees
  'claytonandrews', 'claytonbeeter', 'jtbrubaker', 'nickburdi', 'gerritcole', 'nestorcortes', 'jakecousins', 'scotteffross', 'calebferguson', 'luisgil', 'victorgonzalez', 'yoendrysgomes', 'ianhamilton', 'clayholmes', 'tommykahnle', 'jonathanloaisiga', 'ronmarinaccio', 'mckinleymoore', 'codymorris', 'codypoteet', 'carlosrodon', 'clarkeschmidt', 'marcusstroman', 'loutrivino', 'lukeweaver',
  // Phillies
  'kolbyallard', 'josealvarado', 'maxcastillo', 'dylancovey', 'seranthonydominguez', 'jeffhoffman', 'orionkerkering', 'yuniormarte', 'michaelmercado', 'nicknelson', 'aaronnola', 'luisfortiz', 'luisortiz', 'ricardopinto', 'michaelrucker', 'gregorysoto', 'mattstrahm', 'rangersuarez', 'cristophersanchez', 'spencerturnbull', 'taijuanwalker', 'zackwheeler',
  // Blue Jays
  'angelbastardo', 'kevingausman', 'joséberríos', 'joseberrios', 'shanebieber', 'jakebloss', 'dylancease', 'lazaroestrada', 'braydonfisher', 'masonfluharty', 'bowdenfrancis', 'brendonlittle', 'louisvarland', 'treyyesavage',
  // Brewers
  'aaronashby', 'bradleyblalock', 'jbbukauskas', 'taylorclarke', 'dlhall', 'bryanhudson', 'jakobjunis', 'jansonjunk', 'trevormegill', 'wademiley', 'hobymilner', 'joelpayamps', 'elvispeguero', 'freddyperalta', 'colinrea', 'joeross', 'abneruribe', 'thyagovieira', 'devinwilliams', 'brycewilson', 'brandonwoodruff', 'grantanderson', 'colemancrow', 'robergasser', 'robertgasser', 'loganhenderson', 'jaredkoenig', 'eastonmcgee', 'jacobmisiorowski', 'tobiasmyers', 'chadpatrick', 'sammyperalta', 'quinnpriester', 'carlosrodriguez', 'craigyoho', 'robzastryzny', 'angelzerpa',
  // WBC Japan & others
  'yudarvish', 'shotaimanaga', 'syotaimanaga', 'yuukiudagawa', 'yukiudagawa', 'yukimatui', 'yukimatsui', 'hirototakahashi', 'taisei', 'ryutotogo', 'shogotogo', 'hiromiito', 'rookiesasaki', 'rokisasaki', 'adukiyuasa', 'atsukiyuasa',
  'juliourías', 'juliourias', 'joséurquidy', 'joseurquidy', 'adriánmartínez', 'adrianmartinez', 'luiscessa', 'javierassad', 'jojoromero', 'gievannygallegos', 'giovannygallegos', 'jesuscruz', 'gerardoreyes', 'jakesanchez', 'erubielarmenta', 'samuelzazueta', 'césarvargas', 'cesarvargas', 'mannybarreda',
  'kwanghyunkim', 'wontae-in', 'wontaein', 'gawkb', 'gwakbeen', 'jeongcheol-won', 'jeongcheolwon', 'kimyun-sik', 'kimyunsik', 'kimwon-jung', 'kimwonjung', 'jungwoo-young', 'jungwooyoung', 'koochang-mo', 'koochangmo', 'leeeui-lee', 'leeeuilee', 'parkse-woong', 'parksewoong'
]);

export const PlayerManager: React.FC<PlayerManagerProps> = ({
  players,
  activePlayerId,
  onSelectPlayer,
  onAddPlayer,
  onDeletePlayer,
  onTogglePlayerPosition,
  onUpdatePlayerThrows,
  onUpdatePlayerBats,
  
  teamAName,
  teamBName,
  onUpdateTeamAName,
  onUpdateTeamBName,
  teamAColor,
  teamBColor,
  onUpdateTeamAColor,
  onUpdateTeamBColor,
  onImportRoster,
  onClearRoster
}) => {
  // Input form state for Team A
  const [nameA, setNameA] = useState('');
  const [numA, setNumA] = useState('');
  const [throwsA, setThrowsA] = useState<'R' | 'L'>('R');
  const [batsA, setBatsA] = useState<'R' | 'L' | 'S'>('R');
  const [posTypeA, setPosTypeA] = useState<'batter' | 'pitcher' | 'both'>('batter');
  const [orderA, setOrderA] = useState<string>(''); // empty means none
  
  // Input form state for Team B
  const [nameB, setNameB] = useState('');
  const [numB, setNumB] = useState('');
  const [throwsB, setThrowsB] = useState<'R' | 'L'>('R');
  const [batsB, setBatsB] = useState<'R' | 'L' | 'S'>('R');
  const [posTypeB, setPosTypeB] = useState<'batter' | 'pitcher' | 'both'>('batter');
  const [orderB, setOrderB] = useState<string>(''); // empty means none

  // Hidden file input refs for CSV imports
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);

  const handleSubmitA = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nameA.trim()) return;
    onAddPlayer(
      nameA.trim(), 
      numA.trim() || undefined, 
      teamAName, 
      throwsA, 
      batsA, 
      posTypeA, 
      orderA ? Number(orderA) : undefined
    );
    setNameA('');
    setNumA('');
    setThrowsA('R');
    setBatsA('R');
    setPosTypeA('batter');
    setOrderA('');
  };

  const handleSubmitB = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nameB.trim()) return;
    onAddPlayer(
      nameB.trim(), 
      numB.trim() || undefined, 
      teamBName, 
      throwsB, 
      batsB, 
      posTypeB, 
      orderB ? Number(orderB) : undefined
    );
    setNameB('');
    setNumB('');
    setThrowsB('R');
    setBatsB('R');
    setPosTypeB('batter');
    setOrderB('');
  };

  // CSV parsing function with position type support (Batter vs Pitcher auto-detect)
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>, teamKey: 'teamA' | 'teamB') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) return;

      // Extract team name from the filename (without extension)
      const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const targetTeamName = fileNameWithoutExt;

      const parsedPlayers: Omit<Player, 'id'>[] = [];
      let defaultHotkeyIndex = 1;

      const lowerFileName = file.name.toLowerCase();
      const isPitchingFile = lowerFileName.includes('投手') || 
                             lowerFileName.includes('pitcher') || 
                             lowerFileName.includes('pitching') || 
                             (lowerFileName.includes('投') && !lowerFileName.includes('投打'));

      // 1. Header row detection
      const firstLineCols = lines[0].split(/[,\t，]/).map(c => c.replace(/^["']|["']$/g, '').trim());
      const headerKeywords = ['名前', '選手', 'name', 'player', '背番号', '番号', 'no.', 'number', '投打', '投', '打', 'hand', 'position', 'ポジション', '役割'];
      const hasHeaderInFirstLine = firstLineCols.some(col => headerKeywords.some(key => col.toLowerCase().includes(key)));

      let startIdx = 0;
      let headers: string[] = [];

      if (hasHeaderInFirstLine) {
        headers = firstLineCols;
        startIdx = 1;
      } else {
        // If no header, only treat first row as team name if it has 1 column and is short
        if (firstLineCols.length === 1 && firstLineCols[0].length < 15) {
          startIdx = 1;
        } else {
          startIdx = 0;
        }
      }

      const idxName = headers.findIndex(h => /name|名前|選手/i.test(h));
      const idxNum = headers.findIndex(h => /number|no|番号|背番号/i.test(h));
      const idxHotkey = headers.findIndex(h => /hotkey|キー/i.test(h));
      const idxHand = headers.findIndex(h => /hand|throws|投打|投|打|利き腕/i.test(h));

      // Track default states during row iteration
      let currentSectionPos: 'batter' | 'pitcher' | 'both' = isPitchingFile ? 'pitcher' : 'batter';
      let currentTeamSection = targetTeamName;

      for (let i = startIdx; i < lines.length; i++) {
        const row = lines[i].split(/[,\t，]/).map(c => c.replace(/^["']|["']$/g, '').trim());
        if (row.length === 0) continue;

        // Clean columns, filter out empty ones to see the content
        const activeCols = row.filter(c => c.length > 0);
        if (activeCols.length === 0) continue;

        let pName = '';
        let pNumber: string | undefined = undefined;
        let pPos: 'batter' | 'pitcher' | 'both' = 'batter';
        let pTeam = currentTeamSection;

        // Check for section headers (if row has only 1 non-empty column, or first col is position label)
        const firstCol = row[0] || '';
        const firstColLower = firstCol.toLowerCase();

        // 1. Position indicator check
        if (firstColLower === '投手' || firstColLower === 'pitcher' || firstColLower === 'p') {
          currentSectionPos = 'pitcher';
          if (row[1]) {
            pName = row[1];
          } else {
            // It's just a section header row like "投手,,,,,"
            continue;
          }
        } else if (firstColLower === '打者' || firstColLower === '野手' || firstColLower === 'batter' || firstColLower === 'fielders' || firstColLower === 'hitter') {
          currentSectionPos = 'batter';
          if (row[1]) {
            pName = row[1];
          } else {
            // It's just a section header row
            continue;
          }
        }

        // 2. Team section header check (e.g. BC league "茨城", "埼玉", "群馬" in firstCol)
        // If firstCol is non-empty, is not a number, is not a known position label, and is not a player name (because row[1] contains the actual player name)
        const isTeamHeader = firstCol && 
                             !/^\d+$/.test(firstCol) && 
                             !['投手', '打者', '野手', 'pitcher', 'batter', 'p', 'both'].includes(firstColLower) &&
                             row[1] && row[1].length > 0;
        
        if (isTeamHeader) {
          currentTeamSection = firstCol;
          pTeam = currentTeamSection;
        }

        // Parse Name and Number from the row
        if (!pName) {
          // If we have headers, try header-based lookup first
          if (headers.length > 0) {
            if (idxName !== -1 && row[idxName]) pName = row[idxName];
            if (idxNum !== -1 && row[idxNum]) pNumber = row[idxNum];
          } else {
            // No headers: scan columns for name/number pattern
            const candidateCols = row.map(c => c.trim()).filter((c, idx) => {
              if (idx === 0 && isTeamHeader) return false;
              if (idx === 0 && (firstColLower === '投手' || firstColLower === '打者')) return false;
              return c.length > 0;
            });

            if (candidateCols.length > 0) {
              let foundNameNumber = false;
              for (const col of candidateCols) {
                const match = col.match(/^(\d+)\s+(.+)$/);
                if (match) {
                  pNumber = match[1];
                  pName = match[2];
                  foundNameNumber = true;
                  break;
                }
              }

              if (!foundNameNumber) {
                const numIdx = candidateCols.findIndex(c => /^\d+$/.test(c));
                if (numIdx !== -1) {
                  pNumber = candidateCols[numIdx];
                  const nameCandidates = candidateCols.filter((_, idx) => idx !== numIdx);
                  if (nameCandidates.length > 0) {
                    pName = nameCandidates[0];
                  }
                } else {
                  pName = candidateCols[0];
                }
              }
            }
          }
        }

        if (!pName || pName === '-') continue;

        // Determine position:
        // A. If the name is in the known pitchers set, it's a pitcher!
        // B. Else, fall back to currentSectionPos
        const normName = pName.toLowerCase().replace(/[\s\.\-\u3000']/g, '');
        if (MLB_PITCHERS.has(normName)) {
          pPos = 'pitcher';
        } else {
          pPos = currentSectionPos;
        }

        // Keep existing parsed hotkey generation
        let pHotkey = '';
        if (headers.length > 0 && idxHotkey !== -1 && row[idxHotkey]) {
          pHotkey = row[idxHotkey].toLowerCase();
        }
        if (!pHotkey) {
          pHotkey = defaultHotkeyIndex <= 9 ? defaultHotkeyIndex.toString() : '-';
          defaultHotkeyIndex++;
        }

        // Parse hand, throws, bats
        let pHand: 'R' | 'L' | 'S' = 'R';
        let pThrows: 'R' | 'L' = 'R';
        let pBats: 'R' | 'L' | 'S' = 'R';

        // Check if hands info is available in row
        let handVal = '';
        if (headers.length > 0 && idxHand !== -1 && row[idxHand]) {
          handVal = row[idxHand];
        } else {
          // Scan row for hand pattern
          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const val = row[colIdx];
            if (val && (val.includes('右') || val.includes('左') || val.includes('両') || /^[rls]$/i.test(val))) {
              handVal = val;
              break;
            }
          }
        }

        if (handVal) {
          const handText = handVal.toLowerCase();
          if (handText.includes('右投右打') || handText === '右/右') {
            pThrows = 'R'; pBats = 'R'; pHand = 'R';
          } else if (handText.includes('右投左打') || handText === '右/左') {
            pThrows = 'R'; pBats = 'L'; pHand = 'L';
          } else if (handText.includes('左投左打') || handText === '左/左') {
            pThrows = 'L'; pBats = 'L'; pHand = 'L';
          } else if (handText.includes('左投右打') || handText === '左/右') {
            pThrows = 'L'; pBats = 'R'; pHand = 'R';
          } else if (handText.includes('右投両打') || handText === '右/両' || handText === '右/s') {
            pThrows = 'R'; pBats = 'S'; pHand = 'S';
          } else if (handText.includes('左投両打') || handText === '左/両' || handText === '左/s') {
            pThrows = 'L'; pBats = 'S'; pHand = 'S';
          } else {
            if (handText.includes('左') || handText.includes('l')) {
              pThrows = 'L'; pBats = 'L'; pHand = 'L';
            } else if (handText.includes('両') || handText.includes('s')) {
              pThrows = 'R'; pBats = 'S'; pHand = 'S';
            }
          }
        }

        parsedPlayers.push({
          name: pName,
          number: pNumber,
          hotkey: pHotkey,
          teamName: pTeam,
          positionType: pPos,
          hand: pHand,
          throws: pThrows,
          bats: pBats
        });
      }

      // Check if there are multiple teams in the parsed list
      const uniqueTeams = Array.from(new Set(parsedPlayers.map(p => p.teamName ? p.teamName.trim().toUpperCase() : '')));
      const isMultiTeam = uniqueTeams.filter(Boolean).length > 1;

      onImportRoster(teamKey, targetTeamName, parsedPlayers, isMultiTeam, file.name);
    };

    reader.readAsText(file, 'utf-8');
    e.target.value = ''; // Reset input selection
  };

  // Group players by team name
  const playersA = players.filter(p => p.teamName === teamAName);
  const playersB = players.filter(p => p.teamName === teamBName);

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      {/* Panel Header */}
      <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-855 flex items-center justify-between">
        <h3 className="text-xs uppercase font-extrabold tracking-wider text-zinc-400 flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-400" />
          チーム登録・選手名簿
        </h3>
        <div className="flex items-center gap-2">
          {onClearRoster && players.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm("現在登録されている選手名簿をすべてクリアしてよろしいですか？")) {
                  onClearRoster();
                }
              }}
              className="text-[9px] bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/80 px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-2.5 h-2.5" />
              名簿クリア
            </button>
          )}
          <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-900 px-1.5 py-0.5 rounded font-bold">
            登録選手数: {players.length}人
          </span>
        </div>
      </div>

      {/* Side-by-side Roster Columns */}
      <div className="grid grid-cols-2 divide-x divide-zinc-800 flex-1 overflow-y-auto min-h-[300px] max-h-[420px]">
        
        {/* TEAM A COLUMN */}
        <div className="flex flex-col p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-1">
              <span className="text-[8.5px] font-black bg-zinc-800 border border-zinc-700 text-zinc-400 px-1 py-0.5 rounded select-none shrink-0">先行</span>
              <input
                type="text"
                value={teamAName}
                onChange={(e) => onUpdateTeamAName(e.target.value)}
                placeholder="TEAM A"
                className="bg-transparent text-sm font-extrabold text-amber-400 focus:outline-none focus:border-amber-400 border-b border-transparent w-32 uppercase"
                title="クリックでチーム名を編集"
              />
              <select
                value={teamAColor}
                onChange={(e) => onUpdateTeamAColor(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-[10px] rounded px-1 py-0.5 text-zinc-300 focus:outline-none cursor-pointer h-5 shrink-0"
                title="タイムラインのテーマ色を選択"
              >
                <option value="amber">橙</option>
                <option value="sky">水</option>
                <option value="emerald">緑</option>
                <option value="red">赤</option>
                <option value="blue">青</option>
                <option value="indigo">紺</option>
                <option value="purple">紫</option>
                <option value="zinc">灰</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 font-bold">{playersA.length}名</span>
              <button
                type="button"
                onClick={() => fileInputARef.current?.click()}
                className="px-1.5 py-1 bg-zinc-850 hover:bg-zinc-750 text-sky-300 rounded border border-zinc-750 cursor-pointer flex items-center gap-1 text-[8.5px] font-semibold transition-colors"
                title="選手名簿CSVをインポート（投手・野手自動判定）"
              >
                <Upload className="w-2.5 h-2.5 text-sky-400" /> CSVインポート
              </button>
              <input
                ref={fileInputARef}
                type="file"
                accept=".csv"
                onChange={(e) => handleCsvImport(e, 'teamA')}
                className="hidden"
              />
            </div>
          </div>

          {/* Add Team A Player Form */}
          <form onSubmit={handleSubmitA} className="flex gap-1 items-center">
            <input
              type="text"
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="選手名"
              className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 text-xs px-2 py-1.5 rounded text-zinc-200 focus:outline-none focus:border-sky-500 h-8"
            />
            <input
              type="text"
              value={numA}
              onChange={(e) => setNumA(e.target.value)}
              placeholder="No."
              className="w-8 bg-zinc-950 border border-zinc-800 text-xs px-0.5 py-1.5 rounded text-center text-zinc-250 focus:outline-none focus:border-sky-500 h-8"
              title="背番号"
            />
            <select
              value={throwsA}
              onChange={(e) => setThrowsA(e.target.value as 'R' | 'L')}
              className="bg-zinc-950 border border-zinc-800 text-[10px] px-1 py-1 rounded text-zinc-300 focus:outline-none cursor-pointer w-11 h-8 shrink-0 font-bold"
              title="投球（右投/左投）"
            >
              <option value="R">右投</option>
              <option value="L">左投</option>
            </select>
            <select
              value={batsA}
              onChange={(e) => setBatsA(e.target.value as 'R' | 'L' | 'S')}
              className="bg-zinc-950 border border-zinc-800 text-[10px] px-1 py-1 rounded text-zinc-300 focus:outline-none cursor-pointer w-11 h-8 shrink-0 font-bold"
              title="打席（右打/左打/両打）"
            >
              <option value="R">右打</option>
              <option value="L">左打</option>
              <option value="S">両打</option>
            </select>
            <select
              value={posTypeA}
              onChange={(e) => setPosTypeA(e.target.value as 'batter' | 'pitcher' | 'both')}
              className="bg-zinc-950 border border-zinc-800 text-[10px] px-1 py-1 rounded text-zinc-300 focus:outline-none cursor-pointer w-9 h-8 shrink-0 font-bold text-center"
              title="役割（野手/投手/二刀流）"
            >
              <option value="batter">野</option>
              <option value="pitcher">投</option>
              <option value="both">二</option>
            </select>
            <select
              value={orderA}
              onChange={(e) => setOrderA(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-[10px] px-0.5 py-1 rounded text-zinc-300 focus:outline-none cursor-pointer w-11 h-8 shrink-0 font-bold"
              title="デフォルト打順（1番〜9番）"
            >
              <option value="">打順</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <option key={n} value={n}>{n}番</option>
              ))}
            </select>
            <button
              type="submit"
              onClick={handleSubmitA}
              className="bg-sky-650 hover:bg-sky-550 text-white px-2 py-1.5 rounded text-[11px] font-extrabold active:scale-95 shadow cursor-pointer transition-colors shrink-0 h-8 flex items-center justify-center"
            >
              追加
            </button>
          </form>

          {/* Roster A List */}
          <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-1">
            {playersA.length === 0 ? (
              <p className="text-[10px] text-zinc-550 text-center py-6">選手が登録されていません。<br/>上のボタンからCSVをインポートしてください。</p>
            ) : (
              playersA.map((player) => {
                const isActive = player.id === activePlayerId;
                return (
                  <div
                    key={player.id}
                    onClick={() => onSelectPlayer(isActive ? null : player.id)}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-all border group ${
                      isActive
                        ? 'bg-sky-650/15 border-sky-500/60 hover:bg-sky-650/20'
                        : 'bg-zinc-850/30 border-zinc-855 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 bg-zinc-900 border border-zinc-800 text-[9px] font-mono text-zinc-400 rounded flex items-center justify-center">
                        {player.hotkey}
                      </span>
                      {player.number && (
                        <span className="text-[9px] font-bold text-sky-400 bg-sky-950/40 px-1 rounded border border-sky-900/30">
                          #{player.number}
                        </span>
                      )}
                      {player.battingOrder && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-950/40 px-1 rounded border border-amber-900/30 shrink-0">
                          {player.battingOrder}番
                        </span>
                      )}
                      <span className={`text-xs font-semibold ${isActive ? 'text-sky-300 font-bold' : 'text-zinc-200'}`}>
                        {player.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* 投球 (Throws) バッジ */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentThrows = player.throws || (player.hand === 'L' ? 'L' : 'R');
                          const nextThrows = currentThrows === 'L' ? 'R' : 'L';
                          if (onUpdatePlayerThrows) onUpdatePlayerThrows(player.id, nextThrows);
                        }}
                        className={`text-[8.5px] px-1 py-0.5 rounded font-black border transition-all cursor-pointer ${
                          (player.throws || (player.hand === 'L' ? 'L' : 'R')) === 'L'
                            ? 'bg-amber-950/45 border-amber-900/50 text-amber-400 font-extrabold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 font-bold'
                        }`}
                        title="クリックして投球（右投 / 左投）を切り替え"
                      >
                        {(player.throws || (player.hand === 'L' ? 'L' : 'R')) === 'L' ? '左投' : '右投'}
                      </button>

                      {/* 打撃 (Bats) バッジ */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentBats = player.bats || player.hand || 'R';
                          let nextBats: 'R' | 'L' | 'S' = 'R';
                          if (currentBats === 'R') nextBats = 'L';
                          else if (currentBats === 'L') nextBats = 'S';
                          if (onUpdatePlayerBats) onUpdatePlayerBats(player.id, nextBats);
                        }}
                        className={`text-[8.5px] px-1 py-0.5 rounded font-black border transition-all cursor-pointer ${
                          (player.bats || player.hand || 'R') === 'L'
                            ? 'bg-amber-950/45 border-amber-900/50 text-amber-400 font-extrabold'
                            : (player.bats || player.hand || 'R') === 'S'
                              ? 'bg-sky-950/45 border-sky-900/50 text-sky-400 font-extrabold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 font-bold'
                        }`}
                        title="クリックして打席（右打 / 左打 / 両打）を切り替え"
                      >
                        {(player.bats || player.hand || 'R') === 'L' ? '左打' : (player.bats || player.hand || 'R') === 'S' ? '両打' : '右打'}
                      </button>

                      {/* Position Type Badge & Toggle (野 / 投 / 二) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTogglePlayerPosition) onTogglePlayerPosition(player.id);
                        }}
                        className={`text-[8.5px] px-1 py-0.5 rounded font-black border transition-all cursor-pointer ${
                          player.positionType === 'pitcher'
                            ? 'bg-red-950/45 border-red-900/50 text-red-400 font-extrabold'
                            : player.positionType === 'both'
                              ? 'bg-purple-950/45 border-purple-900/50 text-purple-300 font-extrabold'
                              : 'bg-emerald-950/45 border-emerald-900/50 text-emerald-400 font-bold'
                        }`}
                        title="クリックして登録役割（野手 / 投手 / 二刀流）を切り替え"
                      >
                        {player.positionType === 'pitcher' ? '投' : player.positionType === 'both' ? '二' : '野'}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePlayer(player.id);
                        }}
                        className="p-0.5 text-zinc-650 hover:text-red-400 hover:bg-zinc-900/50 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TEAM B COLUMN */}
        <div className="flex flex-col p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-1">
              <span className="text-[8.5px] font-black bg-zinc-800 border border-zinc-700 text-zinc-400 px-1 py-0.5 rounded select-none shrink-0">後攻</span>
              <input
                type="text"
                value={teamBName}
                onChange={(e) => onUpdateTeamBName(e.target.value)}
                placeholder="TEAM B"
                className="bg-transparent text-sm font-extrabold text-amber-400 focus:outline-none focus:border-amber-400 border-b border-transparent w-32 uppercase"
                title="クリックでチーム名を編集"
              />
              <select
                value={teamBColor}
                onChange={(e) => onUpdateTeamBColor(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-[10px] rounded px-1 py-0.5 text-zinc-300 focus:outline-none cursor-pointer h-5 shrink-0"
                title="タイムラインのテーマ色を選択"
              >
                <option value="amber">橙</option>
                <option value="sky">水</option>
                <option value="emerald">緑</option>
                <option value="red">赤</option>
                <option value="blue">青</option>
                <option value="indigo">紺</option>
                <option value="purple">紫</option>
                <option value="zinc">灰</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 font-bold">{playersB.length}名</span>
              <button
                type="button"
                onClick={() => fileInputBRef.current?.click()}
                className="px-1.5 py-1 bg-zinc-850 hover:bg-zinc-750 text-sky-300 rounded border border-zinc-750 cursor-pointer flex items-center gap-1 text-[8.5px] font-semibold transition-colors"
                title="選手名簿CSVをインポート（投手・野手自動判定）"
              >
                <Upload className="w-2.5 h-2.5 text-sky-400" /> CSVインポート
              </button>
              <input
                ref={fileInputBRef}
                type="file"
                accept=".csv"
                onChange={(e) => handleCsvImport(e, 'teamB')}
                className="hidden"
              />
            </div>
          </div>

          {/* Add Team B Player Form */}
          <form onSubmit={handleSubmitB} className="flex gap-1 items-center">
            <input
              type="text"
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="選手名"
              className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 text-xs px-2 py-1.5 rounded text-zinc-200 focus:outline-none focus:border-sky-500 h-8"
            />
            <input
              type="text"
              value={numB}
              onChange={(e) => setNumB(e.target.value)}
              placeholder="No."
              className="w-8 bg-zinc-950 border border-zinc-800 text-xs px-0.5 py-1.5 rounded text-center text-zinc-250 focus:outline-none focus:border-sky-500 h-8"
              title="背番号"
            />
            <select
              value={throwsB}
              onChange={(e) => setThrowsB(e.target.value as 'R' | 'L')}
              className="bg-zinc-950 border border-zinc-800 text-[10px] px-1 py-1 rounded text-zinc-300 focus:outline-none cursor-pointer w-11 h-8 shrink-0 font-bold"
              title="投球（右投/左投）"
            >
              <option value="R">右投</option>
              <option value="L">左投</option>
            </select>
            <select
              value={batsB}
              onChange={(e) => setBatsB(e.target.value as 'R' | 'L' | 'S')}
              className="bg-zinc-950 border border-zinc-800 text-[10px] px-1 py-1 rounded text-zinc-300 focus:outline-none cursor-pointer w-11 h-8 shrink-0 font-bold"
              title="打席（右打/左打/両打）"
            >
              <option value="R">右打</option>
              <option value="L">左打</option>
              <option value="S">両打</option>
            </select>
            <select
              value={posTypeB}
              onChange={(e) => setPosTypeB(e.target.value as 'batter' | 'pitcher' | 'both')}
              className="bg-zinc-950 border border-zinc-800 text-[10px] px-1 py-1 rounded text-zinc-300 focus:outline-none cursor-pointer w-9 h-8 shrink-0 font-bold text-center"
              title="役割（野手/投手/二刀流）"
            >
              <option value="batter">野</option>
              <option value="pitcher">投</option>
              <option value="both">二</option>
            </select>
            <select
              value={orderB}
              onChange={(e) => setOrderB(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-[10px] px-0.5 py-1 rounded text-zinc-300 focus:outline-none cursor-pointer w-11 h-8 shrink-0 font-bold"
              title="デフォルト打順（1番〜9番）"
            >
              <option value="">打順</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <option key={n} value={n}>{n}番</option>
              ))}
            </select>
            <button
              type="submit"
              onClick={handleSubmitB}
              className="bg-sky-650 hover:bg-sky-555 text-white px-2 py-1.5 rounded text-[11px] font-extrabold active:scale-95 shadow cursor-pointer transition-colors shrink-0 h-8 flex items-center justify-center"
            >
              追加
            </button>
          </form>

          {/* Roster B List */}
          <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-1">
            {playersB.length === 0 ? (
              <p className="text-[10px] text-zinc-550 text-center py-6">選手が登録されていません。<br/>上のボタンからCSVをインポートしてください。</p>
            ) : (
              playersB.map((player) => {
                const isActive = player.id === activePlayerId;
                return (
                  <div
                    key={player.id}
                    onClick={() => onSelectPlayer(isActive ? null : player.id)}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-all border group ${
                      isActive
                        ? 'bg-sky-650/15 border-sky-500/60 hover:bg-sky-650/20'
                        : 'bg-zinc-850/30 border-zinc-850 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 bg-zinc-900 border border-zinc-800 text-[9px] font-mono text-zinc-400 rounded flex items-center justify-center">
                        {player.hotkey}
                      </span>
                      {player.number && (
                        <span className="text-[9px] font-bold text-sky-400 bg-sky-950/40 px-1 rounded border border-sky-900/30">
                          #{player.number}
                        </span>
                      )}
                      {player.battingOrder && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-950/40 px-1 rounded border border-amber-900/30 shrink-0">
                          {player.battingOrder}番
                        </span>
                      )}
                      <span className={`text-xs font-semibold ${isActive ? 'text-sky-300 font-bold' : 'text-zinc-200'}`}>
                        {player.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* 投球 (Throws) バッジ */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentThrows = player.throws || (player.hand === 'L' ? 'L' : 'R');
                          const nextThrows = currentThrows === 'L' ? 'R' : 'L';
                          if (onUpdatePlayerThrows) onUpdatePlayerThrows(player.id, nextThrows);
                        }}
                        className={`text-[8.5px] px-1 py-0.5 rounded font-black border transition-all cursor-pointer ${
                          (player.throws || (player.hand === 'L' ? 'L' : 'R')) === 'L'
                            ? 'bg-amber-950/45 border-amber-900/50 text-amber-400 font-extrabold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 font-bold'
                        }`}
                        title="クリックして投球（右投 / 左投）を切り替え"
                      >
                        {(player.throws || (player.hand === 'L' ? 'L' : 'R')) === 'L' ? '左投' : '右投'}
                      </button>

                      {/* 打撃 (Bats) バッジ */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentBats = player.bats || player.hand || 'R';
                          let nextBats: 'R' | 'L' | 'S' = 'R';
                          if (currentBats === 'R') nextBats = 'L';
                          else if (currentBats === 'L') nextBats = 'S';
                          if (onUpdatePlayerBats) onUpdatePlayerBats(player.id, nextBats);
                        }}
                        className={`text-[8.5px] px-1 py-0.5 rounded font-black border transition-all cursor-pointer ${
                          (player.bats || player.hand || 'R') === 'L'
                            ? 'bg-amber-950/45 border-amber-900/50 text-amber-400 font-extrabold'
                            : (player.bats || player.hand || 'R') === 'S'
                              ? 'bg-sky-950/45 border-sky-900/50 text-sky-400 font-extrabold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 font-bold'
                        }`}
                        title="クリックして打席（右打 / 左打 / 両打）を切り替え"
                      >
                        {(player.bats || player.hand || 'R') === 'L' ? '左打' : (player.bats || player.hand || 'R') === 'S' ? '両打' : '右打'}
                      </button>

                      {/* Position Type Badge & Toggle (野 / 投 / 二) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTogglePlayerPosition) onTogglePlayerPosition(player.id);
                        }}
                        className={`text-[8.5px] px-1 py-0.5 rounded font-black border transition-all cursor-pointer ${
                          player.positionType === 'pitcher'
                            ? 'bg-red-950/45 border-red-900/50 text-red-400 font-extrabold'
                            : player.positionType === 'both'
                              ? 'bg-purple-950/45 border-purple-900/50 text-purple-300 font-extrabold'
                              : 'bg-emerald-950/45 border-emerald-900/50 text-emerald-400 font-bold'
                        }`}
                        title="クリックして登録役割（野手 / 投手 / 二刀流）を切り替え"
                      >
                        {player.positionType === 'pitcher' ? '投' : player.positionType === 'both' ? '二' : '野'}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePlayer(player.id);
                        }}
                        className="p-0.5 text-zinc-650 hover:text-red-400 hover:bg-zinc-900/50 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Footnote */}
      <div className="px-3 py-2 bg-zinc-950 text-[10px] text-zinc-500 border-t border-zinc-850 flex items-center justify-between select-none">
        <span>Click player or press keys to select</span>
        <button
          onClick={() => onSelectPlayer(null)}
          className="text-zinc-400 hover:text-white hover:underline cursor-pointer font-semibold"
        >
          Clear Active
        </button>
      </div>
    </div>
  );
};
