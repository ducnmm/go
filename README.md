# Strategy Games dApp

A blockchain-powered strategy games platform built on the Sui Network, featuring classic games like Caro (Tic-Tac-Toe variant) and Reversi with AI opponents and NFT rewards.

https://github.com/user-attachments/assets/31220198-9ccb-4462-9843-042db7ad804e

## Features

### 🎮 Multiple Game Types
- **Caro (9x9)**: Classic five-in-a-row strategy game on a 9x9 board
- **Reversi (Othello)**: Strategic piece-flipping game on an 8x8 board

### 🤖 AI Opponents
- Three difficulty levels for each game type
- Smart AI algorithms providing challenging gameplay
- Different strategies for Caro and Reversi

### 🏆 Blockchain Integration
- **Trophy NFTs**: Earn collectible trophies for game victories
- **On-chain Game State**: All game moves and results stored on Sui blockchain

### 📊 Stats & Achievements
- **NFT Collection Tracking**: View your trophy collection and stats
- **Leaderboard**: Global ranking system based on game performance
- **Achievement System**: Track wins, losses, and gaming milestones

## Smart Contract Integration

### Move Package Structure
The dApp interacts with multiple Move modules deployed on Sui:

- **`caro_game`**: Handles Caro game logic, board state, and AI moves
- **`reversi_game`**: Manages Reversi gameplay, piece flipping, and AI strategies
- **Trophy System**: NFT minting and reward distribution

### Core Smart Contract Functions

#### Game Creation
```typescript
// Create new Caro game with AI difficulty
newAIGame(difficulty: 1|2|3) -> Transaction
// Create new Reversi game with AI difficulty  
newReversiGame(difficulty: 1|2|3) -> Transaction
```

#### Game Moves
```typescript
// Player move in Caro game (position 0-80 for 9x9 board)
playerMove(gameId: string, position: number) -> Transaction
// Player move in Reversi game (position 0-63 for 8x8 board)
reversiPlayerMove(gameId: string, position: number) -> Transaction
```

#### Game State Queries
```typescript
// Retrieve game state from blockchain
useAIGameQuery(gameId: string) -> CaroGame
useReversiGameQuery(gameId: string) -> ReversiGame
```

### Real-time Data Synchronization

#### Automatic Polling
- **5-second intervals**: Continuous polling for AI moves and game updates
- **React Query**: Intelligent caching and background refetching
- **Error Recovery**: Automatic retry on network failures

#### Game State Structure
```typescript
// Caro Game Object
CaroGame {
  id: string              // Sui object ID
  board: number[]         // 81-element array (9x9)
  player: string          // Human player address
  turn: number            // 0=player, 1=AI
  game_status: number     // 0=active, 1=win, 2=lose, 3=draw
  difficulty: number      // 1=easy, 2=medium, 3=hard
  moves_count: number     // Total moves played
  start_time: number      // Game start timestamp
  player_move_times: number[] // Move timing analytics
}

// Reversi Game Object  
ReversiGame {
  id: string              // Sui object ID
  board: number[]         // 64-element array (8x8)
  player: string          // Human player address (Black)
  turn: number            // 0=player, 1=AI
  game_status: number     // 0=active, 1=win, 2=lose, 3=draw
  player_pieces: number   // Player piece count
  ai_pieces: number       // AI piece count
  difficulty: number      // AI difficulty level
  start_time: number      // Game start timestamp
  player_move_times: number[] // Move analytics
}
```

### Advanced Blockchain Features

#### DevInspect Transactions
- **Read-only Queries**: Extract complex game state without gas costs
- **Trophy Status**: Check win/loss status using `devInspectTransactionBlock`
- **Game End Detection**: Determine game outcomes through Move function calls

#### Transaction Management
- **Transaction Signing**: Secure wallet integration via dApp Kit
- **Real-time Feedback**: Toast notifications for transaction status

### Blockchain Data Flow

1. **Game Creation**: User initiates game → Smart contract creates shared object → Object ID returned
2. **Move Execution**: User selects position → Transaction built → Wallet signs → Move validated on-chain
3. **AI Response**: Smart contract processes AI move → Game state updated → Frontend polls for changes
4. **State Sync**: React Query fetches updated state → UI re-renders → Real-time game updates
5. **Game End**: Win condition detected → Trophy NFT minted → Stats updated → Leaderboard refreshed

## Technical Architecture

### Blockchain Connectivity
This dApp demonstrates advanced Sui blockchain integration:

- **Sui TypeScript SDK**: Full integration with Sui's client libraries
- **dApp Kit**: Wallet connection and transaction management using `@mysten/dapp-kit`
- **Smart Contract Interaction**: Direct communication with Move smart contracts for game logic
- **Object-based State Management**: Utilizing Sui's object model for game state persistence

### Game State Management
- **On-chain Validation**: All moves validated by Move smart contracts
- **Real-time Updates**: Live game state synchronization with blockchain
- **Error Recovery**: Robust error handling for blockchain interactions

## Getting Started

### Prerequisites
- Node.js 16+ and pnpm installed
- Sui wallet (like Sui Wallet browser extension)
- Access to Sui network (Devnet recommended for testing)

### Installation

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start development server
pnpm dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
# Build for deployment
pnpm build
```

## Network Configuration

The dApp automatically detects and configures for different Sui networks:

- **Localnet**: Local development with custom explorer
- **Devnet**: Development testing with SuiScan explorer
- **Testnet**: Pre-production testing
- **Mainnet**: Production deployment

## Game URLs

- **Root**: `/` - Game selection and stats
- **Caro Game**: `/caro/{gameId}` - Join specific Caro game
- **Reversi Game**: `/reversi/{gameId}` - Join specific Reversi game
- **Legacy Support**: `/game/{gameId}` - Backwards compatibility

## Smart Contract Integration

This frontend connects to Move smart contracts deployed on Sui that handle:
- Game creation and player coordination
- Move validation and game logic
- Trophy NFT minting for victories
- Leaderboard and statistics tracking

The application showcases how to build complex, stateful dApps on Sui with real-time blockchain interactions and NFT rewards.
