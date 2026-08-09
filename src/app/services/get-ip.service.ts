import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GetIpService {

  constructor(private http: HttpClient) { }

  getIPAddress() {
    return this.http.get('https://api.ipify.org?format=json');
  }

  generateRandomString(length = 8): string {
    const characters = 'ABCDEGHJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  // Stable per-browser identity so a refresh/reconnect keeps the same player,
  // instead of generating a brand new id on every page load.
  getPersistentPlayerId(): string {
    if (typeof localStorage === 'undefined') {
      return this.generateRandomString(8);
    }
    let id = localStorage.getItem('playerId');
    if (!id) {
      id = this.generateRandomString(8);
      localStorage.setItem('playerId', id);
    }
    return id;
  }
}
