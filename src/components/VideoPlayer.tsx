import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Upload, Film, Gauge } from 'lucide-react';

interface VideoPlayerProps {
  onVideoLoaded: (file: File, url: string) => void;
  videoUrl: string | null;
  videoName: string | null;
  onTimeUpdate?: (time: number) => void;
}

export interface VideoPlayerRef {
  getCurrentTime: () => number;
  seekTo: (time: number) => void;
  togglePlay: () => void;
  isPlaying: boolean;
  getVideoElement: () => HTMLVideoElement | null;
}

import { formatCentiseconds } from '../utils/formatters';

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  onVideoLoaded,
  videoUrl,
  videoName,
  onTimeUpdate
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const seekTimeoutRef = useRef<number | null>(null);

  // Revoke old object URLs on change or unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, [videoUrl]);

  // Expose controls to the parent component
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      return videoRef.current ? videoRef.current.currentTime : 0;
    },
    seekTo: (time: number) => {
      if (videoRef.current) {
        // Seek to time, capped between 0 and duration
        const targetTime = Math.max(0, Math.min(time, duration));
        videoRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
        if (onTimeUpdate) onTimeUpdate(targetTime);
      }
    },
    togglePlay: () => {
      handleTogglePlay();
    },
    isPlaying: isPlaying,
    getVideoElement: () => videoRef.current
  }));

  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // Sync state on HTML5 video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      if (onTimeUpdateRef.current) onTimeUpdateRef.current(time);
    };
    const handleDurationChange = () => setDuration(video.duration);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);

    // Initial check
    setIsPlaying(!video.paused);
    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
    };
  }, [videoUrl]);

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(err => console.error("Error playing video:", err));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    
    setCurrentTime(time);
    
    // Directly update video playhead for instant real-time drag synchronization
    videoRef.current.currentTime = time;
    if (onTimeUpdateRef.current) onTimeUpdateRef.current(time);
  };

  const handleFrameStep = (seconds: number) => {
    if (!videoRef.current) return;
    const isPlayingBefore = !videoRef.current.paused;
    if (isPlayingBefore) videoRef.current.pause();
    
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    
    // Maintain playing state if it was playing (usually frame stepping pauses, which we do here)
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        onVideoLoaded(file, url);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      onVideoLoaded(file, url);
    }
  };

  // Restart video helper
  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header Info */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-950 border-b border-zinc-800 text-xs text-zinc-400">
        <div className="flex items-center gap-2 font-medium text-zinc-200">
          <Film className="w-4 h-4 text-emerald-500" />
          <span>{videoName || 'No Video Loaded'}</span>
        </div>
        <div>
          {videoUrl && <span className="bg-zinc-850 px-2 py-0.5 rounded border border-zinc-850">Local File</span>}
        </div>
      </div>

      {/* Main Video Screen Area */}
      <div className="flex-1 flex items-center justify-center bg-black relative min-h-[300px]">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain max-h-[500px]"
            onClick={handleTogglePlay}
            preload="metadata"
            playsInline
          />
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg m-4 p-8 transition-colors ${
              isDragOver
                ? 'border-emerald-500 bg-emerald-950/20'
                : 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-600'
            }`}
          >
            <Upload className={`w-12 h-12 mb-4 transition-transform duration-300 ${isDragOver ? 'translate-y-[-4px] text-emerald-400' : 'text-zinc-500'}`} />
            <p className="text-sm font-semibold text-zinc-300 mb-2">Drag and drop local video file here</p>
            <p className="text-xs text-zinc-500 mb-4">Supports MP4, MOV, WebM (up to 2GB+ files)</p>
            
            <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white px-4 py-2 rounded-lg text-sm border border-zinc-700 font-medium shadow-md">
              Choose Local Video
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}
      </div>

      {/* Video Custom Controller Panel */}
      {videoUrl && (
        <div className="p-4 bg-zinc-950/90 border-t border-zinc-850 flex flex-col gap-3.5">
          {/* Seekbar and Timeline */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 shadow-inner min-w-[70px] text-center">
              {formatCentiseconds(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.01"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
            />
            <span className="text-xs font-mono text-zinc-400 min-w-[50px]">
              {formatCentiseconds(duration)}
            </span>
          </div>

          {/* Control Buttons row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleRestart}
                title="Restart"
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <RotateCcw className="w-4.5 h-4.5" />
              </button>

              <button
                onClick={() => handleFrameStep(-5.0)}
                title="5秒戻す (Step Backward 5s)"
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <SkipBack className="w-4.5 h-4.5" />
              </button>

              <button
                onClick={handleTogglePlay}
                className="p-2.5 mx-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>

              <button
                onClick={() => handleFrameStep(5.0)}
                title="5秒進む (Step Forward 5s)"
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <SkipForward className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Playback Speed Controls */}
            <div className="flex items-center gap-1.5 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 px-2 flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                Speed
              </span>
              {[0.25, 0.5, 1.0, 1.5, 2.0].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleSpeedChange(rate)}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-semibold ${
                    playbackRate === rate
                      ? 'bg-zinc-850 border border-zinc-700 text-emerald-400 shadow-inner'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/50'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Hotkey Helper Tooltip */}
            <div className="hidden md:flex text-[11px] text-zinc-500 items-center gap-1">
              <span className="bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded text-[10px] text-zinc-300 font-mono shadow">Space</span>
              <span>Play/Pause</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';
