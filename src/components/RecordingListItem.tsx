import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recording } from '../../types';
import { useAudioPlayback } from '../context/AudioPlaybackContext';

interface RecordingListItemProps {
  recording: Recording;
  onUpdateTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

const RecordingListItem: React.FC<RecordingListItemProps> = ({ recording, onUpdateTitle, onDelete }) => {
  const navigate = useNavigate();
  const { playRecording, isPlaying } = useAudioPlayback();

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecordingClick = () => {
    navigate(`/recording/${recording.id}`);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-5 mb-3">
      <div className="flex items-start gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleRecordingClick}>
          {/* Title */}
          <h3 className="text-xl font-normal text-white mb-2 hover:text-blue-400 transition-colors">
            {recording.fileName}
          </h3>

          {/* Location and date */}
          <p className="text-sm text-gray-400 mb-3">
            {recording.location && recording.recordedDate ? (
              `${recording.location} • ${new Date(recording.recordedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            ) : recording.location || (recording.recordedDate && new Date(recording.recordedDate).toLocaleDateString())}
          </p>
        </div>

        {/* Duration and play/loop buttons */}
        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <span className="text-sm text-gray-400 font-normal">{formatTime(recording.duration)}</span>
          {recording.audioBlob && (
            <div className="flex items-center gap-1">
              {/* Play button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playRecording(recording.id, recording.audioBlob!, false, recording.loopPoints);
                }}
                className={`p-1 rounded-full transition-colors ${
                  isPlaying(recording.id, false)
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700 text-gray-400'
                }`}
                title="Play"
              >
                {isPlaying(recording.id, false) ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              {/* Loop button - only show if loop points are set */}
              {recording.loopPoints && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playRecording(recording.id, recording.audioBlob!, true, recording.loopPoints);
                  }}
                  className={`p-1 rounded-full transition-colors ${
                    isPlaying(recording.id, true)
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-700 text-gray-400'
                  }`}
                  title="Loop (saved points)"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordingListItem;
