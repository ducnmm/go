import { UseQueryResult } from "@tanstack/react-query";
import { useNetworkVariable } from "config";
import { useObjectQuery, UseObjectQueryResponse } from "hooks/useObjectQuery";

/** Reversi Game data structure */
export type ReversiGame = {
    /** The game's Object ID */
    id: string;

    /** Current state of the game board, 64 marks in row-major order (8x8). */
    board: number[];

    /** Address of the human player (Black) */
    player: string;

    /** Turn indicator: 0 = player, 1 = AI */
    turn: number;

    /** Game status: 0=active, 1=player wins, 2=AI wins, 3=draw */
    game_status: number;

    /** Number of player pieces */
    player_pieces: number;

    /** Number of AI pieces */
    ai_pieces: number;

    /** AI difficulty level: 1=easy, 2=medium, 3=hard */
    difficulty: number;

    /** Game start timestamp */
    start_time: number;

    /** Player move times for thinking time tracking */
    player_move_times: number[];
};

export type UseReversiGameQueryResult = UseQueryResult<ReversiGame, Error>;
export type InvalidateReversiGameQuery = () => void;

/** Refetch Reversi games every 5 seconds for real-time AI moves */
const REFETCH_INTERVAL = 5000;

/**
 * Hook to fetch a Reversi Game object from RPC by its ID.
 */
export function useReversiGameQuery(id: string): [UseReversiGameQueryResult, InvalidateReversiGameQuery] {
    const packageId = useNetworkVariable("packageId");
    const [response, invalidate] = useObjectQuery(
        {
            id,
            options: { showType: true, showContent: true },
        },
        {
            refetchInterval: REFETCH_INTERVAL,
        },
    );

    // Wait for the query to succeed before doing any further work.
    if (response.status !== "success") {
        return [response as UseReversiGameQueryResult, invalidate];
    }

    const data = response.data.data;
    if (!data) {
        return [toError(response, "Failed to fetch Reversi game"), invalidate];
    }

    const reType = new RegExp(`^${packageId}::reversi_game::ReversiGame`);
    const { type, content } = data;

    if (!type || !type.match(reType) || !content || content.dataType !== "moveObject") {
        return [toError(response, "Object is not a Reversi Game"), invalidate];
    }

    const {
        board,
        player,
        turn,
        game_status,
        player_pieces,
        ai_pieces,
        difficulty,
        start_time,
        player_move_times
    } = content.fields as any;

    const success = {
        ...response,
        data: {
            id,
            board: board || [],
            player: player || "",
            turn: turn || 0,
            game_status: game_status || 0,
            player_pieces: player_pieces || 2,
            ai_pieces: ai_pieces || 2,
            difficulty: difficulty || 1,
            start_time: start_time || 0,
            player_move_times: player_move_times || [],
        } as ReversiGame,
    };

    return [success as UseReversiGameQueryResult, invalidate];
}

function toError(response: UseObjectQueryResponse, message: string): UseReversiGameQueryResult {
    return {
        ...response,
        status: "error",
        error: new Error(message),
    } as UseReversiGameQueryResult;
} 