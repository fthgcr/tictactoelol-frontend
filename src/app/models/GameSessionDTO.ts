export class GameSessionDTO {
    pid: number | undefined;
    uid: number | undefined;
    firstPlayer: String | undefined;
    secondPlayer: String | undefined;
    gameId: String | undefined;
    turn: number | undefined;
    date: Date | undefined;
    playArea: String | undefined;
    playAreaArray: String[];
    gameRule: String;
    gameStatus: number = -1;

    constructor(){};
}