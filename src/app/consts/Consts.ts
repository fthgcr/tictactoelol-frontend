import { GameAreaRequest } from "../models/GameAreaRequest";
import { GameSession } from "../models/GameSession";
import { GameSessionDTO } from "../models/GameSessionDTO";
import { GameSessionRequest } from "../models/GameSessionRequest";

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

  static gameSessionToPlayRequest(gameSession: GameSessionDTO, index: number, value: String, horizontalRule: String, verticalRule: String) : GameAreaRequest{
    let gameAreaRequest : GameAreaRequest = new GameAreaRequest();
    gameAreaRequest.pid = gameSession.pid;
    gameAreaRequest.date = gameSession.date;
    gameAreaRequest.firstPlayer = gameSession.firstPlayer;
    gameAreaRequest.gameId = gameSession.gameId;
    gameAreaRequest.secondPlayer = gameSession.secondPlayer;
    gameAreaRequest.turn = gameSession.turn;
    gameAreaRequest.uid = gameSession.uid;
    gameAreaRequest.playArea = "";
    for(let index: number = 0; index < 9; index++){
      gameAreaRequest.playArea = gameAreaRequest.playArea + (gameSession as any).playAreaArray[index] + "," 
    }
    gameAreaRequest.playArea = gameAreaRequest.playArea.slice(0,-1);
    gameAreaRequest.index = index;
    gameAreaRequest.value = value;
    gameAreaRequest.verticalRule = verticalRule;
    gameAreaRequest.horizontalRule = horizontalRule;
    gameAreaRequest.gameStatus = gameSession.gameStatus;

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

    
    gameSessionDTO.secondPlayer = gameSession.secondPlayer;
    gameSessionDTO.turn = gameSession.turn;

    
    return gameSessionDTO;
  }
  
}
