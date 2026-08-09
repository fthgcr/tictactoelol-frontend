import { Component, ElementRef, OnDestroy, OnInit, Renderer2, TemplateRef, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GetIpService } from '../../../services/get-ip.service';
import { SessionService } from '../../../services/session.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { InputDialogComponent } from '../../tools/input-dialog/input-dialog.component';
import { ImageGame } from '../../../models/ImageGame';
import * as Utils from '../../../consts/Consts';
import { UserNameDialogComponent } from '../../tools/user-name-dialog/user-name-dialog.component';
import { CommonModule } from '@angular/common';
import { GameSessionRequest } from '../../../models/GameSessionRequest';
import { GameSession } from '../../../models/GameSession';
import { GameSessionDTO } from '../../../models/GameSessionDTO';
import { MatButtonModule } from '@angular/material/button';
import {
  MatSnackBar,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef,
} from '@angular/material/snack-bar';
import { SnackbarComponent } from '../../tools/snackbar/snackbar.component';
import { GameAreaRequest } from '../../../models/GameAreaRequest';
import { interval, Subscription } from 'rxjs';
import { ChampionsOverviewComponent } from '../../../champions-overview/champions-overview.component';
import { LolChampionsExternalService } from '../../../services/lol-champions-external.service';
import { Champion } from '../../../models/Champion';
import { ReplayDialogComponent } from '../../tools/replay-dialog/replay-dialog.component';
import { ScoreBoard } from '../../../models/ScoreBoard';
import { ScoreBoardService } from '../../../services/score-board.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
})
export class GameComponent implements OnInit, OnDestroy {
  @ViewChild('openModal') openModal: ElementRef;
  private messageSubscription: Subscription;
  private intervalSubscription: Subscription;
  private routeSubscription: Subscription;
  private styleElement: HTMLStyleElement;
  // Status of the round we have already reacted to. Keeps the score to one point per
  // finished game and lets a rematch (finished -> active) be detected.
  private handledGameStatus: number = -1;
  private gameOverDialogRef?: MatDialogRef<ReplayDialogComponent>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private getipService: GetIpService,
    private sessionService: SessionService,
    private matDialog: MatDialog,
    private _snackBar: MatSnackBar,
    private lolChampionsExternalService: LolChampionsExternalService,
    private renderer: Renderer2,
    private scoreBoardService : ScoreBoardService
  ) {}

  userName: any;
  gameId: any;
  images: ImageGame[] = [];
  gameSessionRequest : GameSessionRequest = new GameSessionRequest();
  gameModel : GameSessionDTO = new GameSessionDTO();
  player : number = 0;
  isTurn: boolean = false;
  rules : String[] = [];
  timer: number = 30;
  gameOverText : String = "";
  champions: Champion[] = [];
  leavePageParameter : String = "";
  scoreBoard : ScoreBoard = new ScoreBoard("");
  isCursorPointer: boolean = false;

  ngOnInit() {
    //this.getUserName();
    this.changeBackground(true);
    this.getChampions();
    this.setGameAreaEmpty();
    this.getParameter();
  }

  ngOnDestroy(): void {
    this.sessionService.disconnect();
    this.stopInterval();
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  listenerMessage(){
    this.sessionService.getMessageSubject().subscribe((message : any) => {
      //console.log("listenerMessage : " + JSON.stringify(message));
    });
  }

  getParameter() {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.gameId = params.get('gameId');
      this.scoreBoard = this.scoreBoardService.getScoreBoard(this.gameId);
      this.sessionService.initConnectionSocket();
      this.sessionService.joinGame(this.gameId);
      this.listenForMessages();
      //this.listenerMessage();
      if(Utils.default.isMatchmaking(this.gameId)){
        // Per-game key first (multi-tab safe), fall back to the legacy single key.
        this.gameSessionRequest.playerIp = (localStorage.getItem('matchmaking_' + this.gameId) ?? localStorage.getItem('fromMatchmaking'))?.toString();
        this.gameSessionRequest.gameId = this.gameId;
        this.getMatchmaking();
      } else {
        this.gameSessionRequest.playerIp = this.getipService.getPersistentPlayerId();
        this.gameSessionRequest.gameId = this.gameId;
        this.initializeSession();
      }
      
      
    });
  }

  // 0 = first player, 1 = second player, -1 = spectator. Derived from our own id
  // rather than from "is there a second player yet", which used to demote the host
  // to player 1 whenever they reloaded a game that had already been joined - and
  // handed anyone opening the link a player seat that the server would not honour.
  private resolvePlayer(){
    const me = this.gameSessionRequest.playerIp;
    if(me && this.gameModel.firstPlayer === me){
      this.player = 0;
    } else if(me && this.gameModel.secondPlayer === me){
      this.player = 1;
    } else {
      this.player = -1;
    }
  }

  get isSpectator(): boolean {
    return this.player === -1;
  }

  getMatchmaking(){
    this.sessionService.healthCheckSession(this.gameSessionRequest).subscribe(gameSession => {
      this.gameModel = gameSession;
      setTimeout(() => {
        this.resolvePlayer();
        this.isTurn = this.player === this.gameModel.turn;
        if(this.gameModel.secondPlayer && this.gameModel.secondPlayer === this.gameSessionRequest.playerIp){
          this.sessionService.playArea(this.gameId, Utils.default.gameSessionToPlayRequest(this.gameModel, this.gameSessionRequest.playerIp, Utils.WS_SIGNAL_HEALTH_CHECK, ""));
        }
      },3000);
    })
  }

  initializeSession(){
    this.sessionService.createOrJoinGame(this.gameSessionRequest).subscribe((response) => {
      const tempModel = Utils.default.setPlayAreaArray(response, this.gameModel);
      if(tempModel && tempModel.uid){
        this.gameModel = tempModel;
        this.resolvePlayer();
        setTimeout(() => {
          if(this.gameModel.secondPlayer){
            this.sessionService.playArea(this.gameId, Utils.default.gameSessionToPlayRequest(this.gameModel, this.gameSessionRequest.playerIp, Utils.WS_SIGNAL_HEALTH_CHECK, ""));
          }
        },2000);
        
      }
    });
  }

  listenForMessages() {
    this.messageSubscription = this.sessionService
      .getMessageSubject()
      .subscribe((messages: any) => {
        if(Array.isArray(messages) && messages.length > 0){
          // The server answers with an empty body when the session is gone (for example
          // swept by the TTL job); there is nothing to render from that.
          const latest = messages[messages.length - 1];
          if(!latest){
            return;
          }
          const previousStatus = this.handledGameStatus;
          this.gameModel = latest;
          // Re-read our seat from every session: someone who arrives while the two
          // seats are still filling can legitimately become a player, and everyone
          // after that stays a spectator.
          this.resolvePlayer();
          const status = this.gameModel.gameStatus;

          // A finished round turning active again means a rematch was started - by us or
          // by the opponent - so clear everything the previous round left on screen.
          if(previousStatus !== -1 && status === -1){
            this.startNewRound();
          }

          // Game status is fully server-authoritative: -1 active, 0/1 winner, 2 draw.
          // Only the move into a finished state is handled. Later broadcasts on an
          // already finished session (health checks, a late skip signal, the opponent's
          // replay request) must not score again or stack a second dialog.
          if(status !== -1 && previousStatus === -1){
            if(status === 2){
              this.gameOverText = "Draw !";
            } else if(this.isSpectator){
              // Neutral wording: "You Won" means nothing to someone who is watching.
              this.gameOverText = `Player ${status + 1} Wins !`;
            } else if(status === this.player){
              this.scoreBoardService.updateScoreBoard(this.gameId, true);
              this.gameOverText = "You Won !";
            } else {
              this.scoreBoardService.updateScoreBoard(this.gameId, false);
              this.gameOverText = "You Lose !";
            }
            this.stopInterval();
            // Spectators see the result banner but get no Replay/Quit prompt - only the
            // two players may start a rematch, and the server enforces that as well.
            if(!this.isSpectator){
              this.openGameOverDialog();
            }
          }
          this.handledGameStatus = status;

          // Rules are regenerated for every rematch, so they are read from each session
          // rather than only from the first message.
          if(this.gameModel.gameRule){
            this.rules = this.gameModel.gameRule.split(',');
          }

          // A wrong answer is "the turn moved on but the board did not". Requiring the
          // turn to have actually changed keeps echoes of the same state - health checks
          // and rematch broadcasts - from firing a bogus message.
          if(messages.length >= 2 && status === -1) {
            const previous = messages[messages.length - 2];
            const boardUnchanged = Utils.default.areArraysEqual(this.gameModel.playAreaArray, previous.playAreaArray);
            const turnMoved = previous.turn !== this.gameModel.turn;
            if(this.player !== this.gameModel.turn && boardUnchanged && turnMoved){
              this.callSnackBar(this.timer > 0 ? "Your answer is wrong! Your Opponent's Turn."
                                               : "Time is up! Your Opponent's Turn.", 2500);
            }
          }
          //Change Turn - never our turn once the round is over
          this.isTurn = status === -1 && this.player === this.gameModel.turn;
          if(this.isTurn) {
            this.changeBackground(false);
            this.resetInterval();
          } else {
            this.stopInterval();
          }

          //Set Play Area Images
          for(let index = 0; index < 9; index++){
            if(this.gameModel && this.gameModel.playAreaArray && this.gameModel.playAreaArray[index] !== "0"){
              this.placeImage(index, this.gameModel.playAreaArray[index])
            }
          }
        }
      });
  }

  //Clicked Game Area FROM Page
  gameAreaClick(index: number) {
    if (!this.images[index].isOpen || !this.isTurn || this.gameModel.gameStatus !== -1 || this.timer < 1)  return;
    var championSelectDialog = this.matDialog.open(InputDialogComponent, {
      width: '600px',
      height: '9%',
      data: this.filterChampion()
    });
    championSelectDialog.afterClosed().subscribe((result) => {
      if (result) {
        this.setPlayArea(index, result);
      }
    });
  }

  //Call Service for Set Play Area
  setPlayArea(index: number, champ: String){
    this.isTurn = false;
    this.sessionService.playArea(this.gameId, Utils.default.gameSessionToPlayRequest(this.gameModel, this.gameSessionRequest.playerIp, index, champ));
  }

  placeImage(index: number, champ: String) {
    this.images[index].source = Utils.default.championImageURL(champ);
    this.images[index].isOpen = false;
    // Border color comes from server-side cell ownership. For a player blue is their
    // own; a spectator has no side, so blue is simply the first player.
    const owner = this.gameModel.cellOwnersArray ? this.gameModel.cellOwnersArray[index] : undefined;
    const blueSide = this.isSpectator ? 0 : this.player;
    this.images[index].style = Utils.default.placePngBorder(owner === String(blueSide) ? 0 : 1);
  }

  setGameAreaEmpty() {
    for (let index = 0; index < 9; index++) {
      this.images[index] = new ImageGame();
    }
  }

  //Split Rules
  splitRule(rule : String, before: boolean) : String{
    if(rule){
      const parts = rule.split(' : ');
      return before ? parts[0] : parts[1];
    } else return "";
    
  }

  //May be delete
  navigate(){
    var championSelectDialog = this.matDialog.open(UserNameDialogComponent, {
      width: '600px',
      height: '35%',
      
    });
    championSelectDialog.afterClosed().subscribe((result) => {
      if (result) {
        //console.log(result);
      }
    });
  }

  //Rules
  getVerticalRule(index : number) : String{
    if(index === 0 || index === 3 || index === 6){
      return this.rules[0];
    } else if(index === 1 || index === 4 || index === 7){
      return this.rules[1];
    } else if(index === 2 || index === 5 || index === 8){
      return this.rules[2];
    } else {
      return "";
    }
  }

  getHorizontalRule(index : number) : String{
    if(index === 0 || index === 1 || index === 2){
      return this.rules[3];
    } else if(index === 3 || index === 4 || index === 5){
      return this.rules[4];
    } else if(index === 6 || index === 7 || index === 8){
      return this.rules[5];
    } else {
      return "";
    }
  }

  //snackBar
  callSnackBar(message: String, duration: number){
    const data = { message: message};
        this._snackBar.openFromComponent(SnackbarComponent, {
          duration: duration,
          data: data
        });
  }

  //Buttons
  // Two ways to invite: a URL the opponent can paste straight into the address bar,
  // or the bare id for the "Join Game" box on the main menu. Copying the id as if it
  // were a link is what used to send people to a 404.
  copyInviteLink(){
    this.copyToClipboard(`${window.location.origin}/game/${this.gameId}`, "Invite link copied !");
  }

  copyGameId(){
    this.copyToClipboard(this.gameId, "Game ID copied !");
  }

  private copyToClipboard(value: String, message: String){
    navigator.clipboard.writeText(value.toString())
      .then(() => {
        this.callSnackBar(message, 2000);
      })
      .catch(() => {
        this.callSnackBar("Could not access the clipboard.", 2000);
      })
  }

  openInfoPage(){
    this.router.navigate(['/howto']);
  }

  openChampionsGuide(){
    const dialogRef = this.matDialog.open(ChampionsOverviewComponent, {
      panelClass:'icon-outside',
    });
  }

  redirectHomePage(){
    this.router.navigate(['/']);
  }

  //Timer Section
  startInterval(): void {
    this.intervalSubscription = interval(1000).subscribe(() => {
      this.timer -= 1;
      // Closing the champion picker on timeout must not also close the game over dialog.
      if(this.timer === 0 && this.gameModel.gameStatus === -1){
        this.matDialog.closeAll();
      }
      if(this.timer < -1){
        if(this.gameModel.gameStatus !== -1 || !this.isTurn){
          // Round is over, or the turn already moved on: there is nothing left to skip.
          // Without this the loser's timer kept firing skip signals once per second.
          this.stopInterval();
          return;
        }
        // Ask the server to skip our turn; it validates that we really are the turn holder.
        this.sessionService.playArea(this.gameId, Utils.default.gameSessionToPlayRequest(this.gameModel, this.gameSessionRequest.playerIp, Utils.WS_SIGNAL_SKIP_TURN, ""));
      }
    });
  }

  stopInterval(): void {
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
  }

  resetInterval(): void {
    this.timer = 30;
    this.stopInterval();
    this.startInterval();
  }

  //Champions Data 
  getChampions() {
    this.lolChampionsExternalService.getChampions().subscribe((result: any) => {
      let obj: Champion = new Champion();
      for (const [key, value] of Object.entries(result.data)) {
        obj = new Champion();
        obj.name = (value as any).name;
        obj.png = Utils.default.placeImageURL(key);
        this.champions.push(obj);
      }
    });
  }

  // Returns a filtered copy for the picker; the master champions list is left intact
  // so already-placed champions can still be filtered correctly on the next turn.
  filterChampion(): Champion[] {
    return this.champions.filter(item => item.name && !this.gameModel.playAreaArray.includes(item.name));
  }

  //Replay Section
  openGameOverDialog(){
    // Guard against a second dialog stacking on top of the first one.
    if(this.gameOverDialogRef){
      return;
    }
    this.gameOverDialogRef = this.matDialog.open(ReplayDialogComponent, {
      panelClass:'icon-outside',
      data: this.gameId
    });
    this.gameOverDialogRef.afterClosed().subscribe((result: any) => {
      this.gameOverDialogRef = undefined;
      if(result === 'replay'){
        // The rematch is a server-side reset broadcast to both players, so the
        // opponent's board resets at the same moment ours does.
        this.sessionService.playArea(this.gameId, Utils.default.gameSessionToPlayRequest(this.gameModel, this.gameSessionRequest.playerIp, Utils.WS_SIGNAL_REPLAY, ""));
      }
    });
  }

  // Clears everything the finished round left behind before the new one is rendered.
  private startNewRound(){
    if(this.gameOverDialogRef){
      this.gameOverDialogRef.close();
    }
    this.gameOverText = "";
    this.setGameAreaEmpty();
    this.timer = 30;
  }

  //Confirm Exit Game
  openDialogWithTemplateRef(templateRef: TemplateRef<any>, whichPage: String) {
    this.leavePageParameter = whichPage;
    this.matDialog.open(templateRef);
  }

  //Close all dialogs
  closeDialogs(){
    this.matDialog.closeAll();
  }

  //Leave Page
  leavePage(){
    this.closeDialogs();
    if(this.leavePageParameter === "Info"){
      this.openInfoPage();
    } else {
      this.redirectHomePage();
    }
  }

  //Body Background
  changeBackground(isDefault : boolean){
    if (!isDefault) {
      const keyframes = `
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `;

      const background = `
        body {
          background: linear-gradient(-45deg, #4b658496, #4b658496, #00bfb3, #00bfb3);
          background-size: 400% 400%;
          animation: gradient 3s ease infinite;
          height: 100vh;
        }
      `;

      const styles = keyframes + background;

      this.styleElement = this.renderer.createElement('style');
      this.renderer.appendChild(this.styleElement, this.renderer.createText(styles));
      this.renderer.appendChild(document.head, this.styleElement);
      setTimeout(() => {
        this.changeBackground(true);
      },3000);
    } else {
      if (this.styleElement && this.styleElement.parentNode) { // Check parentNode existence before removal
        this.renderer.removeChild(document.head, this.styleElement);
      }
    }
  }

  setCursorCondition(condition: boolean, index : number){
    // Nothing is clickable when it is not our turn, so do not advertise it as such.
    if(this.images[index].source === "" && condition && this.isTurn){
      this.isCursorPointer = true;
    } else {
      this.isCursorPointer = false;
    }

  }




}
