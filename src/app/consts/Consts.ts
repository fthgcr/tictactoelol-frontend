import { GameAreaRequest } from "../models/GameAreaRequest";
import { GameSession } from "../models/GameSession";
import { GameSessionDTO } from "../models/GameSessionDTO";
import { GameSessionRequest } from "../models/GameSessionRequest";

// Websocket control signals passed in the "index" field of a GameAreaRequest.
// index >= 0 is a real board cell; these negative values are commands.
// The old -2 "broadcast client state" signal is gone: game state (wins, turns, board)
// is now fully server-authoritative and cannot be pushed from a client.
export const WS_SIGNAL_HEALTH_CHECK = -1; // ask the server to re-broadcast its state
export const WS_SIGNAL_SKIP_TURN = -3;    // current player's timer ran out
export const WS_SIGNAL_REPLAY = -4;       // rematch: reset the session for both players

export const PNG_URL = 'https://ddragon.leagueoflegends.com/cdn/14.3.1/img/champion/';
export const PNG_BORDER = "border: 0.5rem solid ";
export const SPLASH_URL = 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/';



export default class Utils {
  static placeImageURL(val: String) : String {
    return PNG_URL + val + ".png";
  }

  static placeSplashURL(val: String) : String {
    return SPLASH_URL + val + "_0.jpg";
  }
  
  static placePngBorder(player: number) : any {
    if(player === 0){
      return {
        'border': "0.5rem solid blue"
      };
    } else {
      return {
        'border': "0.5rem solid red"
      };
    }
  }

  static spinnerOverlay(isLoading: boolean) : any {
    if(isLoading) {
      return {
        'left': '0',
        'top': '0',
        'width': '100%',
        'height': '100%',
        'opacity': '0.2',
        'z-index': '1000',
      };
    } else {
      return {};
    }
  }

  static areArraysEqual(array1 : any[], array2: any[]): boolean {
    return JSON.stringify(array1) === JSON.stringify(array2);
  }

  // Only identity ("who"), the target cell ("where") and the champion ("which") matter
  // to the server now; board, turn, rules and status are all resolved server-side.
  static gameSessionToPlayRequest(gameSession: GameSessionDTO, playerId: String | undefined, index: number, value: String) : GameAreaRequest{
    let gameAreaRequest : GameAreaRequest = new GameAreaRequest();
    gameAreaRequest.playerId = playerId;
    gameAreaRequest.gameId = gameSession.gameId;
    gameAreaRequest.uid = gameSession.uid;
    gameAreaRequest.index = index;
    gameAreaRequest.value = value;

    return gameAreaRequest;
  }

  static setPlayAreaArray(gameSession: GameSession, gameModel: GameSessionDTO) : GameSessionDTO {
    if(gameSession && (gameSession as any).playAreaArray && gameModel && gameModel.playAreaArray && gameModel.pid && gameModel.pid > 0){
      const sameContent = (gameSession as any).playAreaArray?.every((value: String, index: number) => value === gameModel?.playAreaArray[index]);
      if(sameContent){
        return new GameSessionDTO();
      }
    }

    let gameSessionDTO : GameSessionDTO = new GameSessionDTO();
    gameSessionDTO.uid = gameSession?.uid;
    gameSessionDTO.date = gameSession.date;
    gameSessionDTO.firstPlayer = gameSession.firstPlayer;
    gameSessionDTO.gameId = gameSession.gameId;
    gameSessionDTO.pid = gameSession.pid;
    gameSessionDTO.playArea = gameSession.playArea;
    gameSessionDTO.gameStatus = gameSession.gameStatus;
    if(Array.isArray((gameSession as any).playAreaArray)){
      gameSessionDTO.playAreaArray = (gameSession as any).playAreaArray;
    } else {
      gameSessionDTO.playAreaArray = (gameSession as any).playAreaArray.split(",").map(String);
    }
    gameSessionDTO.cellOwners = (gameSession as any).cellOwners;
    if(Array.isArray((gameSession as any).cellOwnersArray)){
      gameSessionDTO.cellOwnersArray = (gameSession as any).cellOwnersArray;
    } else if((gameSession as any).cellOwners){
      gameSessionDTO.cellOwnersArray = (gameSession as any).cellOwners.split(",").map(String);
    }

    
    gameSessionDTO.secondPlayer = gameSession.secondPlayer;
    gameSessionDTO.turn = gameSession.turn;

    
    return gameSessionDTO;
  }

  static isMatchmaking(gameId : String) : boolean {
    return gameId.substring(0, 2) === "FI";
  }
  
}
