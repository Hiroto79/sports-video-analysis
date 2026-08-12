/**
 * Baseball Catcher Mitt Computer Vision Tracker
 * Maintains a real-time sliding buffer of catcher mitt coordinates (Target Setup vs Catch Impact)
 * to accurately measure displacement in cm when the user presses Pitch at ball arrival.
 */

export interface MittTrackingResult {
  isCenterCamera: boolean;
  targetCourse: string;
  actualCourse: string;
  missDistanceCm: number;
  dxCm: number;
  dyCm: number;
  isOpposite: boolean;
}

interface MittSample {
  time: number;
  normX: number;
  normY: number;
}

// Sliding sample buffer for the past 4 seconds
const mittSampleBuffer: MittSample[] = [];

let lastRecordedTime = -1;

/**
 * Record a frame sample while video is playing
 */
export function recordMittFrame(video: HTMLVideoElement): void {
  try {
    if (!video || video.readyState < 2 || !video.videoWidth) return;

    const currentTime = video.currentTime;

    // Avoid duplicate samples at the exact same timestamp (throttle < 80ms)
    if (Math.abs(currentTime - lastRecordedTime) < 0.08) return;

    // If user sought/jumped in video (> 1.5s jump backwards or forwards), clear stale buffer
    if (lastRecordedTime >= 0 && (currentTime < lastRecordedTime - 0.5 || currentTime > lastRecordedTime + 2.0)) {
      mittSampleBuffer.length = 0;
    }
    lastRecordedTime = currentTime;

    const width = 320;
    const height = 180;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Home plate ROI (bottom-middle quadrant: y 55%~92%, x 35%~65%)
    const yStart = Math.floor(height * 0.55);
    const yEnd = Math.floor(height * 0.92);
    const xStart = Math.floor(width * 0.35);
    const xEnd = Math.floor(width * 0.65);

    let sumX = 0;
    let sumY = 0;
    let weightSum = 0;

    const midX = (xStart + xEnd) / 2;
    const midY = (yStart + yEnd) / 2;

    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Glove / mitt contrast weight in home plate ROI
        const brightness = (r + g + b) / 3;
        const contrastWeight = Math.abs(brightness - 128);

        sumX += x * contrastWeight;
        sumY += y * contrastWeight;
        weightSum += contrastWeight;
      }
    }

    if (weightSum > 0) {
      const centroidX = sumX / weightSum;
      const centroidY = sumY / weightSum;

      const normX = ((centroidX - midX) / ((xEnd - xStart) / 2));
      const normY = ((centroidY - midY) / ((yEnd - yStart) / 2));

      mittSampleBuffer.push({ time: currentTime, normX, normY });

      // Keep only samples within the last 6 seconds
      while (mittSampleBuffer.length > 0 && mittSampleBuffer[0].time < currentTime - 6.0) {
        mittSampleBuffer.shift();
      }
    }
  } catch {
    // Ignore frame read errors
  }
}

/**
 * When the user presses Pitch at arrival/impact time,
 * compare the pre-pitch setup position (t - 2.5s ~ t - 1.2s) vs current catch position (t).
 */
export function getMittDisplacementAtCatch(video: HTMLVideoElement): MittTrackingResult | null {
  try {
    if (!video) return null;
    const catchTime = video.currentTime;

    // 1. Current catch position
    let catchSample = mittSampleBuffer.find(s => Math.abs(s.time - catchTime) < 0.35);
    if (!catchSample) {
      recordMittFrame(video);
      catchSample = mittSampleBuffer[mittSampleBuffer.length - 1];
    }
    if (!catchSample) return null;

    // 2. Pre-pitch target setup position (1.2s to 2.8s before catch)
    const targetWindowSamples = mittSampleBuffer.filter(
      s => s.time >= catchTime - 2.8 && s.time <= catchTime - 1.0
    );

    let targetNormX = catchSample.normX;
    let targetNormY = catchSample.normY;

    if (targetWindowSamples.length > 0) {
      // Average the stationary setup position
      const avgX = targetWindowSamples.reduce((acc, s) => acc + s.normX, 0) / targetWindowSamples.length;
      const avgY = targetWindowSamples.reduce((acc, s) => acc + s.normY, 0) / targetWindowSamples.length;
      targetNormX = avgX;
      targetNormY = avgY;
    }

    // Determine target course (構え)
    const tHPos = targetNormX < -0.28 ? '内角' : (targetNormX > 0.28 ? '外角' : '真ん中');
    const tVPos = targetNormY < -0.28 ? '高め' : (targetNormY > 0.28 ? '低め' : '');
    const targetCourse = tVPos ? `${tHPos}${tVPos}` : tHPos;

    // Determine actual catch course (着弾)
    const aHPos = catchSample.normX < -0.28 ? '内角' : (catchSample.normX > 0.28 ? '外角' : '真ん中');
    const aVPos = catchSample.normY < -0.28 ? '高め' : (catchSample.normY > 0.28 ? '低め' : '');
    const actualCourse = aVPos ? `${aHPos}${aVPos}` : aHPos;

    // Calculate displacement in centimeters (home plate standard = 43.18cm)
    const dxCm = Math.round((catchSample.normX - targetNormX) * 22.0 * 10) / 10;
    const dyCm = Math.round((catchSample.normY - targetNormY) * 22.0 * 10) / 10;
    const missDistanceCm = Math.round(Math.sqrt(dxCm * dxCm + dyCm * dyCm) * 10) / 10;

    // 逆球判定 (Target was outside, but arrived inside or vice-versa)
    const isOpposite = (tHPos === '外角' && aHPos === '内角') || (tHPos === '内角' && aHPos === '外角');

    return {
      isCenterCamera: true,
      targetCourse,
      actualCourse,
      missDistanceCm,
      dxCm,
      dyCm,
      isOpposite
    };
  } catch (err) {
    console.error('Error computing mitt displacement:', err);
    return null;
  }
}
