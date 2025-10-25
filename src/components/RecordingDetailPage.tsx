import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getRecordingById, getRhythmById, getTagById, updateRecording, deleteRecording } from '../db/storage';
import type { Recording, Rhythm } from '../types';
import { AudioPlayerWithLoop } from './AudioPlayerWithLoop';
import { useWaveform } from '../hooks/useWaveform';

interface LoopPoints {
  start: number;
  end: number;
}

export function RecordingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [rhythm, setRhythm] = useState<Rhythm | null>(null);
  const [rhythmName, setRhythmName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Load waveform data
  const { waveformData, isLoading: isGeneratingWaveform, error: waveformError } = useWaveform(
    recording?.audioBlob || null,
    recording?.id || null,
    recording?.waveformData || null
  );

  useEffect(() => {
    const loadRecording = async () => {
      if (!id) return;

      try {
        const recordingData = await getRecordingById(id);
        if (recordingData) {
          setRecording(recordingData);

          // Load associated rhythm
          const rhythmData = await getRhythmById(recordingData.rhythmId);
          if (rhythmData) {
            setRhythm(rhythmData);

            // Load rhythm name
            const tag = await getTagById(rhythmData.primaryRhythmNameTag);
            if (tag) {
              setRhythmName(tag.value);
            }
          }
        }
      } catch (error) {
        console.error('Error loading recording:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecording();
  }, [id]);

  const handleSaveLoopPoints = async (points: LoopPoints | null) => {
    if (!recording) return;

    try {
      await updateRecording(recording.id, { loopPoints: points });
      console.log('✅ Loop points saved');

      // Update local state
      setRecording({ ...recording, loopPoints: points });
    } catch (error) {
      console.error('Error saving loop points:', error);
      alert('Failed to save loop points');
    }
  };

  const handleDelete = async () => {
    if (!recording) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${recording.fileName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteRecording(recording.id);
      // Navigate back to the rhythm detail page
      if (rhythm) {
        navigate(`/rhythm/${rhythm.id}`);
      } else {
        navigate('/rhythms');
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Failed to delete recording');
    }
  };

  const handleTitleClick = () => {
    if (!recording) return;
    setIsEditingTitle(true);
    setEditedTitle(recording.fileName);
  };

  const handleTitleSave = async () => {
    if (!recording || !editedTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    if (editedTitle.trim() !== recording.fileName) {
      try {
        await updateRecording(recording.id, { fileName: editedTitle.trim() });
        setRecording({ ...recording, fileName: editedTitle.trim() });
      } catch (error) {
        console.error('Error updating title:', error);
        alert('Failed to update title');
      }
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setEditedTitle(recording?.fileName || '');
    }
  };

  const handleToggleFavorite = async () => {
    if (!recording) return;

    try {
      const newFavoriteState = !recording.isFavorite;
      await updateRecording(recording.id, { isFavorite: newFavoriteState });
      setRecording({ ...recording, isFavorite: newFavoriteState });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorite status');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="text-center py-12">
        <p className="text-white mb-4">Recording not found</p>
        <button onClick={() => navigate(-1)} className="btn-primary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-400 mb-4 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-start gap-3 mb-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="input-field text-2xl font-bold flex-1"
              autoFocus
            />
          ) : (
            <h1
              onClick={handleTitleClick}
              className="text-2xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors flex-1"
            >
              {recording.fileName}
            </h1>
          )}
          <button
            onClick={handleToggleFavorite}
            className="text-2xl hover:scale-110 transition-transform"
            title={recording.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {recording.isFavorite ? '⭐' : '☆'}
          </button>
        </div>
        {rhythmName && (
          <p className="text-gray-400">
            Rhythm: <span className="text-blue-400">{rhythmName}</span>
          </p>
        )}
      </div>

      {/* Recording info */}
      <div className="card">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {recording.location && (
            <div>
              <span className="text-gray-500">Location:</span>{' '}
              <span className="text-gray-300">{recording.location}</span>
            </div>
          )}
          {recording.recordedDate && (
            <div>
              <span className="text-gray-500">Date:</span>{' '}
              <span className="text-gray-300">
                {new Date(recording.recordedDate).toLocaleDateString()}
              </span>
            </div>
          )}
          <div>
            <span className="text-gray-500">Duration:</span>{' '}
            <span className="text-gray-300">
              {Math.floor(recording.duration / 60)}:{Math.floor(recording.duration % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Waveform generation status */}
      {isGeneratingWaveform && (
        <div className="card text-center py-6">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
          <p className="text-gray-300">Generating waveform...</p>
        </div>
      )}

      {waveformError && (
        <div className="card bg-red-900/20 border-red-500">
          <p className="text-red-400">Error generating waveform: {waveformError}</p>
        </div>
      )}

      {/* Audio player with loop editor */}
      {waveformData && waveformData.length > 0 && recording.audioBlob && (
        <AudioPlayerWithLoop
          audioBlob={recording.audioBlob}
          duration={recording.duration}
          waveformData={waveformData}
          initialLoopPoints={recording.loopPoints || null}
          recordingId={recording.id}
          onSaveLoopPoints={handleSaveLoopPoints}
        />
      )}

      {/* Notes */}
      {recording.notes && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-2">Notes</h3>
          <p className="text-gray-300 whitespace-pre-wrap">{recording.notes}</p>
        </div>
      )}

      {/* Delete button */}
      <div className="card">
        <button
          onClick={handleDelete}
          className="w-full btn-danger py-3 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Recording
        </button>
      </div>
    </div>
  );
}
