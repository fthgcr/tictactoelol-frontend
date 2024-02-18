import { Component, ElementRef  } from '@angular/core';

@Component({
  selector: 'app-how-to-play',
  templateUrl: './how-to-play.component.html',
  styleUrl: './how-to-play.component.scss'
})
export class HowToPlayComponent {

  constructor(private elementRef: ElementRef){}
  isSearchActive: boolean = false;

  toggleSearch(): void {
    this.isSearchActive = !this.isSearchActive;
    if (this.isSearchActive) {
      setTimeout(() => {
        const inputElement = this.elementRef.nativeElement.querySelector('.input-search') as HTMLInputElement;
        inputElement.focus();
      });
    }
  }

  closeSearch(): void {
    this.isSearchActive = false;
  }
}
