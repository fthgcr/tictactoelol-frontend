export class GameSession {
    pid: number | undefined;
    uid: number | undefined;
    firstPlayer: String | undefined;
    secondPlayer: String | undefined;
    gameId: String | undefined;
    turn: number | undefined;
    date: Date | undefined;
    playArea: String | undefined;
    gameStatus: number;

    constructor(){};
}