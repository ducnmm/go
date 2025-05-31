// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from "react";
import { useTransactions } from "hooks/useTransactions";
import { useExecutor } from "mutations/useExecutor";
import {
  Card,
  Flex,
  Heading,
  Text,
  Button,
  Badge,
  Box,
  Separator,
  Strong,
} from "@radix-ui/themes";
import { GearIcon, StarIcon, PersonIcon } from "@radix-ui/react-icons";
import { ReversiBoard, ReversiBoardMark } from "./ReversiBoard";
import { ReversiGame } from "hooks/useReversiGameQuery";

interface ReversiGameBoardProps {
  game: ReversiGame;
  currentAccount: string;
}

const DIFFICULTY_LABELS = {
  1: "🟢 Easy",
  2: "🟡 Medium",
  3: "🔴 Hard",
};

const STATUS_LABELS = {
  0: "Active",
  1: "Player Wins! 🎉",
  2: "AI Wins 🤖",
  3: "Draw 🤝",
};

export function ReversiGameBoard({ game, currentAccount }: ReversiGameBoardProps) {
  const tx = useTransactions();
  const { mutate: signAndExecute, isPending } = useExecutor();

  const [lastMoveTime, setLastMoveTime] = useState<number | null>(null);

  const isPlayerTurn = game.turn === 0;
  const isGameActive = game.game_status === 0;
  const canMove = isPlayerTurn && isGameActive && game.player === currentAccount;

  const makeMove = (position: number) => {
    if (!tx || !canMove) return;

    const moveStartTime = Date.now();
    setLastMoveTime(moveStartTime);

    signAndExecute(
      {
        tx: tx.reversiPlayerMove(game.id, position),
        options: { showEffects: true },
      },
      (result) => {
        console.log("Reversi move executed:", result);
      }
    );
  };

  const calculateThinkingTime = () => {
    if (!lastMoveTime) return "0";
    return ((Date.now() - lastMoveTime) / 1000).toFixed(1);
  };

  // Calculate valid moves based on actual Reversi rules
  const getValidMoves = (): number[] => {
    if (!canMove) return [];
    
    const validMoves: number[] = [];
    const PLAYER_MARK = 1; // Black (player)
    const AI_MARK = 2;     // White (AI)
    
    for (let i = 0; i < 64; i++) {
      if (game.board[i] === 0) { // Empty cell
        if (canFlipPieces(i, PLAYER_MARK, AI_MARK)) {
          validMoves.push(i);
        }
      }
    }
    return validMoves;
  };

  // Check if placing a piece at position can flip opponent pieces
  const canFlipPieces = (position: number, playerMark: number, opponentMark: number): boolean => {
    const row = Math.floor(position / 8);
    const col = position % 8;
    
    // All 8 directions: up, down, left, right, and 4 diagonals
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],  // up-left, up, up-right
      [0, -1],           [0, 1],   // left, right
      [1, -1],  [1, 0],  [1, 1]    // down-left, down, down-right
    ];
    
    for (const [dr, dc] of directions) {
      if (checkDirection(row, col, dr, dc, playerMark, opponentMark)) {
        return true; // Found at least one direction where pieces can be flipped
      }
    }
    
    return false;
  };

  // Check if pieces can be flipped in a specific direction
  const checkDirection = (
    startRow: number, 
    startCol: number, 
    deltaRow: number, 
    deltaCol: number, 
    playerMark: number, 
    opponentMark: number
  ): boolean => {
    let row = startRow + deltaRow;
    let col = startCol + deltaCol;
    let foundOpponent = false;
    
    // Walk in the direction until we hit a boundary or empty cell
    while (row >= 0 && row < 8 && col >= 0 && col < 8) {
      const pos = row * 8 + col;
      const cellValue = game.board[pos];
      
      if (cellValue === 0) {
        // Hit empty cell - no valid flip
        return false;
      } else if (cellValue === opponentMark) {
        // Found opponent piece - keep looking for our piece
        foundOpponent = true;
      } else if (cellValue === playerMark) {
        // Found our piece - valid flip if we passed through opponent pieces
        return foundOpponent;
      }
      
      row += deltaRow;
      col += deltaCol;
    }
    
    // Hit boundary without finding our piece
    return false;
  };

  const validMoves = getValidMoves();

  return (
    <Flex direction="column" gap="6" align="center" style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Game Header */}
      <Card size="3" style={{ width: "100%" }}>
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center">
            <Flex align="center" gap="3">
              <GearIcon width="20" height="20" />
              <Heading size="5">⚫ Reversi Battle</Heading>
              <Badge color="purple" size="2">
                {DIFFICULTY_LABELS[game.difficulty as keyof typeof DIFFICULTY_LABELS]}
              </Badge>
            </Flex>

            <Badge
              color={
                game.game_status === 1
                  ? "green"
                  : game.game_status === 2
                    ? "red"
                    : "gray"
              }
              size="2"
            >
              {STATUS_LABELS[game.game_status as keyof typeof STATUS_LABELS]}
            </Badge>
          </Flex>

          <Separator />

          {/* Turn Indicator */}
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              {isPlayerTurn ? <PersonIcon /> : <GearIcon />}
              <Text size="3" weight="bold">
                {isPlayerTurn ? "Your Turn" : "AI's Turn"}
              </Text>
            </Flex>

            <Flex align="center" gap="4">
              <Text size="2" color="gray">
                ⚫ You: {game.player_pieces}
              </Text>
              <Text size="2" color="gray">
                🔴 AI: {game.ai_pieces}
              </Text>
            </Flex>
          </Flex>

          {/* Thinking Time */}
          {lastMoveTime && (
            <Box>
              <Text size="2" color="gray">
                ⏱️ Thinking time: {calculateThinkingTime()}s
              </Text>
            </Box>
          )}
        </Flex>
      </Card>

      {/* Game Board */}
      <Flex direction="column" align="center" gap="4">
        <ReversiBoard
          marks={game.board}
          empty={canMove ? ReversiBoardMark.BLACK : ReversiBoardMark.EMPTY}
          onMove={makeMove}
          validMoves={validMoves}
        />

        {/* Action Indicators */}
        {isGameActive && (
          <Box>
            {isPending && (
              <Flex align="center" gap="2">
                <Box className="loading-spinner" />
                <Text size="2" color="blue">
                  Processing your move...
                </Text>
              </Flex>
            )}
          </Box>
        )}
      </Flex>

      {/* Game Result */}
      {!isGameActive && (
        <Card size="3" style={{ width: "100%" }}>
          <Flex direction="column" align="center" gap="4">
            {game.game_status === 1 && (
              <>
                <Box>
                  <StarIcon width="48" height="48" color="gold" />
                </Box>
                <Heading size="5" color="green">
                  🎉 Victory!
                </Heading>
                <Text align="center">
                  You defeated the{" "}
                  {DIFFICULTY_LABELS[game.difficulty as keyof typeof DIFFICULTY_LABELS]}{" "}
                  AI with a score of <Strong>{game.player_pieces} - {game.ai_pieces}</Strong>!
                  <br />
                  Score difference: <Strong>{game.player_pieces - game.ai_pieces}</Strong>
                  <br />
                  Check your wallet for the Trophy NFT reward!
                </Text>
              </>
            )}

            {game.game_status === 2 && (
              <>
                <Box>
                  <GearIcon width="48" height="48" color="gray" />
                </Box>
                <Heading size="5" color="red">
                  🤖 AI Wins
                </Heading>
                <Text align="center" color="gray">
                  The AI outplayed you with a score of{" "}
                  <Strong>{game.ai_pieces} - {game.player_pieces}</Strong>.
                  <br />
                  Try again with a different strategy!
                </Text>
              </>
            )}

            {game.game_status === 3 && (
              <>
                <Heading size="5" color="orange">
                  🤝 Draw
                </Heading>
                <Text align="center" color="gray">
                  Equal skills! Final score: <Strong>{game.player_pieces} - {game.ai_pieces}</Strong>
                </Text>
              </>
            )}

            <Button
              onClick={() => window.location.href = "/"}
              size="3"
              variant="outline"
            >
              Back to Games
            </Button>
          </Flex>
        </Card>
      )}

      {/* Game Info */}
      <Card size="2" style={{ width: "100%" }}>
        <Heading size="4" mb="3">
          🎮 Game Info
        </Heading>
        <Flex direction="column" gap="2">
          <Flex justify="between">
            <Text size="2">Difficulty:</Text>
            <Badge color="purple" size="1">
              {DIFFICULTY_LABELS[game.difficulty as keyof typeof DIFFICULTY_LABELS]}
            </Badge>
          </Flex>
          <Flex justify="between">
            <Text size="2">Current Score:</Text>
            <Text size="2" color="gray">
              You: {game.player_pieces} vs AI: {game.ai_pieces}
            </Text>
          </Flex>
          <Flex justify="between">
            <Text size="2">Game ID:</Text>
            <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>
              {game.id.slice(0, 12)}...
            </Text>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
} 