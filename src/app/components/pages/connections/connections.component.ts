import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConnectionsService } from '../../../services/connections.service';
import { ConnectionsGroup, ConnectionsPuzzle } from '../../../models/ConnectionsPuzzle';
import * as Utils from '../../../consts/Consts';

interface ConnectionsTile {
  name: string;
  groupIndex: number;
  imgUrl: String;
  imgFailed: boolean;
}

interface SolvedGroup {
  rule: string;
  champions: string[];
  colorIndex: number;
}

// Persisted result of a finished daily puzzle (one entry, overwritten each day).
interface DailyResult {
  puzzleId: string;
  won: boolean;
  mistakesLeft: number;
  guessRows: string[]; // emoji rows, one per guess
}

const DAILY_RESULT_KEY = 'connections_daily_result';
const GROUP_EMOJIS = ['\u{1F7E8}', '\u{1F7E9}', '\u{1F7E6}', '\u{1F7EA}']; // matches .color-0..3

@Component({
  selector: 'app-connections',
  templateUrl: './connections.component.html',
  styleUrl: './connections.component.scss',
})
export class ConnectionsComponent implements OnInit {

  static readonly MAX_MISTAKES = 4;

  mode: 'daily' | 'unlimited' = 'daily';
  loading: boolean = true;
  loadFailed: boolean = false;
  puzzle: ConnectionsPuzzle | null = null;
  tiles: ConnectionsTile[] = [];
  selected: ConnectionsTile[] = [];
  solvedGroups: SolvedGroup[] = [];
  mistakesLeft: number = ConnectionsComponent.MAX_MISTAKES;
  gameOver: boolean = false;
  won: boolean = false;
  message: String = '';
  guessRows: string[] = [];
  // Set when today's daily was already finished; shows the summary instead of the board.
  dailyResult: DailyResult | null = null;
  private messageTimeout: any;

  constructor(
    private connectionsService: ConnectionsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.newGame();
  }

  switchMode(mode: 'daily' | 'unlimited'): void {
    if (this.mode === mode && !this.loadFailed) return;
    this.mode = mode;
    this.newGame();
  }

  newGame(): void {
    this.loading = true;
    this.loadFailed = false;
    this.puzzle = null;
    this.tiles = [];
    this.selected = [];
    this.solvedGroups = [];
    this.mistakesLeft = ConnectionsComponent.MAX_MISTAKES;
    this.gameOver = false;
    this.won = false;
    this.message = '';
    this.guessRows = [];
    this.dailyResult = null;

    const request = this.mode === 'daily'
      ? this.connectionsService.dailyPuzzle()
      : this.connectionsService.newPuzzle();

    request.subscribe({
      next: (puzzle) => {
        this.puzzle = puzzle;
        if (this.mode === 'daily') {
          const saved = this.loadDailyResult();
          if (saved && puzzle.puzzleId && saved.puzzleId === puzzle.puzzleId) {
            // Already played today: show the summary, not the board.
            this.dailyResult = saved;
            this.won = saved.won;
            this.gameOver = true;
            this.revealAllGroups();
            this.loading = false;
            return;
          }
        }
        this.buildTiles(puzzle);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadFailed = true;
      },
    });
  }

  private buildTiles(puzzle: ConnectionsPuzzle): void {
    const tiles: ConnectionsTile[] = [];
    puzzle.groups.forEach((group, groupIndex) => {
      group.champions.forEach((name) => {
        tiles.push({
          name: name,
          groupIndex: groupIndex,
          imgUrl: Utils.default.placeImageURL(this.normalizeChampionName(name)),
          imgFailed: false,
        });
      });
    });
    this.tiles = this.shuffleArray(tiles);
  }

  // Same Data Dragon name normalization the game board uses.
  private normalizeChampionName(champ: string): string {
    let modified = champ.replaceAll(/\s/g, '').replaceAll(/'/g, '').replaceAll(/\./g, '');
    if (champ.includes("'")) {
      modified = modified.charAt(0).toUpperCase() + modified.slice(1).toLowerCase();
    }
    return modified;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const copy = [...array];
    for (let index = copy.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  shuffleTiles(): void {
    this.tiles = this.shuffleArray(this.tiles);
  }

  isSelected(tile: ConnectionsTile): boolean {
    return this.selected.includes(tile);
  }

  toggleTile(tile: ConnectionsTile): void {
    if (this.gameOver) return;
    const position = this.selected.indexOf(tile);
    if (position !== -1) {
      this.selected.splice(position, 1);
    } else if (this.selected.length < 4) {
      this.selected.push(tile);
    }
  }

  deselectAll(): void {
    this.selected = [];
  }

  submitGuess(): void {
    if (this.selected.length !== 4 || this.gameOver) return;

    this.guessRows.push(this.selected.map((tile) => GROUP_EMOJIS[tile.groupIndex]).join(''));

    const groupCounts = new Map<number, number>();
    this.selected.forEach((tile) => {
      groupCounts.set(tile.groupIndex, (groupCounts.get(tile.groupIndex) ?? 0) + 1);
    });
    const bestMatch = Math.max(...groupCounts.values());

    if (bestMatch === 4) {
      this.revealGroup(this.selected[0].groupIndex);
      this.selected = [];
      if (this.solvedGroups.length === 4) {
        this.finishGame(true);
      }
    } else {
      this.mistakesLeft--;
      if (this.mistakesLeft <= 0) {
        this.revealRemainingGroups();
        this.finishGame(false);
      } else {
        this.showMessage(bestMatch === 3 ? 'One away...' : 'Wrong guess!');
      }
    }
  }

  private finishGame(won: boolean): void {
    this.won = won;
    this.gameOver = true;
    this.showMessage(won ? 'You Won !' : 'You Lose !');
    if (this.mode === 'daily' && this.puzzle && this.puzzle.puzzleId) {
      const result: DailyResult = {
        puzzleId: this.puzzle.puzzleId,
        won: won,
        mistakesLeft: this.mistakesLeft,
        guessRows: this.guessRows,
      };
      this.dailyResult = result;
      this.saveDailyResult(result);
    }
  }

  private revealGroup(groupIndex: number): void {
    if (!this.puzzle) return;
    const group: ConnectionsGroup = this.puzzle.groups[groupIndex];
    this.solvedGroups.push({
      rule: group.rule,
      champions: group.champions,
      colorIndex: groupIndex,
    });
    this.tiles = this.tiles.filter((tile) => tile.groupIndex !== groupIndex);
  }

  private revealRemainingGroups(): void {
    if (!this.puzzle) return;
    this.selected = [];
    this.puzzle.groups.forEach((group, groupIndex) => {
      if (!this.solvedGroups.some((solved) => solved.colorIndex === groupIndex)) {
        this.revealGroup(groupIndex);
      }
    });
  }

  private revealAllGroups(): void {
    this.solvedGroups = [];
    this.tiles = [];
    this.revealRemainingGroups();
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
    const header = 'LoL Connections ' + this.dailyResult.puzzleId
      + (this.dailyResult.won ? ' ✅' : ' ❌');
    const text = header + '\n' + this.dailyResult.guessRows.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.showMessage('Copied to clipboard!');
    });
  }

  private showMessage(text: String): void {
    this.message = text;
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }
    this.messageTimeout = setTimeout(() => {
      this.message = '';
    }, 2500);
  }

  // "Region : Ionia" -> "Region: Ionia" for the solved-row label.
  formatRule(rule: string): string {
    return rule.replace(' : ', ': ');
  }

  mistakeDots(): number[] {
    return Array.from({ length: this.mistakesLeft }, (_, index) => index);
  }

  onImgError(tile: ConnectionsTile): void {
    tile.imgFailed = true;
  }

  redirectHomePage(): void {
    this.router.navigate(['/']);
  }
}
