import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ScoreBoard } from '../models/ScoreBoard';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScoreBoardService {

  constructor() { }

  private scoreBoard : ScoreBoard[] = [];

  getScoreBoard(gameId : String) : ScoreBoard{
    var index = this.scoreBoard.findIndex(score => score.gameId === gameId);
    if(index > -1){
        return this.scoreBoard[index];
    } else {
        const newScore : ScoreBoard = new ScoreBoard(gameId);
        this.scoreBoard.push(newScore);
        return newScore;
    }
  }

  // getScoreBoard() creates the entry on demand, so an unknown gameId here would
  // otherwise blow up on scoreBoard[-1].
  updateScoreBoard(gameId : String, isPlayer : boolean) {
    const score = this.getScoreBoard(gameId);
    if (isPlayer){
        score.user++;
    } else {
        score.opponent++;
    }
  }


  
}
