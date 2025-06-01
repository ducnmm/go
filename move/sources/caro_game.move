// 1.	AI strategy varies based on difficulty:
// 	-	Easy: 70% chance of making a random nearby move, 30% chance of making the optimal move.
// 	-	Medium: 30% random move, 70% optimal move.
// 	-	Hard: 100% optimal move (no randomness).
// 2.	AI decision-making logic:
// 	-	First, the AI checks if it can win immediately.
// 	-	If not, it checks if the player is about to win and blocks that move.
// 	-	If neither applies, it calculates the best move using a scoring system based on position and patterns.
// 	-	If there’s no obvious move, it takes the center or any valid cell.

/// Single-player caro game (9x9 with 5 in a row to win) where the player competes against a smart contract AI.
/// The player is always X and the AI is always O.
/// Winner receives a Trophy NFT with rarity based on performance.
#[allow(duplicate_alias)]
module tic_tac_toe::caro_game {
    
    // === Imports ===
    use sui::object::{Self, UID, ID};
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
    // Board size
    const BOARD_SIZE: u8 = 9;
    const TOTAL_CELLS: u8 = 81; // 9 * 9
    
    const MARK_EMPTY: u8 = 0;
    const MARK_X: u8 = 1;  // Player
    const MARK_O: u8 = 2;  // Computer

    const GAME_ACTIVE: u8 = 0;
    const GAME_PLAYER_WIN: u8 = 1;
    const GAME_COMPUTER_WIN: u8 = 2;
    const GAME_DRAW: u8 = 3;

    // Computer Difficulty levels
    const DIFFICULTY_EASY: u8 = 1;
    const DIFFICULTY_MEDIUM: u8 = 2;
    const DIFFICULTY_HARD: u8 = 3;

    // Trophy rarities
    const RARITY_BRONZE: u8 = 1;
    const RARITY_SILVER: u8 = 2;
    const RARITY_GOLD: u8 = 3;
    const RARITY_DIAMOND: u8 = 4;

    // Win patterns
    const PATTERN_CENTER_CONTROL: u8 = 1;
    const PATTERN_CORNER_TRAP: u8 = 2;
    const PATTERN_FORK_ATTACK: u8 = 3;
    const PATTERN_DEFENSIVE_WIN: u8 = 4;

    // === Structs ===

    /// Represents a caro game vs Computer (9x9 board)
    public struct CaroGame has key, store {
        id: UID,
        board: vector<u8>, // 9x9 board represented as vector of 81 elements
        player: address,   // The human player (always X)
        turn: u8,         // 0 = player turn, 1 = Computer turn
        game_status: u8,  // 0: active, 1: player wins, 2: Computer wins, 3: draw
        moves_count: u8,  // Number of moves played
        difficulty: u8,   // Computer difficulty level
        start_time: u64,  // Game start timestamp
        player_move_times: vector<u64>, // Track thinking time for each move
    }

    /// Trophy NFT sent to the winner
    public struct Trophy has key, store {
        id: UID,
        winner: address,
        rarity: u8,           // 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
        moves_to_win: u8,     // Moves to win
        computer_difficulty: u8,    // 1=Easy, 2=Medium, 3=Hard
        win_pattern: u8,      // Type of winning strategy
        thinking_time: u64,   // Total thinking time in milliseconds
        final_board: vector<u8>,
        timestamp: u64,
        name: String,
        description: String,
        image_url: String,
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

    public struct ComputerMoveMade has copy, drop {
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

    /// Create a new Caro game
    public fun new_caro_game(difficulty: u8, clock: &Clock, ctx: &mut TxContext): CaroGame {
        assert!(difficulty >= DIFFICULTY_EASY && difficulty <= DIFFICULTY_HARD, EInvalidDifficulty);
        
        let mut board = vector::empty<u8>();
        let mut i = 0;
        while (i < TOTAL_CELLS) {
            vector::push_back(&mut board, MARK_EMPTY);
            i = i + 1;
        };

        let timestamp = clock::timestamp_ms(clock);
        let game = CaroGame {
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

    /// Create a new shared Caro game
    #[allow(lint(share_owned))]
    public fun new_shared_caro_game(difficulty: u8, clock: &Clock, ctx: &mut TxContext) {
        transfer::share_object(new_caro_game(difficulty, clock, ctx));
    }

    /// Player makes a move (player is always X)
    public fun player_move(
        game: &mut CaroGame,
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
        assert!(position < TOTAL_CELLS, EInvalidMove);
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
        if (game.moves_count == TOTAL_CELLS) {
            game.game_status = GAME_DRAW;
            event::emit(GameFinished {
                game_id: object::id(game),
                winner: GAME_DRAW,
                moves_count: game.moves_count,
                total_time: current_time - game.start_time,
            });
            return
        };

        // Switch to Computer turn
        game.turn = 1;

        // Computer makes a move immediately
        computer_move(game, clock, ctx);
    }

    /// Computer makes a move (Computer is always O)
    fun computer_move(game: &mut CaroGame, clock: &Clock, _ctx: &mut TxContext) {
        // Calculate Computer move based on difficulty
        let computer_position = calculate_computer_move(&game.board, game.difficulty, clock);
        
        *vector::borrow_mut(&mut game.board, (computer_position as u64)) = MARK_O;
        game.moves_count = game.moves_count + 1;

        event::emit(ComputerMoveMade {
            game_id: object::id(game),
            position: computer_position,
            difficulty: game.difficulty,
        });

        // Check if Computer won
        if (check_winner(&game.board, MARK_O)) {
            game.game_status = GAME_COMPUTER_WIN;
            event::emit(GameFinished {
                game_id: object::id(game),
                winner: GAME_COMPUTER_WIN,
                moves_count: game.moves_count,
                total_time: clock::timestamp_ms(clock) - game.start_time,
            });
            return
        };

        // Check for draw
        if (game.moves_count == TOTAL_CELLS) {
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
    fun award_trophy(game: &CaroGame, current_time: u64, ctx: &mut TxContext) {
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
            computer_difficulty: game.difficulty,
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
    public fun burn_game(game: CaroGame) {
        assert!(game.game_status != GAME_ACTIVE, EGameNotFinished);
        let CaroGame { id, .. } = game;
        object::delete(id);
    }

    // === Helper Functions ===

    /// Calculate Computer move based on difficulty level
    fun calculate_computer_move(board: &vector<u8>, difficulty: u8, clock: &Clock): u8 {
        // For gas efficiency, use simplified algorithms based on difficulty
        
        if (difficulty == DIFFICULTY_EASY) {
            // Easy: 30% optimal, 70% random adjacent
            let seed = clock::timestamp_ms(clock) % 10;
            if (seed < 3) {
                calculate_optimal_move(board)
            } else {
                get_random_adjacent_move(board, clock)
            }
        } else if (difficulty == DIFFICULTY_MEDIUM) {
            // Medium: 70% optimal, 30% random adjacent
            let seed = clock::timestamp_ms(clock) % 10;
            if (seed < 7) {
                calculate_optimal_move(board)
            } else {
                get_random_adjacent_move(board, clock)
            }
        } else {
            // Hard: Always optimal
            calculate_optimal_move(board)
        }
    }

    /// Calculate optimal move using move evaluation scoring
    fun calculate_optimal_move(board: &vector<u8>): u8 {
        // 1. Try to win
        let win_move = find_winning_move(board, MARK_O);
        if (win_move != 255) return win_move;

        // 2. Block player from winning
        let block_move = find_winning_move(board, MARK_X);
        if (block_move != 255) return block_move;

        // 3. Use move evaluation to find best position
        let mut best_pos = 255;
        let mut best_score = 0;
        
        let mut pos = 0;
        while (pos < TOTAL_CELLS) {
            if (*vector::borrow(board, (pos as u64)) == MARK_EMPTY) {
                let score = evaluate_move_score(board, pos, MARK_O);
                if (best_pos == 255 || score > best_score) {
                    best_pos = pos;
                    best_score = score;
                };
            };
            pos = pos + 1;
        };

        if (best_pos != 255) {
            return best_pos
        };

        // Fallback: take center if available
        let center_pos = 4 * BOARD_SIZE + 4;
        if (*vector::borrow(board, (center_pos as u64)) == MARK_EMPTY) return (center_pos as u8);

        // Last resort: take any available position
        let mut pos = 0;
        while (pos < TOTAL_CELLS) {
            if (*vector::borrow(board, (pos as u64)) == MARK_EMPTY) return (pos as u8);
            pos = pos + 1;
        };
        
        // Should never reach here in a valid game
        0
    }

    /// Evaluate move score for a position
    fun evaluate_move_score(board: &vector<u8>, pos: u8, player: u8): u64 {
        let board_size = (BOARD_SIZE as u64); // 9
        let opponent = if (player == MARK_O) { MARK_X } else { MARK_O };
        let mut score = 0;

        // Position being evaluated
        let x = (pos as u64) % board_size;
        let y = (pos as u64) / board_size;

        // Check horizontal direction
        score = score + evaluate_direction(board, x, y, 1, 0, player, opponent, board_size);
        // Check vertical direction  
        score = score + evaluate_direction(board, x, y, 0, 1, player, opponent, board_size);
        // Check diagonal right
        score = score + evaluate_direction(board, x, y, 1, 1, player, opponent, board_size);
        // Check diagonal left
        score = score + evaluate_direction_left_diag(board, x, y, player, opponent, board_size);

        // Prioritize center
        let center = 4 * board_size + 4;
        if ((pos as u64) == center) {
            score = score + 30;
        };

        score
    }

    /// Evaluate score in a specific direction
    fun evaluate_direction(board: &vector<u8>, x: u64, y: u64, dx: u64, dy: u64, player: u8, opponent: u8, board_size: u64): u64 {
        let mut count_self = 0;
        let mut count_oppo = 0;

        // Check positive direction
        let mut step = 1;
        while (step < 6) {
            let nx = x + dx * step;
            let ny = y + dy * step;
            if (nx < board_size && ny < board_size) {
                let idx = ny * board_size + nx;
                if (*vector::borrow(board, idx) == player) count_self = count_self + 1
                else if (*vector::borrow(board, idx) == opponent) count_oppo = count_oppo + 1;
            };
            step = step + 1;
        };

        // Check negative direction
        step = 1;
        while (step < 6) {
            let nx = if (x >= dx * step) { x - dx * step } else { 999 };
            let ny = if (y >= dy * step) { y - dy * step } else { 999 };
            if (nx < board_size && ny < board_size && nx != 999 && ny != 999) {
                let idx = ny * board_size + nx;
                if (*vector::borrow(board, idx) == player) count_self = count_self + 1
                else if (*vector::borrow(board, idx) == opponent) count_oppo = count_oppo + 1;
            };
            step = step + 1;
        };

        (count_self * count_self * 10) + (count_oppo * count_oppo * 5)
    }

    /// Evaluate score in left diagonal direction (special case for negative slope)
    fun evaluate_direction_left_diag(board: &vector<u8>, x: u64, y: u64, player: u8, opponent: u8, board_size: u64): u64 {
        let mut count_self = 0;
        let mut count_oppo = 0;

        // Check positive direction (x+1, y-1)
        let mut step = 1;
        while (step < 6) {
            let nx = x + step;
            let ny = if (y >= step) { y - step } else { 999 };
            if (nx < board_size && ny < board_size && ny != 999) {
                let idx = ny * board_size + nx;
                if (*vector::borrow(board, idx) == player) count_self = count_self + 1
                else if (*vector::borrow(board, idx) == opponent) count_oppo = count_oppo + 1;
            };
            step = step + 1;
        };

        // Check negative direction (x-1, y+1)
        step = 1;
        while (step < 6) {
            let nx = if (x >= step) { x - step } else { 999 };
            let ny = y + step;
            if (nx < board_size && ny < board_size && nx != 999) {
                let idx = ny * board_size + nx;
                if (*vector::borrow(board, idx) == player) count_self = count_self + 1
                else if (*vector::borrow(board, idx) == opponent) count_oppo = count_oppo + 1;
            };
            step = step + 1;
        };

        (count_self * count_self * 10) + (count_oppo * count_oppo * 5)
    }

    /// Get random move adjacent to existing pieces
    fun get_random_adjacent_move(board: &vector<u8>, clock: &Clock): u8 {
        let mut candidate_positions = vector::empty<u8>();
        let board_size = (BOARD_SIZE as u64); // 9

        let mut i = 0;
        // Step 1: scan entire board
        while (i < TOTAL_CELLS) {
            let cell = *vector::borrow(board, (i as u64));
            if (cell != MARK_EMPTY) {
                let x = (i as u64) % board_size;
                let y = (i as u64) / board_size;

                // Step 2: scan 8 directions around (x, y)
                let mut check_y = if (y > 0) { y - 1 } else { y };
                let end_y = if (y + 1 < board_size) { y + 1 } else { y };
                
                while (check_y <= end_y) {
                    let mut check_x = if (x > 0) { x - 1 } else { x };
                    let end_x = if (x + 1 < board_size) { x + 1 } else { x };
                    
                    while (check_x <= end_x) {
                        if (!(check_x == x && check_y == y)) {
                            if (check_x < board_size && check_y < board_size) {
                                let n_idx = check_y * board_size + check_x;
                                if (*vector::borrow(board, n_idx) == MARK_EMPTY && !vector::contains(&candidate_positions, &(n_idx as u8))) {
                                    vector::push_back(&mut candidate_positions, (n_idx as u8));
                                }
                            }
                        };
                        check_x = check_x + 1;
                    };
                    check_y = check_y + 1;
                };
            };
            i = i + 1;
        };

        // If no adjacent positions -> fallback to random on entire board
        if (vector::is_empty(&candidate_positions)) {
            return get_random_move(board, clock)
        };

        let seed = clock::timestamp_ms(clock) % vector::length(&candidate_positions);
        *vector::borrow(&candidate_positions, seed)
    }

    /// Find a winning move for the given player
    fun find_winning_move(board: &vector<u8>, player: u8): u8 {
        let mut pos = 0;
        while (pos < TOTAL_CELLS) {
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
        while (i < TOTAL_CELLS) {
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
        // Check all possible 5-in-a-row combinations
        
        // Check rows
        let mut row = 0;
        while (row < BOARD_SIZE) {
            let mut col = 0;
            while (col <= BOARD_SIZE - 5) {
                if (*vector::borrow(board, (row * BOARD_SIZE + col) as u64) == player &&
                    *vector::borrow(board, (row * BOARD_SIZE + col + 1) as u64) == player &&
                    *vector::borrow(board, (row * BOARD_SIZE + col + 2) as u64) == player &&
                    *vector::borrow(board, (row * BOARD_SIZE + col + 3) as u64) == player &&
                    *vector::borrow(board, (row * BOARD_SIZE + col + 4) as u64) == player) {
                    return true
                };
                col = col + 1;
            };
            row = row + 1;
        };

        // Check columns
        let mut col = 0;
        while (col < BOARD_SIZE) {
            let mut row = 0;
            while (row <= BOARD_SIZE - 5) {
                if (*vector::borrow(board, (row * BOARD_SIZE + col) as u64) == player &&
                    *vector::borrow(board, ((row + 1) * BOARD_SIZE + col) as u64) == player &&
                    *vector::borrow(board, ((row + 2) * BOARD_SIZE + col) as u64) == player &&
                    *vector::borrow(board, ((row + 3) * BOARD_SIZE + col) as u64) == player &&
                    *vector::borrow(board, ((row + 4) * BOARD_SIZE + col) as u64) == player) {
                    return true
                };
                row = row + 1;
            };
            col = col + 1;
        };

        // Check diagonal (top-left to bottom-right)
        let mut row = 0;
        while (row <= BOARD_SIZE - 5) {
            let mut col = 0;
            while (col <= BOARD_SIZE - 5) {
                if (*vector::borrow(board, (row * BOARD_SIZE + col) as u64) == player &&
                    *vector::borrow(board, ((row + 1) * BOARD_SIZE + col + 1) as u64) == player &&
                    *vector::borrow(board, ((row + 2) * BOARD_SIZE + col + 2) as u64) == player &&
                    *vector::borrow(board, ((row + 3) * BOARD_SIZE + col + 3) as u64) == player &&
                    *vector::borrow(board, ((row + 4) * BOARD_SIZE + col + 4) as u64) == player) {
                    return true
                };
                col = col + 1;
            };
            row = row + 1;
        };

        // Check diagonal (top-right to bottom-left)
        let mut row = 0;
        while (row <= BOARD_SIZE - 5) {
            let mut col = 4;
            while (col < BOARD_SIZE) {
                if (*vector::borrow(board, (row * BOARD_SIZE + col) as u64) == player &&
                    *vector::borrow(board, ((row + 1) * BOARD_SIZE + col - 1) as u64) == player &&
                    *vector::borrow(board, ((row + 2) * BOARD_SIZE + col - 2) as u64) == player &&
                    *vector::borrow(board, ((row + 3) * BOARD_SIZE + col - 3) as u64) == player &&
                    *vector::borrow(board, ((row + 4) * BOARD_SIZE + col - 4) as u64) == player) {
                    return true
                };
                col = col + 1;
            };
            row = row + 1;
        };

        false
    }

    /// Analyze the winning pattern
    fun analyze_win_pattern(board: &vector<u8>): u8 {
        // Check if center was used (center of 9x9 board is at position 40: 4*9+4)
        let center_pos = 4 * BOARD_SIZE + 4;
        if (*vector::borrow(board, (center_pos as u64)) == MARK_X) {
            return PATTERN_CENTER_CONTROL
        };

        // Check for corner strategy (9x9 corners are at 0, 8, 72, 80)
        let corners_used = (if (*vector::borrow(board, 0) == MARK_X) 1 else 0) +
                          (if (*vector::borrow(board, 8) == MARK_X) 1 else 0) +
                          (if (*vector::borrow(board, 72) == MARK_X) 1 else 0) +
                          (if (*vector::borrow(board, 80) == MARK_X) 1 else 0);

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
        computer_difficulty: u8,
        win_pattern: u8,
        thinking_time: u64
    ): u8 {
        // Fix: Calculate actual player moves (since player goes first)
        // Total moves includes both player + computer moves
        // Player moves = (total_moves + 1) / 2
        let player_moves = (moves + 1) / 2;

        let mut base_rarity = if (player_moves == 5) 3      // Gold for 5 player moves (9 total moves)
                             else if (player_moves <= 6) 2   // Silver for 6 player moves (11 total moves)
                             else if (player_moves <= 7) 1   // Bronze for 7 player moves (13 total moves)
                             else 1;                          // Bronze for 8+ player moves

        // Computer difficulty bonus
        base_rarity = base_rarity + (computer_difficulty - 1);

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
    fun get_trophy_metadata(rarity: u8, _pattern: u8, _difficulty: u8): (String, String, String) {
        let name = if (rarity == RARITY_BRONZE) string::utf8(b"Bronze Strategist")
                   else if (rarity == RARITY_SILVER) string::utf8(b"Silver Tactician")
                   else if (rarity == RARITY_GOLD) string::utf8(b"Gold Master")
                   else if (rarity == RARITY_DIAMOND) string::utf8(b"Diamond Genius")
                   else string::utf8(b"Legend");

        let description = string::utf8(b"Defeated Computer in Caro Game with superior strategy");
        let image_url = string::utf8(b"https://api.example.com/trophy/");

        (name, description, image_url)
    }

    // === View Functions ===

    /// Get game status
    public fun get_game_status(game: &CaroGame): u8 {
        game.game_status
    }

    /// Get current board state
    public fun get_board(game: &CaroGame): vector<u8> {
        game.board
    }

    /// Get whose turn it is
    public fun get_turn(game: &CaroGame): u8 {
        game.turn
    }

    /// Get move count
    public fun get_moves_count(game: &CaroGame): u8 {
        game.moves_count
    }

    /// Get Computer difficulty
    public fun get_difficulty(game: &CaroGame): u8 {
        game.difficulty
    }
}
