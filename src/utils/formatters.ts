// Helper to format time into MM:SS.CC (Minutes:Seconds.Centiseconds)
export const formatCentiseconds = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return '00:00.00';
  const mins = Math.floor(timeInSeconds / 60);
  const secs = Math.floor(timeInSeconds % 60);
  const centis = Math.floor((timeInSeconds % 1) * 100);
  
  const minsStr = mins.toString().padStart(2, '0');
  const secsStr = secs.toString().padStart(2, '0');
  const centisStr = centis.toString().padStart(2, '0');
  
  return `${minsStr}:${secsStr}.${centisStr}`;
};
