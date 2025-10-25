import { useState, useEffect, useRef } from 'react';
import { updateRecording } from '../db/storage';

interface WaveformRequest {
  channelData: Float32Array;
  targetPoints: number;
}

interface WaveformResponse {
  waveformData: number[];
  error?: string;
}

interface UseWaveformResult {
  waveformData: number[] | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for generating and caching waveform data from audio blobs
 * @param audioBlob - The audio blob to process
 * @param recordingId - The recording ID for caching
 * @param existingWaveformData - Already cached waveform data (if exists)
 * @param targetPoints - Number of data points to generate (default: 1500)
 */
export function useWaveform(
  audioBlob: Blob | null,
  recordingId: string | null,
  existingWaveformData: number[] | null = null,
  targetPoints: number = 1500
): UseWaveformResult {
  const [waveformData, setWaveformData] = useState<number[] | null>(existingWaveformData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // If we already have waveform data, no need to generate
    if (existingWaveformData && existingWaveformData.length > 0) {
      setWaveformData(existingWaveformData);
      return;
    }

    // If no audio blob, nothing to do
    if (!audioBlob) {
      return;
    }

    // Generate waveform data
    const generateWaveform = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Decode audio in main thread (AudioContext not available in workers)
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get channel data (use first channel)
        const channelData = audioBuffer.getChannelData(0);

        // Close audio context to free resources
        await audioContext.close();

        // Create Web Worker for processing
        const worker = new Worker(
          new URL('../workers/waveformWorker.ts', import.meta.url),
          { type: 'module' }
        );
        workerRef.current = worker;

        // Set up message handler
        worker.onmessage = async (e: MessageEvent<WaveformResponse>) => {
          const { waveformData: data, error: workerError } = e.data;

          if (workerError) {
            setError(workerError);
            setIsLoading(false);
            return;
          }

          // Set waveform data in state
          setWaveformData(data);
          setIsLoading(false);

          // Cache in IndexedDB if we have a recording ID
          if (recordingId && data.length > 0) {
            try {
              await updateRecording(recordingId, { waveformData: data });
              console.log('✅ Waveform data cached in IndexedDB');
            } catch (err) {
              console.error('Failed to cache waveform data:', err);
            }
          }

          // Clean up worker
          worker.terminate();
          workerRef.current = null;
        };

        // Set up error handler
        worker.onerror = (err) => {
          setError(err.message || 'Worker error');
          setIsLoading(false);
          worker.terminate();
          workerRef.current = null;
        };

        // Send channel data to worker for processing
        const request: WaveformRequest = {
          channelData,
          targetPoints
        };
        worker.postMessage(request);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    generateWaveform();

    // Cleanup function
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [audioBlob, recordingId, existingWaveformData, targetPoints]);

  return {
    waveformData,
    isLoading,
    error
  };
}
