import { Component, ElementRef, OnDestroy, OnInit, Renderer2, TemplateRef, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GetIpService } from '../../../services/get-ip.service';
import { SessionService } from '../../../services/session.service';
import { MatDialog } from '@angular/material/dialog';
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

  getMatchmaking(){
    this.sessionService.healthCheckSession(this.gameSessionRequest).subscribe(gameSession => {
      this.gameModel = gameSession;
      setTimeout(() => {
        this.player = this.gameModel.secondPlayer === this.gameSessionRequest.playerIp ? 1 : 0;
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
        this.player = this.gameModel.secondPlayer ? 1 : 0;
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
          this.gameModel = messages[messages.length - 1 ];

          // Game status is fully server-authoritative: -1 active, 0/1 winner, 2 draw.
          if(this.gameModel.gameStatus === 2){
            this.gameOverText = "Draw !";
            this.openGameOverDialog();
          } else if(this.gameModel.gameStatus !== -1){
            if(this.gameModel.gameStatus === this.player){
              this.scoreBoardService.updateScoreBoard(this.gameId, true);
              this.gameOverText = "You Won !";
            } else {
              this.scoreBoardService.updateScoreBoard(this.gameId, false);
              this.gameOverText = "You Lose !";
            }
            this.openGameOverDialog();
          }

          //Set Rules Init
          if(messages.length < 2) {
             this.rules = this.gameModel.gameRule.split(',');
          } else {
            if(this.player !== this.gameModel.turn && Utils.default.areArraysEqual(this.gameModel.playAreaArray, messages[messages.length - 2 ].playAreaArray) && this.timer > 0 && this.gameModel.gameStatus === -1){
              this.callSnackBar("Your answer is wrong! Your Opponent's Turn.", 2500);
            } else if(this.player !== this.gameModel.turn && Utils.default.areArraysEqual(this.gameModel.playAreaArray, messages[messages.length - 2 ].playAreaArray) && this.timer < 1){
              this.callSnackBar("Time is up! Your Opponent's Turn.", 2500);
            }
          }
          //Change Turn
          this.isTurn = this.player === this.gameModel.turn;
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
    let modifiedChamp = champ.replaceAll(/\s/g, '').replaceAll(/'/g, '').replaceAll(/\./g, '');
    if(champ.includes("'")){
      modifiedChamp = modifiedChamp.charAt(0).toUpperCase() + modifiedChamp.slice(1).toLowerCase();
    }
    this.images[index].source = Utils.default.placeImageURL(modifiedChamp);
    this.images[index].isOpen = false;
    // Border color comes from server-side cell ownership (blue = mine, red = opponent).
    const owner = this.gameModel.cellOwnersArray ? this.gameModel.cellOwnersArray[index] : undefined;
    this.images[index].style = Utils.default.placePngBorder(owner === String(this.player) ? 0 : 1);
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
  clipBoard(message: String){
    navigator.clipboard.writeText(this.gameId)
      .then(() => {
        this.callSnackBar(message, 2000);
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
      if(this.timer === 0){
        this.matDialog.closeAll();
      }
      if(this.timer < -1){
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
    const dialogRef = this.matDialog.open(ReplayDialogComponent, {
      panelClass:'icon-outside',
      data: this.gameId
    });

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
    if(this.images[index].source === "" && condition){
      this.isCursorPointer = true;
    } else {
      this.isCursorPointer = false;
    }

  }




}
