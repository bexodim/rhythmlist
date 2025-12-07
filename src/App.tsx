import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { RecordingFlow } from './components/RecordingFlow';
import { BottomNav } from './components/BottomNav';
import { AudioPlayer } from './components/AudioPlayer';
import { RecordingDetailPage } from './components/RecordingDetailPage';
import { getAllRhythms, getTagById, getRhythmById, getRecordingsByRhythmId, getRecordingById, getTagsByIds, createRecording, updateRhythm, createTag, deleteRecording, updateRecording, exportAllData, importAllData } from './db/storage';
import type { Rhythm, Recording } from './types';
import { importRhythmsData } from './utils/importData';
import { useAudioPlayback } from './context/AudioPlaybackContext';

function App() {
  // RUN IMPORT ONCE - Remove this after import is complete
  useEffect(() => {
    const hasImported = localStorage.getItem('rhythms_imported');
    if (!hasImported) {
      importRhythmsData().then(() => {
        localStorage.setItem('rhythms_imported', 'true');
        console.log('✅ Import complete! Refresh to see rhythms.');
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 pt-4 pb-4">
        <Routes>
          <Route path="/" element={<RecordingFlow />} />
          <Route path="/rhythms" element={<RhythmListPage />} />
          <Route path="/rhythm/:id" element={<RhythmDetailPage />} />
          <Route path="/recording/:id" element={<RecordingDetailPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/debug" element={<DebugPage />} />
        </Routes>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

// Rhythm List Page
function RhythmListPage() {
  const [rhythms, setRhythms] = useState<Rhythm[]>([]);
  const navigate = useNavigate();
  const [rhythmNames, setRhythmNames] = useState<Map<string, string>>(new Map());
  const [rhythmTags, setRhythmTags] = useState<Map<string, string[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Use global audio playback context
  const { playRecording, isPlaying, recentlyPlayedRecordings } = useAudioPlayback();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'name-asc' | 'date-newest' | 'date-oldest' | 'recordings'>('date-newest');
  const [showRecentlyPlayed, setShowRecentlyPlayed] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<{
    alternateNames: string[];
    regions: string[];
    ethnicGroups: string[];
    occasions: string[];
    languages: string[];
  }>({
    alternateNames: [],
    regions: [],
    ethnicGroups: [],
    occasions: [],
    languages: []
  });
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // All available tags for filtering
  const [allTags, setAllTags] = useState<{
    alternateNames: string[];
    regions: string[];
    ethnicGroups: string[];
    occasions: string[];
    languages: string[];
  }>({
    alternateNames: [],
    regions: [],
    ethnicGroups: [],
    occasions: [],
    languages: []
  });

  // Full rhythm data with all tags (for filtering)
  type RhythmData = {
    name: string;
    alternateNames: string[];
    regions: string[];
    ethnicGroups: string[];
    occasions: string[];
    languages: string[];
  };
  const [rhythmFullData, setRhythmFullData] = useState<Map<string, RhythmData>>(new Map());
  const [favoriteRecordings, setFavoriteRecordings] = useState<Map<string, Recording>>(new Map());

  useEffect(() => {
    const loadRhythms = async () => {
      try {
        const allRhythms = await getAllRhythms();

        // Sort by updatedDate, most recent first
        const sortedRhythms = allRhythms.sort((a, b) =>
          new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime()
        );
        setRhythms(sortedRhythms);

        // Load all primary rhythm names and tags
        const nameMap = new Map<string, string>();
        const tagsMap = new Map<string, string[]>();
        const fullDataMap = new Map();

        // Collect all unique tags
        const allAlternateNames = new Set<string>();
        const allRegions = new Set<string>();
        const allEthnicGroups = new Set<string>();
        const allOccasions = new Set<string>();
        const allLanguages = new Set<string>();

        for (const rhythm of sortedRhythms) {
          const tag = await getTagById(rhythm.primaryRhythmNameTag);
          const rhythmName = tag?.value || 'Unknown';
          nameMap.set(rhythm.id, rhythmName);

          // Load all tag types
          const alternateTags = await getTagsByIds(rhythm.alternateRhythmNameTags);
          const regionTags = await getTagsByIds(rhythm.regionTags);
          const ethnicTags = await getTagsByIds(rhythm.ethnicGroupTags);
          const occasionTags = await getTagsByIds(rhythm.occasionTags);
          const languageTags = await getTagsByIds(rhythm.languageTags);

          const alternateNames = alternateTags.map(t => t.value);
          const regions = regionTags.map(t => t.value);
          const ethnicGroups = ethnicTags.map(t => t.value);
          const occasions = occasionTags.map(t => t.value);
          const languages = languageTags.map(t => t.value);

          // Store full data for filtering
          fullDataMap.set(rhythm.id, {
            name: rhythmName,
            alternateNames,
            regions,
            ethnicGroups,
            occasions,
            languages
          });

          // Collect unique tags
          alternateNames.forEach(t => allAlternateNames.add(t));
          regions.forEach(t => allRegions.add(t));
          ethnicGroups.forEach(t => allEthnicGroups.add(t));
          occasions.forEach(t => allOccasions.add(t));
          languages.forEach(t => allLanguages.add(t));

          // Display tags (priority order for UI display)
          const displayTags: string[] = [];
          displayTags.push(...alternateNames);
          displayTags.push(...regions);
          displayTags.push(...ethnicGroups);
          tagsMap.set(rhythm.id, displayTags.slice(0, 5)); // Limit to 5 tags
        }

        setRhythmNames(nameMap);
        setRhythmTags(tagsMap);
        setRhythmFullData(fullDataMap);

        // Set all available tags for filters
        setAllTags({
          alternateNames: Array.from(allAlternateNames).sort(),
          regions: Array.from(allRegions).sort(),
          ethnicGroups: Array.from(allEthnicGroups).sort(),
          occasions: Array.from(allOccasions).sort(),
          languages: Array.from(allLanguages).sort()
        });

        // Load one favorite recording per rhythm
        const favoriteMap = new Map<string, Recording>();
        for (const rhythm of sortedRhythms) {
          if (rhythm.recordingIds.length > 0) {
            const recordings = await getRecordingsByRhythmId(rhythm.id);
            const favorite = recordings.find(r => r.isFavorite);
            if (favorite) {
              favoriteMap.set(rhythm.id, favorite);
            }
          }
        }
        setFavoriteRecordings(favoriteMap);
      } catch (error) {
        console.error('Error loading rhythms:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRhythms();
  }, []);

  // Filter and sort rhythms
  const filteredAndSortedRhythms = useMemo(() => {
    let filtered = rhythms;

    // Apply recently played filter
    if (showRecentlyPlayed) {
      filtered = filtered.filter(rhythm => {
        // Check if any of this rhythm's recordings were recently played
        return rhythm.recordingIds.some(recId =>
          recentlyPlayedRecordings.includes(recId)
        );
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(rhythm => {
        const data = rhythmFullData.get(rhythm.id);
        if (!data) return false;

        // Search in rhythm name
        if (data.name.toLowerCase().includes(query)) return true;

        // Search in all tag arrays
        if (data.alternateNames.some(t => t.toLowerCase().includes(query))) return true;
        if (data.regions.some(t => t.toLowerCase().includes(query))) return true;
        if (data.ethnicGroups.some(t => t.toLowerCase().includes(query))) return true;
        if (data.occasions.some(t => t.toLowerCase().includes(query))) return true;
        if (data.languages.some(t => t.toLowerCase().includes(query))) return true;

        return false;
      });
    }

    // Apply tag filters
    const hasActiveFilters =
      selectedFilters.alternateNames.length > 0 ||
      selectedFilters.regions.length > 0 ||
      selectedFilters.ethnicGroups.length > 0 ||
      selectedFilters.occasions.length > 0 ||
      selectedFilters.languages.length > 0;

    if (hasActiveFilters) {
      filtered = filtered.filter(rhythm => {
        const data = rhythmFullData.get(rhythm.id);
        if (!data) return false;

        // Check if rhythm has ALL selected filters (AND logic)
        const matchesAlternateNames = selectedFilters.alternateNames.length === 0 ||
          selectedFilters.alternateNames.some(f => data.alternateNames.includes(f));
        const matchesRegions = selectedFilters.regions.length === 0 ||
          selectedFilters.regions.some(f => data.regions.includes(f));
        const matchesEthnicGroups = selectedFilters.ethnicGroups.length === 0 ||
          selectedFilters.ethnicGroups.some(f => data.ethnicGroups.includes(f));
        const matchesOccasions = selectedFilters.occasions.length === 0 ||
          selectedFilters.occasions.some(f => data.occasions.includes(f));
        const matchesLanguages = selectedFilters.languages.length === 0 ||
          selectedFilters.languages.some(f => data.languages.includes(f));

        return matchesAlternateNames && matchesRegions && matchesEthnicGroups &&
               matchesOccasions && matchesLanguages;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return (rhythmFullData.get(a.id)?.name || '').localeCompare(rhythmFullData.get(b.id)?.name || '');
        case 'date-newest':
          return new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime();
        case 'date-oldest':
          return new Date(a.updatedDate).getTime() - new Date(b.updatedDate).getTime();
        case 'recordings':
          return b.recordingIds.length - a.recordingIds.length;
        default:
          return 0;
      }
    });

    return sorted;
  }, [rhythms, searchQuery, selectedFilters, sortOption, rhythmFullData, showRecentlyPlayed, recentlyPlayedRecordings]);

  // Helper functions for filter management
  const toggleFilter = (category: keyof typeof selectedFilters, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const removeFilter = (category: keyof typeof selectedFilters, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [category]: prev[category].filter(v => v !== value)
    }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      alternateNames: [],
      regions: [],
      ethnicGroups: [],
      occasions: [],
      languages: []
    });
    setSearchQuery('');
    setShowRecentlyPlayed(false);
  };


  const activeFilterCount =
    selectedFilters.alternateNames.length +
    selectedFilters.regions.length +
    selectedFilters.ethnicGroups.length +
    selectedFilters.occasions.length +
    selectedFilters.languages.length;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading rhythms...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white">Rhythms</h1>
        <div className="text-sm text-gray-400">
          {filteredAndSortedRhythms.length} of {rhythms.length}
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-2 mb-4">
        {/* Search bar */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search rhythms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Recently Played toggle */}
        <button
          onClick={() => setShowRecentlyPlayed(!showRecentlyPlayed)}
          className={`btn-secondary px-3 py-2 flex items-center gap-2 ${showRecentlyPlayed ? 'bg-blue-600 text-white' : ''}`}
          title="Show recently played"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Filter button */}
        <button
          onClick={() => setShowFilterMenu(!showFilterMenu)}
          className={`btn-secondary px-4 py-2 relative ${activeFilterCount > 0 ? 'bg-blue-600 text-white' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort dropdown */}
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
          className="input-field px-3 py-2"
        >
          <option value="date-newest">Newest</option>
          <option value="date-oldest">Oldest</option>
          <option value="name-asc">A-Z</option>
          <option value="recordings">Most recordings</option>
        </select>

        {/* Export button */}
        <button
          onClick={async () => {
            await exportAllData();
          }}
          className="btn-secondary px-3 py-2 flex items-center gap-1"
          title="Export all data"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        {/* Import button */}
        <label className="btn-secondary px-3 py-2 flex items-center gap-1 cursor-pointer" title="Import data">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <input
            type="file"
            accept="application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const result = await importAllData(file);
                alert(result.message);
                if (result.success) {
                  loadRhythms();
                }
                e.target.value = ''; // Reset input
              }
            }}
            className="hidden"
          />
        </label>
      </div>

      {/* Filter menu */}
      {showFilterMenu && (
        <div className="card mb-4 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-semibold">Filters</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="text-sm text-blue-400 hover:text-blue-300">
                Clear all
              </button>
            )}
          </div>

          {/* Regions */}
          {allTags.regions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm text-gray-400 mb-2">Regions</h4>
              <div className="flex flex-wrap gap-2">
                {allTags.regions.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleFilter('regions', tag)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedFilters.regions.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ethnic Groups */}
          {allTags.ethnicGroups.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm text-gray-400 mb-2">Ethnic Groups</h4>
              <div className="flex flex-wrap gap-2">
                {allTags.ethnicGroups.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleFilter('ethnicGroups', tag)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedFilters.ethnicGroups.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Occasions */}
          {allTags.occasions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm text-gray-400 mb-2">Occasions</h4>
              <div className="flex flex-wrap gap-2">
                {allTags.occasions.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleFilter('occasions', tag)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedFilters.occasions.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {allTags.languages.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm text-gray-400 mb-2">Languages</h4>
              <div className="flex flex-wrap gap-2">
                {allTags.languages.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleFilter('languages', tag)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedFilters.languages.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {(activeFilterCount > 0 || searchQuery.trim() || showRecentlyPlayed) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {searchQuery.trim() && (
            <div className="bg-gray-700 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm">
              <span>Search: "{searchQuery}"</span>
              <button onClick={() => setSearchQuery('')} className="hover:text-red-400">
                ×
              </button>
            </div>
          )}
          {showRecentlyPlayed && (
            <div className="bg-blue-600 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm">
              <span>Recently Played</span>
              <button onClick={() => setShowRecentlyPlayed(false)} className="hover:text-red-400">
                ×
              </button>
            </div>
          )}
          {Object.entries(selectedFilters).map(([category, values]) =>
            values.map(value => (
              <div
                key={`${category}-${value}`}
                className="bg-blue-600 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm"
              >
                <span>{value}</span>
                <button
                  onClick={() => removeFilter(category as keyof typeof selectedFilters, value)}
                  className="hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Results */}
      {rhythms.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-xl text-white mb-4">No rhythms yet!</p>
          <p className="text-gray-400 mb-6">Tap the record button to create your first rhythm</p>
        </div>
      ) : filteredAndSortedRhythms.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-xl text-white mb-4">No matching rhythms</p>
          <p className="text-gray-400 mb-6">Try adjusting your search or filters</p>
          <button onClick={clearAllFilters} className="btn-primary px-4 py-2">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedRhythms.map((rhythm) => {
            const tags = rhythmTags.get(rhythm.id) || [];
            const favoriteRecording = favoriteRecordings.get(rhythm.id);
            return (
              <div
                key={rhythm.id}
                onClick={() => navigate(`/rhythm/${rhythm.id}`)}
                className="card hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <h3 className="text-lg font-bold text-white mb-2">
                  {rhythmNames.get(rhythm.id) || 'Unknown'}
                </h3>

                <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
                  {tags.map((tag, index) => (
                    <span key={index} className="bg-gray-700 text-gray-300 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>

                {favoriteRecording && (
                  <div className="mt-2 mb-2 p-2 bg-gray-900/50 rounded space-y-1">
                    {/* Title and play buttons */}
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400" title="Favorite recording">⭐</span>
                      <span className="text-sm text-gray-300 flex-1">{favoriteRecording.fileName}</span>
                      {favoriteRecording.audioBlob && (
                        <div className="flex items-center gap-1">
                          {/* Play button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playRecording(favoriteRecording.id, favoriteRecording.audioBlob!, false, favoriteRecording.loopPoints);
                            }}
                            className={`p-1 rounded transition-colors ${
                              isPlaying(favoriteRecording.id, false)
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-gray-700 text-gray-400'
                            }`}
                            title="Play"
                          >
                            {isPlaying(favoriteRecording.id, false) ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>
                          {/* Loop button - only show if loop points are set */}
                          {favoriteRecording.loopPoints && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playRecording(favoriteRecording.id, favoriteRecording.audioBlob!, true, favoriteRecording.loopPoints);
                              }}
                              className={`p-1 rounded transition-colors ${
                                isPlaying(favoriteRecording.id, true)
                                  ? 'bg-blue-600 text-white'
                                  : 'hover:bg-gray-700 text-gray-400'
                              }`}
                              title="Loop (saved points)"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Location, date, and duration */}
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 invisible">⭐</span>
                      <div className="text-xs text-gray-500 flex items-center justify-between flex-1">
                        <span>
                          {[
                            favoriteRecording.location,
                            favoriteRecording.recordedDate ? new Date(favoriteRecording.recordedDate).toLocaleDateString() : null
                          ].filter(Boolean).join(' • ')}
                        </span>
                        {favoriteRecording.duration && (
                          <span>
                            {Math.floor(favoriteRecording.duration / 60)}:{Math.floor(favoriteRecording.duration % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-xs text-blue-400">
                  {rhythm.recordingIds.length} {rhythm.recordingIds.length === 1 ? 'recording' : 'recordings'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddRhythmPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Add Rhythm</h1>
      <RhythmForm />
    </div>
  );
}

function NewRecordingPage() {
  return <RecordingFlow />;
}

// Recording List Item Component
function RecordingListItem({ recording, onUpdateTitle, onDelete }: {
  recording: Recording;
  onUpdateTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { playRecording, isPlaying: isPlayingGlobal } = useAudioPlayback();

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
                className={`p-1 rounded transition-colors ${
                  isPlayingGlobal(recording.id, false)
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700 text-gray-400'
                }`}
                title="Play"
              >
                {isPlayingGlobal(recording.id, false) ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
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
                  className={`p-1 rounded transition-colors ${
                    isPlayingGlobal(recording.id, true)
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-700 text-gray-400'
                  }`}
                  title="Loop (saved points)"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
}

// Rhythm Detail Page
function RhythmDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rhythm, setRhythm] = useState<Rhythm | null>(null);
  const [rhythmName, setRhythmName] = useState('');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Edit mode state
  const [editedName, setEditedName] = useState('');
  const [editedAlternateNames, setEditedAlternateNames] = useState('');
  const [editedRegions, setEditedRegions] = useState('');
  const [editedEthnicGroups, setEditedEthnicGroups] = useState('');
  const [editedOccasions, setEditedOccasions] = useState('');
  const [editedLanguages, setEditedLanguages] = useState('');
  const [editedLyrics, setEditedLyrics] = useState('');
  const [editedLyricsTranslation, setEditedLyricsTranslation] = useState('');
  const [editedNotes, setEditedNotes] = useState('');

  useEffect(() => {
    const loadRhythm = async () => {
      if (!id) return;

      try {
        const rhythmData = await getRhythmById(id);
        if (rhythmData) {
          setRhythm(rhythmData);

          // Load rhythm name
          const tag = await getTagById(rhythmData.primaryRhythmNameTag);
          if (tag) {
            setRhythmName(tag.value);
          }

          // Load recordings
          const recordingsData = await getRecordingsByRhythmId(id);
          setRecordings(recordingsData);
        }
      } catch (error) {
        console.error('Error loading rhythm:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRhythm();
  }, [id]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    try {
      let audioBlob: Blob;

      // Check if it's a video file
      if (file.type.startsWith('video/')) {
        console.log('Extracting audio from video...');
        audioBlob = await extractAudioFromVideo(file);
        console.log('Audio extracted successfully');
      } else if (file.type.startsWith('audio/')) {
        audioBlob = file;
        console.log('Audio file selected');
      } else {
        alert('Please upload an audio or video file');
        setIsUploading(false);
        return;
      }

      // Get duration from audio blob
      console.log('Calculating duration...');
      const duration = await getAudioDuration(audioBlob);
      console.log('Duration:', duration);

      // Create recording
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      console.log('Creating recording...');
      await createRecording({
        rhythmId: id,
        fileName,
        audioBlob,
        duration,
        recordedDate: new Date().toISOString(),
        location: 'Uploaded',
        playerNameTags: [],
        notes: '',
        loopPoints: null,
        waveformData: null,
        isFavorite: false
      });

      console.log('Recording created successfully');

      // Reload recordings
      const updatedRecordings = await getRecordingsByRhythmId(id);
      setRecordings(updatedRecordings);
      console.log('Recordings reloaded');

      alert('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const getAudioDuration = async (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audioContext = new AudioContext();
      audioBlob.arrayBuffer()
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          const duration = audioBuffer.duration;
          audioContext.close();
          resolve(duration);
        })
        .catch(error => {
          audioContext.close();
          reject(error);
        });
    });
  };

  const extractAudioFromVideo = async (videoFile: File): Promise<Blob> => {
    // Try to decode the video file directly using Web Audio API
    // Most browsers can extract audio from video containers without playing the video
    try {
      console.log('Attempting direct audio extraction from video...');
      const arrayBuffer = await videoFile.arrayBuffer();
      const audioContext = new AudioContext();

      try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('Successfully decoded audio from video');

        // Convert AudioBuffer back to Blob
        const wavBlob = await audioBufferToWavBlob(audioBuffer);
        audioContext.close();
        return wavBlob;
      } catch (decodeError) {
        console.log('Direct decoding failed, trying alternative method...');
        audioContext.close();

        // Fallback: Try using the video file directly as-is
        // Some video formats can be used directly by Web Audio API
        return videoFile;
      }
    } catch (error) {
      console.error('Error extracting audio from video:', error);
      throw new Error('Failed to extract audio from video. Please convert to audio format first.');
    }
  };

  // Helper function to convert AudioBuffer to WAV Blob
  const audioBufferToWavBlob = async (audioBuffer: AudioBuffer): Promise<Blob> => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = new Float32Array(audioBuffer.length * numberOfChannels);
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < audioBuffer.length; i++) {
        data[i * numberOfChannels + channel] = channelData[i];
      }
    }

    const dataLength = data.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    const volume = 0.8;
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const handleEditToggle = async () => {
    if (!isEditMode && rhythm) {
      // Load current values when entering edit mode
      setEditedName(rhythmName);

      // Load alternate names
      const alternateTags = await getTagsByIds(rhythm.alternateRhythmNameTags);
      setEditedAlternateNames(alternateTags.map(t => t.value).join(', '));

      // Load regions
      const regionTags = await getTagsByIds(rhythm.regionTags);
      setEditedRegions(regionTags.map(t => t.value).join(', '));

      // Load ethnic groups
      const ethnicTags = await getTagsByIds(rhythm.ethnicGroupTags);
      setEditedEthnicGroups(ethnicTags.map(t => t.value).join(', '));

      // Load occasions
      const occasionTags = await getTagsByIds(rhythm.occasionTags);
      setEditedOccasions(occasionTags.map(t => t.value).join(', '));

      // Load languages
      const languageTags = await getTagsByIds(rhythm.languageTags);
      setEditedLanguages(languageTags.map(t => t.value).join(', '));

      // Load text fields
      setEditedLyrics(rhythm.lyrics || '');
      setEditedLyricsTranslation(rhythm.lyricsTranslation || '');
      setEditedNotes(rhythm.notes || '');
    }
    setIsEditMode(!isEditMode);
  };

  const handleDeleteRecording = async (recordingId: string) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) {
      return;
    }

    try {
      await deleteRecording(recordingId);

      // Reload recordings
      if (id) {
        const updatedRecordings = await getRecordingsByRhythmId(id);
        setRecordings(updatedRecordings);
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Failed to delete recording');
    }
  };

  const handleUpdateRecordingTitle = async (recordingId: string, newTitle: string) => {
    try {
      await updateRecording(recordingId, { fileName: newTitle });

      // Update local state
      setRecordings(prevRecordings =>
        prevRecordings.map(rec =>
          rec.id === recordingId ? { ...rec, fileName: newTitle } : rec
        )
      );
    } catch (error) {
      console.error('Error updating recording title:', error);
      alert('Failed to update title');
    }
  };

  const handleSaveEdit = async () => {
    if (!rhythm || !id) return;

    try {
      // Create new tag for the updated name
      const newTag = await createTag('rhythmName', editedName.trim());

      // Process alternate names
      const alternateTagIds: string[] = [];
      if (editedAlternateNames.trim()) {
        const names = editedAlternateNames.split(',').map(n => n.trim()).filter(n => n);
        for (const name of names) {
          const tag = await createTag('rhythmName', name);
          alternateTagIds.push(tag.id);
        }
      }

      // Process regions
      const regionTagIds: string[] = [];
      if (editedRegions.trim()) {
        const regions = editedRegions.split(',').map(n => n.trim()).filter(n => n);
        for (const region of regions) {
          const tag = await createTag('region', region);
          regionTagIds.push(tag.id);
        }
      }

      // Process ethnic groups
      const ethnicTagIds: string[] = [];
      if (editedEthnicGroups.trim()) {
        const groups = editedEthnicGroups.split(',').map(n => n.trim()).filter(n => n);
        for (const group of groups) {
          const tag = await createTag('ethnicGroup', group);
          ethnicTagIds.push(tag.id);
        }
      }

      // Process occasions
      const occasionTagIds: string[] = [];
      if (editedOccasions.trim()) {
        const occasions = editedOccasions.split(',').map(n => n.trim()).filter(n => n);
        for (const occasion of occasions) {
          const tag = await createTag('occasion', occasion);
          occasionTagIds.push(tag.id);
        }
      }

      // Process languages
      const languageTagIds: string[] = [];
      if (editedLanguages.trim()) {
        const languages = editedLanguages.split(',').map(n => n.trim()).filter(n => n);
        for (const language of languages) {
          const tag = await createTag('language', language);
          languageTagIds.push(tag.id);
        }
      }

      // Update rhythm with all new data
      await updateRhythm(id, {
        primaryRhythmNameTag: newTag.id,
        alternateRhythmNameTags: alternateTagIds,
        regionTags: regionTagIds,
        ethnicGroupTags: ethnicTagIds,
        occasionTags: occasionTagIds,
        languageTags: languageTagIds,
        lyrics: editedLyrics.trim(),
        lyricsTranslation: editedLyricsTranslation.trim(),
        notes: editedNotes.trim(),
        updatedDate: new Date().toISOString()
      });

      // Reload rhythm data
      const updatedRhythm = await getRhythmById(id);
      if (updatedRhythm) {
        setRhythm(updatedRhythm);
        setRhythmName(editedName);
      }

      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving rhythm:', error);
      alert('Failed to save changes');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!rhythm) {
    return (
      <div className="text-center py-12">
        <p className="text-white mb-4">Rhythm not found</p>
        <button onClick={() => navigate('/rhythms')} className="btn-primary">
          Back to Rhythms
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/rhythms')}
          className="text-blue-400 mb-4 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {isEditMode ? (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="input-field text-xl font-bold flex-1"
            />
            <button onClick={handleSaveEdit} className="btn-success px-4 py-2">
              Save
            </button>
            <button onClick={() => setIsEditMode(false)} className="btn-outline px-4 py-2">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">{rhythmName}</h1>
            <button onClick={handleEditToggle} className="btn-outline px-4 py-2">
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Recordings */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recordings</h2>
          <div>
            <input
              type="file"
              id="file-upload"
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className={`btn-primary px-4 py-2 cursor-pointer inline-block ${isUploading ? 'opacity-50' : ''}`}
            >
              {isUploading ? 'Uploading...' : '+ Upload'}
            </label>
          </div>
        </div>

        {recordings.length > 0 ? (
          recordings.map((recording) => (
            <RecordingListItem
              key={recording.id}
              recording={recording}
              onUpdateTitle={handleUpdateRecordingTitle}
              onDelete={handleDeleteRecording}
            />
          ))
        ) : (
          <div className="card text-center py-8">
            <p className="text-gray-400 mb-4">No recordings yet</p>
            <p className="text-sm text-gray-500">Upload an audio or video file to get started</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Details</h2>

        {isEditMode ? (
          <div className="space-y-4">
            {/* Alternate Names */}
            <div>
              <label className="label-text">Alternate Names</label>
              <input
                type="text"
                className="input-field"
                placeholder="Comma-separated: Alternative name 1, Alternative name 2..."
                value={editedAlternateNames}
                onChange={(e) => setEditedAlternateNames(e.target.value)}
              />
            </div>

            {/* Regions */}
            <div>
              <label className="label-text">Regions</label>
              <input
                type="text"
                className="input-field"
                placeholder="Comma-separated: Guinea, Mali, Senegal..."
                value={editedRegions}
                onChange={(e) => setEditedRegions(e.target.value)}
              />
            </div>

            {/* Ethnic Groups */}
            <div>
              <label className="label-text">Ethnic Groups</label>
              <input
                type="text"
                className="input-field"
                placeholder="Comma-separated: Malinké, Susu, Baga..."
                value={editedEthnicGroups}
                onChange={(e) => setEditedEthnicGroups(e.target.value)}
              />
            </div>

            {/* Occasions */}
            <div>
              <label className="label-text">Occasions</label>
              <input
                type="text"
                className="input-field"
                placeholder="Comma-separated: Wedding, Harvest, Festival..."
                value={editedOccasions}
                onChange={(e) => setEditedOccasions(e.target.value)}
              />
            </div>

            {/* Languages */}
            <div>
              <label className="label-text">Languages</label>
              <input
                type="text"
                className="input-field"
                placeholder="Comma-separated: Malinké, French..."
                value={editedLanguages}
                onChange={(e) => setEditedLanguages(e.target.value)}
              />
            </div>

            {/* Lyrics */}
            <div>
              <label className="label-text">Lyrics</label>
              <textarea
                className="textarea-field"
                placeholder="Enter lyrics..."
                value={editedLyrics}
                onChange={(e) => setEditedLyrics(e.target.value)}
                rows={3}
              />
            </div>

            {/* Lyrics Translation */}
            <div>
              <label className="label-text">Lyrics Translation</label>
              <textarea
                className="textarea-field"
                placeholder="Enter lyrics translation..."
                value={editedLyricsTranslation}
                onChange={(e) => setEditedLyricsTranslation(e.target.value)}
                rows={3}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="label-text">Notes</label>
              <textarea
                className="textarea-field"
                placeholder="Additional notes about this rhythm..."
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <MetadataDisplay label="Total recordings" value={recordings.length} />
            <MetadataDisplay label="Created" value={new Date(rhythm.createdDate).toLocaleDateString()} />
            <MetadataTagsDisplay label="Alternate names" tagIds={rhythm.alternateRhythmNameTags} />
            <MetadataTagsDisplay label="Regions" tagIds={rhythm.regionTags} />
            <MetadataTagsDisplay label="Ethnic groups" tagIds={rhythm.ethnicGroupTags} />
            <MetadataTagsDisplay label="Occasions" tagIds={rhythm.occasionTags} />
            <MetadataTagsDisplay label="Languages" tagIds={rhythm.languageTags} />
            {rhythm.lyrics && <MetadataDisplay label="Lyrics" value={rhythm.lyrics} multiline />}
            {rhythm.lyricsTranslation && <MetadataDisplay label="Lyrics translation" value={rhythm.lyricsTranslation} multiline />}
            {rhythm.notes && <MetadataDisplay label="Notes" value={rhythm.notes} multiline />}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper components for metadata display
function MetadataDisplay({ label, value, multiline }: { label: string; value: string | number; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-gray-500">{label}:</span>{' '}
      {multiline ? (
        <div className="text-gray-300 mt-1 whitespace-pre-wrap">{value}</div>
      ) : (
        <span className="text-gray-300">{value}</span>
      )}
    </div>
  );
}

function MetadataTagsDisplay({ label, tagIds }: { label: string; tagIds: string[] }) {
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    const loadTags = async () => {
      if (tagIds.length > 0) {
        const tagObjs = await getTagsByIds(tagIds);
        setTags(tagObjs.map(t => t.value));
      }
    };
    loadTags();
  }, [tagIds]);

  if (tags.length === 0) return null;

  return (
    <div>
      <span className="text-gray-500">{label}:</span>{' '}
      <span className="text-gray-300">{tags.join(', ')}</span>
    </div>
  );
}

// Debug Page - Check database contents
function DebugPage() {
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDbInfo = async () => {
      try {
        const rhythms = await getAllRhythms();
        const allRecordings = await getAllRecordings();

        setDbInfo({
          rhythmCount: rhythms.length,
          recordingCount: allRecordings.length,
          rhythms: rhythms,
          recordings: allRecordings
        });
      } catch (error) {
        console.error('Error loading db info:', error);
        setDbInfo({ error: String(error) });
      } finally {
        setLoading(false);
      }
    };

    loadDbInfo();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-white mb-4">Debug Info</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white mb-4">Database Debug Info</h1>

      <div className="card">
        <h2 className="text-xl font-bold text-white mb-2">Summary</h2>
        <p className="text-gray-300">Rhythms: {dbInfo?.rhythmCount || 0}</p>
        <p className="text-gray-300">Recordings: {dbInfo?.recordingCount || 0}</p>
      </div>

      {dbInfo?.error && (
        <div className="card bg-red-900/20">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          <pre className="text-red-300 text-xs overflow-auto">{dbInfo.error}</pre>
        </div>
      )}

      <div className="card">
        <h2 className="text-xl font-bold text-white mb-2">All Rhythms</h2>
        <pre className="text-gray-300 text-xs overflow-auto max-h-96">
          {JSON.stringify(dbInfo?.rhythms, null, 2)}
        </pre>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-white mb-2">All Recordings</h2>
        {dbInfo?.recordingCount === 0 ? (
          <div className="space-y-4">
            <p className="text-red-400 font-bold">⚠️ NO RECORDINGS FOUND IN DATABASE</p>
            <div className="bg-yellow-900/30 p-4 rounded">
              <p className="text-yellow-300 mb-2">Your recordings may be lost. Recovery options:</p>
              <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
                <li>Check if you have an export backup file (.json)</li>
                <li>Check your Downloads folder for any exported backups</li>
                <li>If you have a backup, use the Import button on the Rhythms page</li>
              </ol>
            </div>
          </div>
        ) : (
          <pre className="text-gray-300 text-xs overflow-auto max-h-96">
            {JSON.stringify(dbInfo?.recordings?.map((r: Recording) => ({
              id: r.id,
              fileName: r.fileName,
              rhythmId: r.rhythmId,
              duration: r.duration,
              hasAudioBlob: !!r.audioBlob
            })), null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// Stats Page (Placeholder)
function StatsPage() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-white mb-4">Stats</h1>
      <p className="text-gray-400">Coming soon!</p>
    </div>
  );
}

function UITestPage() {
  const [testInput, setTestInput] = useState('');
  const [testTextarea, setTestTextarea] = useState('');
  const [testTagIds, setTestTagIds] = useState<string[]>([]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">UI Components Test Page</h1>

      {/* Buttons Section */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <button className="btn-primary">Primary Button</button>
          <button className="btn-secondary">Secondary Button</button>
          <button className="btn-success">Success Button</button>
          <button className="btn-danger">Danger Button</button>
          <button className="btn-outline">Outline Button</button>
        </div>
      </div>

      {/* Input Fields Section */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Input Fields</h2>
        <div className="space-y-4">
          <div>
            <label className="label-text">Standard Input</label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter text here..."
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
            />
          </div>

          <div>
            <label className="label-text label-required">Required Input</label>
            <input
              type="text"
              className="input-field"
              placeholder="This field is required"
              required
            />
          </div>

          <div>
            <label className="label-text">Email Input</label>
            <input
              type="email"
              className="input-field"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="label-text">Date Input</label>
            <input
              type="date"
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Textarea Section */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Textarea</h2>
        <div>
          <label className="label-text">Text Area</label>
          <textarea
            className="textarea-field"
            placeholder="Enter longer text here..."
            value={testTextarea}
            onChange={(e) => setTestTextarea(e.target.value)}
          />
        </div>
      </div>

      {/* TagInput Component Section */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">TagInput Component</h2>
        <div className="space-y-4">
          <TagInput
            type="rhythmName"
            label="Rhythm Names"
            selectedTagIds={testTagIds}
            onChange={setTestTagIds}
            required
            placeholder="e.g., Kuku, Sunu, Djole..."
            variant="primary"
          />

          <TagInput
            type="region"
            label="Regions"
            selectedTagIds={[]}
            onChange={() => {}}
            placeholder="e.g., Guinea, Mali, Senegal..."
          />
        </div>
      </div>

      {/* Form Example Section */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Form Example</h2>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="label-text label-required">Title</label>
            <input type="text" className="input-field" placeholder="Enter title" required />
          </div>

          <div>
            <label className="label-text">Description</label>
            <textarea className="textarea-field" placeholder="Enter description"></textarea>
          </div>

          <div className="flex gap-4">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" className="btn-outline">Cancel</button>
            <button type="button" className="btn-danger">Delete</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
