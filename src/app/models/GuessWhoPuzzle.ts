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
  position: string;        // lane, may be multi-valued, comma separated
  species: string;         // lore species, single valued
  // Skins excluding the base one. Null until the server's Data Dragon fetch lands,
  // in which case the Skins column is dropped instead of showing an empty tile.
  skinCount: number | null;
}

export interface GuessWhoPuzzle {
  // "2026-07-18" for the daily puzzle, null for unlimited/random puzzles.
  puzzleId: string | null;
  // Name of the secret champion (solo puzzle: returned on purpose).
  answer: string;
  champions: GuessWhoChampion[];
}
