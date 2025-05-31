// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Container, Heading, Card, Flex, Text, Button, Box, Grid } from "@radix-ui/themes";
import { useState } from "react";
import { NewAIGame } from "components/NewAIGame";
import { NewReversiGame } from "components/NewReversiGame";
import { Leaderboard } from "components/Leaderboard";
import { NFTStats } from "components/NFTStats";
import { ReactElement } from "react";

/**
 * Landing page for the root path. Displays game selection.
 */
export default function Root(): ReactElement {
    const [selectedGame, setSelectedGame] = useState<string | null>(null);

    if (selectedGame === "caro") {
        return (
            <Container m="2">
                <Flex direction="column" gap="4">
                    <Button variant="ghost" onClick={() => setSelectedGame(null)}>
                        ← Back to Game Selection
                    </Button>
                    <Heading size="9" mb="4">
                        New Caro Game
                    </Heading>
                    <NewAIGame />
                </Flex>
            </Container>
        );
    }

    if (selectedGame === "reversi") {
        return (
            <Container m="2">
                <Flex direction="column" gap="4">
                    <Button variant="ghost" onClick={() => setSelectedGame(null)}>
                        ← Back to Game Selection
                    </Button>
                    <Heading size="9" mb="4">
                        New Reversi Game
                    </Heading>
                    <NewReversiGame />
                </Flex>
            </Container>
        );
    }

    return (
        <Container m="2">
            <Heading size="9" mb="6" align="center">
                🎮 Choose Your Game
            </Heading>
            
            <Text size="4" color="gray" mb="6" align="center">
                Challenge AI opponents in classic strategy games and earn Trophy NFTs!
            </Text>

            {/* NFT Stats and Leaderboard section */}
            <Grid columns={{ initial: "1", md: "2" }} gap="6" mb="6">
                <NFTStats />
                <Leaderboard />
            </Grid>

            <Flex direction="column" gap="4" style={{ maxWidth: 800, margin: "0 auto" }}>
                {/* Caro Game Card */}
                <Card size="3" style={{ cursor: "pointer" }} onClick={() => setSelectedGame("caro")}>
                    <Flex direction="column" gap="3">
                        <Flex align="center" justify="between">
                            <Heading size="6">🔴 Caro (Tic-Tac-Toe)</Heading>
                            <Text size="2" color="blue">9x9 Board</Text>
                        </Flex>
                        
                        <Text size="3" color="gray">
                            Classic Caro game on a 9x9 board. Get 5 in a row to win!
                            Strategic depth with multiple winning patterns.
                        </Text>
                        
                        <Flex gap="3" wrap="wrap">
                            <Text size="2">✓ 9x9 Board</Text>
                            <Text size="2">✓ 5 in a Row</Text>
                            <Text size="2">✓ 3 AI Levels</Text>
                            <Text size="2">✓ Trophy NFTs</Text>
                        </Flex>
                        
                        <Box mt="2">
                            <Button size="3" style={{ width: "100%" }}>
                                Play Caro
                            </Button>
                        </Box>
                    </Flex>
                </Card>

                {/* Reversi Game Card */}
                <Card size="3" style={{ cursor: "pointer" }} onClick={() => setSelectedGame("reversi")}>
                    <Flex direction="column" gap="3">
                        <Flex align="center" justify="between">
                            <Heading size="6">⚫ Reversi (Othello)</Heading>
                            <Text size="2" color="purple">8x8 Board</Text>
                        </Flex>
                        
                        <Text size="3" color="gray">
                            Strategic board game where you flip opponent pieces. 
                            Control the board and dominate your opponent!
                        </Text>
                        
                        <Flex gap="3" wrap="wrap">
                            <Text size="2">✓ 8x8 Board</Text>
                            <Text size="2">✓ Piece Flipping</Text>
                            <Text size="2">✓ 3 AI Levels</Text>
                            <Text size="2">✓ Trophy NFTs</Text>
                        </Flex>
                        
                        <Box mt="2">
                            <Button size="3" style={{ width: "100%" }} color="purple">
                                Play Reversi
                            </Button>
                        </Box>
                    </Flex>
                </Card>
            </Flex>

            {/* Game Features */}
            <Card size="2" mt="6" style={{ maxWidth: 600, margin: "24px auto 0" }}>
                <Heading size="4" mb="3" align="center">🏆 Shared Features</Heading>
                <Flex direction="column" gap="2">
                    <Flex align="center" gap="2" justify="center">
                        <Text size="2">🧠 Smart Contract AI with multiple difficulty levels</Text>
                    </Flex>
                    <Flex align="center" gap="2" justify="center">
                        <Text size="2">🏆 Trophy NFTs with rarity based on performance</Text>
                    </Flex>
                    <Flex align="center" gap="2" justify="center">
                        <Text size="2">⚡ Single transaction: your move + AI response</Text>
                    </Flex>
                    <Flex align="center" gap="2" justify="center">
                        <Text size="2">📊 Pattern analysis and win tracking</Text>
                    </Flex>
                </Flex>
            </Card>
        </Container>
    );
}
