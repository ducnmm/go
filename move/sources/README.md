# Sui Move Games - Smart Contracts

This directory contains Move smart contracts for blockchain games on Sui. The project implements single-player games with AI opponents and NFT Trophy reward systems.

## 📁 Smart Contracts

### 1. `caro_game.move` (26KB, 749 lines)
**Caro (Tic-Tac-Toe) vs AI - 9x9 board**

- **Description**: Single-player Caro game on a 9x9 board where players need 5 in a row to win
- **Opponent**: Smart contract AI with 3 difficulty levels (Easy/Medium/Hard)
- **Key Features**:
  - Player is always X, AI is always O
  - Intelligent AI algorithms with different strategies
  - Player thinking time tracking
  - Trophy NFT rewards based on performance (Bronze/Silver/Gold/Diamond)
  - Uses Sui's Random API for AI behavior
- **Events**: GameCreated, MoveMade, ComputerMoveMade, GameFinished, TrophyAwarded

### 2. `reversi_game.move` (26KB, 750 lines)
**Reversi (Othello) vs AI - 8x8 board**

- **Description**: Single-player Reversi (Othello) game on standard 8x8 board
- **Opponent**: Smart contract AI with Sui's Random API
- **Key Features**:
  - Player is Black, AI is White
  - AI with randomized strategies (Corner Control, Mobility)
  - Piece count and move time tracking
  - Trophy NFT with rarity based on final score
  - Handles pass turns when no valid moves available
- **Events**: ReversiGameCreated, ReversiMoveMade, ReversiAIMoveMade, ReversiGameFinished, ReversiTrophyAwarded

## 🎮 Game Implementation

| Game | Board Size | Win Condition | Opponent | Status |
|------|------------|---------------|----------|---------|
| Caro Game | 9x9 | 5 in a row | vs AI | ✅ Active |
| Reversi | 8x8 | Most pieces | vs AI | ✅ Active |

## 🏆 Trophy NFT System

Both games feature NFT Trophy rewards with four rarity levels:

- **Bronze**: Basic performance
- **Silver**: Good performance  
- **Gold**: Great performance
- **Diamond**: Exceptional performance

Trophy rarity is calculated based on:
- Number of moves to win
- Thinking time
- AI difficulty level
- Winning pattern/strategy

## 🤖 AI Implementation

### Caro AI
- 3 difficulty levels (Easy/Medium/Hard)
- Pattern recognition (Center Control, Corner Trap, Fork Attack, Defensive Win)
- Move prediction and blocking
- Random elements for unpredictability

### Reversi AI
- Uses Sui's Random API for secure randomness
- Strategy switching (Corner Control, Mobility)
- Position evaluation
- Adaptive difficulty scaling

## 📊 Events & On-chain Analytics

Both games emit comprehensive events for:
- Game progress tracking
- Player behavior monitoring
- Statistics and analytics
- External integrations

## 🔧 Smart Contract Architecture

- **Single-player games** with AI opponents
- **Shared objects** for game state management
- **Entry functions** for player interactions
- **NFT rewards** for player achievements
- **Random API integration** for secure AI behavior

## 📝 Deployment Information

**Package ID**: `0xd98be67e684314b8c0e30309cde6c6e0349d7fd19bdcb7c08865553fc419c199`  
**Network**: Devnet  
**Modules**: `caro_game`, `reversi_game`

## 🚀 Contract Functions

### Caro Game
- `new_shared_caro_game(difficulty, clock, ctx)` - Create new game
- `player_move(game, position, clock, ctx)` - Make player move
- `computer_move(game, r, clock, ctx)` - AI move (internal)

### Reversi Game  
- `new_reversi_game(difficulty, r, clock, ctx)` - Create new game
- `reversi_player_move(game, position, r, clock, ctx)` - Make player move
- `reversi_ai_move(game, r, clock, ctx)` - AI move (internal)

All contracts use Sui's object model and are optimized for gas efficiency and security. 