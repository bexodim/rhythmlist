import { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect, useMemo } from 'react';

interface LoopPoints {
  start: number;
  end: number;
}

interface PlayHistoryEntry {
  recordingId: string;
  timestamp: number;
}

interface AudioPlaybackState {
  playingRecordingId: string | null;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  recentlyPlayedRecordings: string[]; // List of recently played recording IDs
  playRecording: (recordingId: string, audioBlob: Blob, loop: boolean, loopPoints: LoopPoints | null) => Promise<void>;
  stopPlayback: () => void;
  isPlaying: (recordingId: string, checkLoop?: boolean) => boolean;
}

const AudioPlaybackContext = createContext<AudioPlaybackState | undefined>(undefined);

export function AudioPlaybackProvider({ children }: { children: ReactNode }) {
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playHistory, setPlayHistory] = useState<PlayHistoryEntry[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const crossfadeGainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const loopPointsRef = useRef<LoopPoints | null>(null);
  const isLoopingRef = useRef<boolean>(false);
  const crossfadeScheduledRef = useRef<boolean>(false);
  const nextSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Get recently played recordings (within last 7 days)
  const recentlyPlayedRecordings = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentEntries = playHistory.filter(entry => entry.timestamp > sevenDaysAgo);
    // Return unique recording IDs
    return Array.from(new Set(recentEntries.map(e => e.recordingId)));
  }, [playHistory]);

  // Load play history from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('playHistory');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPlayHistory(parsed);
      } catch (e) {
        console.error('Failed to load play history:', e);
      }
    }
  }, []);

  // Save play history to localStorage when it changes
  useEffect(() => {
    if (playHistory.length > 0) {
      localStorage.setItem('playHistory', JSON.stringify(playHistory));
    }
  }, [playHistory]);

  const CROSSFADE_DURATION = 0.0; // No crossfade - clean loop

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      sourceNodeRef.current = null;
    }
    if (nextSourceRef.current) {
      try {
        nextSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      nextSourceRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    crossfadeScheduledRef.current = false;
  }, []);

  const startPlayback = useCallback(async (startFrom: number = 0, fadeIn: boolean = false) => {
    const audioContext = audioContextRef.current;
    const audioBuffer = audioBufferRef.current;
    const gainNode = gainNodeRef.current;

    if (!audioContext || !audioBuffer || !gainNode) {
      console.error('Audio not initialized');
      return;
    }

    if (audioContext.state === 'closed') {
      console.error('AudioContext is closed');
      return;
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    stopPlayback();

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const crossfadeGain = audioContext.createGain();
    crossfadeGain.connect(gainNode);
    source.connect(crossfadeGain);
    crossfadeGainNodeRef.current = crossfadeGain;

    if (fadeIn) {
      crossfadeGain.gain.setValueAtTime(0, audioContext.currentTime);
      crossfadeGain.gain.linearRampToValueAtTime(1, audioContext.currentTime + CROSSFADE_DURATION);
    } else {
      crossfadeGain.gain.setValueAtTime(1, audioContext.currentTime);
    }

    let offset = startFrom;
    let playDuration: number | undefined = undefined;

    if (isLoopingRef.current && loopPointsRef.current) {
      offset = startFrom >= loopPointsRef.current.start ? startFrom : loopPointsRef.current.start;
      playDuration = loopPointsRef.current.end - offset;
    }

    source.start(0, offset, playDuration);
    sourceNodeRef.current = source;
    startTimeRef.current = audioContext.currentTime;
    pauseTimeRef.current = offset;
    crossfadeScheduledRef.current = false;
  }, [stopPlayback, CROSSFADE_DURATION]);

  const updatePlayback = useCallback(() => {
    const audioContext = audioContextRef.current;
    const audioBuffer = audioBufferRef.current;
    if (!audioContext || !audioBuffer) return;

    const elapsed = audioContext.currentTime - startTimeRef.current;
    let newTime = pauseTimeRef.current + elapsed;

    // Update current time state
    setCurrentTime(newTime);

    // Handle looping
    if (isLoopingRef.current && loopPointsRef.current) {
      if (newTime >= loopPointsRef.current.end) {
        // Immediate loop back to start
        stopPlayback();
        startPlayback(loopPointsRef.current.start, false);
      }
    } else if (!isLoopingRef.current && newTime >= audioBuffer.duration) {
      // Stop at end in normal mode
      stopPlayback();
      setPlayingRecordingId(null);
      setIsLooping(false);
      setCurrentTime(0);
      isLoopingRef.current = false;
      return;
    }

    animationFrameRef.current = requestAnimationFrame(updatePlayback);
  }, [stopPlayback, startPlayback]);

  const playRecording = useCallback(async (
    recordingId: string,
    audioBlob: Blob,
    loop: boolean,
    loopPoints: LoopPoints | null
  ) => {
    // If clicking the same recording with same mode, stop it
    if (playingRecordingId === recordingId && isLooping === loop) {
      stopPlayback();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
      }
      audioContextRef.current = null;
      audioBufferRef.current = null;
      gainNodeRef.current = null;
      setPlayingRecordingId(null);
      setIsLooping(false);
      setCurrentTime(0);
      setDuration(0);
      isLoopingRef.current = false;
      return;
    }

    // Stop any current playback
    stopPlayback();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
    }

    // Set up new playback
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNodeRef.current = gainNode;

      loopPointsRef.current = loopPoints || null;
      isLoopingRef.current = loop;
      setPlayingRecordingId(recordingId);
      setIsLooping(loop);
      setDuration(audioBuffer.duration);
      setCurrentTime(0);

      // Add to play history
      setPlayHistory(prev => {
        // Remove old entries for this recording and add new one
        const filtered = prev.filter(e => e.recordingId !== recordingId);
        const newEntry: PlayHistoryEntry = {
          recordingId,
          timestamp: Date.now()
        };
        // Keep only last 1000 entries
        const updated = [newEntry, ...filtered].slice(0, 1000);
        return updated;
      });

      // Start from loop point only if looping, otherwise start from beginning
      const startFrom = loop && loopPoints ? loopPoints.start : 0;
      await startPlayback(startFrom);
      animationFrameRef.current = requestAnimationFrame(updatePlayback);
    } catch (error) {
      console.error('Error playing audio:', error);
      isLoopingRef.current = false;
      setPlayingRecordingId(null);
      setIsLooping(false);
    }
  }, [playingRecordingId, isLooping, stopPlayback, startPlayback, updatePlayback]);

  const isPlaying = useCallback((recordingId: string, checkLoop?: boolean) => {
    if (checkLoop !== undefined) {
      return playingRecordingId === recordingId && isLooping === checkLoop;
    }
    return playingRecordingId === recordingId;
  }, [playingRecordingId, isLooping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;
      audioBufferRef.current = null;
      gainNodeRef.current = null;
      crossfadeGainNodeRef.current = null;
    };
  }, [stopPlayback]);

  return (
    <AudioPlaybackContext.Provider value={{
      playingRecordingId,
      isLooping,
      currentTime,
      duration,
      recentlyPlayedRecordings,
      playRecording,
      stopPlayback,
      isPlaying
    }}>
      {children}
    </AudioPlaybackContext.Provider>
  );
}

export function useAudioPlayback() {
  const context = useContext(AudioPlaybackContext);
  if (!context) {
    throw new Error('useAudioPlayback must be used within AudioPlaybackProvider');
  }
  return context;
}
