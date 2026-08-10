import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, catchError, shareReplay } from 'rxjs';
import { environment } from '../consts/environment';
import { DDRAGON_VERSION } from '../consts/Consts';

@Injectable({
  providedIn: 'root'
})
export class LolChampionsExternalService {

  // Data Dragon's champion list is ~300kb and never changes during a session,
  // so the response is cached and replayed to every later subscriber.
  // refCount stays false so the cache survives after the last subscriber leaves
  // (the champions dialog is opened and closed repeatedly).
  private champions$?: Observable<any>;

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
          if (!known || known.length === 0) {
            return riot;
          }
          const allowed = new Set(known.map(name => name.toLowerCase()));
          const data: any = {};
          for (const [key, value] of Object.entries<any>(riot.data)) {
            if (allowed.has(String(value.name).toLowerCase())) {
              data[key] = value;
            }
          }
          return { ...riot, data };
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.champions$;
  }
}
