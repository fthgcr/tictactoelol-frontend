import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../consts/environment';
import { ConnectionsPuzzle } from '../models/ConnectionsPuzzle';

@Injectable({
  providedIn: 'root'
})
export class ConnectionsService {

  constructor(private http: HttpClient) { }

  newPuzzle(): Observable<ConnectionsPuzzle> {
    return this.http.get<ConnectionsPuzzle>(`${environment.apiURL}/connections/newPuzzle`);
  }

  dailyPuzzle(): Observable<ConnectionsPuzzle> {
    return this.http.get<ConnectionsPuzzle>(`${environment.apiURL}/connections/dailyPuzzle`);
  }
}
