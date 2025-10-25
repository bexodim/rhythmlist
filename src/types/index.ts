// Tag types
export type TagType = 
  | 'rhythmName' 
  | 'region' 
  | 'ethnicGroup' 
  | 'occasion' 
  | 'language' 
  | 'playerName';

export interface Tag {
  id: string;
  type: TagType;
  value: string;
  usageCount: number;
  createdDate: string;
}

// Rhythm model
export interface Rhythm {
  id: string;
  primaryRhythmNameTag: string; // Tag ID - required
  alternateRhythmNameTags: string[]; // Tag IDs - optional
  regionTags: string[];
  ethnicGroupTags: string[];
  occasionTags: string[];
  languageTags: string[];
  lyrics: string;
  lyricsTranslation: string;
  notes: string;
  createdDate: string;
  updatedDate: string;
  recordingIds: string[]; // Recording IDs
}

// Recording model
export interface Recording {
  id: string;
  rhythmId: string; // Parent rhythm ID
  fileName: string;
  audioBlob: Blob | null;
  duration: number | null; // seconds
  recordedDate: string;
  location: string;
  playerNameTags: string[]; // Tag IDs
  notes: string;
  loopPoints: LoopPoints | null;
  waveformData: number[] | null;
  isFavorite: boolean;
}

export interface LoopPoints {
  start: number; // seconds
  end: number; // seconds
}

// Helper type for creating new entities
export type NewRhythm = Omit<Rhythm, 'id' | 'createdDate' | 'updatedDate' | 'recordingIds'>;
export type NewRecording = Omit<Recording, 'id' | 'waveformData'>;
export type NewTag = Omit<Tag, 'id' | 'usageCount' | 'createdDate'>;
