import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagInput } from './TagInput';
import { createRhythm } from '../db/storage';
import type { NewRhythm } from '../types';

interface RhythmFormProps {
  onSuccess?: (rhythmId: string) => void;
  onCancel?: () => void;
}

export function RhythmForm({ onSuccess, onCancel }: RhythmFormProps) {
  const navigate = useNavigate();

  // Tag states (all are arrays of tag IDs)
  const [primaryRhythmName, setPrimaryRhythmName] = useState<string[]>([]);
  const [alternateRhythmNames, setAlternateRhythmNames] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [ethnicGroups, setEthnicGroups] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

  // Text field states
  const [lyrics, setLyrics] = useState('');
  const [lyricsTranslation, setLyricsTranslation] = useState('');
  const [notes, setNotes] = useState('');

  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: Primary rhythm name is required
    if (primaryRhythmName.length === 0) {
      setError('Primary rhythm name is required');
      return;
    }

    try {
      setIsSaving(true);

      // Create the rhythm object
      const rhythmData: NewRhythm = {
        primaryRhythmNameTag: primaryRhythmName[0],
        alternateRhythmNameTags: alternateRhythmNames,
        regionTags: regions,
        ethnicGroupTags: ethnicGroups,
        occasionTags: occasions,
        languageTags: languages,
        lyrics: lyrics.trim(),
        lyricsTranslation: lyricsTranslation.trim(),
        notes: notes.trim(),
        recordingIds: []
      };

      // Save to IndexedDB
      const newRhythm = await createRhythm(rhythmData);

      // Success! Call callback or navigate
      if (onSuccess) {
        onSuccess(newRhythm.id);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Error saving rhythm:', err);
      setError('Failed to save rhythm. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Primary Rhythm Name - REQUIRED */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">Rhythm Names</h2>
        <div className="space-y-4">
          <TagInput
            type="rhythmName"
            label="Primary Rhythm Name"
            selectedTagIds={primaryRhythmName}
            onChange={setPrimaryRhythmName}
            required
            placeholder="e.g., Kuku, Sunu, Djole..."
            variant="primary"
            maxTags={1}
          />

          <TagInput
            type="rhythmName"
            label="Alternate Rhythm Names"
            selectedTagIds={alternateRhythmNames}
            onChange={setAlternateRhythmNames}
            placeholder="e.g., Alternative spellings or names in other languages..."
          />
        </div>
      </div>

      {/* Geographic & Cultural Context */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">Geographic & Cultural Context</h2>
        <div className="space-y-4">
          <TagInput
            type="region"
            label="Regions"
            selectedTagIds={regions}
            onChange={setRegions}
            placeholder="e.g., Guinea, Mali, Senegal..."
          />

          <TagInput
            type="ethnicGroup"
            label="Ethnic Groups"
            selectedTagIds={ethnicGroups}
            onChange={setEthnicGroups}
            placeholder="e.g., Malinké, Susu, Baga..."
          />
        </div>
      </div>

      {/* Usage Context */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">Usage Context</h2>
        <div className="space-y-4">
          <TagInput
            type="occasion"
            label="Occasions"
            selectedTagIds={occasions}
            onChange={setOccasions}
            placeholder="e.g., Wedding, Harvest, Funeral..."
          />

          <TagInput
            type="language"
            label="Languages"
            selectedTagIds={languages}
            onChange={setLanguages}
            placeholder="e.g., Malinké, Susu, Baga..."
          />
        </div>
      </div>

      {/* Text Content */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">Lyrics & Notes</h2>
        <div className="space-y-4">
          <div>
            <label className="label-text">Lyrics</label>
            <textarea
              className="textarea-field"
              placeholder="Enter lyrics or vocal patterns..."
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <label className="label-text">Lyrics Translation</label>
            <textarea
              className="textarea-field"
              placeholder="Enter translation or meaning..."
              value={lyricsTranslation}
              onChange={(e) => setLyricsTranslation(e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <label className="label-text">Notes</label>
            <textarea
              className="textarea-field"
              placeholder="Any additional notes, context, or variations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-4 justify-end">
        <button
          type="button"
          onClick={handleCancel}
          className="btn-outline"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Rhythm'}
        </button>
      </div>
    </form>
  );
}
