import { useSuiClient } from "@mysten/dapp-kit";
import { Card, Flex, Heading, Text, Avatar, Spinner } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useNetworkVariable } from "config";

interface PlayerStats {
    address: string;
    totalTrophies: number;
    winTrophies: number;
}

/**
 * Component hiển thị top 3 người chơi có nhiều Trophy NFT nhất (bao gồm cả Caro và Reversi)
 */
export function Leaderboard() {
    const client = useSuiClient();
    const packageId = useNetworkVariable("packageId");

    const { data: leaderboard, isLoading } = useQuery({
        queryKey: ["leaderboard", packageId],
        queryFn: async () => {
            if (!packageId) return [];

            try {
                const playerStatsMap = new Map<string, PlayerStats>();

                // Query Caro Game Trophies
                const caroTrophies = await client.queryEvents({
                    query: { 
                        MoveEventType: `${packageId}::caro_game::TrophyAwarded`
                    },
                    limit: 100
                });

                for (const event of caroTrophies.data) {
                    if (event.parsedJson) {
                        const data = event.parsedJson as any;
                        const player = data.player;
                        
                        if (!playerStatsMap.has(player)) {
                            playerStatsMap.set(player, {
                                address: player,
                                totalTrophies: 0,
                                winTrophies: 0,
                            });
                        }
                        
                        const stats = playerStatsMap.get(player)!;
                        stats.totalTrophies++;
                        stats.winTrophies++; // Caro trophies are all wins
                    }
                }

                // Query Reversi Game Trophy events
                const reversiTrophies = await client.queryEvents({
                    query: { 
                        MoveEventType: `${packageId}::reversi_game::ReversiTrophyAwarded`
                    },
                    limit: 100
                });

                for (const event of reversiTrophies.data) {
                    if (event.parsedJson) {
                        const data = event.parsedJson as any;
                        const player = data.player;
                        
                        if (!playerStatsMap.has(player)) {
                            playerStatsMap.set(player, {
                                address: player,
                                totalTrophies: 0,
                                winTrophies: 0,
                            });
                        }
                        
                        const stats = playerStatsMap.get(player)!;
                        stats.totalTrophies++;
                        stats.winTrophies++; // Reversi trophies are also all wins
                    }
                }

                // Convert to array and get top 3
                const top3 = Array.from(playerStatsMap.values())
                    .sort((a, b) => b.totalTrophies - a.totalTrophies)
                    .slice(0, 3);

                return top3;
            } catch (error) {
                console.error("Error querying trophies:", error);
                return [];
            }
        },
        refetchInterval: 30000,
        enabled: !!packageId,
    });

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (isLoading) {
        return (
            <Card size="3">
                <Flex direction="column" align="center" gap="3" p="4">
                    <Spinner size="3" />
                    <Text size="3" color="gray">Loading top 3…</Text>
                </Flex>
            </Card>
        );
    }

    return (
        <Card size="3">
            <Flex direction="column" gap="4">
                <Heading size="5" align="center">Top 3 NFT Holders</Heading>

                {!leaderboard || leaderboard.length === 0 ? (
                    <Text size="3" color="gray" align="center">
                        No Trophies yet. Play to reach the top!
                    </Text>
                ) : (
                    <Flex direction="column" gap="3">
                        {leaderboard.map((player, index) => (
                            <Card key={player.address} variant="surface" size="2">
                                <Flex align="center" gap="3" p="3">
                                    <Text size="5">
                                        {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                                    </Text>

                                    <Avatar
                                        fallback={player.address.slice(2, 4).toUpperCase()}
                                        size="3"
                                        color={index === 0 ? "gold" : index === 1 ? "gray" : "orange"}
                                    />

                                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                                        <Text size="3" weight="bold">
                                            {formatAddress(player.address)}
                                        </Text>
                                        <Text size="2" color="gray">
                                            {player.totalTrophies} Trophy{player.totalTrophies > 1 ? 's' : ''}
                                        </Text>
                                    </Flex>

                                    <Text size="6" weight="bold" color="blue">
                                        {player.totalTrophies}
                                    </Text>
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                )}
            </Flex>
        </Card>
    );
} 