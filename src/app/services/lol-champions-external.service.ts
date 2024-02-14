import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LolChampionsExternalService {

  constructor(private http: HttpClient) { }

  getChampions() {
    return this.http.get('https://ddragon.leagueoflegends.com/cdn/14.2.1/data/en_US/champion.json');
  }
}
