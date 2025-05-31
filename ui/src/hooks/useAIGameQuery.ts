// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { UseQueryResult } from "@tanstack/react-query";
import { useNetworkVariable } from "config";
import { useObjectQuery, UseObjectQueryResponse } from "hooks/useObjectQuery";

/** AI Game data structure */
export type AIGame = {
    /** The game's Object ID */
    id: string;

    /** Current state of the game board, 9 marks in row-major order. */
    board: number[];

    /** Address of the human player (always X) */
    player: string;

    /** Turn indicator: 0 = player, 1 = AI */
    turn: number;

    /** Game status: 0=active, 1=player wins, 2=AI wins, 3=draw */
    game_status: number;

    /** Number of moves played so far */
    moves_count: number;

    /** AI difficulty level: 1=easy, 2=medium, 3=hard */
    difficulty: number;

    /** Game start timestamp */
    start_time: number;

    /** Player move times for thinking time tracking */
    player_move_times: number[];
};

export type UseAIGameQueryResult = UseQueryResult<AIGame, Error>;
export type InvalidateAIGameQuery = () => void;

/** Refetch AI games every 5 seconds for real-time AI moves */
const REFETCH_INTERVAL = 5000;

/**
 * Hook to fetch an AI Game object from RPC by its ID.
 *
 * Will return an error if the object cannot be fetched, or is the
 * incorrect type. Returns a query result and a function to invalidate
 * the query.
 */
export function useAIGameQuery(id: string): [UseAIGameQueryResult, InvalidateAIGameQuery] {
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
        return [response as UseAIGameQueryResult, invalidate];
    }

    const data = response.data.data;
    if (!data) {
        return [toError(response, "Failed to fetch AI game"), invalidate];
    }

    const reType = new RegExp(`^${packageId}::ai_game::AIGame`);
    const { type, content } = data;

    if (!type || !type.match(reType) || !content || content.dataType !== "moveObject") {
        return [toError(response, "Object is not an AI Game"), invalidate];
    }

    const {
        board,
        player,
        turn,
        game_status,
        moves_count,
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
            moves_count: moves_count || 0,
            difficulty: difficulty || 1,
            start_time: start_time || 0,
            player_move_times: player_move_times || [],
        } as AIGame,
    };

    return [success as UseAIGameQueryResult, invalidate];
}

function toError(response: UseObjectQueryResponse, message: string): UseAIGameQueryResult {
    return {
        ...response,
        data: undefined,
        error: Error(message),
        isError: true,
        isLoadingError: true,
        isSuccess: false,
        status: "error",
    } as UseAIGameQueryResult;
} 