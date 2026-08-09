import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainMenuComponent } from './components/pages/main-menu/main-menu.component';
import { GameComponent } from './components/pages/game/game.component';
import { HowToPlayComponent } from './components/pages/how-to-play/how-to-play.component';
import { InputDialogComponent } from './components/tools/input-dialog/input-dialog.component';
import { ConnectionsComponent } from './components/pages/connections/connections.component';
import { GuessWhoComponent } from './components/pages/guess-who/guess-who.component';

const routes: Routes = [
  {
    path: '',
    component: MainMenuComponent,
  },
  {
    path: 'game',
    component: GameComponent,
  },
  {
    path: 'game/:gameId',
    component: GameComponent,
  },
  {
    path: 'howto',
    component: HowToPlayComponent,
  },
  {
    path: 'connections',
    component: ConnectionsComponent,
  },
  {
    path: 'guesswho',
    component: GuessWhoComponent,
  },
  { path: '**', redirectTo: '/' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
