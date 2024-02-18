import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { Router } from '@angular/router';
import { SessionService } from '../services/session.service';

@Component({
  selector: 'app-replay-dialog',
  templateUrl: './replay-dialog.component.html',
  styleUrl: './replay-dialog.component.scss',
  animations: [
    trigger('slowAnimate', [
      transition(':enter', [style({opacity: '0'}), animate(1000)]),
      transition(':leave', [style({opacity: '1'}), animate(1000, style({opacity: '0'}))]),
    ])
  ]
})
export class ReplayDialogComponent implements OnInit{

  constructor(@Inject(MAT_DIALOG_DATA) public gameId: String,
  private ref: MatDialogRef<ReplayDialogComponent>,
  private router: Router,
  private sessionService: SessionService){}

  public stateAnimate: boolean;

  ngOnInit(): void {
    this.stateAnimate = true;
  }

  replay(){
    this.sessionService.replaySession(this.gameId).subscribe((response) => {
      this.ref.close();
      this.router.navigate(['/gam', this.gameId]);
    })
  }

  quit(){
    this.stateAnimate = false;
    setTimeout(() => {
      this.ref.close();
      this.router.navigate(['/']);
    }, 1500);
  }


}
