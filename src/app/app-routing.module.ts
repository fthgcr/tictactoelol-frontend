import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainMenuComponent } from './main-menu/main-menu.component';
import { GameComponent } from './game/game.component';
import { HowToPlayComponent } from './how-to-play/how-to-play.component';
import { InputDialogComponent } from './input-dialog/input-dialog.component';

const routes: Routes = [
  {
    path: '',
    component: MainMenuComponent,
  },
  {
    path: 'game/:gameId',
    component: GameComponent,
  },
  {
    path: 'howto',
    component: HowToPlayComponent,
  },
  { path: '**', redirectTo: '/' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
