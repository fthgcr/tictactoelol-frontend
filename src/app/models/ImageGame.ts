export class ImageGame {
    source: String | undefined;
    style: any | undefined;
    isOpen: boolean = true;

    constructor(){
        this.isOpen = true;
        this.style = {};
        this.source = "";
    };
}