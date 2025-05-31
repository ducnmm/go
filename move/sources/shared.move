// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// An implementation of Caro (7x7 with 4 in a row to win), using shared objects.
///
/// The `Game` object is shared so both players can mutate it, and
/// contains authorization logic to only accept a move from the
/// correct player.
///
/// The `owned` module shows a variant of this game implemented using
/// only fast path transactions, which should be cheaper and lower
/// latency, but either requires a centralized service or a multi-sig
/// set-up to own the game.
module tic_tac_toe::shared;

/// The state of an active game of caro.
public struct Game has key {
    id: UID,
    /// Marks on the board.
    board: vector<u8>,
    /// The next turn to be played.
    turn: u8,
    /// The address expected to send moves on behalf of X.
    x: address,
    /// The address expected to send moves on behalf of O.
    o: address,
}

/// An NFT representing a finished game. Sent to the winning player if there
/// is one, or to both players in the case of a draw.
public struct Trophy has key {
    id: UID,
    /// Whether the game was won or drawn.
    status: u8,
    /// The state of the board at the end of the game.
    board: vector<u8>,
    /// The number of turns played
    turn: u8,
    /// The other player (relative to the player who owns this Trophy).
    other: address,
}

// === Constants ===

// Board size
const BOARD_SIZE: u8 = 7;
const TOTAL_CELLS: u8 = 49; // 7 * 7

// Marks
const MARK__: u8 = 0;
const MARK_X: u8 = 1;
const MARK_O: u8 = 2;

// Trophy status
const TROPHY_NONE: u8 = 0;
const TROPHY_DRAW: u8 = 1;
const TROPHY_WIN: u8 = 2;

// === Errors ===

#[error]
const EInvalidLocation: vector<u8> = b"Move was for a position that doesn't exist on the board.";

#[error]
const EWrongPlayer: vector<u8> = b"Game expected a move from another player";

#[error]
const EAlreadyFilled: vector<u8> = b"Attempted to place a mark on a filled slot.";

#[error]
const ENotFinished: vector<u8> = b"Game has not reached an end condition.";

#[error]
const EAlreadyFinished: vector<u8> = b"Can't place a mark on a finished game.";

#[error]
const EInvalidEndState: vector<u8> = b"Game reached an end state that wasn't expected.";

// === Public Functions ===

/// Create a new game, played by `x` and `o`. This function should be called
/// by the address responsible for administrating the game.
public fun new(x: address, o: address, ctx: &mut TxContext) {
    let mut board = vector::empty<u8>();
    let mut i = 0;
    while (i < TOTAL_CELLS) {
        vector::push_back(&mut board, MARK__);
        i = i + 1;
    };

    transfer::share_object(Game {
        id: object::new(ctx),
        board,
        turn: 0,
        x,
        o,
    });
}

/// Called by the next player to add a new mark.
public fun place_mark(game: &mut Game, row: u8, col: u8, ctx: &mut TxContext) {
    assert!(game.ended() == TROPHY_NONE, EAlreadyFinished);
    assert!(row < BOARD_SIZE && col < BOARD_SIZE, EInvalidLocation);

    // Confirm that the mark is from the player we expect.
    let (me, them, sentinel) = game.next_player();
    assert!(me == ctx.sender(), EWrongPlayer);

    if (game[row, col] != MARK__) {
        abort EAlreadyFilled
    };

    *(&mut game[row, col]) = sentinel;
    game.turn = game.turn + 1;

    // Check win condition -- if there is a winner, send them the trophy.
    let end = game.ended();
    if (end == TROPHY_WIN) {
        transfer::transfer(game.mint_trophy(end, them, ctx), me);
    } else if (end == TROPHY_DRAW) {
        transfer::transfer(game.mint_trophy(end, them, ctx), me);
        transfer::transfer(game.mint_trophy(end, me, ctx), them);
    } else if (end != TROPHY_NONE) {
        abort EInvalidEndState
    }
}

// === Private Helpers ===

/// Address of the player the move is expected from, the address of the
/// other player, and the mark to use for the upcoming move.
fun next_player(game: &Game): (address, address, u8) {
    if (game.turn % 2 == 0) {
        (game.x, game.o, MARK_X)
    } else {
        (game.o, game.x, MARK_O)
    }
}

/// Test whether 4 consecutive positions contain the same mark (and not empty).
fun test_line_of_four(game: &Game, positions: vector<u8>): bool {
    let mark = game.board[*vector::borrow(&positions, 0) as u64];
    if (mark == MARK__) return false;
    
    let mut i = 1;
    while (i < 4) {
        let pos = *vector::borrow(&positions, i);
        if (game.board[pos as u64] != mark) return false;
        i = i + 1;
    };
    true
}

/// Create a trophy from the current state of the `game`, that indicates
/// that a player won or drew against `other` player.
fun mint_trophy(game: &Game, status: u8, other: address, ctx: &mut TxContext): Trophy {
    Trophy {
        id: object::new(ctx),
        status,
        board: game.board,
        turn: game.turn,
        other,
    }
}

public fun burn(game: Game) {
    assert!(game.ended() != TROPHY_NONE, ENotFinished);
    let Game { id, .. } = game;
    id.delete();
}

/// Test whether the game has reached an end condition or not.
public fun ended(game: &Game): u8 {
    // Check all possible 4-in-a-row combinations
    
    // Check rows
    let mut row = 0;
    while (row < BOARD_SIZE) {
        let mut col = 0;
        while (col <= BOARD_SIZE - 4) {
            let positions = vector[
                row * BOARD_SIZE + col,
                row * BOARD_SIZE + col + 1,
                row * BOARD_SIZE + col + 2,
                row * BOARD_SIZE + col + 3
            ];
            if (test_line_of_four(game, positions)) {
                return TROPHY_WIN
            };
            col = col + 1;
        };
        row = row + 1;
    };

    // Check columns
    let mut col = 0;
    while (col < BOARD_SIZE) {
        let mut row = 0;
        while (row <= BOARD_SIZE - 4) {
            let positions = vector[
                row * BOARD_SIZE + col,
                (row + 1) * BOARD_SIZE + col,
                (row + 2) * BOARD_SIZE + col,
                (row + 3) * BOARD_SIZE + col
            ];
            if (test_line_of_four(game, positions)) {
                return TROPHY_WIN
            };
            row = row + 1;
        };
        col = col + 1;
    };

    // Check diagonal (top-left to bottom-right)
    let mut row = 0;
    while (row <= BOARD_SIZE - 4) {
        let mut col = 0;
        while (col <= BOARD_SIZE - 4) {
            let positions = vector[
                row * BOARD_SIZE + col,
                (row + 1) * BOARD_SIZE + col + 1,
                (row + 2) * BOARD_SIZE + col + 2,
                (row + 3) * BOARD_SIZE + col + 3
            ];
            if (test_line_of_four(game, positions)) {
                return TROPHY_WIN
            };
            col = col + 1;
        };
        row = row + 1;
    };

    // Check diagonal (top-right to bottom-left)
    let mut row = 0;
    while (row <= BOARD_SIZE - 4) {
        let mut col = 3;
        while (col < BOARD_SIZE) {
            let positions = vector[
                row * BOARD_SIZE + col,
                (row + 1) * BOARD_SIZE + col - 1,
                (row + 2) * BOARD_SIZE + col - 2,
                (row + 3) * BOARD_SIZE + col - 3
            ];
            if (test_line_of_four(game, positions)) {
                return TROPHY_WIN
            };
            col = col + 1;
        };
        row = row + 1;
    };

    // Check for draw (board full)
    if (game.turn == TOTAL_CELLS) {
        TROPHY_DRAW
    } else {
        TROPHY_NONE
    }
}

#[syntax(index)]
public fun mark(game: &Game, row: u8, col: u8): &u8 {
    &game.board[(row * BOARD_SIZE + col) as u64]
}

#[syntax(index)]
fun mark_mut(game: &mut Game, row: u8, col: u8): &mut u8 {
    &mut game.board[(row * BOARD_SIZE + col) as u64]
}

// === Test Helpers ===
#[test_only]
public use fun game_board as Game.board;
#[test_only]
public use fun trophy_status as Trophy.status;
#[test_only]
public use fun trophy_board as Trophy.board;
#[test_only]
public use fun trophy_turn as Trophy.turn;
#[test_only]
public use fun trophy_other as Trophy.other;

#[test_only]
public fun game_board(game: &Game): vector<u8> {
    game.board
}

#[test_only]
public fun trophy_status(trophy: &Trophy): u8 {
    trophy.status
}

#[test_only]
public fun trophy_board(trophy: &Trophy): vector<u8> {
    trophy.board
}

#[test_only]
public fun trophy_turn(trophy: &Trophy): u8 {
    trophy.turn
}

#[test_only]
public fun trophy_other(trophy: &Trophy): address {
    trophy.other
}
