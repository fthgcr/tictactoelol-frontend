import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { LolChampionsExternalService } from '../services/lol-champions-external.service';
import { Champion } from '../models/Champion';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  MatAutocomplete,
  MatAutocompleteModule,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import * as Utils from '../consts/Consts';

@Component({
  selector: 'app-input-dialog',
  templateUrl: './input-dialog.component.html',
  styleUrl: './input-dialog.component.scss',
})
export class InputDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('inputAutoComplete', { read: MatAutocompleteTrigger })
  autocompleteTrigger: MatAutocompleteTrigger;

  myForm = new FormGroup({
    stateCtrl: new FormControl(''),
  });
  stateCtrl = new FormControl('');
  filteredStates: Observable<any[]>;

  constructor(
    private lolChampionsExternalService: LolChampionsExternalService,
    @Inject(MAT_DIALOG_DATA) public pickedChampions: any[],
    private ref: MatDialogRef<InputDialogComponent>
  ) {
    this.filteredStates = this.stateCtrl.valueChanges.pipe(
      startWith(''),
      map((state) =>
        state ? this._filterStates(state) : this.champions.slice()
      )
    );
  }

  champions: Champion[] = [];

  ngOnInit(): void {
    this.getChampions();
  }

  ngAfterViewInit() {}

  getChampions() {
    this.lolChampionsExternalService.getChampions().subscribe((result: any) => {
      let obj: Champion = new Champion();
      for (const [key, value] of Object.entries(result.data)) {
        obj = new Champion();
        obj.name = (value as any).name;
        obj.png = Utils.default.placeImageURL(key);
        this.champions.push(obj);
      }
    });
  }

  open(trigger: any) {
    trigger.openPanel();
  }

  private _filterStates(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.champions.filter((champion) =>
      champion.name ? champion.name.toLowerCase().includes(filterValue) : ''
    );
  }

  clickSelect(data: any) {
    this.ref.close(data);
  }
}
