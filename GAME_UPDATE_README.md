# 🎮 Strategy Games Platform Update

## 🆕 Tính Năng Mới: Game Reversi (Othello)

Chúng tôi đã mở rộng ứng dụng từ chỉ có Tic-Tac-Toe (Caro) thành một platform đa game với việc thêm **Reversi (Othello)**!

## 🎯 Cấu Trúc URL Mới

- **`/`** - Trang chọn game
- **`/caro/{gameId}`** - Game Caro (9x9, 5 in a row)
- **`/reversi/{gameId}`** - Game Reversi (8x8, flip pieces)
- **`/game/{gameId}`** - Legacy URL (mặc định là Caro)

## ⚫ Game Reversi (Othello)

### Luật Chơi
- Bảng 8x8 với 4 quân cờ khởi đầu ở giữa
- Người chơi (Black) vs AI (White)
- Đặt quân để "kẹp" và lật quân đối thủ
- Thắng khi có nhiều quân hơn khi kết trúc

### 🤖 AI Với 3 Cấp Độ
1. **🟢 Easy** - 60% random moves, 40% optimal (~75% win rate)
2. **🟡 Medium** - 30% random moves, 70% optimal (~45% win rate)  
3. **🔴 Hard** - 100% optimal với position values (~20% win rate)

### 🏆 Trophy NFT Rewards
- **🥉 Bronze**: Score difference 10-19
- **🥈 Silver**: Score difference 20-34  
- **🥇 Gold**: Score difference 35-49
- **💎 Diamond**: Score difference 50+

**Bonus rarity upgrades:**
- Hard difficulty bonus
- Fast thinking bonus (<30 seconds)

## 🔧 Technical Implementation

### Smart Contract
- **Module**: `tic_tac_toe::reversi_game`
- **Game Logic**: Minimax-inspired AI với strategic position evaluation
- **Position Values**: Corners (100), Edges (25), Centers (20), X-squares (5)
- **Strategy Analysis**: Corner control, mobility, piece flipping evaluation

### UI Components
- `NewReversiGame.tsx` - Game creation interface
- `Root.tsx` - Game selection screen
- Enhanced routing in `App.tsx`
- Transaction support in `useTransactions.ts`

### 🎮 Key Features
- ✅ Single transaction: player move + AI response + piece flipping
- ✅ Smart contract AI với position-based evaluation
- ✅ Trophy NFTs với strategy pattern analysis
- ✅ 3 difficulty levels với different randomness
- ✅ Real-time game state updates

## 🚀 Cách Chạy

### Smart Contract
```bash
cd tic-tac-toe/move
sui move build
sui client publish
```

### Frontend
```bash
cd tic-tac-toe/ui
npm install
npm run dev
```

## 🎯 Game Strategy Tips

### Caro (9x9)
- Control center positions
- Create multiple threats
- Block opponent's 4-in-a-row
- Look for fork opportunities

### Reversi (8x8)
- **Corners are king** - highest strategic value
- **Avoid X-squares** - adjacent to corners
- **Control edges** carefully
- **Maximize mobility** - keep options open
- **Count pieces** at endgame

## 🏗️ Kiến Trúc Code

```
tic-tac-toe/
├── move/sources/
│   ├── ai_game.move          # Caro smart contract
│   ├── reversi_game.move     # Reversi smart contract (NEW)
│   └── shared.move           # Shared utilities
├── ui/src/
│   ├── components/
│   │   ├── NewAIGame.tsx     # Caro game creation
│   │   └── NewReversiGame.tsx # Reversi game creation (NEW)
│   ├── pages/
│   │   ├── Root.tsx          # Game selection (UPDATED)
│   │   └── Game.tsx          # Game display (UPDATED)
│   └── hooks/
│       └── useTransactions.ts # Blockchain transactions (UPDATED)
```

## 🧠 AI Algorithm Notes

### Reversi AI Strategy
1. **Position Evaluation**: Corner (100) > Edge (25) > Center (20) > X-square (5)
2. **Mobility**: Minimize opponent's future moves
3. **Piece Count**: Maximize pieces flipped per move
4. **Endgame**: Pure piece counting when board fills

### Difficulty Scaling
- **Easy**: Primarily random with some strategy
- **Medium**: Balanced random/optimal play
- **Hard**: Full strategic evaluation với position weights

## 🎖️ Trophy System

### Rarity Calculation
```
Base Rarity = Score Difference Tier
+ Difficulty Bonus (Hard = +1)
+ Speed Bonus (Fast = +1)
= Final Rarity (max Diamond)
```

### Strategy Pattern Recognition
- **Corner Control**: 3+ corners owned
- **Mobility**: General strategic play
- **Edge Avoiding**: Careful edge play
- **Defensive**: Counter-attack patterns

Chúc bạn chơi vui vẻ! 🎮✨ 