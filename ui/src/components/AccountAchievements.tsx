// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { 
    Box, 
    Flex, 
    Text, 
    Badge,
    Card,
    Heading,
    Separator,
    Grid
} from "@radix-ui/themes";
import { StarIcon } from "@radix-ui/react-icons";
import { useNetworkVariable } from "config";

interface AccountAchievementsProps {
    address: string;
}

interface TrophyData {
    id: string;
    rarity: string;
    difficulty: number;
    moves: number;
    timestamp: number;
    condition: string;
    color: string;
}

const TROPHY_INFO = [
    { rarity: "🥉 Bronze", condition: "Win in 10-12 moves", color: "#CD7F32", minMoves: 10, maxMoves: 12 },
    { rarity: "🥈 Silver", condition: "Win in 8-9 moves", color: "#C0C0C0", minMoves: 8, maxMoves: 9 },
    { rarity: "🥇 Gold", condition: "Win in 6-7 moves", color: "#FFD700", minMoves: 6, maxMoves: 7 },
    { rarity: "💎 Diamond", condition: "Win in 5 moves + bonuses", color: "#B9F2FF", minMoves: 5, maxMoves: 5 },
    { rarity: "🌈 Rainbow", condition: "Legendary streaks", color: "#FF6B6B", minMoves: 1, maxMoves: 100 }
];

const DIFFICULTY_LABELS = {
    1: "🟢 Easy",
    2: "🟡 Medium", 
    3: "🔴 Hard"
};

function getRarityDetails(rarity: number, moves?: number): { rarity: string; color: string; condition: string } {
    if (rarity === 3 || (moves && moves >= 6 && moves <= 7)) {
        return { rarity: "🥇 Gold", color: "#FFD700", condition: "Win in 6-7 moves" };
    } else if (rarity === 2 || (moves && moves >= 8 && moves <= 9)) {
        return { rarity: "🥈 Silver", color: "#C0C0C0", condition: "Win in 8-9 moves" };
    } else {
        return { rarity: "🥉 Bronze", color: "#CD7F32", condition: "Win in 10-12 moves" };
    }
}

export function AccountAchievements({ address }: AccountAchievementsProps) {
    const client = useSuiClient();
    const packageId = useNetworkVariable("packageId");

    const { data: trophies, isLoading, error } = useQuery({
        queryKey: ["user-trophies", address, packageId],
        queryFn: async () => {
            if (!packageId) return [];

            try {
                // Query for AI game Trophy NFTs
                const ownedObjects = await client.getOwnedObjects({
                    owner: address,
                    filter: {
                        StructType: `${packageId}::ai_game::Trophy`
                    },
                    options: {
                        showContent: true,
                        showType: true
                    }
                });

                console.log("Found AI trophies:", ownedObjects.data.length);

                const trophies: TrophyData[] = [];

                for (const obj of ownedObjects.data) {
                    if (obj.data?.content && 'fields' in obj.data.content) {
                        const fields = obj.data.content.fields as any;
                        console.log("Trophy fields:", fields);
                        
                        const moves = parseInt(fields.moves_to_win || "0");
                        const difficulty = parseInt(fields.ai_difficulty || "1");
                        const timestamp = parseInt(fields.timestamp || "0");
                        const rarityValue = parseInt(fields.rarity || "1");
                        
                        const trophyInfo = getRarityDetails(rarityValue, moves);
                        
                        trophies.push({
                            id: obj.data.objectId,
                            rarity: trophyInfo.rarity,
                            difficulty,
                            moves,
                            timestamp,
                            condition: trophyInfo.condition,
                            color: trophyInfo.color
                        });
                    }
                }

                // Also check for regular game trophies (from shared/owned games)
                const regularTrophies = await Promise.all([
                    client.getOwnedObjects({
                        owner: address,
                        filter: {
                            StructType: `${packageId}::shared::Trophy`
                        },
                        options: {
                            showContent: true,
                            showType: true
                        }
                    }),
                    client.getOwnedObjects({
                        owner: address,
                        filter: {
                            StructType: `${packageId}::owned::Trophy`
                        },
                        options: {
                            showContent: true,
                            showType: true
                        }
                    })
                ]);

                console.log("Found regular trophies:", regularTrophies[0].data.length + regularTrophies[1].data.length);

                // Add regular trophies as Bronze achievements
                for (const trophyResponse of regularTrophies) {
                    for (const obj of trophyResponse.data) {
                        if (obj.data?.content && 'fields' in obj.data.content) {
                            const fields = obj.data.content.fields as any;
                            console.log("Regular trophy fields:", fields);
                            
                            const status = parseInt(fields.status || "0");
                            const turn = parseInt(fields.turn || "9");
                            
                            // Only show wins, not draws
                            if (status === 2) { // TROPHY_WIN = 2
                                trophies.push({
                                    id: obj.data.objectId,
                                    rarity: "🥉 Bronze",
                                    difficulty: 1, // Default to easy for regular games
                                    moves: turn,
                                    timestamp: Date.now(), // No timestamp in regular trophies
                                    condition: "Win vs Human Player",
                                    color: "#CD7F32"
                                });
                            }
                        }
                    }
                }

                // Sort by timestamp (newest first)
                return trophies.sort((a, b) => b.timestamp - a.timestamp);
            } catch (err) {
                console.error("Error fetching trophies:", err);
                return [];
            }
        },
        enabled: !!packageId && !!address,
        refetchInterval: 5000 // Refetch every 5 seconds to catch new trophies
    });

    if (isLoading) {
        return (
            <Box>
                <Text>Loading achievements...</Text>
            </Box>
        );
    }

    if (error) {
        return (
            <Box>
                <Text color="red">Error loading achievements: {error.message}</Text>
            </Box>
        );
    }

    const trophyCount = trophies?.length || 0;
    const bronzeCount = trophies?.filter(t => t.rarity.includes("Bronze")).length || 0;
    const silverCount = trophies?.filter(t => t.rarity.includes("Silver")).length || 0;
    const goldCount = trophies?.filter(t => t.rarity.includes("Gold")).length || 0;
    const diamondCount = trophies?.filter(t => t.rarity.includes("Diamond")).length || 0;
    const rainbowCount = trophies?.filter(t => t.rarity.includes("Rainbow")).length || 0;

    return (
        <Box>
            {/* Summary Stats */}
            <Card size="2" mb="4">
                <Flex direction="column" gap="3">
                    <Flex align="center" gap="2">
                        <Text>🏆</Text>
                        <Heading size="3">Trophy Summary</Heading>
                    </Flex>
                    
                    <Grid columns="5" gap="3">
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" weight="bold">🥉</Text>
                            <Text size="1" color="gray">{bronzeCount}</Text>
                        </Flex>
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" weight="bold">🥈</Text>
                            <Text size="1" color="gray">{silverCount}</Text>
                        </Flex>
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" weight="bold">🥇</Text>
                            <Text size="1" color="gray">{goldCount}</Text>
                        </Flex>
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" weight="bold">💎</Text>
                            <Text size="1" color="gray">{diamondCount}</Text>
                        </Flex>
                        <Flex direction="column" align="center" gap="1">
                            <Text size="2" weight="bold">🌈</Text>
                            <Text size="1" color="gray">{rainbowCount}</Text>
                        </Flex>
                    </Grid>
                    
                    <Separator />
                    
                    <Flex justify="between" align="center">
                        <Text size="2" color="gray">Total Trophies</Text>
                        <Badge size="2" color="green">{trophyCount}</Badge>
                    </Flex>
                </Flex>
            </Card>

            {/* Trophy List */}
            <Box>
                <Heading size="3" mb="3">
                    <Flex align="center" gap="2">
                        <StarIcon width="16" height="16" />
                        Recent Achievements
                    </Flex>
                </Heading>

                {trophyCount === 0 ? (
                    <Card size="2">
                        <Flex direction="column" align="center" gap="3" py="4">
                            <Text size="3">🎮</Text>
                            <Text size="2" color="gray" align="center">
                                No trophies yet!
                                <br />
                                Win some AI games to earn your first achievements.
                            </Text>
                        </Flex>
                    </Card>
                ) : (
                    <Box>
                        {trophies?.slice(0, 10).map((trophy) => (
                            <Card key={trophy.id} size="2" mb="2">
                                <Flex justify="between" align="center">
                                    <Flex align="center" gap="3">
                                        <Text size="3">{trophy.rarity.split(" ")[0]}</Text>
                                        <Box>
                                            <Text size="2" weight="bold">
                                                {trophy.rarity}
                                            </Text>
                                            <Text size="1" color="gray" as="div">
                                                {trophy.condition}
                                            </Text>
                                        </Box>
                                    </Flex>
                                    
                                    <Flex direction="column" align="end" gap="1">
                                        <Badge size="1" color="blue">
                                            {DIFFICULTY_LABELS[trophy.difficulty as keyof typeof DIFFICULTY_LABELS]}
                                        </Badge>
                                        <Text size="1" color="gray">
                                            {trophy.moves} moves
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Card>
                        ))}
                        
                        {trophyCount > 10 && (
                            <Text size="1" color="gray" align="center" mt="2">
                                ... and {trophyCount - 10} more trophies
                            </Text>
                        )}
                    </Box>
                )}
            </Box>

            {/* Achievement Guide */}
            <Card size="2" mt="4">
                <Heading size="3" mb="3">🎯 Achievement Guide</Heading>
                <Box>
                    {TROPHY_INFO.map((trophy, index) => (
                        <Flex key={index} justify="between" align="center" py="2">
                            <Text size="2">{trophy.rarity}</Text>
                            <Text size="2" color="gray">{trophy.condition}</Text>
                        </Flex>
                    ))}
                    <Flex justify="between" align="center" py="2">
                        <Text size="2">🌈 Rainbow</Text>
                        <Text size="2" color="gray">Legendary Achievement</Text>
                    </Flex>
                </Box>
            </Card>
        </Box>
    );
} 