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
import { Board } from "./Board";
import { Mark } from "hooks/useGameQuery";

interface AIGameBoardProps {
  game: {
    id: string;
    board: number[];
    player: string;
    turn: number;
    game_status: number;
    moves_count: number;
    difficulty: number;
  };
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

const AI_THINKING_MESSAGES = [
  "🤔 Analyzing your move...",
  "🧠 Calculating best response...",
  "⚡ Processing strategy...",
  "🎯 Finding optimal position...",
  "🔄 AI is thinking...",
];

export function AIGameBoard({ game, currentAccount }: AIGameBoardProps) {
  const tx = useTransactions();
  const { mutate: signAndExecute, isPending } = useExecutor();

  const [aiThinking, setAiThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [lastMoveTime, setLastMoveTime] = useState<number | null>(null);

  const isPlayerTurn = game.turn === 0;
  const isGameActive = game.game_status === 0;
  const canMove =
    isPlayerTurn && isGameActive && game.player === currentAccount;

  // Stop AI thinking animation when game ends
  useEffect(() => {
    if (!isGameActive) {
      setAiThinking(false);
    }
  }, [isGameActive]);

  // AI thinking animation
  useEffect(() => {
    if (aiThinking) {
      let messageIndex = 0;
      const interval = setInterval(() => {
        setThinkingMessage(AI_THINKING_MESSAGES[messageIndex]);
        messageIndex = (messageIndex + 1) % AI_THINKING_MESSAGES.length;
      }, 800);

      return () => clearInterval(interval);
    }
  }, [aiThinking]);

  // Detect when it's AI's turn to show thinking animation
  useEffect(() => {
    if (game.turn === 1 && isGameActive) {
      setAiThinking(true);
      // Stop thinking animation after AI moves (when turn changes back to 0)
      const timeout = setTimeout(() => {
        setAiThinking(false);
      }, 3000);
      return () => clearTimeout(timeout);
    } else {
      setAiThinking(false);
    }
  }, [game.turn, isGameActive]);

  const makeMove = (row: number, col: number) => {
    if (!tx || !canMove || isPending) return;

    const position = row * 9 + col; // Convert 2D coordinates to 1D position for 9x9 board
    setLastMoveTime(Date.now());

    signAndExecute(
      {
        tx: tx.playerMove(game.id, position),
        options: { showEffects: true },
      },
      ({ effects }) => {
        console.log("Move made successfully:", effects);

        // Check for trophy creation in effects
        const trophyCreated = effects?.created?.find(
          (obj) => obj.owner === currentAccount
        );

        if (trophyCreated) {
          console.log("🏆 Trophy awarded!", trophyCreated);
        }
      }
    );
  };

  // Convert board array to Mark array for Board component
  const marks: Mark[] = game.board.map((cell) => {
    switch (cell) {
      case 1:
        return Mark.X;
      case 2:
        return Mark.O;
      default:
        return Mark._;
    }
  });

  const calculateThinkingTime = () => {
    if (!lastMoveTime) return null;
    const elapsed = Math.floor((Date.now() - lastMoveTime) / 1000);
    return elapsed;
  };

  return (
    <Box style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Game Header */}
      <Card size="3" mb="4">
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <GearIcon width="20" height="20" />
              <Heading size="5">AI Caro Battle</Heading>
              <Badge color="blue" size="2">
                {
                  DIFFICULTY_LABELS[
                    game.difficulty as keyof typeof DIFFICULTY_LABELS
                  ]
                }
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
                {aiThinking
                  ? thinkingMessage
                  : isPlayerTurn
                    ? "Your Turn"
                    : "AI's Turn"}
              </Text>
            </Flex>

            <Text size="2" color="gray">
              Move {game.moves_count}/81
            </Text>
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
        <Board
          marks={marks}
          empty={canMove ? Mark.X : Mark._}
          onMove={makeMove}
        />

        {/* Action Buttons */}
        {isGameActive && (
          <Box>
            {aiThinking && (
              <Flex align="center" gap="2">
                <GearIcon width="16" height="16" className="rotating" />
                <Text size="2" color="purple">
                  {thinkingMessage}
                </Text>
              </Flex>
            )}

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
        <Card size="3">
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
                  {
                    DIFFICULTY_LABELS[
                      game.difficulty as keyof typeof DIFFICULTY_LABELS
                    ]
                  }{" "}
                  AI in <Strong>{game.moves_count} moves</Strong>!
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
                <Text align="center">
                  The AI outsmarted you this time.
                  <br />
                  Try again with a different strategy!
                </Text>
              </>
            )}

            {game.game_status === 3 && (
              <>
                <Heading size="5" color="gray">
                  🤝 It's a Draw!
                </Heading>
                <Text align="center">
                  Well played! The AI couldn't beat you either.
                  <br />
                  Challenge yourself with a harder difficulty!
                </Text>
              </>
            )}

            <Button onClick={() => (window.location.href = "/")} size="3">
              🎮 Play Again
            </Button>
          </Flex>
        </Card>
      )}

      {/* Game Info */}
      <Card size="2" mt="4">
        <Heading size="4" mb="3">
          🎮 Game Info
        </Heading>
        <Flex direction="column" gap="2">
          <Flex justify="between">
            <Text size="2">Difficulty:</Text>
            <Badge color="blue" size="1">
              {
                DIFFICULTY_LABELS[
                  game.difficulty as keyof typeof DIFFICULTY_LABELS
                ]
              }
            </Badge>
          </Flex>
          <Flex justify="between">
            <Text size="2">Game ID:</Text>
            <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>
              {game.id.slice(0, 12)}...
            </Text>
          </Flex>
          <Flex justify="between">
            <Text size="2">Player:</Text>
            <Text size="2" color="gray" style={{ fontFamily: "monospace" }}>
              {game.player.slice(0, 8)}...
            </Text>
          </Flex>
        </Flex>
      </Card>
    </Box>
  );
}
