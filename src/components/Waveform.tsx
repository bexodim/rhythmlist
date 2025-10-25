import { useEffect, useRef } from 'react';

interface WaveformProps {
  waveformData: number[];
  duration: number; // in seconds
  currentTime: number; // in seconds
  onSeek?: (time: number) => void;
  loopStart?: number | null; // in seconds
  loopEnd?: number | null; // in seconds
  height?: number;
}

export function Waveform({
  waveformData,
  duration,
  currentTime,
  onSeek,
  loopStart = null,
  loopEnd = null,
  height = 120
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const canvasWidth = rect.width;
    const canvasHeight = height;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw background
    ctx.fillStyle = '#1f2937'; // gray-800
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw center line
    ctx.strokeStyle = '#374151'; // gray-700
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight / 2);
    ctx.lineTo(canvasWidth, canvasHeight / 2);
    ctx.stroke();

    // Draw loop region highlight if loop points exist
    if (loopStart !== null && loopEnd !== null && duration > 0) {
      const loopStartX = (loopStart / duration) * canvasWidth;
      const loopEndX = (loopEnd / duration) * canvasWidth;
      const loopWidth = loopEndX - loopStartX;

      ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'; // green with transparency
      ctx.fillRect(loopStartX, 0, loopWidth, canvasHeight);
    }

    // Draw waveform bars
    const barWidth = canvasWidth / waveformData.length;
    const maxBarHeight = (canvasHeight / 2) * 0.9; // 90% of half height

    ctx.fillStyle = 'rgba(59, 130, 246, 0.7)'; // blue-500 with transparency

    waveformData.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = amplitude * maxBarHeight;

      // Draw bar above center line
      ctx.fillRect(x, canvasHeight / 2 - barHeight, barWidth - 0.5, barHeight);

      // Draw bar below center line (mirror)
      ctx.fillRect(x, canvasHeight / 2, barWidth - 0.5, barHeight);
    });

    // Draw playback position indicator
    if (duration > 0) {
      const progressX = (currentTime / duration) * canvasWidth;

      ctx.strokeStyle = '#ef4444'; // red-500
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, canvasHeight);
      ctx.stroke();
    }

  }, [waveformData, duration, currentTime, loopStart, loopEnd, height]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Trigger re-render by forcing a state update
      if (canvasRef.current) {
        // The canvas will be redrawn by the effect above
      }
    };

    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Handle click to seek
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPosition = x / rect.width; // 0 to 1
    const newTime = clickPosition * duration;

    onSeek(newTime);
  };

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full rounded-lg border border-gray-700 cursor-pointer"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
