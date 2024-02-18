import { NgModule } from '@angular/core';
import {
  BrowserModule,
  provideClientHydration,
} from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GameComponent } from './game/game.component';
import { MainMenuComponent } from './main-menu/main-menu.component';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { InputDialogComponent } from './input-dialog/input-dialog.component';
import { PixelButtonComponent } from './pixel-button/pixel-button.component';
import { UserNameDialogComponent } from './user-name-dialog/user-name-dialog.component';
import { CommonModule } from '@angular/common';
import { AsyncPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { HowToPlayComponent } from './how-to-play/how-to-play.component';
import { MatCardModule } from '@angular/material/card';
import { ChampionsOverviewComponent } from './champions-overview/champions-overview.component';
import { ReplayDialogComponent } from './replay-dialog/replay-dialog.component';
import { DummyComponent } from './dummy/dummy.component';

@NgModule({
  declarations: [
    AppComponent,
    UserNameDialogComponent,
    PixelButtonComponent,
    InputDialogComponent,
    MainMenuComponent,
    GameComponent,
    HowToPlayComponent,
    ChampionsOverviewComponent,
    ReplayDialogComponent,
    DummyComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    AsyncPipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatSlideToggleModule,
    CommonModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  providers: [
    //provideClientHydration()
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
