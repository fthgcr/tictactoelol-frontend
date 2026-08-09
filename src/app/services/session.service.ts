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

  // Connection state so we never send over a socket that isn't ready yet.
  private connected = false;
  private pendingActions : Array<() => void> = [];
  private currentTopic : String | null = null;
  private reconnectAttempts = 0;
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private static readonly RECONNECT_DELAY_MS = 3000;

  constructor(private http: HttpClient) {
    this.initConnectionSocket();
  }

  generateGameId(): Observable<string> {
    return this.http.get(`${environment.apiURL}/session/generateGameId`, { responseType: 'text' });
  }

  createOrJoinGame(sessionRequest: GameSessionRequest): Observable<any> {
    return this.http.post<any>(`${environment.apiURL}/session/createOrJoinGame`, sessionRequest);
  }

  healthCheckSession(sessionRequest: GameSessionRequest): Observable<any> {
    return this.http.post<any>(`${environment.apiURL}/session/healthCheckSession`, sessionRequest);
  }

  replaySession(gameId : String): Observable<any>{
    return this.http.get<any>(`${environment.apiURL}/session/replaySession/${gameId}`);
  }

  quitSession(sessionId : number): Observable<any>{
    return this.http.delete<any>(`${environment.apiURL}/session/quitSession/${sessionId}`);
  }

  // Keep only a short tail of messages. The game logic only ever looks at the
  // last two entries, so an unbounded array would just leak memory over a match.
  private static readonly MAX_BUFFERED_MESSAGES = 50;

  //Web Socket
  // Full reset: closes any existing socket, clears the message stream and opens a fresh socket.
  // Components call this before joinGame().
  initConnectionSocket(){
    this.disconnect();
    this.messageSubject = new BehaviorSubject<GameSession[]>([]);
    this.createSocket();
  }

  // Creates a new SockJS/STOMP client without touching the message stream.
  // Used both for the initial connection and for silent reconnects.
  private createSocket(){
    const socket = new SockJS(environment.wsURL);
    this.stompClient = Stomp.over(socket);
    this.connected = false;
  }

  joinGame(gameId : String) {
    this.currentTopic = gameId;
    this.reconnectAttempts = 0;
    this.messageSubject.next([]);
    this.connectAndSubscribe(gameId);
  }

  private connectAndSubscribe(gameId : String) {
    this.stompClient.connect({},
      () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.stompClient.subscribe(`/topic/${gameId}` , (messages : any) => {
          const messageContent = JSON.parse(messages.body);
          const currentMessage = this.messageSubject.getValue();
          currentMessage.push(messageContent);
          if (currentMessage.length > SessionService.MAX_BUFFERED_MESSAGES) {
            currentMessage.splice(0, currentMessage.length - SessionService.MAX_BUFFERED_MESSAGES);
          }
          this.messageSubject.next(currentMessage);
        });
        // Flush anything that was queued while the socket was still connecting.
        const actions = this.pendingActions;
        this.pendingActions = [];
        actions.forEach(action => action());
      },
      (error : any) => {
        this.connected = false;
        // Only retry if this is still the topic we care about (not an intentional disconnect).
        // Covers slow/cold backends (e.g. a spun-down Render instance) instead of hanging silently.
        if (this.currentTopic === gameId && this.reconnectAttempts < SessionService.MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          setTimeout(() => {
            if (this.currentTopic === gameId) {
              this.createSocket();
              this.connectAndSubscribe(gameId);
            }
          }, SessionService.RECONNECT_DELAY_MS);
        }
      }
    );
  }

  playArea(gameId : String, gameAreaRequest : GameAreaRequest){
    const send = () => this.stompClient.send(`/app/chat/${gameId}`, {}, JSON.stringify(gameAreaRequest));
    if (this.connected) {
      send();
    } else {
      // Not connected yet: run it as soon as the connection is established.
      this.pendingActions.push(send);
    }
  }

  getMessageSubject(){
    return this.messageSubject.asObservable();
  }

  disconnect() {
    this.connected = false;
    this.pendingActions = [];
    this.currentTopic = null;
    if(this.stompClient){
      try {
        this.stompClient.disconnect(() => {
          //console.log('Disconnected from WebSocket');
        });
      } catch (e) {
        // Client was never fully connected; nothing to close.
      }
    }
  }

  //Find Match
  findMatch(username : String): Observable<any>{
    return this.http.get<any>(`${environment.apiURL}/session/findMatch/${username}`);
  }


}

