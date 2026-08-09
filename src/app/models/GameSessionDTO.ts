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
    // Server-provided cell ownership: "-1" empty, "0" first player, "1" second player.
    cellOwners: String | undefined;
    cellOwnersArray: String[] | undefined;
    gameRule: String;
    gameStatus: number = -1;

    constructor(secondPlayer = null){};
}