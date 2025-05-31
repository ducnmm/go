// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { UseQueryResult } from "@tanstack/react-query";
import { useNetworkVariable } from "config";
import { useObjectQuery, UseObjectQueryResponse } from "hooks/useObjectQuery";

/** Variants of the caro protocol */
export type Kind = "shared";

/** Marks on the game board */
export enum Mark {
    /** No mark */
    _ = 0,
    /** Marked by player X */
    X,
    /** Marked by player O */
    O,
}

/** State of the game, deserialized from its Move Object */
export type Game = {
    /** The game's Object ID */
    id: string;

    /** Whether it's a 'shared' game */
    kind: Kind;

    /** Current state of the game board, 49 marks in row-major order (7x7). */
    board: Mark[];

    /** Number of turns played so far. */
    turn: number;

    /** Address of the player controlling X */
    x: string;

    /** Address of the player controlling O */
    o: string;
};

export type UseGameQueryResult = UseQueryResult<Game, Error>;
export type InvalidateGameQuery = () => void;

/** Refetch games every 5 seconds */
const REFETCH_INTERVAL = 5000;

/**
 * Hook to fetch a Game object from RPC by its ID.
 *
 * Will return an error if the object cannot be fetched, or is the
 * incorrect type. Returns a query result and a function to invalidate
 * the query.
 */
export function useGameQuery(id: string): [UseGameQueryResult, InvalidateGameQuery] {
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
        return [response as UseGameQueryResult, invalidate];
    }

    const data = response.data.data;
    if (!data) {
        return [toError(response, "Failed to fetch game"), invalidate];
    }

    const reType = new RegExp(`^${packageId}::shared::Game`);
    const { type, content } = data;

    if (!type || !type.match(reType) || !content || content.dataType !== "moveObject") {
        return [toError(response, "Object is not a Game"), invalidate];
    }

    const kind = "shared" as Kind;
    const { board, turn, x, o } = content.fields as Game;

    const success = {
        ...response,
        data: { id, kind, board, turn, x, o },
    };

    return [success as UseGameQueryResult, invalidate];
}

function toError(response: UseObjectQueryResponse, message: string): UseGameQueryResult {
    return {
        ...response,
        data: undefined,
        error: Error(message),
        isError: true,
        isLoadingError: true,
        isSuccess: false,
        status: "error",
    } as UseGameQueryResult;
}
