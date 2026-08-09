// Mirrors backend GuessWhoChampion / GuessWhoPuzzle response models.

export interface GuessWhoChampion {
  name: string;
  role: string;            // may be multi-valued, comma separated
  difficulty: string;
  region: string;
  releaseDate: string;     // release year, e.g. "2013"
  abilityResource: string;
  meleeRanged: string;     // may be multi-valued, comma separated
  gender: string;
}

export interface GuessWhoPuzzle {
  // "2026-07-18" for the daily puzzle, null for unlimited/random puzzles.
  puzzleId: string | null;
  // Name of the secret champion (solo puzzle: returned on purpose).
  answer: string;
  champions: GuessWhoChampion[];
}
