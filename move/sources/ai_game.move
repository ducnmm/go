// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Single-player tic-tac-toe game where the player competes against a smart contract AI.
/// The player is always X and the AI is always O.
/// Winner receives a Trophy NFT with rarity based on performance.
module tic_tac_toe::ai_game {
    
    // === Imports ===
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::vector;
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};
    use sui::event;

    // === Errors ===
    const EInvalidMove: u64 = 0;
    const EGameNotActive: u64 = 1;
    const ENotPlayerTurn: u64 = 2;
    const EAlreadyFilled: u64 = 3;
    const EInvalidDifficulty: u64 = 4;
    const EGameNotFinished: u64 = 5;

    // === Constants ===
    const MARK_EMPTY: u8 = 0;
    const MARK_X: u8 = 1;  // Player
    const MARK_O: u8 = 2;  // AI

    const GAME_ACTIVE: u8 = 0;
    const GAME_PLAYER_WIN: u8 = 1;
    const GAME_AI_WIN: u8 = 2;
    const GAME_DRAW: u8 = 3;

    // AI Difficulty levels
    const DIFFICULTY_EASY: u8 = 1;
    const DIFFICULTY_MEDIUM: u8 = 2;
    const DIFFICULTY_HARD: u8 = 3;

    // Trophy rarities
    const RARITY_BRONZE: u8 = 1;
    const RARITY_SILVER: u8 = 2;
    const RARITY_GOLD: u8 = 3;
    const RARITY_DIAMOND: u8 = 4;
    const RARITY_RAINBOW: u8 = 5;

    // Win patterns
    const PATTERN_CENTER_CONTROL: u8 = 1;
    const PATTERN_CORNER_TRAP: u8 = 2;
    const PATTERN_FORK_ATTACK: u8 = 3;
    const PATTERN_DEFENSIVE_WIN: u8 = 4;
    const PATTERN_BLITZ_WIN: u8 = 5;

    // === Structs ===

    /// Represents a tic-tac-toe game vs AI
    public struct AIGame has key, store {
        id: UID,
        board: vector<u8>, // 3x3 board represented as vector of 9 elements
        player: address,   // The human player (always X)
        turn: u8,         // 0 = player turn, 1 = AI turn
        game_status: u8,  // 0: active, 1: player wins, 2: AI wins, 3: draw
        moves_count: u8,  // Number of moves played
        difficulty: u8,   // AI difficulty level
        start_time: u64,  // Game start timestamp
        player_move_times: vector<u64>, // Track thinking time for each move
    }

    /// Trophy NFT sent to the winner
    public struct Trophy has key, store {
        id: UID,
        winner: address,
        rarity: u8,           // 1=Bronze, 2=Silver, 3=Gold, 4=Diamond, 5=Rainbow
        moves_to_win: u8,     // 5-9 moves
        ai_difficulty: u8,    // 1=Easy, 2=Medium, 3=Hard
        win_pattern: u8,      // Type of winning strategy
        thinking_time: u64,   // Total thinking time in milliseconds
        final_board: vector<u8>,
        timestamp: u64,
        name: String,
        description: String,
        image_url: String,
    }

    /// Player statistics for streak tracking
    public struct PlayerStats has key, store {
        id: UID,
        player: address,
        total_games: u64,
        wins: u64,
        losses: u64,
        draws: u64,
        current_streak: u8,
        best_streak: u8,
        trophies_earned: u64,
    }

    // === Events ===

    public struct GameCreated has copy, drop {
        game_id: ID,
        player: address,
        difficulty: u8,
        timestamp: u64,
    }

    public struct MoveMade has copy, drop {
        game_id: ID,
        player: address,
        position: u8,
        move_time: u64,
    }

    public struct AIMoveMade has copy, drop {
        game_id: ID,
        position: u8,
        difficulty: u8,
    }

    public struct GameFinished has copy, drop {
        game_id: ID,
        winner: u8,
        moves_count: u8,
        total_time: u64,
    }

    public struct TrophyAwarded has copy, drop {
        trophy_id: ID,
        game_id: ID,
        player: address,
        rarity: u8,
        pattern: u8,
    }

    // === Public Functions ===

    /// Create a new AI game
    public fun new_ai_game(difficulty: u8, clock: &Clock, ctx: &mut TxContext): AIGame {
        assert!(difficulty >= DIFFICULTY_EASY && difficulty <= DIFFICULTY_HARD, EInvalidDifficulty);
        
        let mut board = vector::empty<u8>();
        let mut i = 0;
        while (i < 9) {
            vector::push_back(&mut board, MARK_EMPTY);
            i = i + 1;
        };

        let timestamp = clock::timestamp_ms(clock);
        let game = AIGame {
            id: object::new(ctx),
            board,
            player: tx_context::sender(ctx),
            turn: 0, // Player starts first
            game_status: GAME_ACTIVE,
            moves_count: 0,
            difficulty,
            start_time: timestamp,
            player_move_times: vector::empty<u64>(),
        };

        event::emit(GameCreated {
            game_id: object::id(&game),
            player: tx_context::sender(ctx),
            difficulty,
            timestamp,
        });

        game
    }

    /// Create a new shared AI game
    public fun new_shared_ai_game(difficulty: u8, clock: &Clock, ctx: &mut TxContext) {
        transfer::share_object(new_ai_game(difficulty, clock, ctx));
    }

    /// Player makes a move (player is always X)
    public fun player_move(
        game: &mut AIGame,
        position: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Validations
        assert!(game.game_status == GAME_ACTIVE, EGameNotActive);
        assert!(sender == game.player, ENotPlayerTurn);
        assert!(game.turn == 0, ENotPlayerTurn); // Must be player's turn
        assert!(position < 9, EInvalidMove);
        assert!(*vector::borrow(&game.board, (position as u64)) == MARK_EMPTY, EAlreadyFilled);

        // Track move time
        let move_time = current_time - game.start_time;
        vector::push_back(&mut game.player_move_times, move_time);

        // Make player move
        *vector::borrow_mut(&mut game.board, (position as u64)) = MARK_X;
        game.moves_count = game.moves_count + 1;

        event::emit(MoveMade {
            game_id: object::id(game),
            player: sender,
            position,
            move_time,
        });

        // Check if player won
        if (check_winner(&game.board, MARK_X)) {
            game.game_status = GAME_PLAYER_WIN;
            let total_time = current_time - game.start_time;
            
            event::emit(GameFinished {
                game_id: object::id(game),
                winner: GAME_PLAYER_WIN,
                moves_count: game.moves_count,
                total_time,
            });

            // Award trophy to player
            award_trophy(game, current_time, ctx);
            return
        };

        // Check for draw
        if (game.moves_count == 9) {
            game.game_status = GAME_DRAW;
            event::emit(GameFinished {
                game_id: object::id(game),
                winner: GAME_DRAW,
                moves_count: game.moves_count,
                total_time: current_time - game.start_time,
            });
            return
        };

        // Switch to AI turn
        game.turn = 1;

        // AI makes a move immediately
        ai_move(game, clock, ctx);
    }

    /// AI makes a move (AI is always O)
    fun ai_move(game: &mut AIGame, clock: &Clock, ctx: &mut TxContext) {
        // Calculate AI move based on difficulty
        let ai_position = calculate_ai_move(&game.board, game.difficulty, clock);
        
        *vector::borrow_mut(&mut game.board, (ai_position as u64)) = MARK_O;
        game.moves_count = game.moves_count + 1;

        event::emit(AIMoveMade {
            game_id: object::id(game),
            position: ai_position,
            difficulty: game.difficulty,
        });

        // Check if AI won
        if (check_winner(&game.board, MARK_O)) {
            game.game_status = GAME_AI_WIN;
            event::emit(GameFinished {
                game_id: object::id(game),
                winner: GAME_AI_WIN,
                moves_count: game.moves_count,
                total_time: clock::timestamp_ms(clock) - game.start_time,
            });
            return
        };

        // Check for draw
        if (game.moves_count == 9) {
            game.game_status = GAME_DRAW;
            event::emit(GameFinished {
                game_id: object::id(game),
                winner: GAME_DRAW,
                moves_count: game.moves_count,
                total_time: clock::timestamp_ms(clock) - game.start_time,
            });
            return
        };

        // Switch back to player turn
        game.turn = 0;
    }

    /// Award trophy to winning player
    fun award_trophy(game: &AIGame, current_time: u64, ctx: &mut TxContext) {
        let win_pattern = analyze_win_pattern(&game.board);
        let thinking_time = calculate_total_thinking_time(&game.player_move_times);
        let rarity = calculate_trophy_rarity(
            game.moves_count,
            game.difficulty,
            win_pattern,
            thinking_time
        );

        let (name, description, image_url) = get_trophy_metadata(rarity, win_pattern, game.difficulty);

        let trophy = Trophy {
            id: object::new(ctx),
            winner: game.player,
            rarity,
            moves_to_win: game.moves_count,
            ai_difficulty: game.difficulty,
            win_pattern,
            thinking_time,
            final_board: game.board,
            timestamp: current_time,
            name,
            description,
            image_url,
        };

        event::emit(TrophyAwarded {
            trophy_id: object::id(&trophy),
            game_id: object::id(game),
            player: game.player,
            rarity,
            pattern: win_pattern,
        });

        transfer::transfer(trophy, game.player);
    }

    /// Burn finished game to reclaim storage
    public fun burn_game(game: AIGame) {
        assert!(game.game_status != GAME_ACTIVE, EGameNotFinished);
        let AIGame { id, .. } = game;
        object::delete(id);
    }

    // === Helper Functions ===

    /// Calculate AI move based on difficulty level
    fun calculate_ai_move(board: &vector<u8>, difficulty: u8, clock: &Clock): u8 {
        // For gas efficiency, use simplified algorithms based on difficulty
        
        if (difficulty == DIFFICULTY_EASY) {
            // Easy: 30% optimal, 70% random
            let seed = clock::timestamp_ms(clock) % 10;
            if (seed < 3) {
                calculate_optimal_move(board)
            } else {
                get_random_move(board, clock)
            }
        } else if (difficulty == DIFFICULTY_MEDIUM) {
            // Medium: 70% optimal, 30% random
            let seed = clock::timestamp_ms(clock) % 10;
            if (seed < 7) {
                calculate_optimal_move(board)
            } else {
                get_random_move(board, clock)
            }
        } else {
            // Hard: Always optimal
            calculate_optimal_move(board)
        }
    }

    /// Calculate optimal move using minimax-like logic
    fun calculate_optimal_move(board: &vector<u8>): u8 {
        // 1. Try to win
        let win_move = find_winning_move(board, MARK_O);
        if (win_move != 255) return win_move;

        // 2. Block player from winning
        let block_move = find_winning_move(board, MARK_X);
        if (block_move != 255) return block_move;

        // 3. Take center if available
        if (*vector::borrow(board, 4) == MARK_EMPTY) return 4;

        // 4. Take corners
        let corners = vector[0, 2, 6, 8];
        let mut i = 0;
        while (i < vector::length(&corners)) {
            let pos = *vector::borrow(&corners, i);
            if (*vector::borrow(board, (pos as u64)) == MARK_EMPTY) return pos;
            i = i + 1;
        };

        // 5. Take any edge
        let edges = vector[1, 3, 5, 7];
        i = 0;
        while (i < vector::length(&edges)) {
            let pos = *vector::borrow(&edges, i);
            if (*vector::borrow(board, (pos as u64)) == MARK_EMPTY) return pos;
            i = i + 1;
        };

        // Should never reach here in a valid game
        0
    }

    /// Find a winning move for the given player
    fun find_winning_move(board: &vector<u8>, player: u8): u8 {
        let mut pos = 0;
        while (pos < 9) {
            if (*vector::borrow(board, (pos as u64)) == MARK_EMPTY) {
                // Try this move
                let mut temp_board = *board;
                *vector::borrow_mut(&mut temp_board, (pos as u64)) = player;
                
                if (check_winner(&temp_board, player)) {
                    return pos
                };
            };
            pos = pos + 1;
        };
        255 // No winning move found
    }

    /// Get random valid move
    fun get_random_move(board: &vector<u8>, clock: &Clock): u8 {
        let mut empty_positions = vector::empty<u8>();
        let mut i = 0;
        while (i < 9) {
            if (*vector::borrow(board, (i as u64)) == MARK_EMPTY) {
                vector::push_back(&mut empty_positions, (i as u8));
            };
            i = i + 1;
        };

        let seed = clock::timestamp_ms(clock) % vector::length(&empty_positions);
        *vector::borrow(&empty_positions, seed)
    }

    /// Check if a player has won
    fun check_winner(board: &vector<u8>, player: u8): bool {
        // Check rows
        let mut i = 0;
        while (i < 3) {
            let row_start = i * 3;
            if (*vector::borrow(board, (row_start as u64)) == player &&
                *vector::borrow(board, (row_start + 1 as u64)) == player &&
                *vector::borrow(board, (row_start + 2 as u64)) == player) {
                return true
            };
            i = i + 1;
        };

        // Check columns
        i = 0;
        while (i < 3) {
            if (*vector::borrow(board, (i as u64)) == player &&
                *vector::borrow(board, (i + 3 as u64)) == player &&
                *vector::borrow(board, (i + 6 as u64)) == player) {
                return true
            };
            i = i + 1;
        };

        // Check diagonals
        if (*vector::borrow(board, 0) == player &&
            *vector::borrow(board, 4) == player &&
            *vector::borrow(board, 8) == player) {
            return true
        };

        if (*vector::borrow(board, 2) == player &&
            *vector::borrow(board, 4) == player &&
            *vector::borrow(board, 6) == player) {
            return true
        };

        false
    }

    /// Analyze the winning pattern
    fun analyze_win_pattern(board: &vector<u8>): u8 {
        // Check if center was used
        if (*vector::borrow(board, 4) == MARK_X) {
            return PATTERN_CENTER_CONTROL
        };

        // Check for corner strategy
        let corners_used = (if (*vector::borrow(board, 0) == MARK_X) 1 else 0) +
                          (if (*vector::borrow(board, 2) == MARK_X) 1 else 0) +
                          (if (*vector::borrow(board, 6) == MARK_X) 1 else 0) +
                          (if (*vector::borrow(board, 8) == MARK_X) 1 else 0);

        if (corners_used >= 2) {
            return PATTERN_CORNER_TRAP
        };

        PATTERN_DEFENSIVE_WIN
    }

    /// Calculate total thinking time
    fun calculate_total_thinking_time(move_times: &vector<u64>): u64 {
        let mut total = 0;
        let mut i = 0;
        while (i < vector::length(move_times)) {
            total = total + *vector::borrow(move_times, i);
            i = i + 1;
        };
        total
    }

    /// Calculate trophy rarity based on performance
    fun calculate_trophy_rarity(
        moves: u8,
        ai_difficulty: u8,
        win_pattern: u8,
        thinking_time: u64
    ): u8 {
        let mut base_rarity = if (moves == 5) 3      // Gold for 5 moves
                             else if (moves <= 7) 2   // Silver for 6-7 moves
                             else 1;                   // Bronze for 8-9 moves

        // AI difficulty bonus
        base_rarity = base_rarity + (ai_difficulty - 1);

        // Fast thinking bonus (under 5 seconds total)
        if (thinking_time < 5000) {
            base_rarity = base_rarity + 1;
        };

        // Special pattern bonus
        if (win_pattern == PATTERN_FORK_ATTACK) {
            base_rarity = base_rarity + 1;
        };

        // Cap at Diamond (4) for now, Rainbow (5) reserved for streaks
        if (base_rarity > 4) 4 else base_rarity
    }

    /// Get trophy metadata based on rarity and pattern
    fun get_trophy_metadata(rarity: u8, pattern: u8, difficulty: u8): (String, String, String) {
        let name = if (rarity == RARITY_BRONZE) string::utf8(b"Bronze Strategist")
                   else if (rarity == RARITY_SILVER) string::utf8(b"Silver Tactician")
                   else if (rarity == RARITY_GOLD) string::utf8(b"Gold Master")
                   else if (rarity == RARITY_DIAMOND) string::utf8(b"Diamond Genius")
                   else string::utf8(b"Rainbow Legend");

        let description = string::utf8(b"Defeated AI in Tic-Tac-Toe with superior strategy");
        let image_url = string::utf8(b"https://api.example.com/trophy/");

        (name, description, image_url)
    }

    // === View Functions ===

    /// Get game status
    public fun get_game_status(game: &AIGame): u8 {
        game.game_status
    }

    /// Get current board state
    public fun get_board(game: &AIGame): vector<u8> {
        game.board
    }

    /// Get whose turn it is
    public fun get_turn(game: &AIGame): u8 {
        game.turn
    }

    /// Get move count
    public fun get_moves_count(game: &AIGame): u8 {
        game.moves_count
    }

    /// Get AI difficulty
    public fun get_difficulty(game: &AIGame): u8 {
        game.difficulty
    }
} 