import { useState, useEffect, useRef, useCallback } from 'react';
import { LoopEditor } from './LoopEditor';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(propDuration);
  const [playbackMode, setPlaybackMode] = useState<'normal' | 'loop'>('normal');
  const [loopPoints, setLoopPoints] = useState<LoopPoints | null>(initialLoopPoints);
  const [volume, setVolume] = useState(1.0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const crossfadeGainNodeRef = useRef<GainNode | null>(null);
  const crossfadeScheduledRef = useRef<boolean>(false);
  const nextSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const CROSSFADE_DURATION = 0.0; // No crossfade - clean loop

  // Initialize audio context and load audio buffer
  useEffect(() => {
    let isMounted = true;

    const initAudio = async () => {
      try {
        // Close existing context if any
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          await audioContextRef.current.close();
        }

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        if (!isMounted) {
          if (audioContext.state !== 'closed') {
            audioContext.close();
          }
          return;
        }

        audioBufferRef.current = audioBuffer;

        // Set duration from audio buffer
        setDuration(audioBuffer.duration);

        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
        gainNodeRef.current = gainNode;

      } catch (error) {
        console.error('Error loading audio:', error);
      }
    };

    initAudio();

    return () => {
      isMounted = false;
      stopPlayback();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {
          // Ignore errors on close
        });
      }
      audioContextRef.current = null;
      gainNodeRef.current = null;
      audioBufferRef.current = null;
    };
  }, [audioBlob]);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      sourceNodeRef.current = null;
    }
  }, []);

  const startPlayback = useCallback(async (startFrom: number = 0, fadeIn: boolean = false) => {
    const audioContext = audioContextRef.current;
    const audioBuffer = audioBufferRef.current;
    const gainNode = gainNodeRef.current;

    if (!audioContext || !audioBuffer || !gainNode) {
      console.error('Audio not initialized');
      return;
    }

    // Check if AudioContext is closed
    if (audioContext.state === 'closed') {
      console.error('AudioContext is closed');
      return;
    }

    // Resume context if suspended (must await!)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    stopPlayback();

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Create a gain node for crossfading
    const crossfadeGain = audioContext.createGain();
    crossfadeGain.connect(gainNode);
    source.connect(crossfadeGain);
    crossfadeGainNodeRef.current = crossfadeGain;

    // Apply fade in if requested
    if (fadeIn) {
      crossfadeGain.gain.setValueAtTime(0, audioContext.currentTime);
      crossfadeGain.gain.linearRampToValueAtTime(1, audioContext.currentTime + CROSSFADE_DURATION);
    } else {
      crossfadeGain.gain.setValueAtTime(1, audioContext.currentTime);
    }

    // Determine playback range
    let offset = startFrom;
    let playDuration: number | undefined = undefined;

    if (playbackMode === 'loop' && loopPoints) {
      offset = startFrom >= loopPoints.start ? startFrom : loopPoints.start;
      playDuration = loopPoints.end - offset;
    }

    source.start(0, offset, playDuration);
    sourceNodeRef.current = source;
    startTimeRef.current = audioContext.currentTime;
    pauseTimeRef.current = offset;
    crossfadeScheduledRef.current = false; // Reset crossfade scheduling

  }, [playbackMode, loopPoints, stopPlayback, CROSSFADE_DURATION]);

  // Update current time during playback
  const updateCurrentTime = useCallback(() => {
    const audioContext = audioContextRef.current;
    const audioBuffer = audioBufferRef.current;
    const gainNode = gainNodeRef.current;
    const crossfadeGain = crossfadeGainNodeRef.current;
    if (!audioContext || !isPlaying || !audioBuffer || !gainNode) return;

    const elapsed = audioContext.currentTime - startTimeRef.current;
    let newTime = pauseTimeRef.current + elapsed;

    // Handle looping in loop mode
    if (playbackMode === 'loop' && loopPoints) {
      if (newTime >= loopPoints.end) {
        // Immediate loop back to start
        stopPlayback();
        startPlayback(loopPoints.start, false);
      }
    } else if (playbackMode === 'normal' && duration > 0 && newTime >= duration) {
      // Stop at end in normal mode
      stopPlayback();
      setIsPlaying(false);
      setCurrentTime(duration);
      return;
    }

    setCurrentTime(newTime);
    animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
  }, [isPlaying, playbackMode, loopPoints, duration, stopPlayback, startPlayback, CROSSFADE_DURATION]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateCurrentTime]);

  const togglePlayPause = async () => {
    if (isPlaying) {
      // Pause: stop playback and save current position
      stopPlayback();
      setIsPlaying(false);
      // Current time is already being tracked by updateCurrentTime
    } else {
      // Play: resume from current position
      let startFrom = currentTime;

      // If in loop mode and current time is outside loop, start from loop start
      if (playbackMode === 'loop' && loopPoints) {
        if (currentTime < loopPoints.start || currentTime >= loopPoints.end) {
          startFrom = loopPoints.start;
          setCurrentTime(loopPoints.start);
        }
      }

      setIsPlaying(true);
      await startPlayback(startFrom);
    }
  };

  const handleSeek = async (time: number) => {
    const wasPlaying = isPlaying;
    stopPlayback();
    setCurrentTime(time);

    if (wasPlaying) {
      // Small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 10));
      await startPlayback(time);
    }
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

  const handleModeToggle = () => {
    if (playbackMode === 'normal' && loopPoints) {
      setPlaybackMode('loop');
    } else if (playbackMode === 'loop') {
      setPlaybackMode('normal');
    } else {
      // No loop points set, show message
      alert('Set loop points first to enable loop mode');
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canEnableLoopMode = loopPoints !== null;

  return (
    <div className="space-y-4">
      {/* Playback controls */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Playback</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleModeToggle}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                playbackMode === 'loop'
                  ? 'bg-green-600 text-white'
                  : canEnableLoopMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!canEnableLoopMode && playbackMode === 'normal'}
            >
              {playbackMode === 'loop' ? '🔁 Looping' : '▶ Normal'}
            </button>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={togglePlayPause}
            className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Time display */}
          <div className="flex-1 text-sm text-gray-300 font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Loop editor */}
      <div className="card">
        <LoopEditor
          waveformData={waveformData}
          duration={duration}
          currentTime={currentTime}
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
