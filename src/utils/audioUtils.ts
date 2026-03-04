export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

export function base64ToFloat32(base64: string): Float32Array {
  const binaryString = atob(base64);
  const int16Array = new Int16Array(binaryString.length / 2);
  const view = new DataView(int16Array.buffer);
  
  // The binary string is raw bytes. We need to read them as little-endian int16
  for (let i = 0; i < int16Array.length; i++) {
    // Each int16 is 2 bytes
    const byte1 = binaryString.charCodeAt(i * 2);
    const byte2 = binaryString.charCodeAt(i * 2 + 1);
    // Combine bytes (little endian)
    const val = (byte2 << 8) | byte1;
    // Handle signed 16-bit integer
    int16Array[i] = val >= 0x8000 ? val - 0x10000 : val;
  }

  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
}

export function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (outputRate === inputRate) {
    return buffer;
  }
  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    // Simple linear interpolation or just averaging could work, but for speech, 
    // simple decimation (taking every Nth sample) is often "okay" for preview, 
    // but averaging is better to prevent aliasing. 
    // Let's do a simple average of the samples in the window.
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
