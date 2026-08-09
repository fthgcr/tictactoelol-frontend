import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../../services/session.service';
import * as Utils from '../../../consts/Consts';
import { GameSessionDTO } from '../../../models/GameSessionDTO';
import { GameSessionRequest } from '../../../models/GameSessionRequest';
import { GetIpService } from '../../../services/get-ip.service';
import { interval, Subscription } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-find-match',
  templateUrl: './find-match.component.html',
  styleUrl: './find-match.component.scss',
})
export class FindMatchComponent implements OnInit, OnDestroy {
  private messageSubscription: Subscription;
  private pollSubscription: Subscription;
  private redirecting = false;
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
    localStorage.setItem('fromMatchmaking', this.username.toString());
    this.sessionCreateOrJoin();
  }

  ngOnDestroy(): void {
    this.stopPolling();
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    // If we leave while still waiting (no opponent joined), delete the empty
    // session so the next matchmaker doesn't get paired with a ghost.
    if (!this.gameModel.secondPlayer && this.gameModel.firstPlayer === this.username && this.gameModel.uid) {
      this.quitSession();
    }
  }

  sessionCreateOrJoin() {
    this.sessionService.findMatch(this.username).subscribe((response) => {
      const tempModel = Utils.default.setPlayAreaArray(response, this.gameModel);
      if (tempModel && tempModel.uid) {
        this.gameModel = tempModel;
        // Store the matchmaking identity keyed by gameId so multiple tabs don't clobber each other.
        if (this.gameModel.gameId) {
          localStorage.setItem('matchmaking_' + this.gameModel.gameId, this.username.toString());
        }
        this.sessionService.initConnectionSocket();
        this.sessionService.joinGame(this.gameModel.gameId ?? "");
        this.listenForMessages();
        if (this.gameModel.secondPlayer) {
          // We are the joining (second) player: announce ourselves, then head into the game.
          setTimeout(() => {
            this.sessionService.playArea(this.gameModel.gameId ?? "", Utils.default.gameSessionToPlayRequest(this.gameModel, this.username, Utils.WS_SIGNAL_HEALTH_CHECK, ""));
            this.redirectGame(1500);
          }, 3000);
        } else {
          // We are waiting: poll as a fallback in case the one-shot WS broadcast is missed.
          this.startPolling();
        }
      }
    });
  }

  listenForMessages() {
    this.messageSubscription = this.sessionService.getMessageSubject().subscribe((messages: any) => {
      if (Array.isArray(messages) && messages.length > 0) {
        const latest = messages[messages.length - 1];
        if (latest && latest.secondPlayer) {
          this.gameModel = latest;
          this.redirectGame(1500);
        }
      }
    });
  }

  // Fallback: keep asking the server for the current session state until an
  // opponent shows up, independent of websocket broadcast timing.
  startPolling() {
    this.pollSubscription = interval(2000).subscribe(() => {
      const request = new GameSessionRequest();
      request.gameId = this.gameModel.gameId;
      request.playerIp = this.username;
      this.sessionService.healthCheckSession(request).subscribe((session) => {
        if (session && session.secondPlayer) {
          this.gameModel = session;
          this.redirectGame(1500);
        }
      });
    });
  }

  stopPolling() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  quitSession() {
    this.sessionService.quitSession(this.gameModel.uid ?? -1, this.username).subscribe();
  }

  redirectGame(timeoutMiliSeconds: number) {
    if (this.redirecting) {
      return;
    }
    this.redirecting = true;
    this.stopPolling();
    this.sessionService.disconnect();
    this.spinner = false;
    this.displayText = "Game Found !";
    setTimeout(() => {
      this.dialogRef.close();
      this.router.navigate(['/game', this.gameModel.gameId]);
    }, timeoutMiliSeconds);
  }

}
