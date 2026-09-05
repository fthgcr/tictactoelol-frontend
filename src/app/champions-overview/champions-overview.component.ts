import { Component, OnInit } from '@angular/core';
import { Champion } from '../models/Champion';
import { LolChampionsExternalService } from '../services/lol-champions-external.service';
import * as Utils from '../consts/Consts';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-champions-overview',
  templateUrl: './champions-overview.component.html',
  styleUrl: './champions-overview.component.scss'
})
export class ChampionsOverviewComponent implements OnInit{

  constructor(private lolChampionsExternalService: LolChampionsExternalService, private dialogRef: MatDialogRef<ChampionsOverviewComponent>) {}

  champions: Champion[] = [];


  ngOnInit(): void {
    this.getChampions();
  }

  ngAfterViewInit() {
  }
  
  getChampions() {
    this.lolChampionsExternalService.getChampions().subscribe((result: any) => {
      let obj: Champion = new Champion();
      // The square icon (same asset the board and the picker already use) instead
      // of the full splash art: ~20-30kb instead of ~0.5mb, and by the time this
      // dialog opens the service has usually already warmed the browser cache for
      // every one of them (see LolChampionsExternalService.preloadIcons), so the
      // grid renders instantly instead of popping in card by card.
      for (const [key, value] of Object.entries(result.data)) {
        obj = new Champion();
        obj.name = (value as any).name;
        obj.png = Utils.default.placeImageURL(key);
        this.champions.push(obj);
      }
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
