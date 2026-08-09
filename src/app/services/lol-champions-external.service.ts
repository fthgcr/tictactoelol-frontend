import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

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

  getChampions(): Observable<any> {
    if (!this.champions$) {
      this.champions$ = this.http
        .get('https://ddragon.leagueoflegends.com/cdn/14.2.1/data/en_US/champion.json')
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.champions$;
  }
}
