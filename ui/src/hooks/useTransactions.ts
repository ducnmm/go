// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "config";
import { Game } from "hooks/useGameQuery";

/** Hook to provide an instance of the Transactions builder. */
export function useTransactions(): Transactions | null {
    const packageId = useNetworkVariable("packageId");
    return packageId ? new Transactions(packageId) : null;
}

/**
 * Builds on-chain transactions for the Tic-Tac-Toe game.
 */
export class Transactions {
    readonly packageId: string;

    constructor(packageId: string) {
        this.packageId = packageId;
    }

    newSharedGame(player: string, opponent: string): Transaction {
        const tx = new Transaction();

        tx.moveCall({
            target: `${this.packageId}::shared::new`,
            arguments: [tx.pure.address(player), tx.pure.address(opponent)],
        });

        return tx;
    }

    placeMark(game: Game, row: number, col: number): Transaction {
        if (game.kind !== "shared") {
            throw new Error("Cannot place mark directly on owned game");
        }

        const tx = new Transaction();

        tx.moveCall({
            target: `${this.packageId}::shared::place_mark`,
            arguments: [tx.object(game.id), tx.pure.u8(row), tx.pure.u8(col)],
        });

        return tx;
    }

    ended(game: Game): Transaction {
        const tx = new Transaction();

        tx.moveCall({
            target: `${this.packageId}::${game.kind}::ended`,
            arguments: [tx.object(game.id)],
        });

        return tx;
    }

    burn(game: Game): Transaction {
        const tx = new Transaction();

        tx.moveCall({
            target: `${this.packageId}::${game.kind}::burn`,
            arguments: [tx.object(game.id)],
        });

        return tx;
    }

    newAIGame(difficulty: number): Transaction {
        const tx = new Transaction();

        tx.moveCall({
            target: `${this.packageId}::ai_game::new_shared_ai_game`,
            arguments: [tx.pure.u8(difficulty), tx.object("0x6")],
        });

        return tx;
    }

    playerMove(gameId: string, position: number): Transaction {
        const tx = new Transaction();

        tx.moveCall({
            target: `${this.packageId}::ai_game::player_move`,
            arguments: [tx.object(gameId), tx.pure.u8(position), tx.object("0x6")],
        });

        return tx;
    }

    newReversiGame(difficulty: number): Transaction {
        const tx = new Transaction();

        tx.moveCall({
            target: `${this.packageId}::reversi_game::new_shared_reversi_game`,
            arguments: [tx.pure.u8(difficulty), tx.object("0x6")],
        });

        return tx;
    }

    reversiPlayerMove(gameId: string, position: number): Transaction {
        const tx = new Transaction();

        tx.moveCall({
            target: `${this.packageId}::reversi_game::player_move`,
            arguments: [tx.object(gameId), tx.pure.u8(position), tx.object("0x6")],
        });

        return tx;
    }
}
