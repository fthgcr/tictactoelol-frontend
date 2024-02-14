import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../consts/environment';
import { GameSessionRequest } from '../models/GameSessionRequest';
import { GameAreaRequest } from '../models/GameAreaRequest';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { GameSession } from '../models/GameSession';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private stompClient : any;
  private messageSubject : BehaviorSubject<GameSession[]> = new BehaviorSubject<GameSession[]>([]);

  constructor(private http: HttpClient) { 
    this.initConnectionSocket();
  }

  

  createOrJoinGame(sessionRequest: GameSessionRequest): Observable<any> {
    return this.http.post<any>(`${environment.apiURL}/session/createOrJoinGame`, sessionRequest);
  }

  healthCheckSession(sessionRequest: GameSessionRequest): Observable<any> {
    return this.http.post<any>(`${environment.apiURL}/session/healthCheckSession`, sessionRequest);
  }

  setPlayArea(gameAreaRequest : GameAreaRequest): Observable<any> {
    return this.http.post<any>(`${environment.apiURL}/session/setPlayArea`, gameAreaRequest);
  }

  //Web Socket
  initConnectionSocket(){
    this.messageSubject = new BehaviorSubject<GameSession[]>([]);
    const socket = new SockJS(environment.wsURL);
    this.stompClient = Stomp.over(socket);
    this.stompClient.debug = function (){};
  }

  joinGame(gameId : String) {
    this.messageSubject.next([]);
    this.stompClient.connect({}, () => {
      this.stompClient.subscribe(`/topic/${gameId}` , (messages : any) => {
        const messageContent = JSON.parse(messages.body);
        const currentMessage = this.messageSubject.getValue();
        currentMessage.push(messageContent);
        this.messageSubject.next(currentMessage);
        //console.log("Join Game - Messages : " + JSON.stringify(messageContent));

      })
    })
  }

  playArea(gameId : String, gameAreaRequest : GameAreaRequest){
    this.stompClient.send(`/app/chat/${gameId}`, {}, JSON.stringify(gameAreaRequest));
  }

  getMessageSubject(){
    return this.messageSubject.asObservable();
  }

  disconnect() {
    if(this.stompClient){
      this.stompClient.disconnect(() => {
        //console.log('Disconnected from WebSocket');
      });
    }
  }


}