export class ScoreBoard {
    user: number ;
    opponent: number;
    gameId: String;

    constructor(newGameId : String){
        this.user = 0;
        this.opponent = 0;
        this.gameId = newGameId;
    };
}