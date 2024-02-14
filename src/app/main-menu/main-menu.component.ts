import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GetIpService } from '../services/get-ip.service';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as Utils from '../consts/Consts';
import { CommonModule } from '@angular/common';
import { PixelButtonComponent } from '../pixel-button/pixel-button.component';
import { MatDialog } from '@angular/material/dialog';
import { UserNameDialogComponent } from '../user-name-dialog/user-name-dialog.component';

@Component({
  selector: 'app-main-menu',
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.scss'
  
})
export class MainMenuComponent{
  @ViewChild('openModal') openModal: ElementRef;
  constructor(private getipService: GetIpService, 
    private router: Router,
    private matDialog: MatDialog) {}

  private gameId: String = '';
  spinner: boolean = false;

  openNameDialog() {
    const anchorElement: HTMLElement = this.openModal.nativeElement;
    anchorElement.click();
  }

  createGame() {
    //localStorage.setItem('UserName', event);
    this.openGamePage(this.getipService.generateRandomString(8) + this.getDayInfo());
  }

  openGamePage(gameId : String){
    this.changeSpinner();
    setTimeout(() => {
      this.gameId = gameId;
      this.changeSpinner();
      this.router.navigate(['/game', this.gameId]);
    }, 1500);
  }

  getDayInfo(): String {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return day + month + hours + minutes + seconds;
  }

  backgroundOverlay(){
    return Utils.default.spinnerOverlay(this.spinner);
  }

  changeSpinner(){
    this.spinner = !this.spinner;
    this.backgroundOverlay();
  }

  openJoinGameModal(){
    this.openNameDialog();
  }

  joinGame(event : any){
    this.openGamePage(event)
  }

  openInfoPage(){
    this.router.navigate(['/howto']);
  }
}
