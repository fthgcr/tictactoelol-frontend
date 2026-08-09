import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GuessWhoService } from '../../../services/guess-who.service';
import { GuessWhoChampion, GuessWhoPuzzle } from '../../../models/GuessWhoPuzzle';
import * as Utils from '../../../consts/Consts';

type Feedback = 'correct' | 'partial' | 'wrong';

interface GuessCell {
  label: string;      // column header, e.g. "Region"
  value: string;      // displayed value from the guessed champion
  feedback: Feedback;
  arrow: '' | 'up' | 'down'; // release year hint: answer is later/earlier
}

interface GuessRow {
  name: string;
  imgUrl: String;
  imgFailed: boolean;
  correct: boolean;
  cells: GuessCell[];
  animate: boolean; // true while the tiles are flipping open
}

// Persisted result of a finished daily puzzle (one entry, overwritten each day).
interface DailyResult {
  puzzleId: string;
  won: boolean;
  guessCount: number;
  answer: string;
  guessRows: string[]; // emoji rows, one per guess
}

const DAILY_RESULT_KEY = 'guesswho_daily_result';
const COLUMNS = ['Gender', 'Role', 'Range', 'Region', 'Resource', 'Difficulty', 'Year'];

// Tile reveal animation timings; must stay in sync with the SCSS keyframes.
const REVEAL_STAGGER_MS = 110; // gap between two neighbouring tiles
const REVEAL_TILE_MS = 520;    // duration of a single tile flip
const REVEAL_TOTAL_MS = (COLUMNS.length - 1) * REVEAL_STAGGER_MS + REVEAL_TILE_MS;

const FEEDBACK_EMOJIS: Record<Feedback, string> = {
  correct: '\u{1F7E9}', // green
  partial: '\u{1F7E7}', // orange
  wrong: '\u{1F7E5}',   // red
};

@Component({
  selector: 'app-guess-who',
  templateUrl: './guess-who.component.html',
  styleUrl: './guess-who.component.scss',
})
export class GuessWhoComponent implements OnInit, OnDestroy {

  columns: string[] = COLUMNS;

  mode: 'daily' | 'unlimited' = 'daily';
  loading: boolean = true;
  loadFailed: boolean = false;
  puzzle: GuessWhoPuzzle | null = null;
  guesses: GuessRow[] = []; // newest first
  guessedNames: Set<string> = new Set();
  searchText: string = '';
  suggestions: GuessWhoChampion[] = [];
  gameOver: boolean = false;
  won: boolean = false;
  // True while the newest row's tiles are still flipping open; input is locked.
  revealing: boolean = false;
  message: String = '';
  answerImgUrl: String = '';
  answerImgFailed: boolean = false;
  // Set when today's daily was already finished; shows the summary instead of the input.
  dailyResult: DailyResult | null = null;
  private emojiRows: string[] = []; // oldest first, for sharing
  private messageTimeout: any;
  private revealTimeout: any;

  constructor(
    private guessWhoService: GuessWhoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.newGame();
  }

  ngOnDestroy(): void {
    clearTimeout(this.messageTimeout);
    clearTimeout(this.revealTimeout);
  }

  switchMode(mode: 'daily' | 'unlimited'): void {
    if (this.mode === mode && !this.loadFailed) return;
    this.mode = mode;
    this.newGame();
  }

  newGame(): void {
    clearTimeout(this.revealTimeout);
    this.revealing = false;
    this.loading = true;
    this.loadFailed = false;
    this.puzzle = null;
    this.guesses = [];
    this.guessedNames = new Set();
    this.searchText = '';
    this.suggestions = [];
    this.gameOver = false;
    this.won = false;
    this.message = '';
    this.answerImgUrl = '';
    this.answerImgFailed = false;
    this.dailyResult = null;
    this.emojiRows = [];

    const request = this.mode === 'daily'
      ? this.guessWhoService.dailyPuzzle()
      : this.guessWhoService.newPuzzle();

    request.subscribe({
      next: (puzzle) => {
        this.puzzle = puzzle;
        this.answerImgUrl = Utils.default.championImageURL(puzzle.answer);
        if (this.mode === 'daily') {
          const saved = this.loadDailyResult();
          if (saved && puzzle.puzzleId && saved.puzzleId === puzzle.puzzleId) {
            // Already played today: show the summary, not the input.
            this.dailyResult = saved;
            this.won = saved.won;
            this.gameOver = true;
            this.loading = false;
            return;
          }
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadFailed = true;
      },
    });
  }

  //Search & guessing

  onSearchChange(): void {
    const query = this.searchText.trim().toLowerCase();
    if (!query || !this.puzzle) {
      this.suggestions = [];
      return;
    }
    this.suggestions = this.puzzle.champions
      .filter((champion) => !this.guessedNames.has(champion.name))
      .filter((champion) => champion.name.toLowerCase().includes(query))
      .slice(0, 8);
  }

  submitFirstSuggestion(): void {
    if (this.suggestions.length > 0) {
      this.guessChampion(this.suggestions[0]);
    }
  }

  guessChampion(champion: GuessWhoChampion): void {
    if (!this.puzzle || this.gameOver || this.revealing || this.guessedNames.has(champion.name)) return;

    this.guessedNames.add(champion.name);
    this.searchText = '';
    this.suggestions = [];

    const answer = this.puzzle.champions.find((c) => c.name === this.puzzle!.answer);
    if (!answer) return;

    const row = this.buildGuessRow(champion, answer);
    this.guesses.unshift(row); // newest on top
    this.emojiRows.push(row.cells.map((cell) => FEEDBACK_EMOJIS[cell.feedback]).join(''));

    this.startReveal(row);
  }

  // Plays the staggered tile flip, then hands over to the end-of-game logic.
  private startReveal(row: GuessRow): void {
    this.revealing = true;
    clearTimeout(this.revealTimeout);
    this.revealTimeout = setTimeout(() => {
      row.animate = false;
      this.revealing = false;
      if (row.correct) {
        this.finishGame(true);
      }
    }, REVEAL_TOTAL_MS);
  }

  // Per-tile delay so the traits open one after another, left to right.
  revealDelayMs(index: number): number {
    return index * REVEAL_STAGGER_MS;
  }

  giveUp(): void {
    if (this.gameOver || this.revealing) return;
    this.finishGame(false);
  }

  private buildGuessRow(guess: GuessWhoChampion, answer: GuessWhoChampion): GuessRow {
    const cells: GuessCell[] = [
      this.exactCell('Gender', guess.gender, answer.gender),
      this.multiCell('Role', guess.role, answer.role),
      this.multiCell('Melee/Ranged', guess.meleeRanged, answer.meleeRanged),
      this.exactCell('Region', guess.region, answer.region),
      this.exactCell('Resource', guess.abilityResource, answer.abilityResource),
      this.exactCell('Difficulty', guess.difficulty, answer.difficulty),
      this.yearCell(guess.releaseDate, answer.releaseDate),
    ];
    return {
      name: guess.name,
      imgUrl: Utils.default.championImageURL(guess.name),
      imgFailed: false,
      correct: guess.name === answer.name,
      cells: cells,
      animate: true,
    };
  }

  private exactCell(label: string, guessValue: string, answerValue: string): GuessCell {
    const equal = (guessValue ?? '').trim().toLowerCase() === (answerValue ?? '').trim().toLowerCase();
    return { label: label, value: guessValue, feedback: equal ? 'correct' : 'wrong', arrow: '' };
  }

  // Multi-valued attributes (comma separated): green when the sets match,
  // orange when they only share some values, red otherwise.
  private multiCell(label: string, guessValue: string, answerValue: string): GuessCell {
    const guessSet = this.splitValues(guessValue);
    const answerSet = this.splitValues(answerValue);
    const shared = guessSet.filter((value) => answerSet.includes(value));

    let feedback: Feedback = 'wrong';
    if (shared.length === guessSet.length && shared.length === answerSet.length) {
      feedback = 'correct';
    } else if (shared.length > 0) {
      feedback = 'partial';
    }
    return { label: label, value: guessValue, feedback: feedback, arrow: '' };
  }

  private yearCell(guessYear: string, answerYear: string): GuessCell {
    const guessed = parseInt(guessYear, 10);
    const actual = parseInt(answerYear, 10);
    if (isNaN(guessed) || isNaN(actual) || guessed === actual) {
      return this.exactCell('Year', guessYear, answerYear);
    }
    return {
      label: 'Year',
      value: guessYear,
      feedback: 'wrong',
      arrow: actual > guessed ? 'up' : 'down', // answer released later / earlier
    };
  }

  private splitValues(value: string): string[] {
    return (value ?? '')
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter((part) => part !== '');
  }

  //Game end & daily persistence

  private finishGame(won: boolean): void {
    this.won = won;
    this.gameOver = true;
    this.suggestions = [];
    this.showMessage(won ? 'You Won !' : 'You Lose !');
    if (this.mode === 'daily' && this.puzzle && this.puzzle.puzzleId) {
      const result: DailyResult = {
        puzzleId: this.puzzle.puzzleId,
        won: won,
        guessCount: this.guesses.length,
        answer: this.puzzle.answer,
        guessRows: this.emojiRows,
      };
      this.dailyResult = result;
      this.saveDailyResult(result);
    }
  }

  //Daily result persistence (guarded for SSR where localStorage does not exist)
  private loadDailyResult(): DailyResult | null {
    try {
      const raw = localStorage.getItem(DAILY_RESULT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  private saveDailyResult(result: DailyResult): void {
    try {
      localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(result));
    } catch (e) {
      // Storage unavailable; the daily lock is a convenience, not a requirement.
    }
  }

  shareResult(): void {
    if (!this.dailyResult) return;
    const header = 'LoL Guess Who ' + this.dailyResult.puzzleId
      + (this.dailyResult.won ? ' ✅ ' + this.dailyResult.guessCount + ' guesses' : ' ❌');
    const text = header + '\n' + this.dailyResult.guessRows.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.showMessage('Copied to clipboard!');
    });
  }

  //Helpers

  private showMessage(text: String): void {
    this.message = text;
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    this.messageTimeout = setTimeout(() => {
      this.message = '';
    }, 2500);
  }

  suggestionImgUrl(champion: GuessWhoChampion): String {
    return Utils.default.championImageURL(champion.name);
  }

  onImgError(row: GuessRow): void {
    row.imgFailed = true;
  }

  redirectHomePage(): void {
    this.router.navigate(['/']);
  }
}
