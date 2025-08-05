/**
 * Genera un codice casuale per le partite
 * @param length Lunghezza del codice (default: 6)
 * @returns Stringa alfanumerica casuale
 */
export function generateCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Calcola i punti in base al tempo di risposta
 * @param basePoints Punti base per la domanda
 * @param timeLimit Tempo limite in millisecondi
 * @param timeTaken Tempo impiegato in millisecondi
 * @returns Punti calcolati
 */
export function calculatePoints(basePoints: number, timeLimit: number, timeTaken: number): number {
  if (timeTaken > timeLimit) return 0;
  
  // Più veloce rispondi, più punti ottieni
  const timeBonus = (timeLimit - timeTaken) / timeLimit;
  return Math.round(basePoints * (0.5 + 0.5 * timeBonus));
}

/**
 * Mescola un array (Fisher-Yates shuffle)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
