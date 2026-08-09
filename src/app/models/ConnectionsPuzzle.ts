export class ConnectionsGroup {
    rule: string;
    champions: string[];
}

export class ConnectionsPuzzle {
    // "2026-07-18" for the daily puzzle, null for unlimited puzzles.
    puzzleId: string | null;
    groups: ConnectionsGroup[];
}
