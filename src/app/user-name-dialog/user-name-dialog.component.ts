import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PixelButtonComponent } from '../pixel-button/pixel-button.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-name-dialog',
  templateUrl: './user-name-dialog.component.html',
  styleUrl: './user-name-dialog.component.scss',
})
export class UserNameDialogComponent {
  @Output() notify : EventEmitter<any> = new EventEmitter<any>(); 
  @ViewChild('closeModal') closeModal: ElementRef;

  clickEvent(){
    this.notify.emit();
  }

  validationCheck : boolean = false;
  playerName: string = "";
  

  validateName(){
    if(!this.playerName || this.playerName === ""){
      this.validationCheck = true;
      return;
    }

    localStorage.setItem('Username', this.playerName);
    const anchorElement: HTMLElement = this.closeModal.nativeElement;
    anchorElement.click();
    this.notify.emit(this.playerName);
  }

  checkName(){
    this.validationCheck = false;
  }
}
