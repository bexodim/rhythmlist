import { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, fileName: string) => void;
  defaultLocation?: string;
}

type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopped';

export function AudioRecorder({ onRecordingComplete, defaultLocation = '' }: AudioRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState(defaultLocation);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<string>('');

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate auto-naming: [Location] - [YYYY-MM-DD] - [HH:MM:SS]
  const generateFileName = (): string => {
    const now = new Date(recordingStartTimeRef.current);
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const loc = location.trim() || 'Unknown Location';
    return `${loc} - ${date} - ${time}`;
  };

  const startRecording = async () => {
    try {
      setRecordingState('requesting');
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = new Date().toISOString();

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);

        // Create URL for preview
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        setRecordingState('stopped');
      };

      // Start recording
      mediaRecorder.start();
      setRecordingState('recording');
      setRecordingTime(0);

      // Start timer
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please grant permission and try again.');
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();

      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleSave = () => {
    if (audioBlob) {
      const fileName = generateFileName();
      onRecordingComplete(audioBlob, fileName);
    }
  };

  const handleReset = () => {
    // Clean up
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingState('idle');
    setRecordingTime(0);
    setError(null);
    audioChunksRef.current = [];
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-white mb-4">Audio Recording</h2>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Location Input */}
      <div className="mb-4">
        <label className="label-text">Recording Location</label>
        <input
          type="text"
          className="input-field"
          placeholder="e.g., Studio A, Living Room..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={recordingState !== 'idle'}
        />
        <p className="mt-1 text-sm text-gray-400">
          Used in auto-generated filename
        </p>
      </div>

      {/* Recording Controls */}
      <div className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            {recordingState === 'recording' && (
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-300">
                {recordingState === 'idle' && 'Ready to record'}
                {recordingState === 'requesting' && 'Requesting microphone access...'}
                {recordingState === 'recording' && 'Recording in progress'}
                {recordingState === 'stopped' && 'Recording complete'}
              </p>
              {recordingState === 'recording' && (
                <p className="text-2xl font-mono font-bold text-white mt-1">
                  {formatTime(recordingTime)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-3">
          {recordingState === 'idle' && (
            <button
              onClick={startRecording}
              className="btn-danger flex-1"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 bg-white rounded-full"></span>
                Start Recording
              </span>
            </button>
          )}

          {recordingState === 'recording' && (
            <button
              onClick={stopRecording}
              className="btn-secondary flex-1"
            >
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 bg-white"></span>
                Stop Recording
              </span>
            </button>
          )}

          {recordingState === 'stopped' && (
            <>
              <button
                onClick={handleReset}
                className="btn-outline"
              >
                Record Again
              </button>
              <button
                onClick={handleSave}
                className="btn-success flex-1"
              >
                Save Recording
              </button>
            </>
          )}
        </div>

        {/* Audio Preview */}
        {audioUrl && recordingState === 'stopped' && (
          <div className="space-y-2">
            <label className="label-text">Preview Recording</label>
            <audio
              src={audioUrl}
              controls
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              Duration: {formatTime(recordingTime)}
            </p>
            <p className="text-sm text-gray-500">
              File name: <span className="font-mono">{generateFileName()}</span>
            </p>
          </div>
        )}
      </div>

      {/* Recording Info */}
      {recordingState === 'idle' && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Make sure your microphone is connected and you're in a quiet environment for best results.
          </p>
        </div>
      )}
    </div>
  );
}
