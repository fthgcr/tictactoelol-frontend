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

  updateScoreBoard(gameId : String, isPlayer : boolean) {
    var index = this.scoreBoard.findIndex(score => score.gameId === gameId);
    if (isPlayer){
        this.scoreBoard[index].user++;
    } else {
        this.scoreBoard[index].opponent++;
    }
  }


  
}
