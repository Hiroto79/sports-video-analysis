import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { TaggedEvent } from '../types';
import { 
  Play, Pause, X, Download, Scissors, ChevronRight, Film, RotateCcw
} from 'lucide-react';

interface MatrixPlayerModalProps {
  isOpen: boolean;
  title: string;
  clips: TaggedEvent[];
  videoUrl: string | null;
  videoName: string;
  onClose: () => void;
}

export const MatrixPlayerModal: React.FC<MatrixPlayerModalProps> = ({
  isOpen,
  title,
  clips,
  videoUrl,
  videoName,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<'individual' | 'combined'>('individual');

  // Sort clips by video timeline start time
  const sortedClips = useMemo(() => {
    return [...clips].sort((a, b) => a.startTime - b.startTime);
  }, [clips]);

  // Set video source playhead to the first clip's start time on load
  useEffect(() => {
    if (isOpen && sortedClips.length > 0 && videoRef.current) {
      videoRef.current.currentTime = sortedClips[0].startTime;
      setCurrentTime(sortedClips[0].startTime);
      setIsPlaying(false);
    }
  }, [isOpen, sortedClips]);

  // Handle Play/Pause toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Keyboard controls for modal video player (Space bar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPlaying]);

  // Monitor playhead time updates and perform auto-skip skip-playlist logic
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || sortedClips.length === 0) return;
    
    const time = video.currentTime;
    setCurrentTime(time);

    // Only apply skip-playlist skip logic if playing
    if (!video.paused) {
      // Find if we are currently inside any selected clip
      const currentClip = sortedClips.find(c => time >= c.startTime - 0.1 && time <= c.endTime);

      if (currentClip) {
        // If current clip is ending, jump to the next clip
        if (time >= currentClip.endTime - 0.05) {
          const nextIdx = sortedClips.indexOf(currentClip) + 1;
          if (nextIdx < sortedClips.length) {
            video.currentTime = sortedClips[nextIdx].startTime;
          } else {
            // End of playlist: pause and loop back to start
            video.pause();
            setIsPlaying(false);
            video.currentTime = sortedClips[0].startTime;
          }
        }
      } else {
        // If playhead falls into an unselected gap, skip forward to the next future clip
        const nextClip = sortedClips.find(c => c.startTime > time);
        if (nextClip) {
          video.currentTime = nextClip.startTime;
        } else {
          // No future clips: stop and rewind
          video.pause();
          setIsPlaying(false);
          video.currentTime = sortedClips[0].startTime;
        }
      }
    }
  };

  // Skip playhead directly to specific clip
  const handleJumpToClip = (clip: TaggedEvent) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = clip.startTime;
      setCurrentTime(clip.startTime);
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Video metadata load
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // --- Browser MediaRecorder Capture Exporters ---
  const exportSingleClip = async (clip: TaggedEvent, index: number) => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    
    video.pause();
    setIsPlaying(false);
    setExportProgress(`クリップ ${index + 1} を抽出中...`);

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
      if (!stream) throw new Error("ブラウザキャプチャに対応していません。");

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

      const recordPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/mp4' }));
      });

      recorder.start();
      video.play().catch(() => {});

      const durationMs = (clip.endTime - clip.startTime) * 1000;
      await new Promise((resolve) => setTimeout(resolve, durationMs));

      video.pause();
      recorder.stop();

      const blob = await recordPromise;
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `matrix_clip_${index + 1}_${clip.playerName || 'pitch'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setExportProgress(null);
    } catch (err: any) {
      alert(`書き出し失敗: ${err.message || err}`);
      setExportProgress(null);
    }
  };

  const exportCombinedDigest = async () => {
    const video = videoRef.current;
    if (!video || !videoUrl || sortedClips.length === 0) return;
    
    video.pause();
    setIsPlaying(false);
    setExportProgress(`全 ${sortedClips.length} 件を結合した動画を生成中...`);

    try {
      // @ts-ignore
      const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream ? video.mozCaptureStream() : null;
      if (!stream) throw new Error("ブラウザキャプチャに対応していません。");

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };

      const recordPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/mp4' }));
      });

      recorder.start();

      for (let i = 0; i < sortedClips.length; i++) {
        const clip = sortedClips[i];
        setExportProgress(`ダイジェスト録画中: ${i + 1}/${sortedClips.length}`);

        video.currentTime = clip.startTime;
        await new Promise((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve(null);
          };
          video.addEventListener('seeked', onSeeked);
        });

        video.play().catch(() => {});
        const durationMs = (clip.endTime - clip.startTime) * 1000;
        await new Promise((resolve) => setTimeout(resolve, durationMs));
        video.pause();
      }

      recorder.stop();
      const combinedBlob = await recordPromise;
      const downloadUrl = URL.createObjectURL(combinedBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `matrix_digest_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setExportProgress(null);
    } catch (err: any) {
      alert(`結合書き出し失敗: ${err.message || err}`);
      setExportProgress(null);
    }
  };

  const handleExportClips = async () => {
    if (exportMode === 'combined') {
      await exportCombinedDigest();
    } else {
      for (let i = 0; i < sortedClips.length; i++) {
        await exportSingleClip(sortedClips[i], i);
      }
    }
  };

  const handleFFmpegScript = () => {
    const scriptName = videoName ? videoName.substring(0, videoName.lastIndexOf('.')) : 'video';
    const originalVideoPath = videoName || 'input.mp4';
    
    let content = `#!/bin/bash\n# Sportscode Matrix / Timeline Selection Export Script\n`;
    content += `echo "-----------------------------------------------"\n`;
    content += `echo "FFmpeg 無劣化クリップ切り出しを開始します"\n`;
    content += `echo "元動画: ${originalVideoPath}"\n`;
    content += `echo "-----------------------------------------------"\n\n`;
    content += `mkdir -p clips_matrix_output\n\n`;

    const concatFileList: string[] = [];
    sortedClips.forEach((ev, idx) => {
      const clipDuration = ev.endTime - ev.startTime;
      const cleanPlayer = (ev.playerName || 'unassigned').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanResult = (ev.labels['Result'] || 'pitch').toString().replace(/[^a-zA-Z0-9_-]/g, '_');
      const outputName = `clips_matrix_output/clip_${idx + 1}_${cleanPlayer}_${cleanResult}.mp4`;
      
      content += `ffmpeg -y -ss ${ev.startTime.toFixed(2)} -i "${originalVideoPath}" -t ${clipDuration.toFixed(2)} -c copy "${outputName}"\n`;
      concatFileList.push(outputName);
    });

    content += `\n# --- 結合用ダイジェストビデオの作成 ---\n`;
    content += `cat << 'EOF' > clips_matrix_output/concat_list.txt\n`;
    concatFileList.forEach(file => {
      content += `file '${file.replace('clips_matrix_output/', '')}'\n`;
    });
    content += `EOF\n\n`;
    content += `ffmpeg -y -f concat -safe 0 -i clips_matrix_output/concat_list.txt -c copy "clips_matrix_output/digest_matrix_${scriptName}.mp4"\n\n`;
    content += `echo "すべて完了しました！ clips_matrix_output フォルダをご確認ください。"\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `lossless_ffmpeg_matrix_${scriptName}.command`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-950/80 border-b border-zinc-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm lg:text-base font-extrabold text-white leading-none">
                {title}
              </h2>
              <p className="text-[10px] text-zinc-450 mt-1">
                Sportscode Elite: {sortedClips.length} 件のプレイをプレイリスト再生中
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Progress banner */}
        {exportProgress && (
          <div className="bg-emerald-950/90 text-emerald-400 px-6 py-2.5 text-xs font-bold shrink-0 border-b border-emerald-900/40 animate-pulse">
            {exportProgress}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          
          {/* Left: Video Player Panel */}
          <div className="flex-1 p-4 lg:p-6 flex flex-col justify-center bg-black/40 min-w-0">
            {videoUrl ? (
              <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
                <div className="relative border border-zinc-800 rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl">
                  {/* Status Indicator overlay */}
                  {isPlaying && (
                    <div className="absolute top-3 left-3 z-30 bg-emerald-950/95 border border-emerald-500/80 px-2.5 py-1 rounded-lg text-[9px] font-extrabold text-emerald-400 flex items-center gap-1.5 shadow backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping shrink-0" />
                      PLAYLIST AUTOMATIC SKIP ACTIVE
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    src={videoUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Player Controls */}
                <div className="bg-zinc-950/80 border border-zinc-850 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-400">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                    <span className="text-[9px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-500 font-mono">
                      {videoName}
                    </span>
                  </div>

                  {/* Playhead Slider */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.01}
                    value={currentTime}
                    onChange={(e) => {
                      if (videoRef.current) {
                        const t = parseFloat(e.target.value);
                        videoRef.current.currentTime = t;
                        setCurrentTime(t);
                      }
                    }}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 rounded-lg bg-zinc-800"
                  />

                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        if (videoRef.current && sortedClips.length > 0) {
                          videoRef.current.currentTime = sortedClips[0].startTime;
                          setCurrentTime(sortedClips[0].startTime);
                        }
                      }}
                      className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-xl cursor-pointer active:scale-95 transition-all"
                      title="プレイリストの最初に戻る"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={togglePlay}
                      className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl cursor-pointer active:scale-90 shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-zinc-555 py-20">
                ビデオファイルが読み込まれていません。
              </div>
            )}
          </div>

          {/* Right: Clip Playlist & Exporter list Panel */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-850 flex flex-col shrink-0 min-h-0 bg-zinc-950/20">
            
            {/* Export Settings wrapper */}
            <div className="p-4 border-b border-zinc-850 bg-zinc-950/30 flex flex-col gap-3 shrink-0">
              <span className="text-[9px] uppercase font-black tracking-wider text-zinc-500 leading-none">
                📁 プレイリストのエクスポート
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setExportMode('individual')}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer ${
                    exportMode === 'individual'
                      ? 'bg-zinc-800 border-emerald-500/60 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  個別ファイル
                </button>
                <button
                  onClick={() => setExportMode('combined')}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer ${
                    exportMode === 'combined'
                      ? 'bg-zinc-800 border-emerald-500/60 text-emerald-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  1つに結合
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleExportClips}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {exportMode === 'combined' ? 'ダイジェストを結合出力' : '全クリップを書き出し'}
                </button>

                <button
                  onClick={handleFFmpegScript}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-sky-400 text-[10px] font-bold rounded-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Scissors className="w-3 h-3 text-sky-400" />
                  FFmpeg高速無劣化コマンド
                </button>
              </div>
            </div>

            {/* Clips list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              <span className="text-[9px] uppercase font-black tracking-wider text-zinc-500 block leading-none mb-1">
                📋 クリップ一覧 (タイムシーク)
              </span>
              {sortedClips.map((clip, idx) => {
                const isCurrent = currentTime >= clip.startTime - 0.1 && currentTime <= clip.endTime;
                const pName = clip.labels.Pitcher || clip.labels['投手名'] || clip.actionName;
                const resultVal = clip.labels['Result'] || '-';

                return (
                  <button
                    key={clip.id}
                    onClick={() => handleJumpToClip(clip)}
                    className={`w-full text-left p-3 border rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isCurrent 
                        ? 'bg-emerald-950/20 border-emerald-500/60 shadow' 
                        : 'bg-zinc-900/50 border-zinc-850 hover:border-zinc-750'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-zinc-500">
                        #{idx + 1} ({clip.startTime.toFixed(1)}s - {clip.endTime.toFixed(1)}s)
                      </p>
                      <p className="text-xs font-bold text-zinc-200 truncate mt-0.5">
                        {pName}
                      </p>
                      <p className="text-[10px] font-bold text-amber-500/90 truncate mt-0.5">
                        結果: {resultVal}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isCurrent ? 'text-emerald-400 translate-x-0.5' : 'text-zinc-600'}`} />
                  </button>
                );
              })}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
