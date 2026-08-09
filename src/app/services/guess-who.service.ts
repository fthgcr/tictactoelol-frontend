import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../consts/environment';
import { GuessWhoPuzzle } from '../models/GuessWhoPuzzle';

@Injectable({
  providedIn: 'root'
})
export class GuessWhoService {

  constructor(private http: HttpClient) { }

  newPuzzle(): Observable<GuessWhoPuzzle> {
    return this.http.get<GuessWhoPuzzle>(`${environment.apiURL}/guesswho/newPuzzle`);
  }

  dailyPuzzle(): Observable<GuessWhoPuzzle> {
    return this.http.get<GuessWhoPuzzle>(`${environment.apiURL}/guesswho/dailyPuzzle`);
  }
}
