import { db } from './schema';
import type { Tag, Rhythm, Recording, TagType } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ============= TAG OPERATIONS =============

export const createTag = async (type: TagType, value: string): Promise<Tag> => {
  // Check if tag already exists
  const existing = await db.tags
    .where({ type, value })
    .first();
  
  if (existing) {
    // Increment usage count
    await db.tags.update(existing.id, { 
      usageCount: existing.usageCount + 1 
    });
    return { ...existing, usageCount: existing.usageCount + 1 };
  }
  
  // Create new tag
  const tag: Tag = {
    id: uuidv4(),
    type,
    value,
    usageCount: 1,
    createdDate: new Date().toISOString()
  };
  
  await db.tags.add(tag);
  return tag;
};

export const getTagsByType = async (type: TagType): Promise<Tag[]> => {
  return db.tags
    .where('type')
    .equals(type)
    .sortBy('usageCount')
    .then(tags => tags.reverse()); // Most used first
};

export const getTagById = async (id: string): Promise<Tag | undefined> => {
  return db.tags.get(id);
};

export const getTagsByIds = async (ids: string[]): Promise<Tag[]> => {
  return db.tags.bulkGet(ids).then(tags => 
    tags.filter((tag): tag is Tag => tag !== undefined)
  );
};

export const searchTags = async (type: TagType, query: string): Promise<Tag[]> => {
  const allTags = await getTagsByType(type);
  const lowerQuery = query.toLowerCase();
  return allTags.filter(tag => 
    tag.value.toLowerCase().includes(lowerQuery)
  );
};

// ============= RHYTHM OPERATIONS =============

export const createRhythm = async (rhythm: Omit<Rhythm, 'id' | 'createdDate' | 'updatedDate'>): Promise<Rhythm> => {
  const newRhythm: Rhythm = {
    ...rhythm,
    id: uuidv4(),
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString()
  };
  
  await db.rhythms.add(newRhythm);
  return newRhythm;
};

export const getRhythmById = async (id: string): Promise<Rhythm | undefined> => {
  return db.rhythms.get(id);
};

export const getAllRhythms = async (): Promise<Rhythm[]> => {
  return db.rhythms.toArray();
};

export const updateRhythm = async (id: string, updates: Partial<Rhythm>): Promise<void> => {
  await db.rhythms.update(id, {
    ...updates,
    updatedDate: new Date().toISOString()
  });
};

export const deleteRhythm = async (id: string): Promise<void> => {
  // Delete all associated recordings first
  const recordings = await db.recordings.where('rhythmId').equals(id).toArray();
  await db.recordings.bulkDelete(recordings.map(r => r.id));
  
  // Delete the rhythm
  await db.rhythms.delete(id);
};

export const addRecordingToRhythm = async (rhythmId: string, recordingId: string): Promise<void> => {
  const rhythm = await getRhythmById(rhythmId);
  if (rhythm) {
    await updateRhythm(rhythmId, {
      recordingIds: [...rhythm.recordingIds, recordingId]
    });
  }
};

// ============= RECORDING OPERATIONS =============

export const createRecording = async (recording: Omit<Recording, 'id'>): Promise<Recording> => {
  const newRecording: Recording = {
    ...recording,
    id: uuidv4()
  };
  
  await db.recordings.add(newRecording);
  
  // Add recording ID to parent rhythm
  await addRecordingToRhythm(recording.rhythmId, newRecording.id);
  
  return newRecording;
};

export const getRecordingById = async (id: string): Promise<Recording | undefined> => {
  return db.recordings.get(id);
};

export const getRecordingsByRhythmId = async (rhythmId: string): Promise<Recording[]> => {
  return db.recordings.where('rhythmId').equals(rhythmId).toArray();
};

export const getAllRecordings = async (): Promise<Recording[]> => {
  return db.recordings.toArray();
};

export const updateRecording = async (id: string, updates: Partial<Recording>): Promise<void> => {
  await db.recordings.update(id, updates);
};

export const deleteRecording = async (id: string): Promise<void> => {
  const recording = await getRecordingById(id);
  if (recording) {
    // Remove recording ID from parent rhythm
    const rhythm = await getRhythmById(recording.rhythmId);
    if (rhythm) {
      await updateRhythm(rhythm.id, {
        recordingIds: rhythm.recordingIds.filter(rid => rid !== id)
      });
    }
  }
  
  await db.recordings.delete(id);
};

// ============= SEARCH & FILTER =============

export const searchRhythms = async (query: string): Promise<Rhythm[]> => {
  const allRhythms = await getAllRhythms();
  const lowerQuery = query.toLowerCase();
  
  // Get all tags for comparison
  const allTags = await db.tags.toArray();
  const tagMap = new Map(allTags.map(tag => [tag.id, tag.value.toLowerCase()]));
  
  return allRhythms.filter(rhythm => {
    // Search in rhythm name tags
    const rhythmNameMatches = [
      rhythm.primaryRhythmNameTag,
      ...rhythm.alternateRhythmNameTags
    ].some(tagId => tagMap.get(tagId)?.includes(lowerQuery));
    
    // Search in other tag fields
    const otherTagMatches = [
      ...rhythm.regionTags,
      ...rhythm.ethnicGroupTags,
      ...rhythm.occasionTags,
      ...rhythm.languageTags
    ].some(tagId => tagMap.get(tagId)?.includes(lowerQuery));
    
    // Search in text fields
    const textMatches = 
      rhythm.lyrics.toLowerCase().includes(lowerQuery) ||
      rhythm.lyricsTranslation.toLowerCase().includes(lowerQuery) ||
      rhythm.notes.toLowerCase().includes(lowerQuery);
    
    return rhythmNameMatches || otherTagMatches || textMatches;
  });
};

export const filterRhythmsByTags = async (tagIds: string[]): Promise<Rhythm[]> => {
  if (tagIds.length === 0) return getAllRhythms();
  
  const allRhythms = await getAllRhythms();
  
  return allRhythms.filter(rhythm => {
    const rhythmTagIds = [
      rhythm.primaryRhythmNameTag,
      ...rhythm.alternateRhythmNameTags,
      ...rhythm.regionTags,
      ...rhythm.ethnicGroupTags,
      ...rhythm.occasionTags,
      ...rhythm.languageTags
    ];
    
    // Check if rhythm has ALL specified tags (AND logic)
    return tagIds.every(tagId => rhythmTagIds.includes(tagId));
  });
};
