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
      for (const [key, value] of Object.entries(result.data)) {
        obj = new Champion();
        obj.name = (value as any).name;
        obj.png = Utils.default.placeSplashURL(key.replace(/\s/g, ""));
        this.champions.push(obj);
      }
    });
  }

  closeDialog() {
    this.dialogRef.close();
  }
}
