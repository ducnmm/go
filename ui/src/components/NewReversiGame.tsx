// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { useTransactions } from "hooks/useTransactions";
import { useExecutor } from "mutations/useExecutor";
import { 
    Button, 
    Card, 
    Flex, 
    Heading, 
    Text, 
    Separator,
    Badge,
    Box,
    Strong,
    Select
} from "@radix-ui/themes";
import { GearIcon, StarIcon, LightningBoltIcon } from "@radix-ui/react-icons";

const DIFFICULTY_OPTIONS = [
    {
        value: "1",
        label: "🟢 Easy",
        description: "AI makes random moves 60% of the time",
        winRate: "~75%",
        color: "green" as const
    },
    {
        value: "2", 
        label: "🟡 Medium",
        description: "AI plays optimally 70% of the time",
        winRate: "~45%",
        color: "yellow" as const
    },
    {
        value: "3",
        label: "🔴 Hard", 
        description: "AI always plays optimally using position values",
        winRate: "~20%",
        color: "red" as const
    }
];

const TROPHY_TIERS = [
    { rarity: "🥉 Bronze", condition: "Win with score difference 10-19", color: "#CD7F32" },
    { rarity: "🥈 Silver", condition: "Win with score difference 20-34", color: "#C0C0C0" },
    { rarity: "🥇 Gold", condition: "Win with score difference 35-49", color: "#FFD700" },
    { rarity: "💎 Diamond", condition: "Win with score difference 50+", color: "#B9F2FF" },
];

export function NewReversiGame() {
    const tx = useTransactions();
    const { mutate: signAndExecute, isPending } = useExecutor();
    
    const [selectedDifficulty, setSelectedDifficulty] = useState("2");
    const [gameCreated, setGameCreated] = useState<string | null>(null);

    const selectedDifficultyInfo = DIFFICULTY_OPTIONS.find(d => d.value === selectedDifficulty);

    const createReversiGame = () => {
        if (!tx) return;

        signAndExecute(
            {
                tx: tx.newReversiGame(parseInt(selectedDifficulty)),
                options: { showEffects: true },
            },
            ({ effects }) => {
                console.log("Reversi Game created successfully:", effects);
                
                const gameId = effects?.created?.[0].reference?.objectId;
                if (gameId) {
                    setGameCreated(gameId);
                    setTimeout(() => {
                        window.location.href = `/reversi/${gameId}`;
                    }, 1500);
                }
            }
        );
    };

    if (gameCreated) {
        return (
            <Card size="3" style={{ maxWidth: 600, margin: "0 auto" }}>
                <Flex direction="column" align="center" gap="4">
                    <Box>
                        <GearIcon width="48" height="48" color="purple" />
                    </Box>
                    <Heading size="5">🎉 Reversi Game Created!</Heading>
                    <Text align="center" color="gray">
                        Your game vs {selectedDifficultyInfo?.label} AI is ready.
                        <br />
                        Redirecting to game board...
                    </Text>
                    <Badge color="purple" size="2">
                        Game ID: {gameCreated.slice(0, 8)}...
                    </Badge>
                </Flex>
            </Card>
        );
    }

    return (
        <Box style={{ maxWidth: 700, margin: "0 auto" }}>
            <Card size="3">
                <Flex direction="column" gap="4">
                    {/* Header */}
                    <Flex align="center" gap="3">
                        <Heading size="6" weight="bold" mb="3">
                            Reversi Challenge
                        </Heading>
                    </Flex>

                    <Text size="4" color="gray" mb="4">
                        Play Reversi (8x8 board, flip opponent pieces) against smart contract AI and earn Trophy NFTs based on your performance!
                    </Text>

                    <Separator />

                    {/* Difficulty Selection */}
                    <Box>
                        <Text size="3" weight="bold" mb="3">
                            🎯 Choose Difficulty
                        </Text>
                        
                        <Select.Root value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                            <Select.Trigger style={{ width: "100%" }} />
                            <Select.Content>
                                {DIFFICULTY_OPTIONS.map((option) => (
                                    <Select.Item key={option.value} value={option.value}>
                                        <Flex align="center" gap="2">
                                            <Text>{option.label}</Text>
                                            <Badge color={option.color} size="1">
                                                {option.winRate}
                                            </Badge>
                                        </Flex>
                                    </Select.Item>
                                ))}
                            </Select.Content>
                        </Select.Root>

                        {selectedDifficultyInfo && (
                            <Box mt="3" p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "8px" }}>
                                <Text size="2" color="gray">
                                    <Strong>{selectedDifficultyInfo.label}</Strong>: {selectedDifficultyInfo.description}
                                    <br />
                                    Expected win rate: <Strong>{selectedDifficultyInfo.winRate}</Strong>
                                </Text>
                            </Box>
                        )}
                    </Box>

                    <Separator />

                    {/* Trophy Information */}
                    <Box>
                        <Flex align="center" gap="2" mb="3">
                            <StarIcon width="16" height="16" />
                            <Text size="3" weight="bold">
                                Trophy Rewards
                            </Text>
                        </Flex>
                        
                        <Box>
                            {TROPHY_TIERS.map((trophy, index) => (
                                <Flex key={index} justify="between" align="center" py="2">
                                    <Text size="2">{trophy.rarity}</Text>
                                    <Text size="2" color="gray">{trophy.condition}</Text>
                                </Flex>
                            ))}
                        </Box>

                        <Box mt="3" p="3" style={{ backgroundColor: "var(--purple-2)", borderRadius: "8px" }}>
                            <Flex align="center" gap="2">
                                <LightningBoltIcon width="14" height="14" />
                                <Text size="2" color="purple">
                                    <Strong>Bonus:</Strong> Hard difficulty + fast thinking (&lt;30s) upgrades trophy rarity!
                                </Text>
                            </Flex>
                        </Box>
                    </Box>

                    <Separator />

                    {/* Create Game Button */}
                    <Flex direction="column" gap="3">
                        <Button
                            onClick={createReversiGame}
                            disabled={isPending}
                            size="3"
                            color="purple"
                            style={{ width: "100%" }}
                        >
                            {isPending ? (
                                <Flex align="center" gap="2">
                                    <Box className="loading-spinner" />
                                    <Text>Creating Reversi Game...</Text>
                                </Flex>
                            ) : (
                                <Flex align="center" gap="2">
                                    <GearIcon width="16" height="16" />
                                    <Text>Start Battle vs {selectedDifficultyInfo?.label} AI</Text>
                                </Flex>
                            )}
                        </Button>

                        <Text size="1" color="gray" align="center">
                            Game will be created as a shared object on the blockchain.
                            <br />
                            Trophy NFTs are automatically minted when you win!
                        </Text>
                    </Flex>
                </Flex>
            </Card>

            {/* Game Features */}
            <Card size="2" mt="4">
                <Heading size="4" mb="3">⚫ Reversi Game Features</Heading>
                <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                        <Text size="2">🧠</Text>
                        <Text size="2">Smart contract AI with strategic position evaluation</Text>
                    </Flex>
                    <Flex align="center" gap="2">
                        <Text size="2">🏆</Text>
                        <Text size="2">Trophy NFTs with rarity based on score difference</Text>
                    </Flex>
                    <Flex align="center" gap="2">
                        <Text size="2">⚡</Text>
                        <Text size="2">Single transaction: your move + AI response + piece flipping</Text>
                    </Flex>
                    <Flex align="center" gap="2">
                        <Text size="2">📊</Text>
                        <Text size="2">Corner control and mobility strategy analysis</Text>
                    </Flex>
                    <Flex align="center" gap="2">
                        <Text size="2">🎨</Text>
                        <Text size="2">Collectible trophies with strategy pattern metadata</Text>
                    </Flex>
                </Flex>
            </Card>
        </Box>
    );
} 