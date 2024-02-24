import { Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../../services/session.service';
import * as Utils from '../../../consts/Consts';
import { GameSessionDTO } from '../../../models/GameSessionDTO';
import { GetIpService } from '../../../services/get-ip.service';
import { Subscription } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-find-match',
  templateUrl: './find-match.component.html',
  styleUrl: './find-match.component.scss',
})
export class FindMatchComponent implements OnInit, OnDestroy {
  private messageSubscription: Subscription;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private getipService: GetIpService,
    private dialogRef: MatDialogRef<FindMatchComponent>
  ) { }

  gameModel: GameSessionDTO = new GameSessionDTO();
  spinner: boolean = true;
  displayText = "Finding Match...";
  username: String;

  ngOnInit() {
    
    this.username = this.getipService.generateRandomString(8);
    localStorage.setItem('fromMatchmaking',this.username.toString());
    this.sessionCreateOrJoin();
  }

  ngOnDestroy(): void {
    
    if(!this.gameModel.secondPlayer && this.gameModel.firstPlayer === this.username){
      //this.quitSession();
    }
  }

  sessionCreateOrJoin() {
    this.sessionService.findMatch(this.username).subscribe((response) => {
      const tempModel = Utils.default.setPlayAreaArray(response, this.gameModel);
      if (tempModel && tempModel.uid) {
        this.gameModel = tempModel;
        this.sessionService.initConnectionSocket();
        this.sessionService.joinGame(this.gameModel.gameId ?? "");
        this.listenForMessages();
        if (this.gameModel.secondPlayer) {
          
          setTimeout(() => {
            this.sessionService.playArea(this.gameModel.gameId ?? "", Utils.default.gameSessionToPlayRequest(this.gameModel, -1, "", "", ""));
            this.redirectGame(1500);
          }, 3000);
          
        }
      }
    });
  }

  listenForMessages() {
    this.messageSubscription = this.sessionService.getMessageSubject().subscribe((messages: any) => {
      if (Array.isArray(messages) && messages.length > 0) {
        this.gameModel = messages[messages.length - 1];
        if (this.gameModel.secondPlayer) {
          
          this.redirectGame(1500);
        }
      }
    });
  }

  quitSession() {
    //TODO: Bakılacak
    this.sessionService.quitSession(this.gameModel.uid ?? -1).subscribe(result => {
      
    });
  }

  redirectGame(timeoutMiliSeconds : number){
    this.sessionService.disconnect();
    this.spinner = false;
    this.displayText = "Game Found !";
    setTimeout(() => {
      this.dialogRef.close();
      this.router.navigate(['/game', this.gameModel.gameId]);
    }, timeoutMiliSeconds);
    
  }

}
