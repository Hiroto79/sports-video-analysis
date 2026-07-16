import { useState, useRef, useEffect, useMemo } from 'react';
import type { Player, ButtonConfig, TaggedEvent, CustomPreset } from './types';
import { VideoPlayer } from './components/VideoPlayer';
import type { VideoPlayerRef } from './components/VideoPlayer';
import { PlayerManager } from './components/PlayerManager';
import { CodeWindowDesigner } from './components/CodeWindowDesigner';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { OrganizerView } from './components/OrganizerView';
import { MatrixView } from './components/MatrixView';
import { MatrixPlayerModal } from './components/MatrixPlayerModal';
import { supabase } from './lib/supabase';
import { Tv, ExternalLink, Film, Upload, ChevronDown, Command, Scissors, Download, RefreshCw, Users } from 'lucide-react';

// Default initial roster
const INITIAL_PLAYERS: Player[] = [];

// Simplified Baseball template with absolute coordinates positioned in a 7-column grid
const BASEBALL_TEMPLATE: ButtonConfig[] = [
  // Column 0: Main Action
  { id: 'btn_pitch', name: 'Pitch (投球)', type: 'code', hotkey: '', color: 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white font-extrabold shadow-emerald-950/40', leadIn: 4, leadOut: 2, x: 10, y: 10, w: 110, h: 80 },

  // Column 1: Pitch Types A
  { id: 'btn_4seam', name: '4シーム', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 130, y: 10, w: 110, h: 36 },
  { id: 'btn_2seam', name: '2シーム', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 130, y: 52, w: 110, h: 36 },
  { id: 'btn_cutter', name: 'カットボール', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 130, y: 94, w: 110, h: 36 },
  { id: 'btn_slider', name: 'スライダー', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 130, y: 136, w: 110, h: 36 },
  { id: 'btn_sweeper', name: 'スイーパー', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 130, y: 178, w: 110, h: 36 },
  { id: 'btn_slurve', name: 'スラーブ', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 130, y: 220, w: 110, h: 36 },

  // Column 2: Pitch Types B
  { id: 'btn_curve', name: 'カーブ', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 246, y: 10, w: 110, h: 36 },
  { id: 'btn_kncurve', name: 'ナックルカーブ', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 246, y: 52, w: 110, h: 36 },
  { id: 'btn_changeup', name: 'チェンジアップ', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 246, y: 94, w: 110, h: 36 },
  { id: 'btn_splitter', name: 'スプリット', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 246, y: 136, w: 110, h: 36 },
  { id: 'btn_fork', name: 'フォーク', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 246, y: 178, w: 110, h: 36 },
  { id: 'btn_knuckle', name: 'ナックル', type: 'label', hotkey: '', color: 'bg-sky-950/70 border-sky-900/40 hover:bg-sky-900/60 text-sky-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Pitch Type', x: 246, y: 220, w: 110, h: 36 },

  // Column 3: Pitch Results
  { id: 'btn_calledstrike', name: '見逃しストライク', type: 'label', hotkey: '', color: 'bg-rose-950/70 border-rose-900/50 hover:bg-rose-900/60 text-rose-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Result', x: 362, y: 10, w: 110, h: 36 },
  { id: 'btn_swingingstrike', name: '空振りストライク', type: 'label', hotkey: '', color: 'bg-rose-950/70 border-rose-900/50 hover:bg-rose-900/60 text-rose-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Result', x: 362, y: 52, w: 110, h: 36 },
  { id: 'btn_foul', name: 'ファール', type: 'label', hotkey: '', color: 'bg-rose-950/70 border-rose-900/50 hover:bg-rose-900/60 text-rose-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Result', x: 362, y: 94, w: 110, h: 36 },
  { id: 'btn_ball', name: 'ボール', type: 'label', hotkey: '', color: 'bg-blue-950/70 border-blue-900/50 hover:bg-blue-900/60 text-blue-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Result', x: 362, y: 136, w: 110, h: 36 },

  // Column 4: Batted Ball Type & Outcomes
  { id: 'btn_grounder', name: 'ゴロ', type: 'label', hotkey: '', color: 'bg-purple-950/70 border-purple-900/50 hover:bg-purple-900/60 text-purple-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Batted Ball', x: 478, y: 10, w: 110, h: 36 },
  { id: 'btn_liner', name: 'ライナー', type: 'label', hotkey: '', color: 'bg-purple-950/70 border-purple-900/50 hover:bg-purple-900/60 text-purple-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Batted Ball', x: 478, y: 52, w: 110, h: 36 },
  { id: 'btn_flyball', name: 'フライ', type: 'label', hotkey: '', color: 'bg-purple-950/70 border-purple-900/50 hover:bg-purple-900/60 text-purple-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Batted Ball', x: 478, y: 94, w: 110, h: 36 },
  { id: 'btn_popfly', name: '小フライ', type: 'label', hotkey: '', color: 'bg-purple-950/70 border-purple-900/50 hover:bg-purple-900/60 text-purple-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Batted Ball', x: 478, y: 136, w: 110, h: 36 },

  // Column 5: Steals & Tactics
  { id: 'btn_steal_success', name: '盗塁成功', type: 'label', hotkey: '', color: 'bg-sky-950/40 border-sky-800/60 hover:bg-sky-800/40 text-sky-400 font-bold', leadIn: 0, leadOut: 0, groupName: 'Play', x: 594, y: 10, w: 110, h: 36 },
  { id: 'btn_steal_fail', name: '盗塁失敗', type: 'label', hotkey: '', color: 'bg-sky-950/40 border-sky-800/60 hover:bg-sky-800/40 text-sky-400 font-bold', leadIn: 0, leadOut: 0, groupName: 'Play', x: 594, y: 52, w: 110, h: 36 },
  { id: 'btn_pickoff_out', name: '牽制死', type: 'label', hotkey: '', color: 'bg-sky-950/40 border-sky-800/60 hover:bg-sky-800/40 text-sky-400 font-bold', leadIn: 0, leadOut: 0, groupName: 'Play', x: 594, y: 94, w: 110, h: 36 },
  { id: 'btn_bunt', name: 'バント', type: 'label', hotkey: '', color: 'bg-amber-950/40 border-amber-800/60 hover:bg-amber-800/40 text-amber-400 font-bold', leadIn: 0, leadOut: 0, groupName: 'Tactics', x: 594, y: 136, w: 110, h: 36 },
  { id: 'btn_endrun', name: 'エンドラン', type: 'label', hotkey: '', color: 'bg-amber-950/40 border-amber-800/60 hover:bg-amber-800/40 text-amber-400 font-bold', leadIn: 0, leadOut: 0, groupName: 'Tactics', x: 594, y: 178, w: 110, h: 36 },
  { id: 'btn_squeeze', name: 'スクイズ', type: 'label', hotkey: '', color: 'bg-amber-950/40 border-amber-800/60 hover:bg-amber-800/40 text-amber-400 font-bold', leadIn: 0, leadOut: 0, groupName: 'Tactics', x: 594, y: 220, w: 110, h: 36 },

  // Column 6: RBI & Special
  { id: 'btn_rbi1', name: '1打点', type: 'label', hotkey: '', color: 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'RBI', x: 710, y: 10, w: 110, h: 36 },
  { id: 'btn_rbi2', name: '2打点', type: 'label', hotkey: '', color: 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'RBI', x: 710, y: 52, w: 110, h: 36 },
  { id: 'btn_rbi3', name: '3打点', type: 'label', hotkey: '', color: 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'RBI', x: 710, y: 94, w: 110, h: 36 },
  { id: 'btn_rbi4', name: '4打点', type: 'label', hotkey: '', color: 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'RBI', x: 710, y: 136, w: 110, h: 36 },
  { id: 'btn_fc', name: 'フィルダースチョイス', type: 'label', hotkey: '', color: 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Play', x: 710, y: 178, w: 110, h: 36 },
  { id: 'btn_advance', name: '進塁', type: 'label', hotkey: '', color: 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300 font-bold', leadIn: 0, leadOut: 0, groupName: 'Play', x: 710, y: 220, w: 110, h: 36 }
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
  'ランナー': ['なし', '1塁', '2塁', '3塁', '満塁', '1・2塁', '2・3塁', '1・3塁'],
  '打点': ['1打点', '2打点', '3打点', '4打点'],
  '作戦/他': ['バント', 'エンドラン', '牽制', '盗塁成功', '盗塁失敗', 'フィルダースチョイス'],
};

function App() {
  const [currentUser, setCurrentUser] = useState<string>(() => window.localStorage.getItem('sportscode_current_user') || '');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => window.localStorage.getItem('sportscode_is_logged_in') === 'true');
  const [usersDb] = useState<{ [key: string]: { name: string; password?: string } }>(() => {
    try {
      const saved = window.localStorage.getItem('sportscode_users_db');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      'default': { name: 'デフォルトアカウント', password: '' },
      'baseball_team_a': { name: 'Aチーム監督', password: '123' },
      'baseball_team_b': { name: 'Bチーム監督', password: '123' },
      'admin': { name: 'システム管理者', password: 'admin' }
    };
  });

  const [inputUserId, setInputUserId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Administrator Account Management panel states
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminAccountsList, setAdminAccountsList] = useState<any[]>([]);
  const [adminPanelError, setAdminPanelError] = useState<string | null>(null);
  const [newTeamId, setNewTeamId] = useState('');
  const [newTeamPassword, setNewTeamPassword] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      setUpdateStatus('ready');
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

  const fetchAdminAccounts = async () => {
    if (!supabase) {
      // Offline fallback: Use usersDb
      const mockList = Object.entries(usersDb).map(([id, info]) => ({
        id,
        password: info.password || '',
        team_name: info.name,
        is_active: true
      }));
      setAdminAccountsList(mockList);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('team_accounts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setAdminAccountsList(data);
        setAdminPanelError(null);
      } else {
        setAdminPanelError(error?.message || 'アカウント一覧の取得に失敗しました');
      }
    } catch (err: any) {
      setAdminPanelError(err?.message || 'エラーが発生しました');
    }
  };

  const handleAdminUpdatePassword = async (id: string, newPass: string) => {
    if (supabase) {
      const { error } = await supabase
        .from('team_accounts')
        .update({ password: newPass })
        .eq('id', id);
      if (error) {
        alert('パスワード更新に失敗しました: ' + error.message);
        return;
      }
    } else {
      usersDb[id] = { ...usersDb[id], password: newPass };
      window.localStorage.setItem('sportscode_users_db', JSON.stringify(usersDb));
    }
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
    if (!newTeamId.trim() || !newTeamPassword.trim()) {
      alert('IDとパスワードを入力してください');
      return;
    }

    if (supabase) {
      const { error } = await supabase
        .from('team_accounts')
        .insert({
          id: newTeamId.trim(),
          password: newTeamPassword.trim(),
          team_name: newTeamName.trim() || null,
          is_active: true
        });
      if (error) {
        alert('登録に失敗しました: ' + error.message);
        return;
      }
    } else {
      usersDb[newTeamId] = { name: newTeamName || newTeamId, password: newTeamPassword };
      window.localStorage.setItem('sportscode_users_db', JSON.stringify(usersDb));
    }

    setNewTeamId('');
    setNewTeamPassword('');
    setNewTeamName('');
    fetchAdminAccounts();
  };

  useEffect(() => {
    if (showAdminPanel) {
      fetchAdminAccounts();
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
          .select('password, is_active, team_name')
          .eq('id', trimmedId)
          .single();

        if (!error && data) {
          supabaseUser = data;
          databaseExists = true;
        } else if (error && error.code !== 'PGRST116') {
          console.error("Supabase login connection/table error:", error);
          // If the error code is not 'no rows found' (PGRST116), the table doesn't exist or network is down.
          // Fall back to local simulation.
          databaseExists = false;
        } else {
          console.warn("Supabase user row not found (PGRST116):", error);
          // No rows found: the database exists but this ID was not found.
          databaseExists = true;
        }
      } catch (err) {
        console.error("Supabase query failed exception:", err);
      }
    }

    if (databaseExists && supabaseUser) {
      if (!supabaseUser.is_active) {
        setLoginError('サブスクリプションの有効期限が切れています。管理側にお問い合わせください。');
        return;
      }

      if (supabaseUser.password !== loginPassword) {
        setLoginError('IDまたはパスワードが正しくありません');
        return;
      }

      // Login successful via Supabase
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
        setLoginError('IDまたはパスワードが正しくありません');
        return;
      }

      // Login successful via Local Simulation
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
    setLoginError('IDまたはパスワードが正しくありません');
  };

  const handleForceLogout = (reason: string) => {
    window.localStorage.removeItem('sportscode_current_user');
    window.localStorage.removeItem('sportscode_current_password');
    window.localStorage.setItem('sportscode_is_logged_in', 'false');
    setIsLoggedIn(false);
    setCurrentUser('');
    setLoginError(reason);
    channelRef.current?.postMessage({ type: 'SYNC_USER_LOGGED_OUT' });
    window.location.reload();
  };

  // Periodic check to verify if the account is still valid (password hasn't changed, subscription hasn't expired)
  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const verifySession = async () => {
      const savedPassword = window.localStorage.getItem('sportscode_current_password') || '';
      
      // If Supabase is active, check the cloud DB
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('team_accounts')
            .select('password, is_active')
            .eq('id', currentUser)
            .single();

          if (!error && data) {
            if (data.password !== savedPassword || !data.is_active) {
              // Remote password changed or account deactivated (e.g. subscription expired!)
              handleForceLogout('サブスクリプションの有効期限が切れたか、パスワードが変更されました。再度ログインしてください。');
            }
          }
        } catch (err) {
          console.warn("Session verification check failed:", err);
        }
      } else {
        // Local simulation: Check usersDb
        const user = usersDb[currentUser];
        if (user && user.password !== savedPassword) {
          handleForceLogout('パスワードが変更されました。再度ログインしてください。');
        }
      }
    };

    // Run verification on mount
    verifySession();

    // Check every 20 seconds
    const interval = setInterval(verifySession, 20000);
    return () => clearInterval(interval);
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
  const [videoName, setVideoName] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Teams names state
  const [teamAName, setTeamAName] = useState(() => localStorage.getItem('sportscode_teama_name') || '');
  const [teamBName, setTeamBName] = useState(() => localStorage.getItem('sportscode_teamb_name') || '');
  const [teamAColor, setTeamAColor] = useState(() => localStorage.getItem('sportscode_teama_color') || 'amber');
  const [teamBColor, setTeamBColor] = useState(() => localStorage.getItem('sportscode_teamb_color') || 'sky');

  // Game date state: manually set game date for tagging session (stored as YYYY-MM-DD)
  const [gameDate, setGameDate] = useState<string>(() => localStorage.getItem('sportscode_game_date') || '');

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
  const [events, setEvents] = useState<TaggedEvent[]>([]);
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
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // App View Mode State: 'tagger' | 'analytics' | 'organizer' | 'matrix'
  const [currentView, setCurrentView] = useState<'tagger' | 'analytics' | 'organizer' | 'matrix'>('tagger');

  // Timeline zoom & timeshift sync states
  const [timelineZoom, setTimelineZoom] = useState(100);
  const [isTimeShiftModalOpen, setIsTimeShiftModalOpen] = useState(false);
  const [timeShiftOffset, setTimeShiftOffset] = useState('');
  const [timeShiftTarget, setTimeShiftTarget] = useState<'all' | 'selected'>('all');



  // Timeline multi-selection state
  const [timelineSelectedIds, setTimelineSelectedIds] = useState<Set<string>>(new Set());

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

  // Sync layout buttons to localStorage and other windows
  const saveLayout = (newLayout: ButtonConfig[]) => {
    setButtons(newLayout);
    localStorage.setItem('sportscode_designer_layout', JSON.stringify(newLayout));
    channelRef.current?.postMessage({ type: 'SYNC_BUTTONS', buttons: newLayout });
  };

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
      if (e.code === 'Space') {
        e.preventDefault();
        if (videoPlayerRef.current) {
          videoPlayerRef.current.togglePlay();
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


  const handleViewChange = (newView: 'tagger' | 'analytics' | 'organizer' | 'matrix') => {
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
        labels: ev.labels
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
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('video_name', videoName);

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
    setPlayers(updated);
    if (videoName) {
      localStorage.setItem(`sportscode_players_${videoName}`, JSON.stringify(updated));
    } else {
      localStorage.setItem('sportscode_designer_roster', JSON.stringify(updated));
    }
    channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: updated });
  };

  const handleDeletePlayer = (id: string) => {
    const updated = players.filter(p => p.id !== id);
    setPlayers(updated);
    channelRef.current?.postMessage({ type: 'SYNC_PLAYERS', players: updated });
    if (activePlayerId === id) {
      setActivePlayerId(null);
    }
  };

  const handleUpdateTeamAName = (newVal: string) => {
    const oldVal = teamAName;
    setTeamAName(newVal);
    channelRef.current?.postMessage({ type: 'UPDATE_TEAMA_NAME', value: newVal });

    setPlayers(prev => {
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

    setPlayers(prev => {
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
    setPlayers([]);
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
    setPlayers(prev => {
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
    setPlayers(prev => {
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
    setPlayers(prev => {
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
    setPlayers(prev => {
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
    setPlayers(prev => {
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
          const cleanName = p.name.trim().replace(/[\s\u3000\.\-\']+/g, '_');
          const cleanTeam = (p.teamName ? p.teamName.trim().toUpperCase() : nameA).replace(/[\s\u3000\.\-\']+/g, '_');
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
        const cleanName = p.name.trim().replace(/[\s\u3000\.\-\']+/g, '_');
        const cleanTeam = normTeamNameVal.replace(/[\s\u3000\.\-\']+/g, '_');
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
    perspective: 'pitcher' | 'catcher',
    
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
    perspective;

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
      if (!videoPlayerRef.current) return;
      const timestamp = videoPlayerRef.current.getCurrentTime();
      
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

      setEvents(prev => [newEvent, ...prev]);
      setActiveEventId(newEvent.id);
      syncEventToSupabase(newEvent);

      // Auto-clear Strike Zone grid selections and outfield plots
      setSelectedCourse('');
      setPlottedHit(null);
      setPreSelectedLabels([]);
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

  // --- USER AUTHENTICATION / LOGIN OVERLAY (Blocks Main & Code Windows if not logged in) ---
  if (!isLoggedIn) {
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
              <p className="text-[10px] text-rose-500 font-bold text-center bg-rose-950/20 p-2 rounded-lg border border-rose-900/30">
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
          defense={inningHalf === 'top' ? defenseA : defenseB}
          onUpdateDefense={(val) => {
            if (isCodeWindow) {
              if (inningHalf === 'top') setDefenseA(val);
              else setDefenseB(val);
              channelRef.current?.postMessage({ type: 'UPDATE_DEFENSE', value: val });
            } else {
              if (inningHalf === 'top') setDefenseA(val);
              else setDefenseB(val);
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
          catcherId={inningHalf === 'top' ? catcherIdA : catcherIdB}
          onUpdateCatcherId={(val) => {
            if (inningHalf === 'top') setCatcherIdA(val);
            else setCatcherIdB(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_CATCHER_ID', value: val, inningHalf });
          }}
          inf1Id={inningHalf === 'top' ? inf1IdA : inf1IdB}
          onUpdateInf1Id={(val) => {
            if (inningHalf === 'top') setInf1IdA(val);
            else setInf1IdB(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_INF1_ID', value: val, inningHalf });
          }}
          inf2Id={inningHalf === 'top' ? inf2IdA : inf2IdB}
          onUpdateInf2Id={(val) => {
            if (inningHalf === 'top') setInf2IdA(val);
            else setInf2IdB(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_INF2_ID', value: val, inningHalf });
          }}
          inf3Id={inningHalf === 'top' ? inf3IdA : inf3IdB}
          onUpdateInf3Id={(val) => {
            if (inningHalf === 'top') setInf3IdA(val);
            else setInf3IdB(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_INF3_ID', value: val, inningHalf });
          }}
          inf4Id={inningHalf === 'top' ? inf4IdA : inf4IdB}
          onUpdateInf4Id={(val) => {
            if (inningHalf === 'top') setInf4IdA(val);
            else setInf4IdB(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_INF4_ID', value: val, inningHalf });
          }}
          lfId={inningHalf === 'top' ? lfIdA : lfIdB}
          onUpdateLfId={(val) => {
            if (inningHalf === 'top') setLfIdA(val);
            else setLfIdB(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_LF_ID', value: val, inningHalf });
          }}
          cfId={inningHalf === 'top' ? cfIdA : cfIdB}
          onUpdateCfId={(val) => {
            if (inningHalf === 'top') setCfIdA(val);
            else setCfIdB(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_CF_ID', value: val, inningHalf });
          }}
          rfId={inningHalf === 'top' ? rfIdA : rfIdB}
          onUpdateRfId={(val) => {
            if (inningHalf === 'top') setRfIdA(val);
            else setRfIdB(val);
            if (isCodeWindow) channelRef.current?.postMessage({ type: 'UPDATE_RF_ID', value: val, inningHalf });
          }}
          dhId={inningHalf === 'top' ? dhIdA : dhIdB}
          onUpdateDhId={(val) => {
            if (inningHalf === 'top') setDhIdA(val);
            else setDhIdB(val);
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased">
      {/* Header Banner */}
      <header className="px-4 py-3 lg:px-6 lg:py-4 bg-zinc-900/60 border-b border-zinc-850 backdrop-blur-md flex flex-col lg:flex-row gap-3 items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="bg-emerald-600 p-2 rounded-lg text-white shadow-lg shadow-emerald-900/30 shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm lg:text-base font-extrabold tracking-tight text-white flex flex-wrap items-center gap-1.5 truncate">
              <span>スポーツビデオタグ＆スタッツロガー</span>
              <span className="text-[9px] bg-red-950 border border-red-800 text-red-400 font-bold px-1.5 py-0.5 rounded">
                Elite v9.0
              </span>
            </h1>
            <p className="hidden lg:block text-xs text-zinc-400 mt-0.5">Sportscode Elite: 画面連動型デュアルウィンドウ設定</p>
          </div>
        </div>

        {/* Workspace select tab and popout buttons */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end shrink-0">
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-inner select-none gap-1">
            <button
              onClick={() => handleViewChange('tagger')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentView === 'tagger'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              📹 ビデオ＆タグ記録
            </button>
            <button
              onClick={() => handleViewChange('organizer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentView === 'organizer'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              📁 オーガナイザー＆エディタ
            </button>
            <button
              onClick={() => handleViewChange('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentView === 'matrix'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              🧮 マトリックス (Matrix)
            </button>
            <button
              onClick={() => handleViewChange('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentView === 'analytics'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              📊 自動分析ダッシュボード
            </button>
          </div>

          {/* Change / Open Video Button */}
          <button
            onClick={() => videoFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-900 text-[10px] font-bold text-emerald-300 hover:text-white rounded-lg cursor-pointer transition-colors shadow"
            title="新しい動画ファイルを読み込みます"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            動画を変更 / 開く
          </button>
          <input
            type="file"
            ref={videoFileInputRef}
            onChange={handleVideoFileChange}
            accept="video/*"
            className="hidden"
          />

          {/* Browser Popout button */}
          <button
            onClick={handlePopoutCodeWindow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[10px] font-bold text-sky-400 hover:text-sky-300 rounded-lg cursor-pointer transition-colors"
            title="コードタグ窓をポップアウト表示します"
          >
            <ExternalLink className="w-3 h-3" />
            コードウィンドウをポップアウト
          </button>

          {/* Update button */}
          <button
            onClick={handleCheckForUpdates}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-bold rounded-lg cursor-pointer transition-colors shadow ${
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
            <RefreshCw className={`w-3 h-3 ${
              updateStatus === 'checking' || updateStatus === 'downloading'
                ? 'animate-spin text-sky-400'
                : updateStatus === 'ready' ? 'text-emerald-300'
                : 'text-rose-500'
            }`} />
            {updateStatus === 'idle' && 'アップデートを確認'}
            {updateStatus === 'checking' && '確認中...'}
            {updateStatus === 'not-available' && '最新版です'}
            {updateStatus === 'available' && `v${updateInfo?.version}に更新する`}
            {updateStatus === 'downloading' && `ダウンロード中 ${updateProgress}%`}
            {updateStatus === 'ready' && '再起動して適用'}
          </button>

          {/* User profile dropdown / logout */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px]">
            <span className="font-bold text-zinc-400">👤 {usersDb[currentUser]?.name || currentUser}</span>
            {currentUser === 'admin' && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="flex items-center gap-1 bg-emerald-700/80 hover:bg-emerald-600 text-[9px] font-bold text-white px-2 py-0.5 rounded cursor-pointer transition-colors"
                title="アカウント契約・ライセンス管理を開きます"
              >
                <Users className="w-2.5 h-2.5" />
                管理
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
              className="font-black text-rose-400 hover:text-rose-300 ml-1 hover:underline cursor-pointer bg-transparent border-0 p-0"
              title="ログアウトしてユーザー選択に戻ります"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* 1. SHARED PERSISTENT VIDEO CONTAINER (Never unmounted, prevents black screen/reset bugs) */}
      {videoUrl && (
        <div 
          style={{ display: currentView === 'analytics' || currentView === 'matrix' ? 'none' : 'block' }}
          className={`shrink-0 w-full transition-all duration-300 ${
            currentView === 'organizer'
              ? (activeOrganizerTab === 'grid' ? 'max-w-2xl mx-auto p-2 lg:p-4' : 'max-w-7xl mx-auto p-2 lg:p-4')
              : 'max-w-5xl mx-auto p-4'
          }`}
        >
          <div className={currentView === 'organizer' && activeOrganizerTab === 'organizer' ? "grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch" : ""}>
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
                        // If current clip ends, skip to next clip's startTime immediately
                        if (time >= currentClip.endTime - 0.05) {
                          const nextIdx = orderedSelectedClips.indexOf(currentClip) + 1;
                          if (nextIdx < orderedSelectedClips.length) {
                            const nextClip = orderedSelectedClips[nextIdx];
                            try {
                              if (video.readyState >= 1) {
                                video.currentTime = nextClip.startTime;
                              }
                            } catch {}
                          } else {
                            // End of playlist: pause and rewind to first selected clip
                            video.pause();
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
                          try {
                            if (video.readyState >= 1) {
                              video.currentTime = nextClip.startTime;
                            }
                          } catch {}
                        } else {
                          // No future selected clips: pause and rewind to the very first one
                          video.pause();
                          try {
                            if (video.readyState >= 1) {
                              video.currentTime = orderedSelectedClips[0].startTime;
                            }
                          } catch {}
                        }
                      }
                    }
                  }
                }}
              />
            </div>

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
      ) : (
        /* RENDER TAGGER WORKSPACE VIEW */
        <main className="flex-1 p-4 lg:p-6 max-w-5xl mx-auto w-full flex flex-col gap-4 lg:gap-6 min-w-0">

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
            className="flex flex-col bg-zinc-950/45 p-1 select-none overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-850 scrollbar-track-transparent"
          >
            <div 
              className="min-w-full flex flex-col relative h-fit"
              style={{ width: `${timelineZoom}%` }}
            >
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
                const presentActionNames = Array.from(new Set(events.map(e => e.labels.Pitcher || e.actionName)));
                if (presentActionNames.length === 0) {
                  presentActionNames.push(activePresetName === 'baseball' ? 'Pitch (投球)' : 'Attack (攻撃)');
                }

                // Resolve timeline sorting order
                const tracks = timelineTrackOrder.filter(t => presentActionNames.includes(t));
                presentActionNames.forEach(t => {
                  if (!tracks.includes(t)) {
                    tracks.push(t);
                  }
                });

                return tracks.map((trackName) => {
                  const trackEvents = events.filter(e => (e.labels.Pitcher || e.actionName) === trackName);
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
                                if (e.shiftKey || e.metaKey || e.ctrlKey) {
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
                              className={`absolute h-7 top-1 rounded border text-[8px] font-extrabold text-white flex items-center justify-center px-1 shadow cursor-pointer transition-all select-none overflow-hidden text-ellipsis whitespace-nowrap ${
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

        {/* RIGHT-CLICK TAGGING CONTEXT MENU OVERLAY */}
        {contextMenu && (() => {
          const targetEv = events.find(e => e.id === contextMenu.eventId);
          if (!targetEv) return null;

          return (
            <div 
              style={{ top: `${Math.min(contextMenu.y, window.innerHeight - 320)}px`, left: `${Math.min(contextMenu.x, window.innerWidth - 220)}px` }}
              className="fixed z-[1000] bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl p-1.5 text-xs w-48 text-zinc-200 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2.5 py-1.5 border-b border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 font-bold">
                <span>タグ編集 ({formatTime(targetEv.timestamp)})</span>
                <button onClick={() => setContextMenu(null)} className="text-zinc-500 hover:text-white">✕</button>
              </div>

              {Object.entries(TAG_GROUPS).map(([groupName, tagList]) => {
                const currentTagVal = targetEv.labels[groupName] || targetEv.labels[groupName.toLowerCase()] || '';

                return (
                  <div 
                    key={groupName}
                    className="relative group/sub"
                  >
                    <div className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer text-xs transition-colors hover:bg-zinc-800 ${currentTagVal ? 'text-sky-300 font-bold' : 'text-zinc-300'}`}>
                      <span>{groupName}</span>
                      <span className="text-[10px] text-zinc-500">▶</span>
                    </div>

                    {/* Submenu on hover */}
                    <div className="hidden group-hover/sub:flex flex-col absolute left-full top-0 ml-1 bg-zinc-900 border border-zinc-750 rounded-xl shadow-2xl p-1 text-xs min-w-[140px] max-h-64 overflow-y-auto z-[1010] gap-0.5">
                      {tagList.map(tagName => {
                        const isChecked = currentTagVal === tagName || currentTagVal.includes(tagName);

                        return (
                          <div
                            key={tagName}
                            onClick={() => {
                              handleToggleEventTag(contextMenu.eventId, groupName, tagName);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer text-xs transition-colors hover:bg-zinc-800 ${
                              isChecked ? 'bg-sky-950/80 text-sky-300 font-black' : 'text-zinc-300'
                            }`}
                          >
                            <span>{tagName}</span>
                            {isChecked && <span className="text-emerald-400 font-extrabold text-sm">✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-zinc-800 pt-1 mt-0.5">
                <div
                  onClick={() => handleDeleteSelectedEvent(contextMenu.eventId)}
                  className="px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer text-xs text-red-400 hover:bg-red-950/60 hover:text-red-300 font-bold transition-colors"
                >
                  <span>イベントを削除</span>
                  <span>🗑️</span>
                </div>
              </div>
            </div>
          );
        })()}
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

      {/* 5. ADMINISTRATOR PANEL MODAL */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/40">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-extrabold text-white">ライセンス契約・アカウント管理（管理者）</h3>
              </div>
              <button 
                onClick={() => setShowAdminPanel(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer transition-all"
              >
                閉じる
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Account Creator Form */}
              <div className="bg-zinc-950/60 border border-zinc-850 p-4 rounded-xl space-y-4">
                <h4 className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">➕ 新規チーム（アカウント）登録</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-zinc-500 font-bold">ユーザーID</label>
                    <input
                      type="text"
                      placeholder="例: team_braves"
                      value={newTeamId}
                      onChange={(e) => setNewTeamId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-zinc-500 font-bold">パスワード</label>
                    <input
                      type="text"
                      placeholder="パスワード"
                      value={newTeamPassword}
                      onChange={(e) => setNewTeamPassword(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-zinc-500 font-bold">チーム表示名</label>
                    <input
                      type="text"
                      placeholder="例: ブレーブス"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAdminCreateTeam}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow transition-all cursor-pointer text-center"
                >
                  新しいアカウントを保存
                </button>
              </div>

              {/* Accounts List Table */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-zinc-400 tracking-wider uppercase">👥 登録済みのチーム一覧</h4>
                {adminPanelError && (
                  <p className="text-xs text-rose-500 font-bold bg-rose-950/20 border border-rose-900/30 p-2.5 rounded-lg">
                    ⚠️ {adminPanelError}
                  </p>
                )}
                
                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/20">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-bold">
                        <th className="p-3">ユーザーID</th>
                        <th className="p-3">チーム名</th>
                        <th className="p-3">パスワード</th>
                        <th className="p-3 text-center">サブスク状態</th>
                        <th className="p-3 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {adminAccountsList.map((acc) => (
                        <tr key={acc.id} className="hover:bg-zinc-900/40 text-zinc-300">
                          <td className="p-3 font-mono font-bold text-white">{acc.id}</td>
                          <td className="p-3 font-bold">{acc.team_name || '---'}</td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={acc.password}
                              onChange={(e) => handleAdminUpdatePassword(acc.id, e.target.value)}
                              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white font-mono font-bold w-24 text-center focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              acc.is_active 
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' 
                                : 'bg-rose-950 text-rose-400 border border-rose-900'
                            }`}>
                              {acc.is_active ? 'アクティブ' : '停止中'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {acc.id !== 'admin' && (
                                <button
                                  onClick={() => handleAdminToggleActive(acc.id, acc.is_active)}
                                  className={`px-2.5 py-1 rounded text-[10px] font-black cursor-pointer transition-all ${
                                    acc.is_active
                                      ? 'bg-rose-950 hover:bg-rose-900 text-rose-400'
                                      : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-400'
                                  }`}
                                >
                                  {acc.is_active ? '契約停止' : '再開する'}
                                </button>
                              )}
                              {acc.id !== 'admin' && (
                                <button
                                  onClick={() => setConfirmDeleteId(acc.id)}
                                  className="px-2.5 py-1 rounded text-[10px] font-black cursor-pointer transition-all bg-zinc-900 hover:bg-rose-950 text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:border-rose-900"
                                >
                                  🗑 削除
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
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
    </div>
  );
}

export default App;
