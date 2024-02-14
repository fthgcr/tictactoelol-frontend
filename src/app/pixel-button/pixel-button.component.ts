import { Component, Input, Output, EventEmitter, OnDestroy} from '@angular/core';


@Component({
  selector: 'app-pixel-button',
  templateUrl: './pixel-button.component.html',
  styleUrl: './pixel-button.component.scss'
})
export class PixelButtonComponent{

  @Input() buttonName: String = "";

  @Output() notify : EventEmitter<any> = new EventEmitter<any>(); 

  clickEvent(){
    this.notify.emit();
  }

  

}
