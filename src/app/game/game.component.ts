import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GetIpService } from '../services/get-ip.service';
import { SessionService } from '../services/session.service';
import { MatDialog } from '@angular/material/dialog';
import { InputDialogComponent } from '../input-dialog/input-dialog.component';
import { ImageGame } from '../models/ImageGame';
import * as Utils from '../consts/Consts';
import { UserNameDialogComponent } from '../user-name-dialog/user-name-dialog.component';
import { CommonModule } from '@angular/common';
import { GameSessionRequest } from '../models/GameSessionRequest';
import { GameSession } from '../models/GameSession';
import { GameSessionDTO } from '../models/GameSessionDTO';
import { MatButtonModule } from '@angular/material/button';
import {
  MatSnackBar,
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef,
} from '@angular/material/snack-bar';
import { SnackbarComponent } from '../snackbar/snackbar.component';
import { GameAreaRequest } from '../models/GameAreaRequest';
import { interval, Subscription } from 'rxjs';
import { ChampionsOverviewComponent } from '../champions-overview/champions-overview.component';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
})
export class GameComponent implements OnInit, OnDestroy {
  @ViewChild('openModal') openModal: ElementRef;
  private messageSubscription: Subscription;
  private intervalSubscription: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private getipService: GetIpService,
    private sessionService: SessionService,
    private matDialog: MatDialog,
    private _snackBar: MatSnackBar
  ) {}

  userName: any;
  gameId: any;
  images: ImageGame[] = [];
  gameSessionRequest : GameSessionRequest = new GameSessionRequest();
  gameModel : GameSessionDTO = new GameSessionDTO();
  personalClicked: number[] = [];
  player : number = 0;
  isTurn: boolean = false;
  rules : String[] = [];
  timer: number = 45;
  selectedChamp : number = -1;
  gameOverText : String = "";

  ngOnInit() {
    //this.getUserName();
    this.setGameAreaEmpty();
    this.getParameter();
  }

  ngOnDestroy(): void {
    this.sessionService.disconnect();
    this.stopInterval();
  }

  listenerMessage(){
    this.sessionService.getMessageSubject().subscribe((message : any) => {
      //console.log("listenerMessage : " + JSON.stringify(message));
    });
  }

  getParameter() {
    this.route.paramMap.subscribe((params) => {
      this.gameId = params.get('gameId');
      this.gameSessionRequest.playerIp = this.getipService.generateRandomString(8);
      this.gameSessionRequest.gameId = this.gameId;
      this.sessionService.initConnectionSocket();
      this.sessionService.joinGame(this.gameId);
      this.listenForMessages();
      //this.listenerMessage();
      this.initializeSession();
      //this.createOrJoinGame();
      
    });
  }

  initializeSession(){
    this.sessionService.createOrJoinGame(this.gameSessionRequest).subscribe((response) => {
      const tempModel = Utils.default.setPlayAreaArray(response, this.gameModel);
      if(tempModel && tempModel.uid){
        this.gameModel = tempModel;
        this.player = this.gameModel.secondPlayer ? 1 : 0;
        setTimeout(() => {
          if(this.gameModel.secondPlayer){
            this.sessionService.playArea(this.gameId, Utils.default.gameSessionToPlayRequest(this.gameModel,-1, "", "", ""));
          }
        },3000);
        
      }
    });
  }

  listenForMessages() {
    this.messageSubscription = this.sessionService
      .getMessageSubject()
      .subscribe((messages: any) => {
        if(Array.isArray(messages) && messages.length > 0){
          this.gameModel = messages[messages.length - 1 ];
          
          if (!((this.gameModel.playAreaArray as any).includes("0")) && this.gameModel.gameStatus === -1){
            this.gameOverText = "Draw !";
            this.gameModel.gameStatus = 2;
            this.redirectHomePage();
          } else if(this.gameModel.gameStatus === -1){
            this.checkPersonalClick((this.gameModel.playAreaArray as any));
          } else {
            if(this.gameModel.gameStatus === this.player){
              this.gameOverText = "You Won !";
              this.redirectHomePage();
            } else {
              this.gameOverText = "You Lose !";
              this.redirectHomePage();
            }
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

  createOrJoinGame() {
    this.sessionService.createOrJoinGame(this.gameSessionRequest).subscribe((response) => {
        this.gameModel = Utils.default.setPlayAreaArray(response, new GameSessionDTO());
        this.player = this.gameModel.secondPlayer ? 1 : 0;
        //this.startInterval();
      },(error) => {
        console.error('Error in createOrJoinGame request: ', error);
      }
    );
  }

  //Clicked Game Area FROM Page
  gameAreaClick(index: number) {
    if (!this.images[index].isOpen || !this.isTurn || this.gameModel.gameStatus !== -1) return;
    var championSelectDialog = this.matDialog.open(InputDialogComponent, {
      width: '600px',
      height: '9%',
      data: { selectedChampions: this.gameModel.playAreaArray }
    });
    championSelectDialog.afterClosed().subscribe((result) => {
      if (result) {
        this.selectedChamp = index;
        this.setPlayArea(index, result);
      }
    });
  }

  //Check PersonalClick
  checkPersonalClick(gameArea : String []){
    if(gameArea[this.selectedChamp] !== null && gameArea[this.selectedChamp] !== "0" && this.selectedChamp !== -1){
      this.personalClicked.push(this.selectedChamp);
      if(this.checkWinCondition()){
        var tempModel = this.gameModel;
        tempModel.gameStatus = this.player;
        this.sessionService.playArea(this.gameId, Utils.default.gameSessionToPlayRequest(tempModel,-2, "", "", ""));
      }
    }
    this.selectedChamp = -1;
  }

  //Call Service for Set Play Area 
  setPlayArea(index: number, champ: String){
    this.isTurn = false;
    this.sessionService.playArea(this.gameId, Utils.default.gameSessionToPlayRequest(this.gameModel,index, champ, this.getHorizontalRule(index), this.getVerticalRule(index)));
  }

  placeImage(index: number, champ: String) {
    this.images[index].source = Utils.default.placeImageURL(champ);
    this.images[index].isOpen = false;
    this.images[index].style = Utils.default.placePngBorder(this.personalClicked.includes(index) ? 0 : 1);
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

  //Check Win Condition
  checkWinCondition(): boolean {

    if(this.personalClicked.length < 3){
      return false;
    }
    // Define winning combinations
    const winningCombinations = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontal
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Vertical
      [0, 4, 8], [2, 4, 6]             // Diagonal
    ];

    // Create a set of user moves for faster lookup
    const userMovesSet = new Set(this.personalClicked);

    // Check each winning combination
    for (const combination of winningCombinations) {
      const [a, b, c] = combination;
      if (userMovesSet.has(a) && userMovesSet.has(b) && userMovesSet.has(c)) {
        return true; // User has a winning combination
      }
    }

    return false; // No win condition met
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
    setTimeout(() => {
      this.router.navigate(['/']);
    },5000);
  }

  //Timer Section
  startInterval(): void {
    this.intervalSubscription = interval(1000).subscribe(() => {
      this.timer -= 1;
      if(this.timer === 0){
        this.matDialog.closeAll();
      }
      if(this.timer < -2){
         var tempModel = this.gameModel;
         tempModel.turn = tempModel.turn == 0 ? 1 : 0;
         this.sessionService.playArea(this.gameId, Utils.default.gameSessionToPlayRequest(tempModel,-2, "", "", ""));
      }
    });
  }

  stopInterval(): void {
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
    }
  }

  resetInterval(): void {
    this.timer = 45;
    this.stopInterval();
    this.startInterval();
  }

}
