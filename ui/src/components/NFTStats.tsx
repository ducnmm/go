import { useSuiClient } from "@mysten/dapp-kit";
import { Card, Flex, Heading, Text, Spinner } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useNetworkVariable } from "config";

/**
 * Component displays NFT statistics (both Caro and Reversi games)
 */
export function NFTStats() {
    const client = useSuiClient();
    const packageId = useNetworkVariable("packageId");

    const { data: stats, isLoading } = useQuery({
        queryKey: ["nft-stats", packageId],
        queryFn: async () => {
            if (!packageId) return { totalTrophies: 0, totalPlayers: 0 };

            try {
                const uniquePlayers = new Set<string>();
                let totalTrophies = 0;

                // Query Caro Game Trophy events
                const caroTrophies = await client.queryEvents({
                    query: { 
                        MoveEventType: `${packageId}::caro_game::TrophyAwarded`
                    },
                    limit: 1000
                });

                totalTrophies += caroTrophies.data.length;
                
                for (const event of caroTrophies.data) {
                    if (event.parsedJson) {
                        const data = event.parsedJson as any;
                        if (data.player) {
                            uniquePlayers.add(data.player);
                        }
                    }
                }

                // Query Reversi Game Trophy events
                const reversiTrophies = await client.queryEvents({
                    query: { 
                        MoveEventType: `${packageId}::reversi_game::ReversiTrophyAwarded`
                    },
                    limit: 1000
                });

                totalTrophies += reversiTrophies.data.length;
                
                for (const event of reversiTrophies.data) {
                    if (event.parsedJson) {
                        const data = event.parsedJson as any;
                        if (data.player) {
                            uniquePlayers.add(data.player);
                        }
                    }
                }

                return {
                    totalTrophies,
                    totalPlayers: uniquePlayers.size,
                };
            } catch (error) {
                console.error("Error querying NFT stats:", error);
                return { totalTrophies: 0, totalPlayers: 0 };
            }
        },
        refetchInterval: 60000,
        enabled: !!packageId,
    });

    if (isLoading) {
        return (
            <Card size="3">
                <Flex direction="column" align="center" gap="3" p="4">
                    <Spinner size="3" />
                    <Text size="3" color="gray">Loading statistics...</Text>
                </Flex>
            </Card>
        );
    }

    return (
        <Card size="3">
            <Flex direction="column" gap="4" align="center" p="4">
                <Heading size="5">Trophy Stats</Heading>
                
                <Flex direction="column" align="center" gap="2">
                    <Text size="8" weight="bold" color="blue">
                        {stats?.totalTrophies || 0}
                    </Text>
                    <Text size="3" color="gray">
                        Total Trophies
                    </Text>
                </Flex>

                <Flex direction="column" align="center" gap="2">
                    <Text size="6" weight="bold" color="green">
                        {stats?.totalPlayers || 0}
                    </Text>
                    <Text size="3" color="gray">
                        Players
                    </Text>
                </Flex>
            </Flex>
        </Card>
    );
} 