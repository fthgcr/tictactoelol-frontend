import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, catchError, shareReplay, tap } from 'rxjs';
import { environment } from '../consts/environment';
import { DDRAGON_VERSION, PNG_URL } from '../consts/Consts';

@Injectable({
  providedIn: 'root'
})
export class LolChampionsExternalService {

  // Data Dragon's champion list is ~300kb and never changes during a session,
  // so the response is cached and replayed to every later subscriber.
  // refCount stays false so the cache survives after the last subscriber leaves
  // (the champions dialog is opened and closed repeatedly).
  private champions$?: Observable<any>;
  // Square icons run ~20-30kb each; warming the browser cache for the whole roster
  // the moment it is known (see preloadIcons below) means the champions guide - and
  // the in-game picker - never sit on a cold fetch later. Guarded so a second
  // subscriber replaying the cached list does not re-kick the same 170-odd requests.
  private iconsPreloaded = false;

  constructor(private http: HttpClient) { }

  /**
   * Data Dragon's roster, narrowed to the champions the server actually knows.
   *
   * Riot always serves the full live roster, so any champion we have not added to
   * the game's own data set would still show up in the picker - and the server
   * would reject the move while the player lost their turn. Intersecting the two
   * lists here means the picker can never offer an unplayable champion.
   *
   * If the server list cannot be fetched the raw Data Dragon response is used, so
   * a cold backend degrades to "slightly too many champions" rather than an empty
   * picker.
   */
  getChampions(): Observable<any> {
    if (!this.champions$) {
      const riot$ = this.http.get<any>(
        `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US/champion.json`);
      const known$ = this.http
        .get<string[]>(`${environment.apiURL}/champions/names`)
        .pipe(catchError(() => of<string[] | null>(null)));

      this.champions$ = forkJoin({ riot: riot$, known: known$ }).pipe(
        map(({ riot, known }) => {
          // Data Dragon 16.15.1 quietly ships a second, "Jade_"-prefixed entry for most
          // champions (an alternate-game-mode stat block, e.g. "Jade_Gragas" next to
          // "Gragas") with the same display name but a different square icon. Real
          // champion ids never contain an underscore, so dropping any key that does is
          // a safe, forward-compatible way to filter out that whole family - without it
          // every affected champion showed up twice in the picker, once per icon.
          const allowed = known && known.length > 0
            ? new Set(known.map(name => name.toLowerCase()))
            : null;
          const data: any = {};
          for (const [key, value] of Object.entries<any>(riot.data)) {
            if (key.includes('_')) {
              continue;
            }
            if (allowed && !allowed.has(String(value.name).toLowerCase())) {
              continue;
            }
            data[key] = value;
          }
          return { ...riot, data };
        }),
        tap(merged => this.preloadIcons(merged.data)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.champions$;
  }

  // Fires off the icon fetches and lets the browser's own HTTP cache hold them - no
  // need to keep the Image objects around, just to start each request early.
  private preloadIcons(data: Record<string, any>): void {
    if (this.iconsPreloaded) {
      return;
    }
    this.iconsPreloaded = true;
    for (const key of Object.keys(data)) {
      const img = new Image();
      img.src = `${PNG_URL}${key}.png`;
    }
  }
}
