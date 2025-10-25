// Web Worker for processing audio channel data into waveform
// This runs in a separate thread to avoid blocking the UI

interface WaveformRequest {
  channelData: Float32Array;
  targetPoints: number; // Target number of data points (e.g., 1500)
}

interface WaveformResponse {
  waveformData: number[];
  error?: string;
}

self.onmessage = (e: MessageEvent<WaveformRequest>) => {
  const { channelData, targetPoints } = e.data;

  try {
    // Calculate samples per point for downsampling
    const samplesPerPoint = Math.floor(channelData.length / targetPoints);

    // Generate waveform data by taking RMS (root mean square) of each chunk
    const waveformData: number[] = [];

    for (let i = 0; i < targetPoints; i++) {
      const start = i * samplesPerPoint;
      const end = Math.min(start + samplesPerPoint, channelData.length);

      // Calculate RMS for this chunk
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += channelData[j] * channelData[j];
      }
      const rms = Math.sqrt(sum / (end - start));

      waveformData.push(rms);
    }

    // Normalize to 0-1 range
    const maxAmplitude = Math.max(...waveformData);
    const normalizedData = maxAmplitude > 0
      ? waveformData.map(val => val / maxAmplitude)
      : waveformData;

    // Send result back to main thread
    const response: WaveformResponse = {
      waveformData: normalizedData
    };
    self.postMessage(response);

  } catch (error) {
    // Send error back to main thread
    const response: WaveformResponse = {
      waveformData: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    self.postMessage(response);
  }
};

// Required for TypeScript
export {};
