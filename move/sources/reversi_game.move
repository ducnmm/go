/// Reversi (Othello) game where the player competes against a smart contract AI.
/// The player is Black and the AI is White.
/// Winner receives a Trophy NFT with rarity based on performance.
/// Now uses Sui's Random API for unpredictable and secure AI behavior.
#[allow(duplicate_alias)]
module tic_tac_toe::reversi_game {
    
    // === Imports ===
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::vector;
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};
    use sui::event;
    use sui::random::{Self, Random, RandomGenerator};

    // === Errors ===
    const EInvalidMove: u64 = 0;
    const EGameNotActive: u64 = 1;
    const ENotPlayerTurn: u64 = 2;
    const EInvalidPosition: u64 = 3;
    const EInvalidDifficulty: u64 = 4;
    const ENoValidMoves: u64 = 5;

    // === Constants ===
    // Board size (8x8 for Reversi)
    const BOARD_SIZE: u8 = 8;
    const TOTAL_CELLS: u8 = 64; // 8 * 8
    
    const MARK_EMPTY: u8 = 0;
    const MARK_BLACK: u8 = 1;  // Player
    const MARK_WHITE: u8 = 2;  // AI

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

    // Strategy patterns
    const STRATEGY_CORNER_CONTROL: u8 = 1;
    const STRATEGY_MOBILITY: u8 = 3;

    // === Structs ===

    /// Represents a Reversi game vs AI (8x8 board)
    public struct ReversiGame has key, store {
        id: UID,
        board: vector<u8>, // 8x8 board represented as vector of 64 elements
        player: address,   // The human player (Black)
        turn: u8,         // 0 = player turn, 1 = AI turn
        game_status: u8,  // 0: active, 1: player wins, 2: AI wins, 3: draw
        player_pieces: u8,  // Number of player pieces
        ai_pieces: u8,     // Number of AI pieces
        difficulty: u8,    // AI difficulty level
        start_time: u64,   // Game start timestamp
        player_move_times: vector<u64>, // Track thinking time for each move
        valid_moves_count: u8, // Number of valid moves available
        consecutive_passes: u8, // Track consecutive passes
        ai_strategy: u8,  // Current AI strategy (changes randomly)
    }

    /// Trophy NFT sent to the winner
    public struct ReversiTrophy has key, store {
        id: UID,
        winner: address,
        rarity: u8,           // 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
        final_score: u8,      // Final piece count difference
        ai_difficulty: u8,    // 1=Easy, 2=Medium, 3=Hard
        strategy_pattern: u8, // Type of winning strategy
        thinking_time: u64,   // Total thinking time in milliseconds
        final_board: vector<u8>,
        timestamp: u64,
        name: String,
        description: String,
        image_url: String,
    }

    // === Events ===

    public struct ReversiGameCreated has copy, drop {
        game_id: ID,
        player: address,
        difficulty: u8,
        timestamp: u64,
    }

    public struct ReversiMoveMade has copy, drop {
        game_id: ID,
        player: address,
        position: u8,
        pieces_flipped: u8,
        move_time: u64,
    }

    public struct ReversiAIMoveMade has copy, drop {
        game_id: ID,
        position: u8,
        pieces_flipped: u8,
        difficulty: u8,
        strategy: u8,
    }

    public struct ReversiGameFinished has copy, drop {
        game_id: ID,
        winner: u8,
        player_score: u8,
        ai_score: u8,
        total_time: u64,
    }

    public struct ReversiTrophyAwarded has copy, drop {
        trophy_id: ID,
        game_id: ID,
        player: address,
        rarity: u8,
        strategy: u8,
    }

    // === Public Functions ===

    /// Create a new Reversi AI game
    entry fun new_reversi_game(
        difficulty: u8, 
        r: &Random,
        clock: &Clock, 
        ctx: &mut TxContext
    ) {
        assert!(difficulty >= DIFFICULTY_EASY && difficulty <= DIFFICULTY_HARD, EInvalidDifficulty);
        
        let mut generator = random::new_generator(r, ctx);
        let initial_strategy = select_random_reversi_strategy(&mut generator, difficulty);
        
        let mut board = vector::empty<u8>();
        let mut i = 0;
        while (i < TOTAL_CELLS) {
            vector::push_back(&mut board, MARK_EMPTY);
            i = i + 1;
        };

        // Set up initial Reversi position
        *vector::borrow_mut(&mut board, 27) = MARK_WHITE; // d4
        *vector::borrow_mut(&mut board, 28) = MARK_BLACK; // e4
        *vector::borrow_mut(&mut board, 35) = MARK_BLACK; // d5
        *vector::borrow_mut(&mut board, 36) = MARK_WHITE; // e5

        let timestamp = clock::timestamp_ms(clock);
        let game = ReversiGame {
            id: object::new(ctx),
            board,
            player: tx_context::sender(ctx),
            turn: 0, // Player (Black) starts first
            game_status: GAME_ACTIVE,
            player_pieces: 2,
            ai_pieces: 2,
            difficulty,
            start_time: timestamp,
            player_move_times: vector::empty<u64>(),
            valid_moves_count: 4, // Initial valid moves for player
            consecutive_passes: 0,
            ai_strategy: initial_strategy,
        };

        event::emit(ReversiGameCreated {
            game_id: object::id(&game),
            player: tx_context::sender(ctx),
            difficulty,
            timestamp,
        });

        transfer::share_object(game);
    }

    /// Player makes a move - SECURE ENTRY POINT
    entry fun reversi_player_move(
        game: &mut ReversiGame,
        position: u8,
        r: &Random,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Validations
        assert!(game.game_status == GAME_ACTIVE, EGameNotActive);
        assert!(sender == game.player, ENotPlayerTurn);
        assert!(game.turn == 0, ENotPlayerTurn); // Must be player's turn
        assert!(position < TOTAL_CELLS, EInvalidMove);
        assert!(*vector::borrow(&game.board, (position as u64)) == MARK_EMPTY, EInvalidPosition);

        // Check if move is valid (can flip at least one piece)
        let flipped_pieces = get_flipped_pieces(&game.board, position, MARK_BLACK);
        assert!(vector::length(&flipped_pieces) > 0, EInvalidMove);

        // Track move time
        let move_time = current_time - game.start_time;
        vector::push_back(&mut game.player_move_times, move_time);

        // Make player move and flip pieces
        *vector::borrow_mut(&mut game.board, (position as u64)) = MARK_BLACK;
        flip_pieces(&mut game.board, &flipped_pieces, MARK_BLACK);

        // Update piece counts
        let pieces_flipped = (vector::length(&flipped_pieces) as u8);
        game.player_pieces = game.player_pieces + 1 + pieces_flipped;
        game.ai_pieces = game.ai_pieces - pieces_flipped;

        event::emit(ReversiMoveMade {
            game_id: object::id(game),
            player: sender,
            position,
            pieces_flipped,
            move_time,
        });

        // Reset consecutive passes
        game.consecutive_passes = 0;

        // Check if player won (all pieces or no moves left)
        if (game.player_pieces + game.ai_pieces == TOTAL_CELLS || 
            !has_valid_moves(&game.board, MARK_WHITE)) {
            
            if (game.player_pieces > game.ai_pieces) {
                game.game_status = GAME_PLAYER_WIN;
                award_reversi_trophy(game, current_time, ctx);
            } else if (game.ai_pieces > game.player_pieces) {
                game.game_status = GAME_AI_WIN;
            } else {
                game.game_status = GAME_DRAW;
            };

            event::emit(ReversiGameFinished {
                game_id: object::id(game),
                winner: game.game_status,
                player_score: game.player_pieces,
                ai_score: game.ai_pieces,
                total_time: current_time - game.start_time,
            });
            return // IMPORTANT: Return here to prevent AI move
        };

        // Switch to AI turn
        game.turn = 1;

        // AI makes a move immediately
        ai_move_reversi(game, r, clock, ctx);
    }

    /// Award trophy to winning player
    fun award_reversi_trophy(game: &ReversiGame, current_time: u64, ctx: &mut TxContext) {
        let strategy_pattern = analyze_strategy_pattern(&game.board);
        let thinking_time = calculate_total_thinking_time(&game.player_move_times);
        let score_diff = if (game.player_pieces > game.ai_pieces) { 
            game.player_pieces - game.ai_pieces 
        } else { 0 };
        
        let rarity = calculate_reversi_trophy_rarity(
            score_diff,
            game.difficulty,
            strategy_pattern,
            thinking_time
        );

        let trophy = ReversiTrophy {
            id: object::new(ctx),
            winner: game.player,
            rarity,
            final_score: score_diff,
            ai_difficulty: game.difficulty,
            strategy_pattern,
            thinking_time,
            final_board: game.board,
            timestamp: current_time,
            name: get_trophy_name(rarity, strategy_pattern),
            description: get_trophy_description(rarity, score_diff, game.difficulty),
            image_url: get_trophy_image_url(rarity),
        };

        event::emit(ReversiTrophyAwarded {
            trophy_id: object::id(&trophy),
            game_id: object::id(game),
            player: game.player,
            rarity,
            strategy: strategy_pattern,
        });

        transfer::public_transfer(trophy, game.player);
    }

    // === AI Logic ===

    /// AI makes a move using secure randomness
    fun ai_move_reversi(
        game: &mut ReversiGame, 
        r: &Random,
        clock: &Clock, 
        ctx: &mut TxContext
    ) {
        let mut generator = random::new_generator(r, ctx);
        
        // Randomly adjust strategy occasionally
        if (should_change_reversi_strategy(&mut generator, game.player_pieces + game.ai_pieces)) {
            game.ai_strategy = select_random_reversi_strategy(&mut generator, game.difficulty);
        };

        // Find valid moves
        let valid_moves = get_all_valid_moves(&game.board, MARK_WHITE);
        
        if (vector::is_empty(&valid_moves)) {
            // AI must pass
            game.consecutive_passes = game.consecutive_passes + 1;
            game.turn = 0; // Back to player
            
            // Check if game ends (both players pass or board full)
            if (game.consecutive_passes >= 2 || game.player_pieces + game.ai_pieces == TOTAL_CELLS) {
                if (game.player_pieces > game.ai_pieces) {
                    game.game_status = GAME_PLAYER_WIN;
                    award_reversi_trophy(game, clock::timestamp_ms(clock), ctx);
                } else if (game.ai_pieces > game.player_pieces) {
                    game.game_status = GAME_AI_WIN;
                } else {
                    game.game_status = GAME_DRAW;
                };

                event::emit(ReversiGameFinished {
                    game_id: object::id(game),
                    winner: game.game_status,
                    player_score: game.player_pieces,
                    ai_score: game.ai_pieces,
                    total_time: clock::timestamp_ms(clock) - game.start_time,
                });
            };
            return
        };

        // Select AI move with randomness - FIXED: Add safety check
        let ai_position = calculate_reversi_ai_move(&game.board, &valid_moves, game.difficulty, game.ai_strategy, &mut generator);
        
        // Make AI move
        let flipped = get_flipped_pieces(&game.board, ai_position, MARK_WHITE);
        *vector::borrow_mut(&mut game.board, (ai_position as u64)) = MARK_WHITE;
        flip_pieces(&mut game.board, &flipped, MARK_WHITE);
        
        // Update piece counts
        let pieces_flipped = (vector::length(&flipped) as u8);
        game.ai_pieces = game.ai_pieces + 1 + pieces_flipped;
        game.player_pieces = game.player_pieces - pieces_flipped;

        event::emit(ReversiAIMoveMade {
            game_id: object::id(game),
            position: ai_position,
            pieces_flipped,
            difficulty: game.difficulty,
            strategy: game.ai_strategy,
        });

        // Reset consecutive passes and switch to player
        game.consecutive_passes = 0;
        game.turn = 0;

        // Check if AI won
        if (game.player_pieces + game.ai_pieces == TOTAL_CELLS || 
            !has_valid_moves(&game.board, MARK_BLACK)) {
            
            if (game.ai_pieces > game.player_pieces) {
                game.game_status = GAME_AI_WIN;
            } else if (game.player_pieces > game.ai_pieces) {
                game.game_status = GAME_PLAYER_WIN;
                award_reversi_trophy(game, clock::timestamp_ms(clock), ctx);
            } else {
                game.game_status = GAME_DRAW;
            };

            event::emit(ReversiGameFinished {
                game_id: object::id(game),
                winner: game.game_status,
                player_score: game.player_pieces,
                ai_score: game.ai_pieces,
                total_time: clock::timestamp_ms(clock) - game.start_time,
            });
        };
    }

    /// Select random strategy for Reversi AI
    fun select_random_reversi_strategy(generator: &mut RandomGenerator, difficulty: u8): u8 {
        let rand_val = random::generate_u8_in_range(generator, 1, 101);
        
        match (difficulty) {
            DIFFICULTY_EASY => {
                if (rand_val <= 70) STRATEGY_MOBILITY
                else STRATEGY_CORNER_CONTROL
            },
            DIFFICULTY_MEDIUM => {
                if (rand_val <= 50) STRATEGY_CORNER_CONTROL
                else STRATEGY_MOBILITY
            },
            DIFFICULTY_HARD => {
                if (rand_val <= 40) STRATEGY_CORNER_CONTROL
                else STRATEGY_MOBILITY
            },
            _ => STRATEGY_MOBILITY
        }
    }

    /// Determine if AI should change strategy
    fun should_change_reversi_strategy(generator: &mut RandomGenerator, total_pieces: u8): bool {
        // Change strategy every 8-12 pieces with some probability
        if (total_pieces % 10 == 0) {
            let chance = random::generate_u8_in_range(generator, 1, 101);
            chance <= 25 // 25% chance to change strategy
        } else {
            false
        }
    }

    /// Calculate AI move for Reversi with randomness - FIXED
    fun calculate_reversi_ai_move(
        board: &vector<u8>,
        valid_moves: &vector<u8>,
        difficulty: u8,
        _strategy: u8,
        generator: &mut RandomGenerator
    ): u8 {
        // SAFETY CHECK: Ensure we have valid moves
        assert!(!vector::is_empty(valid_moves), ENoValidMoves);
        
        match (difficulty) {
            DIFFICULTY_EASY => {
                // 60% random, 40% best
                let decision = random::generate_u8_in_range(generator, 1, 101);
                if (decision <= 60) {
                    // FIXED: Safe random selection
                    let len = vector::length(valid_moves);
                    let random_val = random::generate_u64(generator);
                    let idx = random_val % len;
                    *vector::borrow(valid_moves, idx)
                } else {
                    find_best_reversi_move(board, valid_moves)
                }
            },
            DIFFICULTY_MEDIUM => {
                // 30% random, 70% best
                let decision = random::generate_u8_in_range(generator, 1, 101);
                if (decision <= 30) {
                    // FIXED: Safe random selection
                    let len = vector::length(valid_moves);
                    let random_val = random::generate_u64(generator);
                    let idx = random_val % len;
                    *vector::borrow(valid_moves, idx)
                } else {
                    find_best_reversi_move(board, valid_moves)
                }
            },
            DIFFICULTY_HARD => {
                // 10% random, 90% best (with random tie-breaking)
                let decision = random::generate_u8_in_range(generator, 1, 101);
                if (decision <= 10) {
                    // FIXED: Safe random selection
                    let len = vector::length(valid_moves);
                    let random_val = random::generate_u64(generator);
                    let idx = random_val % len;
                    *vector::borrow(valid_moves, idx)
                } else {
                    find_best_reversi_move_with_random_tiebreak(board, valid_moves, generator)
                }
            },
            _ => {
                // FIXED: Safe random selection for default case
                let len = vector::length(valid_moves);
                let random_val = random::generate_u64(generator);
                let idx = random_val % len;
                *vector::borrow(valid_moves, idx)
            }
        }
    }

    /// Flip pieces on the board
    fun flip_pieces(board: &mut vector<u8>, positions: &vector<u8>, player: u8) {
        let mut i = 0;
        while (i < vector::length(positions)) {
            let pos = *vector::borrow(positions, i);
            *vector::borrow_mut(board, (pos as u64)) = player;
            i = i + 1;
        };
    }

    /// Check if player has any valid moves
    fun has_valid_moves(board: &vector<u8>, player: u8): bool {
        let mut pos = 0;
        while (pos < TOTAL_CELLS) {
            if (*vector::borrow(board, (pos as u64)) == MARK_EMPTY) {
                let flipped = get_flipped_pieces(board, pos, player);
                if (vector::length(&flipped) > 0) {
                    return true
                };
            };
            pos = pos + 1;
        };
        false
    }

    /// Get all valid moves for a player
    fun get_all_valid_moves(board: &vector<u8>, player: u8): vector<u8> {
        let mut valid_moves = vector::empty<u8>();
        
        let mut pos = 0;
        while (pos < TOTAL_CELLS) {
            if (*vector::borrow(board, (pos as u64)) == MARK_EMPTY) {
                let flipped = get_flipped_pieces(board, pos, player);
                if (vector::length(&flipped) > 0) {
                    vector::push_back(&mut valid_moves, pos);
                };
            };
            pos = pos + 1;
        };
        
        valid_moves
    }

    /// Get pieces that would be flipped by a move
    fun get_flipped_pieces(board: &vector<u8>, position: u8, player: u8): vector<u8> {
        let mut flipped = vector::empty<u8>();
        let opponent = if (player == MARK_WHITE) { MARK_BLACK } else { MARK_WHITE };
        
        let x = position % BOARD_SIZE;
        let y = position / BOARD_SIZE;
        
        // Check all 8 directions (dx, dy)
        let mut dir_idx = 0;
        while (dir_idx < 8) {
            let mut temp_flipped = vector::empty<u8>();
            
            let (dx, dy) = if (dir_idx == 0) { (255, 255) } // (-1, -1) using u8 wraparound
                else if (dir_idx == 1) { (255, 0) }   // (-1, 0)
                else if (dir_idx == 2) { (255, 1) }   // (-1, 1)
                else if (dir_idx == 3) { (0, 255) }   // (0, -1)
                else if (dir_idx == 4) { (0, 1) }     // (0, 1)
                else if (dir_idx == 5) { (1, 255) }   // (1, -1)
                else if (dir_idx == 6) { (1, 0) }     // (1, 0)
                else { (1, 1) };                      // (1, 1)
            
            let mut nx = x;
            let mut ny = y;
            
            // Move in direction
            loop {
                // Calculate next position with bounds checking
                if (dx == 255) { // -1
                    if (nx == 0) break;
                    nx = nx - 1;
                } else if (dx == 1) {
                    nx = nx + 1;
                    if (nx >= BOARD_SIZE) break;
                };
                
                if (dy == 255) { // -1
                    if (ny == 0) break;
                    ny = ny - 1;
                } else if (dy == 1) {
                    ny = ny + 1;
                    if (ny >= BOARD_SIZE) break;
                };
                
                let next_pos = ny * BOARD_SIZE + nx;
                let piece = *vector::borrow(board, (next_pos as u64));
                
                if (piece == opponent) {
                    vector::push_back(&mut temp_flipped, next_pos);
                } else if (piece == player) {
                    // Found our piece, add all temp_flipped to result
                    vector::append(&mut flipped, temp_flipped);
                    break
                } else {
                    // Empty cell, no flip in this direction
                    break
                };
            };
            
            dir_idx = dir_idx + 1;
        };
        
        flipped
    }

    // === Helper Functions ===

    /// Analyze the winning strategy pattern
    fun analyze_strategy_pattern(board: &vector<u8>): u8 {
        let mut corner_count = 0;
        let corners = vector[0, 7, 56, 63];
        
        let mut i = 0;
        while (i < vector::length(&corners)) {
            let corner = *vector::borrow(&corners, i);
            if (*vector::borrow(board, (corner as u64)) == MARK_BLACK) {
                corner_count = corner_count + 1;
            };
            i = i + 1;
        };
        
        if (corner_count >= 3) {
            STRATEGY_CORNER_CONTROL
        } else {
            STRATEGY_MOBILITY
        }
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

    /// Calculate trophy rarity
    fun calculate_reversi_trophy_rarity(
        score_diff: u8,
        difficulty: u8,
        _strategy: u8,  // Prefixed with underscore
        thinking_time: u64
    ): u8 {
        let mut base_rarity = RARITY_BRONZE;
        
        // Score difference bonus
        if (score_diff >= 20) {
            base_rarity = RARITY_SILVER;
        };
        if (score_diff >= 35) {
            base_rarity = RARITY_GOLD;
        };
        if (score_diff >= 50) {
            base_rarity = RARITY_DIAMOND;
        };
        
        // Difficulty bonus
        if (difficulty == DIFFICULTY_HARD && base_rarity < RARITY_DIAMOND) {
            base_rarity = base_rarity + 1;
        };
        
        // Fast thinking bonus
        if (thinking_time < 30000 && base_rarity < RARITY_DIAMOND) { // < 30 seconds
            base_rarity = base_rarity + 1;
        };
        
        base_rarity
    }

    /// Get trophy name
    fun get_trophy_name(rarity: u8, strategy: u8): String {
        if (rarity == RARITY_DIAMOND) {
            string::utf8(b"Diamond Reversi Master")
        } else if (rarity == RARITY_GOLD) {
            if (strategy == STRATEGY_CORNER_CONTROL) {
                string::utf8(b"Golden Corner Strategist")
            } else {
                string::utf8(b"Golden Reversi Champion")
            }
        } else if (rarity == RARITY_SILVER) {
            string::utf8(b"Silver Disc Dominator")
        } else {
            string::utf8(b"Bronze Reversi Victor")
        }
    }

    /// Get trophy description
    fun get_trophy_description(rarity: u8, _score_diff: u8, _difficulty: u8): String {
        if (rarity == RARITY_DIAMOND) {
            string::utf8(b"Legendary Reversi mastery - dominated the battlefield with supreme strategy!")
        } else {
            string::utf8(b"Victory against AI - strategic thinking rewarded!")
        }
    }

    /// Get trophy image URL
    fun get_trophy_image_url(rarity: u8): String {
        if (rarity == RARITY_DIAMOND) {
            string::utf8(b"https://example.com/diamond_reversi_trophy.png")
        } else if (rarity == RARITY_GOLD) {
            string::utf8(b"https://example.com/gold_reversi_trophy.png")
        } else if (rarity == RARITY_SILVER) {
            string::utf8(b"https://example.com/silver_reversi_trophy.png")
        } else {
            string::utf8(b"https://example.com/bronze_reversi_trophy.png")
        }
    }

    /// Find best move among valid moves (most pieces flipped) - FIXED
    fun find_best_reversi_move(board: &vector<u8>, valid_moves: &vector<u8>): u8 {
        // SAFETY CHECK: Ensure we have valid moves
        assert!(!vector::is_empty(valid_moves), ENoValidMoves);
        
        let mut best_move = *vector::borrow(valid_moves, 0);
        let mut best_flips = 0;
        
        let mut i = 0;
        while (i < vector::length(valid_moves)) {
            let move_pos = *vector::borrow(valid_moves, i);
            let flipped = get_flipped_pieces(board, move_pos, MARK_WHITE);
            let flip_count = vector::length(&flipped);
            
            if (flip_count > best_flips) {
                best_flips = flip_count;
                best_move = move_pos;
            };
            
            i = i + 1;
        };
        
        best_move
    }

    /// Find best move with random tie-breaking - FIXED
    fun find_best_reversi_move_with_random_tiebreak(board: &vector<u8>, valid_moves: &vector<u8>, generator: &mut RandomGenerator): u8 {
        // SAFETY CHECK: Ensure we have valid moves
        assert!(!vector::is_empty(valid_moves), ENoValidMoves);
        
        let mut best_moves = vector::empty<u8>();
        let mut best_flips = 0;
        
        let mut i = 0;
        while (i < vector::length(valid_moves)) {
            let move_pos = *vector::borrow(valid_moves, i);
            let flipped = get_flipped_pieces(board, move_pos, MARK_WHITE);
            let flip_count = vector::length(&flipped);
            
            if (flip_count > best_flips) {
                best_moves = vector::empty<u8>();
                vector::push_back(&mut best_moves, move_pos);
                best_flips = flip_count;
            } else if (flip_count == best_flips) {
                vector::push_back(&mut best_moves, move_pos);
            };
            
            i = i + 1;
        };
        
        // Randomly select from best moves - FIXED
        if (vector::length(&best_moves) > 1) {
            let random_val = random::generate_u64(generator);
            let idx = random_val % vector::length(&best_moves);
            *vector::borrow(&best_moves, idx)
        } else {
            *vector::borrow(&best_moves, 0)
        }
    }

    // === Getters ===

    public fun board(game: &ReversiGame): &vector<u8> { &game.board }
    public fun player(game: &ReversiGame): address { game.player }
    public fun turn(game: &ReversiGame): u8 { game.turn }
    public fun game_status(game: &ReversiGame): u8 { game.game_status }
    public fun player_pieces(game: &ReversiGame): u8 { game.player_pieces }
    public fun ai_pieces(game: &ReversiGame): u8 { game.ai_pieces }
    public fun difficulty(game: &ReversiGame): u8 { game.difficulty }
    public fun moves_count(game: &ReversiGame): u8 { (vector::length(&game.player_move_times) as u8) * 2 }
} 