import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRhythm, createRecording, getAllRhythms, getTagById, createTag } from '../db/storage';
import type { Rhythm } from '../types';

type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopped';
type FlowStep = 'record' | 'metadata' | 'complete';

export function RecordingFlow() {
  const navigate = useNavigate();

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Flow state
  const [flowStep, setFlowStep] = useState<FlowStep>('record');
  const [linkToExisting, setLinkToExisting] = useState(false);

  // Rhythm name state
  const [primaryRhythmName, setPrimaryRhythmName] = useState('');
  const [secondaryRhythmNames, setSecondaryRhythmNames] = useState('');
  const [selectedExistingRhythm, setSelectedExistingRhythm] = useState<Rhythm | null>(null);

  // Recording metadata
  const [location, setLocation] = useState('');
  const [playerNames, setPlayerNames] = useState('');
  const [recordedDate, setRecordedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Additional rhythm metadata (for new rhythms)
  const [regions, setRegions] = useState('');
  const [ethnicGroups, setEthnicGroups] = useState('');
  const [occasions, setOccasions] = useState('');
  const [languages, setLanguages] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [lyricsTranslation, setLyricsTranslation] = useState('');
  const [rhythmNotes, setRhythmNotes] = useState('');

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [existingRhythms, setExistingRhythms] = useState<Rhythm[]>([]);
  const [showExistingRhythms, setShowExistingRhythms] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<Date>(new Date());
  const autoSaveTimeoutRef = useRef<number | null>(null);

  // Load existing rhythms
  useEffect(() => {
    const loadRhythms = async () => {
      const rhythms = await getAllRhythms();
      setExistingRhythms(rhythms);
    };
    loadRhythms();
  }, []);

  // Auto-save: 1 second after user stops typing or after recording finishes
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Only auto-save if we have a recording and a primary rhythm name
    if (audioBlob && primaryRhythmName.trim() && !isSaving) {
      autoSaveTimeoutRef.current = window.setTimeout(() => {
        handleAutoSave();
      }, 1000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [primaryRhythmName, audioBlob]);

  // Format time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      setRecordingState('requesting');
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = new Date();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        stream.getTracks().forEach(track => track.stop());
        setRecordingState('stopped');
      };

      mediaRecorder.start();
      setRecordingState('recording');
      setRecordingTime(0);

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

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleCreateRhythmOnly = async () => {
    if (!primaryRhythmName.trim() || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);

      // Create primary rhythm name tag
      const primaryTag = await createTag('rhythmName', primaryRhythmName.trim());

      // Create the rhythm
      const newRhythm = await createRhythm({
        primaryRhythmNameTag: primaryTag.id,
        alternateRhythmNameTags: [],
        regionTags: [],
        ethnicGroupTags: [],
        occasionTags: [],
        languageTags: [],
        lyrics: '',
        lyricsTranslation: '',
        notes: '',
        recordingIds: []
      });

      // Navigate to the new rhythm's detail page
      navigate(`/rhythm/${newRhythm.id}`);
    } catch (err) {
      console.error('Failed to create rhythm:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create rhythm: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoSave = async () => {
    if (!audioBlob || !primaryRhythmName.trim() || isSaving) return;

    try {
      setIsSaving(true);
      await saveRecording();
      // After auto-save, transition to metadata step
      setFlowStep('metadata');
    } catch (err) {
      console.error('Auto-save failed:', err);
      setError('Failed to save recording. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveRecording = async () => {
    if (!audioBlob) {
      throw new Error('No audio recorded');
    }

    let rhythmId: string;

    if (linkToExisting && selectedExistingRhythm) {
      // Link to existing rhythm
      rhythmId = selectedExistingRhythm.id;
    } else {
      // Create new rhythm with primary name
      if (!primaryRhythmName.trim()) {
        throw new Error('Primary rhythm name is required');
      }

      // Create primary rhythm name tag
      const primaryTag = await createTag('rhythmName', primaryRhythmName.trim());

      // Create alternate rhythm name tags
      const alternateTagIds: string[] = [];
      if (secondaryRhythmNames.trim()) {
        const alternateNames = secondaryRhythmNames.split(',').map(n => n.trim()).filter(n => n);
        for (const name of alternateNames) {
          const tag = await createTag('rhythmName', name);
          alternateTagIds.push(tag.id);
        }
      }

      // Create the rhythm
      const newRhythm = await createRhythm({
        primaryRhythmNameTag: primaryTag.id,
        alternateRhythmNameTags: alternateTagIds,
        regionTags: [],
        ethnicGroupTags: [],
        occasionTags: [],
        languageTags: [],
        lyrics: '',
        lyricsTranslation: '',
        notes: '',
        recordingIds: []
      });

      rhythmId = newRhythm.id;
    }

    // Generate file name
    const date = recordingStartTimeRef.current.toISOString().split('T')[0];
    const time = recordingStartTimeRef.current.toTimeString().split(' ')[0];
    const loc = location.trim() || 'Unknown Location';
    const fileName = `${loc} - ${date} - ${time}`;

    // Create player name tags
    const playerTagIds: string[] = [];
    if (playerNames.trim()) {
      const players = playerNames.split(',').map(p => p.trim()).filter(p => p);
      for (const player of players) {
        const tag = await createTag('playerName', player);
        playerTagIds.push(tag.id);
      }
    }

    // Create the recording
    await createRecording({
      rhythmId,
      fileName,
      audioBlob,
      duration: recordingTime,
      recordedDate: recordedDate,
      location: location.trim() || 'Unknown',
      playerNameTags: playerTagIds,
      notes: notes.trim(),
      loopPoints: null,
      waveformData: null,
      isFavorite: false
    });
  };

  const handleCompleteMetadata = async () => {
    if (!selectedExistingRhythm && flowStep === 'metadata') {
      // Update the rhythm with additional metadata
      // This requires the rhythm ID, which we need to track
      // For now, just complete the flow
      setFlowStep('complete');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } else {
      setFlowStep('complete');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  };

  const handleSelectExistingRhythm = async (rhythm: Rhythm) => {
    setSelectedExistingRhythm(rhythm);
    setLinkToExisting(true);
    setShowExistingRhythms(false);

    // Load rhythm name for display
    const tag = await getTagById(rhythm.primaryRhythmNameTag);
    if (tag) {
      setPrimaryRhythmName(tag.value);
    }
  };

  // STEP 1: Recording Interface
  if (flowStep === 'record') {
    return (
      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Recording UI */}
        {recordingState === 'idle' && (
          <div className="space-y-8">
            {/* Option 1: Tap to Record */}
            <div className="flex flex-col items-center justify-center py-8">
              <h2 className="text-xl font-semibold text-white mb-6">Tap to Record</h2>
              <button
                onClick={startRecording}
                className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-2xl transform transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Option 2: Or Add New Rhythm */}
            <div className="card">
              <h2 className="text-xl font-semibold text-white mb-4">Or Add New Rhythm</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  className="input-field text-lg"
                  placeholder="Enter rhythm name..."
                  value={primaryRhythmName}
                  onChange={(e) => setPrimaryRhythmName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && primaryRhythmName.trim()) {
                      handleCreateRhythmOnly();
                    }
                  }}
                />
                <button
                  onClick={handleCreateRhythmOnly}
                  disabled={!primaryRhythmName.trim() || isSaving}
                  className="btn-primary w-full"
                >
                  {isSaving ? 'Creating...' : 'Create Rhythm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {recordingState === 'requesting' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-32 h-32 rounded-full bg-gray-700 shadow-2xl flex items-center justify-center">
              <div className="text-center text-sm text-white">Requesting mic...</div>
            </div>
          </div>
        )}

        {recordingState === 'recording' && (
          <div className="flex flex-col items-center justify-center py-12">
            <button
              onClick={stopRecording}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 shadow-2xl transform transition-all hover:scale-105 active:scale-95 flex items-center justify-center relative"
            >
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
              <div className="w-12 h-12 bg-white rounded-lg"></div>
            </button>
            <div className="mt-8 text-center">
              <p className="text-3xl font-mono font-bold text-red-500 mb-2">
                {formatTime(recordingTime)}
              </p>
              <p className="text-gray-400">Recording...</p>
            </div>
          </div>
        )}

        {recordingState === 'stopped' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-32 h-32 rounded-full bg-green-500 shadow-2xl flex items-center justify-center">
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="mt-8 text-center">
              <p className="text-xl font-medium text-green-500 mb-2">
                Recording complete!
              </p>
              {isSaving && (
                <p className="text-gray-400">Saving...</p>
              )}
              {!isSaving && !primaryRhythmName.trim() && (
                <p className="text-gray-400">Add a name below to save</p>
              )}
              {!isSaving && primaryRhythmName.trim() && (
                <p className="text-gray-400">Saving in 1 second...</p>
              )}
            </div>
          </div>
        )}

        {/* Audio preview */}
        {audioUrl && recordingState === 'stopped' && (
          <div className="card mb-6">
            <label className="label-text mb-2">Preview Recording</label>
            <audio src={audioUrl} controls className="w-full" />
          </div>
        )}

        {/* Rhythm name fields - BELOW record button */}
        {recordingState === 'stopped' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  className="input-field text-lg"
                  placeholder="Add New Rhythm"
                  value={linkToExisting ? '' : primaryRhythmName}
                  onChange={(e) => {
                    setPrimaryRhythmName(e.target.value);
                    setLinkToExisting(false);
                    setSelectedExistingRhythm(null);
                  }}
                  disabled={linkToExisting}
                />
              </div>
              <button
                onClick={() => setShowExistingRhythms(!showExistingRhythms)}
                className="btn-outline px-4 py-3 flex items-center gap-2 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Link to Existing Rhythm
              </button>
            </div>

            {/* Link to existing rhythm dropdown */}
            {showExistingRhythms && existingRhythms.length > 0 && (
              <div className="card max-h-60 overflow-y-auto">
                <p className="text-sm font-medium text-white mb-2">Select existing rhythm:</p>
                {existingRhythms.map((rhythm) => (
                  <ExistingRhythmItem
                    key={rhythm.id}
                    rhythm={rhythm}
                    onSelect={handleSelectExistingRhythm}
                  />
                ))}
              </div>
            )}

            {/* Selected existing rhythm display */}
            {linkToExisting && selectedExistingRhythm && (
              <div className="card bg-blue-900/30 border-blue-700">
                <p className="text-sm text-blue-400 mb-1">Linked to:</p>
                <p className="text-white font-medium">{primaryRhythmName}</p>
                <button
                  onClick={() => {
                    setLinkToExisting(false);
                    setSelectedExistingRhythm(null);
                    setPrimaryRhythmName('');
                  }}
                  className="text-sm text-gray-400 hover:text-white mt-2"
                >
                  Unlink
                </button>
              </div>
            )}

            {/* Alternate names - only show if NOT linking */}
            {!linkToExisting && primaryRhythmName.trim() && (
              <input
                type="text"
                className="input-field"
                placeholder="Alternate Names (optional, comma-separated)"
                value={secondaryRhythmNames}
                onChange={(e) => setSecondaryRhythmNames(e.target.value)}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // STEP 2: Metadata Form
  if (flowStep === 'metadata') {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-2">Add Recording Details</h2>
        <p className="text-gray-400 mb-6">
          Recording saved! Add more information about this recording and rhythm.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); handleCompleteMetadata(); }} className="space-y-6">
          {/* Recording-specific fields */}
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-4">Recording Information</h3>
            <div className="space-y-4">
              <div>
                <label className="label-text">Location</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Studio A, Home..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="label-text">Player Names</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Comma-separated: John, Mary..."
                  value={playerNames}
                  onChange={(e) => setPlayerNames(e.target.value)}
                />
              </div>

              <div>
                <label className="label-text">Recorded Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={recordedDate}
                  onChange={(e) => setRecordedDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label-text">Notes</label>
                <textarea
                  className="textarea-field"
                  placeholder="Any notes about this recording..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Additional rhythm metadata (only if new rhythm) */}
          {!linkToExisting && (
            <>
              <div className="card">
                <h3 className="text-xl font-bold text-white mb-4">Rhythm Context (Optional)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label-text">Regions</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Comma-separated: Guinea, Mali..."
                      value={regions}
                      onChange={(e) => setRegions(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label-text">Ethnic Groups</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Comma-separated: Malinké, Susu..."
                      value={ethnicGroups}
                      onChange={(e) => setEthnicGroups(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label-text">Occasions</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Comma-separated: Wedding, Harvest..."
                      value={occasions}
                      onChange={(e) => setOccasions(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label-text">Languages</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Comma-separated: Malinké, French..."
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold text-white mb-4">Lyrics & Notes (Optional)</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label-text">Lyrics</label>
                    <textarea
                      className="textarea-field"
                      placeholder="Enter lyrics..."
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="label-text">Lyrics Translation</label>
                    <textarea
                      className="textarea-field"
                      placeholder="Enter translation..."
                      value={lyricsTranslation}
                      onChange={(e) => setLyricsTranslation(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="label-text">Rhythm Notes</label>
                    <textarea
                      className="textarea-field"
                      placeholder="Any additional notes about this rhythm..."
                      value={rhythmNotes}
                      onChange={(e) => setRhythmNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <button type="submit" className="btn-primary w-full">
              Save Recording
            </button>
          </div>
        </form>
      </div>
    );
  }

  // STEP 3: Complete
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div className="card">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Recording Saved!</h2>
        <p className="text-gray-300 mb-4">
          Your recording has been successfully saved to the library.
        </p>
        <p className="text-sm text-gray-400">
          Redirecting to library...
        </p>
      </div>
    </div>
  );
}

// Helper component for displaying existing rhythms
function ExistingRhythmItem({ rhythm, onSelect }: { rhythm: Rhythm; onSelect: (rhythm: Rhythm) => void }) {
  const [rhythmName, setRhythmName] = useState('Loading...');

  useEffect(() => {
    const loadName = async () => {
      const tag = await getTagById(rhythm.primaryRhythmNameTag);
      if (tag) {
        setRhythmName(tag.value);
      }
    };
    loadName();
  }, [rhythm]);

  return (
    <button
      onClick={() => onSelect(rhythm)}
      className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors"
    >
      <p className="font-medium text-white">{rhythmName}</p>
      <p className="text-xs text-gray-400">
        {rhythm.recordingIds.length} {rhythm.recordingIds.length === 1 ? 'recording' : 'recordings'}
      </p>
    </button>
  );
}
