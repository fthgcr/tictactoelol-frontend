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
  private router: Router){}

  public stateAnimate: boolean;

  ngOnInit(): void {
    this.stateAnimate = true;
  }

  // The rematch itself is handled by GameComponent, which sends it over the websocket
  // so the server resets the one shared session and both players are told about it.
  // This dialog used to call the HTTP endpoint and navigate away on its own, which
  // recreated the session for one player only - and deleted it for the other.
  replay(){
    this.ref.close('replay');
  }

  quit(){
    this.stateAnimate = false;
    setTimeout(() => {
      this.ref.close();
      this.router.navigate(['/']);
    }, 1500);
  }


}
