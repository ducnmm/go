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
import { StarIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { useNetworkVariable } from "config";

interface AccountAchievementsProps {
    address: string;
}

interface TrophyData {
    id: string;
    rarity: string;
    difficulty: number;
    moves?: number;
    score?: number; // For Reversi trophies
    timestamp: number;
    condition: string;
    color: string;
    gameType: "caro" | "reversi";
}

const DIFFICULTY_LABELS = {
    1: "🟢 Easy",
    2: "🟡 Medium", 
    3: "🔴 Hard"
};

function getRarityDetails(rarity: number, score?: number): { rarity: string; color: string; condition: string } {
    if (rarity === 4) {
        return { rarity: "💎 Diamond", color: "#B9F2FF", condition: score ? "Score difference 50+" : "Win in 5 moves + bonuses" };
    } else if (rarity === 3) {
        return { rarity: "🥇 Gold", color: "#FFD700", condition: score ? "Score difference 35-49" : "Win in 6-7 moves" };
    } else if (rarity === 2) {
        return { rarity: "🥈 Silver", color: "#C0C0C0", condition: score ? "Score difference 20-34" : "Win in 8-9 moves" };
    } else {
        return { rarity: "🥉 Bronze", color: "#CD7F32", condition: score ? "Score difference 10-19" : "Win in 10+ moves" };
    }
}

// Function to open NFT on Sui Explorer
function openNFTOnExplorer(objectId: string) {
    const explorerUrl = `https://suiscan.xyz/devnet/object/${objectId}`;
    window.open(explorerUrl, '_blank');
}

export function AccountAchievements({ address }: AccountAchievementsProps) {
    const client = useSuiClient();
    const packageId = useNetworkVariable("packageId");

    const { data: trophies, isLoading, error } = useQuery({
        queryKey: ["user-trophies", address, packageId],
        queryFn: async () => {
            if (!packageId) return [];

            try {
                // Query for Caro game Trophy NFTs
                const caroTrophies = await client.getOwnedObjects({
                    owner: address,
                    filter: {
                        StructType: `${packageId}::caro_game::Trophy`
                    },
                    options: {
                        showContent: true,
                        showType: true
                    }
                });

                // Query for Reversi Trophy NFTs
                const reversiTrophies = await client.getOwnedObjects({
                    owner: address,
                    filter: {
                        StructType: `${packageId}::reversi_game::ReversiTrophy`
                    },
                    options: {
                        showContent: true,
                        showType: true
                    }
                });

                console.log("Found Caro trophies:", caroTrophies.data.length);
                console.log("Found Reversi trophies:", reversiTrophies.data.length);

                const allTrophies: TrophyData[] = [];

                // Process Caro trophies
                for (const obj of caroTrophies.data) {
                    if (obj.data?.content && 'fields' in obj.data.content) {
                        const fields = obj.data.content.fields as any;
                        console.log("Caro Trophy fields:", fields);
                        
                        const moves = parseInt(fields.moves_to_win || "0");
                        const difficulty = parseInt(fields.computer_difficulty || "1");
                        const timestamp = parseInt(fields.timestamp || "0");
                        const rarityValue = parseInt(fields.rarity || "1");
                        
                        const trophyInfo = getRarityDetails(rarityValue);
                        
                        allTrophies.push({
                            id: obj.data.objectId,
                            rarity: trophyInfo.rarity,
                            difficulty,
                            moves,
                            timestamp,
                            condition: trophyInfo.condition,
                            color: trophyInfo.color,
                            gameType: "caro"
                        });
                    }
                }

                // Process Reversi trophies
                for (const obj of reversiTrophies.data) {
                    if (obj.data?.content && 'fields' in obj.data.content) {
                        const fields = obj.data.content.fields as any;
                        console.log("Reversi Trophy fields:", fields);
                        
                        const score = parseInt(fields.final_score || "0");
                        const difficulty = parseInt(fields.ai_difficulty || "1");
                        const timestamp = parseInt(fields.timestamp || "0");
                        const rarityValue = parseInt(fields.rarity || "1");
                        
                        const trophyInfo = getRarityDetails(rarityValue, score);
                        
                        allTrophies.push({
                            id: obj.data.objectId,
                            rarity: trophyInfo.rarity,
                            difficulty,
                            score,
                            timestamp,
                            condition: trophyInfo.condition,
                            color: trophyInfo.color,
                            gameType: "reversi"
                        });
                    }
                }

                // Sort by timestamp (newest first) - no grouping
                return allTrophies.sort((a, b) => b.timestamp - a.timestamp);
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

    return (
        <Box>
            {/* Summary Stats */}
            <Card size="2" mb="4">
                <Flex direction="column" gap="3">
                    <Flex align="center" gap="2">
                        <Text>🏆</Text>
                        <Heading size="3">Trophy Summary</Heading>
                    </Flex>
                    
                    
                    {/* Rarity Breakdown */}
                    <Grid columns="4" gap="3">
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
                                Win some Computer games to earn your first achievements.
                            </Text>
                        </Flex>
                    </Card>
                ) : (
                    <Box>
                        {trophies?.map((trophy) => (
                            <Card 
                                key={trophy.id} 
                                size="2" 
                                mb="2"
                                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                                className="hover:shadow-md"
                                onClick={() => openNFTOnExplorer(trophy.id)}
                            >
                                <Flex justify="between" align="center">
                                    <Flex align="center" gap="3">
                                        <Flex align="center" gap="1">
                                            <Text size="3">{trophy.rarity.split(" ")[0]}</Text>
                                        </Flex>
                                        <Box>
                                            <Flex align="center" gap="2" mb="1">
                                                <Text size="2" weight="bold">
                                                    {trophy.rarity.slice(2).trim()}
                                                </Text>
                                                <Badge size="1" color={
                                                    trophy.gameType === "caro" ? "blue" : "purple"
                                                }>
                                                    {trophy.gameType === "caro" ? "🎯 Caro" : "⚫ Reversi"}
                                                </Badge>
                                            </Flex>
                                            <Text size="1" color="gray" as="div">
                                                {trophy.condition}
                                            </Text>
                                        </Box>
                                    </Flex>
                                    
                                    <Flex direction="column" align="end" gap="1">
                                        <Flex align="center" gap="2">
                                            <Badge size="1" color="blue">
                                                {DIFFICULTY_LABELS[trophy.difficulty as keyof typeof DIFFICULTY_LABELS]}
                                            </Badge>
                                            <ExternalLinkIcon width="12" height="12" color="gray" />
                                        </Flex>
                                        <Text size="1" color="gray">
                                            {trophy.moves ? trophy.moves + " moves" : trophy.score + " score"}
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Card>
                        ))}
                    </Box>
                )}
            </Box>

        </Box>
    );
}