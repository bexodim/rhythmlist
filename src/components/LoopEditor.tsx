import { useState, useRef, useEffect } from 'react';
import { Waveform } from './Waveform';

interface LoopPoints {
  start: number; // in seconds
  end: number; // in seconds
}

interface LoopEditorProps {
  waveformData: number[];
  duration: number;
  currentTime: number;
  loopPoints: LoopPoints | null;
  onLoopPointsChange: (points: LoopPoints | null) => void;
  onSeek: (time: number) => void;
}

export function LoopEditor({
  waveformData,
  duration,
  currentTime,
  loopPoints,
  onLoopPointsChange,
  onSeek
}: LoopEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const [tempLoopPoints, setTempLoopPoints] = useState<LoopPoints | null>(loopPoints);

  // Local state for input fields
  const [startMinInput, setStartMinInput] = useState('0');
  const [startSecInput, setStartSecInput] = useState('0.0');
  const [endMinInput, setEndMinInput] = useState('0');
  const [endSecInput, setEndSecInput] = useState('0.0');

  const MIN_LOOP_DURATION = 0.1; // minimum 0.1 seconds

  // Update temp loop points when prop changes
  useEffect(() => {
    setTempLoopPoints(loopPoints);
    if (loopPoints) {
      setStartMinInput(Math.floor(loopPoints.start / 60).toString());
      setStartSecInput((loopPoints.start % 60).toFixed(1));
      setEndMinInput(Math.floor(loopPoints.end / 60).toString());
      setEndSecInput((loopPoints.end % 60).toFixed(1));
    }
  }, [loopPoints]);

  const handleSetLoop = () => {
    // Initialize loop points to full duration
    const newPoints: LoopPoints = {
      start: 0,
      end: duration
    };
    setTempLoopPoints(newPoints);
    onLoopPointsChange(newPoints);
  };

  const handleResetLoop = () => {
    if (window.confirm('Reset loop points?')) {
      setTempLoopPoints(null);
      onLoopPointsChange(null);
    }
  };

  const handleMouseDown = (marker: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(marker);
  };

  const handleTouchStart = (marker: 'start' | 'end') => (e: React.TouchEvent) => {
    e.preventDefault();
    setDragging(marker);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging || !containerRef.current || !tempLoopPoints) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPosition = Math.max(0, Math.min(1, x / rect.width));
    const newTime = clickPosition * duration;

    let newStart = tempLoopPoints.start;
    let newEnd = tempLoopPoints.end;

    if (dragging === 'start') {
      // Ensure start doesn't go past end minus minimum duration
      newStart = Math.min(newTime, tempLoopPoints.end - MIN_LOOP_DURATION);
    } else if (dragging === 'end') {
      // Ensure end doesn't go before start plus minimum duration
      newEnd = Math.max(newTime, tempLoopPoints.start + MIN_LOOP_DURATION);
    }

    const updated: LoopPoints = { start: newStart, end: newEnd };
    setTempLoopPoints(updated);
    onLoopPointsChange(updated);

    // Update input fields
    setStartMinInput(Math.floor(newStart / 60).toString());
    setStartSecInput((newStart % 60).toFixed(1));
    setEndMinInput(Math.floor(newEnd / 60).toString());
    setEndSecInput((newEnd % 60).toFixed(1));
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!dragging || !containerRef.current || !tempLoopPoints || e.touches.length === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const clickPosition = Math.max(0, Math.min(1, x / rect.width));
    const newTime = clickPosition * duration;

    let newStart = tempLoopPoints.start;
    let newEnd = tempLoopPoints.end;

    if (dragging === 'start') {
      newStart = Math.min(newTime, tempLoopPoints.end - MIN_LOOP_DURATION);
    } else if (dragging === 'end') {
      newEnd = Math.max(newTime, tempLoopPoints.start + MIN_LOOP_DURATION);
    }

    const updated: LoopPoints = { start: newStart, end: newEnd };
    setTempLoopPoints(updated);
    onLoopPointsChange(updated);

    // Update input fields
    setStartMinInput(Math.floor(newStart / 60).toString());
    setStartSecInput((newStart % 60).toFixed(1));
    setEndMinInput(Math.floor(newEnd / 60).toString());
    setEndSecInput((newEnd % 60).toFixed(1));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [dragging, tempLoopPoints]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const applyStartTime = () => {
    if (!tempLoopPoints) return;

    const mins = parseFloat(startMinInput) || 0;
    const secs = parseFloat(startSecInput) || 0;
    const newStart = mins * 60 + secs;

    if (isNaN(newStart) || newStart < 0 || newStart > duration) {
      // Reset to current values
      setStartMinInput(Math.floor(tempLoopPoints.start / 60).toString());
      setStartSecInput((tempLoopPoints.start % 60).toFixed(1));
      return;
    }

    // Ensure start doesn't go past end minus minimum duration
    const validStart = Math.min(newStart, tempLoopPoints.end - MIN_LOOP_DURATION);
    const updated: LoopPoints = { start: validStart, end: tempLoopPoints.end };
    setTempLoopPoints(updated);
    onLoopPointsChange(updated);
  };

  const applyEndTime = () => {
    if (!tempLoopPoints) return;

    const mins = parseFloat(endMinInput) || 0;
    const secs = parseFloat(endSecInput) || 0;
    const newEnd = mins * 60 + secs;

    if (isNaN(newEnd) || newEnd < 0 || newEnd > duration) {
      // Reset to current values
      setEndMinInput(Math.floor(tempLoopPoints.end / 60).toString());
      setEndSecInput((tempLoopPoints.end % 60).toFixed(1));
      return;
    }

    // Ensure end doesn't go before start plus minimum duration
    const validEnd = Math.max(newEnd, tempLoopPoints.start + MIN_LOOP_DURATION);
    const updated: LoopPoints = { start: tempLoopPoints.start, end: validEnd };
    setTempLoopPoints(updated);
    onLoopPointsChange(updated);
  };

  const loopDuration = tempLoopPoints
    ? tempLoopPoints.end - tempLoopPoints.start
    : 0;

  return (
    <div className="space-y-3">
      {/* Loop controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Loop Points</h3>
        {!tempLoopPoints ? (
          <button onClick={handleSetLoop} className="btn-primary px-4 py-2">
            Set Loop
          </button>
        ) : (
          <button onClick={handleResetLoop} className="btn-outline px-4 py-2 text-sm">
            Reset
          </button>
        )}
      </div>

      {/* Loop info display with editable times */}
      {tempLoopPoints && (
        <div className="bg-gray-800 rounded px-3 py-3 space-y-3">
          {/* Start time */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400 w-12">Start:</label>
            <input
              type="number"
              min="0"
              step="1"
              value={startMinInput}
              onChange={(e) => setStartMinInput(e.target.value)}
              onBlur={applyStartTime}
              onKeyDown={(e) => e.key === 'Enter' && applyStartTime()}
              className="input-field w-16 text-sm px-2 py-1"
              placeholder="min"
            />
            <span className="text-gray-400 text-sm">:</span>
            <input
              type="number"
              min="0"
              max="59.9"
              step="0.1"
              value={startSecInput}
              onChange={(e) => setStartSecInput(e.target.value)}
              onBlur={applyStartTime}
              onKeyDown={(e) => e.key === 'Enter' && applyStartTime()}
              className="input-field w-16 text-sm px-2 py-1"
              placeholder="sec"
            />
            <span className="text-xs text-gray-500 ml-2">{formatTime(tempLoopPoints.start)}</span>
          </div>

          {/* End time */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400 w-12">End:</label>
            <input
              type="number"
              min="0"
              step="1"
              value={endMinInput}
              onChange={(e) => setEndMinInput(e.target.value)}
              onBlur={applyEndTime}
              onKeyDown={(e) => e.key === 'Enter' && applyEndTime()}
              className="input-field w-16 text-sm px-2 py-1"
              placeholder="min"
            />
            <span className="text-gray-400 text-sm">:</span>
            <input
              type="number"
              min="0"
              max="59.9"
              step="0.1"
              value={endSecInput}
              onChange={(e) => setEndSecInput(e.target.value)}
              onBlur={applyEndTime}
              onKeyDown={(e) => e.key === 'Enter' && applyEndTime()}
              className="input-field w-16 text-sm px-2 py-1"
              placeholder="sec"
            />
            <span className="text-xs text-gray-500 ml-2">{formatTime(tempLoopPoints.end)}</span>
          </div>

          {/* Duration display */}
          <div className="text-sm text-gray-400 border-t border-gray-700 pt-2">
            Loop Duration: <span className="text-white">{formatTime(loopDuration)}</span>
          </div>
        </div>
      )}

      {/* Waveform with markers */}
      <div ref={containerRef} className="relative">
        <Waveform
          waveformData={waveformData}
          duration={duration}
          currentTime={currentTime}
          onSeek={onSeek}
          loopStart={tempLoopPoints?.start ?? null}
          loopEnd={tempLoopPoints?.end ?? null}
        />

        {/* Draggable markers overlay */}
        {tempLoopPoints && duration > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Start marker */}
            <div
              className="absolute top-0 bottom-0 pointer-events-auto cursor-ew-resize"
              style={{
                left: `${(tempLoopPoints.start / duration) * 100}%`,
                width: '20px',
                marginLeft: '-10px'
              }}
              onMouseDown={handleMouseDown('start')}
              onTouchStart={handleTouchStart('start')}
            >
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-green-500" />
              <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-green-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-lg" />
            </div>

            {/* End marker */}
            <div
              className="absolute top-0 bottom-0 pointer-events-auto cursor-ew-resize"
              style={{
                left: `${(tempLoopPoints.end / duration) * 100}%`,
                width: '20px',
                marginLeft: '-10px'
              }}
              onMouseDown={handleMouseDown('end')}
              onTouchStart={handleTouchStart('end')}
            >
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-green-500" />
              <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-green-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
