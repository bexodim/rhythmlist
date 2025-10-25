import { useState, useRef, useEffect } from 'react';
import type { Tag, TagType } from '../types';
import { useTags } from '../hooks/useTags';
import { TagChip } from './TagChip';

interface TagInputProps {
  type: TagType;
  label: string;
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  required?: boolean;
  placeholder?: string;
  variant?: 'default' | 'primary';
  maxTags?: number;
}

export function TagInput({
  type,
  label,
  selectedTagIds,
  onChange,
  required = false,
  placeholder = 'Type to add...',
  variant = 'default',
  maxTags
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { availableTags, createOrGetTag, filterTags } = useTags(type);

  // Load selected tag objects when IDs change
  useEffect(() => {
    const loadSelectedTags = async () => {
      const tags = availableTags.filter(tag => selectedTagIds.includes(tag.id));
      setSelectedTags(tags);
    };
    loadSelectedTags();
  }, [selectedTagIds, availableTags]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = filterTags(inputValue).filter(
    tag => !selectedTagIds.includes(tag.id)
  );

  const handleAddTag = async (value: string) => {
    if (!value.trim()) return;

    // Check if we've reached the max tags limit
    if (maxTags && selectedTagIds.length >= maxTags) {
      return;
    }

    try {
      const tag = await createOrGetTag(value.trim());
      if (!selectedTagIds.includes(tag.id)) {
        onChange([...selectedTagIds, tag.id]);
      }
      setInputValue('');
      setShowDropdown(false);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      handleRemoveTag(selectedTags[selectedTags.length - 1].id);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map(tag => (
            <TagChip
              key={tag.id}
              value={tag.value}
              variant={variant}
              onRemove={() => handleRemoveTag(tag.id)}
            />
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={maxTags ? selectedTagIds.length >= maxTags : false}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        {/* Autocomplete Dropdown */}
        {showDropdown && (inputValue || filteredSuggestions.length > 0) && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredSuggestions.length > 0 ? (
              <>
                {filteredSuggestions.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAddTag(tag.value)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between group transition-colors"
                  >
                    <span className="text-white">{tag.value}</span>
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {tag.usageCount} {tag.usageCount === 1 ? 'use' : 'uses'}
                    </span>
                  </button>
                ))}
              </>
            ) : inputValue.trim() ? (
              <button
                type="button"
                onClick={() => handleAddTag(inputValue)}
                className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors"
              >
                <span className="text-white">
                  Create "<span className="font-medium">{inputValue}</span>"
                </span>
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="mt-1 text-sm text-gray-500">
        Press Enter to add, or select from suggestions
      </p>
    </div>
  );
}
