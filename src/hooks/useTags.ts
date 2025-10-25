import { useState, useEffect } from 'react';
import type { Tag, TagType } from '../types';
import { getTagsByType, createTag } from '../db/storage';

export function useTags(type: TagType) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTags();
  }, [type]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const tags = await getTagsByType(type);
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrGetTag = async (value: string): Promise<Tag> => {
    // createTag already handles find-or-create and usage count
    const tag = await createTag(type, value);
    // Reload tags to update autocomplete list
    await loadTags();
    return tag;
  };

  const filterTags = (query: string): Tag[] => {
    if (!query) return availableTags;
    const lowerQuery = query.toLowerCase();
    return availableTags.filter(tag => 
      tag.value.toLowerCase().includes(lowerQuery)
    );
  };

  return {
    availableTags,
    loading,
    createOrGetTag,
    filterTags,
    refreshTags: loadTags
  };
}
