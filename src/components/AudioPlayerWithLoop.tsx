import { useState, useEffect, useRef, useCallback } from 'react';
import { LoopEditor } from './LoopEditor';
import { useAudioPlayback } from '../context/AudioPlaybackContext';

interface LoopPoints {
  start: number;
  end: number;
}

interface AudioPlayerWithLoopProps {
  audioBlob: Blob;
  duration: number;
  waveformData: number[];
  initialLoopPoints?: LoopPoints | null;
  recordingId: string;
  onSaveLoopPoints?: (points: LoopPoints | null) => void;
}

export function AudioPlayerWithLoop({
  audioBlob,
  duration: propDuration,
  waveformData,
  initialLoopPoints = null,
  recordingId,
  onSaveLoopPoints
}: AudioPlayerWithLoopProps) {
  const [loopPoints, setLoopPoints] = useState<LoopPoints | null>(initialLoopPoints);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Use global audio playback context
  const {
    playRecording,
    isPlaying: isPlayingGlobal,
    playingRecordingId,
    currentTime: contextCurrentTime,
    duration: contextDuration
  } = useAudioPlayback();

  // Use context time if this recording is playing, otherwise show 0
  const currentTime = playingRecordingId === recordingId ? contextCurrentTime : 0;
  const duration = playingRecordingId === recordingId && contextDuration > 0 ? contextDuration : propDuration;

  const handleSeek = async (time: number) => {
    // For now, seeking is disabled during playback
    // Could be enhanced to support seeking in the future
  };

  const handleLoopPointsChange = (points: LoopPoints | null) => {
    setLoopPoints(points);
    setHasUnsavedChanges(true);
  };

  const handleSaveLoopPoints = async () => {
    if (onSaveLoopPoints) {
      await onSaveLoopPoints(loopPoints);
      setHasUnsavedChanges(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Playback controls */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Playback</h3>

        <div className="flex items-center gap-4">
          {/* Control buttons on the left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => playRecording(recordingId, audioBlob, false, loopPoints)}
              className={`w-12 h-12 rounded-full transition-all flex items-center justify-center flex-shrink-0 ${
                isPlayingGlobal(recordingId, false)
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:shadow-lg'
              }`}
              title={isPlayingGlobal(recordingId, false) ? 'Pause' : 'Play'}
            >
              {isPlayingGlobal(recordingId, false) ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            {loopPoints && (
              <button
                onClick={() => playRecording(recordingId, audioBlob, true, loopPoints)}
                className={`w-12 h-12 rounded-full transition-all flex items-center justify-center flex-shrink-0 ${
                  isPlayingGlobal(recordingId, true)
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/50'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:shadow-lg'
                }`}
                title={isPlayingGlobal(recordingId, true) ? 'Looping' : 'Loop'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>

          {/* Progress and timing on the right */}
          <div className="flex-1 space-y-2">
            {/* Progress bar */}
            <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full transition-all ${
                  isPlayingGlobal(recordingId, false) || isPlayingGlobal(recordingId, true)
                    ? 'bg-blue-500'
                    : 'bg-gray-600'
                }`}
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>

            {/* Time and loop info */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              {loopPoints && (
                <span className="text-gray-400">
                  Loop: {formatTime(loopPoints.start)} - {formatTime(loopPoints.end)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loop editor */}
      <div className="card">
        <LoopEditor
          waveformData={waveformData}
          duration={duration}
          currentTime={0}
          loopPoints={loopPoints}
          onLoopPointsChange={handleLoopPointsChange}
          onSeek={handleSeek}
        />

        {/* Save button */}
        {hasUnsavedChanges && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSaveLoopPoints}
              className="btn-success px-4 py-2"
            >
              Save Loop Points
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
