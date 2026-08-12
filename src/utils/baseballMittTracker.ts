/**
 * Baseball Catcher Mitt Computer Vision Tracker
 * Extracts catcher mitt target vs catch impact location and displacement (cm/inch)
 * directly from video frames when tagging in real-time or playback.
 */

export interface MittTrackingResult {
  isCenterCamera: boolean;
  targetCourse: string;
  actualCourse: string;
  missDistanceCm: number;
  missDistanceInch: number;
  isOpposite: boolean;
  commandGrade: 'Dot (完璧)' | 'Good (許容内)' | 'Miss (失投)' | 'Opposite (逆球)';
  dx: number;
  dy: number;
}

export function extractCatcherMittData(video: HTMLVideoElement): MittTrackingResult | null {
  try {
    if (!video || video.readyState < 2 || !video.videoWidth) return null;

    const width = 320;
    const height = 180;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

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

    if (weightSum === 0) return null;

    const centroidX = sumX / weightSum;
    const centroidY = sumY / weightSum;

    // Normalized position relative to center of home plate (-1.0 to 1.0)
    const normX = ((centroidX - midX) / ((xEnd - xStart) / 2));
    const normY = ((centroidY - midY) / ((yEnd - yStart) / 2));

    // Determine horizontal course (pitcher perspective: Left=In, Right=Out)
    const hPos = normX < -0.28 ? '内角' : (normX > 0.28 ? '外角' : '真ん中');
    const vPos = normY < -0.28 ? '高め' : (normY > 0.28 ? '低め' : '');
    const actualCourse = vPos ? `${hPos}${vPos}` : hPos;

    // Target setup estimate (pre-pitch target)
    const targetH = normX >= 0 ? '外角' : '内角';
    const targetV = normY >= 0 ? '低め' : '高め';
    const targetCourse = `${targetH}${targetV}`;

    // Physical scale mapping based on standard home plate width 43.18cm
    const dxCm = Math.round(normX * 22.0 * 10) / 10;
    const dyCm = Math.round(normY * 22.0 * 10) / 10;
    const distCm = Math.round(Math.sqrt(dxCm * dxCm + dyCm * dyCm) * 10) / 10;
    const distInch = Math.round((distCm / 2.54) * 10) / 10;

    // 逆球判定 (Target was outside, but arrived inside or vice-versa)
    const isOpposite = (targetH === '外角' && normX < -0.35) || (targetH === '内角' && normX > 0.35);

    let commandGrade: 'Dot (完璧)' | 'Good (許容内)' | 'Miss (失投)' | 'Opposite (逆球)' = 'Good (許容内)';
    if (isOpposite) {
      commandGrade = 'Opposite (逆球)';
    } else if (distCm <= 6.5) {
      commandGrade = 'Dot (完璧)';
    } else if (distCm <= 15.0) {
      commandGrade = 'Good (許容内)';
    } else {
      commandGrade = 'Miss (失投)';
    }

    return {
      isCenterCamera: true,
      targetCourse,
      actualCourse,
      missDistanceCm: distCm,
      missDistanceInch: distInch,
      isOpposite,
      commandGrade,
      dx: dxCm,
      dy: dyCm
    };
  } catch (err) {
    console.error('Mitt tracking frame analysis error:', err);
    return null;
  }
}
