import Dexie, { type Table } from 'dexie';
import type { Tag, Rhythm, Recording } from '../types';

export class RhythmArchiveDB extends Dexie {
  // Tables
  tags!: Table<Tag, string>;
  rhythms!: Table<Rhythm, string>;
  recordings!: Table<Recording, string>;

  constructor() {
    super('RhythmArchiveDB');

    this.version(1).stores({
      tags: 'id, type, value, usageCount',
      rhythms: 'id, primaryRhythmNameTag, *alternateRhythmNameTags, *regionTags, *ethnicGroupTags, *occasionTags, *languageTags, createdDate, updatedDate',
      recordings: 'id, rhythmId, fileName, recordedDate, location, *playerNameTags'
    });

    // Version 2: Add isFavorite field to recordings
    this.version(2).stores({
      tags: 'id, type, value, usageCount',
      rhythms: 'id, primaryRhythmNameTag, *alternateRhythmNameTags, *regionTags, *ethnicGroupTags, *occasionTags, *languageTags, createdDate, updatedDate',
      recordings: 'id, rhythmId, fileName, recordedDate, location, *playerNameTags, isFavorite'
    }).upgrade(tx => {
      // Set existing recordings to not favorite
      return tx.table('recordings').toCollection().modify(recording => {
        if (recording.isFavorite === undefined) {
          recording.isFavorite = false;
        }
      });
    });
  }
}

// Create a singleton instance
export const db = new RhythmArchiveDB();
