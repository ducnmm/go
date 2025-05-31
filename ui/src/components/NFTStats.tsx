// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useSuiClient } from "@mysten/dapp-kit";
import { Card, Flex, Heading, Text, Spinner } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useNetworkVariable } from "config";

/**
 * Component hiển thị thống kê NFT đơn giản
 */
export function NFTStats() {
    const client = useSuiClient();
    const packageId = useNetworkVariable("packageId");

    const { data: stats, isLoading } = useQuery({
        queryKey: ["nft-stats", packageId],
        queryFn: async () => {
            if (!packageId) return { totalTrophies: 0, totalPlayers: 0 };

            try {
                // Query AI Game Trophy events
                const aiTrophies = await client.queryEvents({
                    query: { 
                        MoveEventType: `${packageId}::ai_game::TrophyAwarded`
                    },
                    limit: 1000
                });

                const uniquePlayers = new Set<string>();
                
                for (const event of aiTrophies.data) {
                    if (event.parsedJson) {
                        const data = event.parsedJson as any;
                        if (data.player) {
                            uniquePlayers.add(data.player);
                        }
                    }
                }

                return {
                    totalTrophies: aiTrophies.data.length,
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
                    <Text size="3" color="gray">Đang tải thống kê...</Text>
                </Flex>
            </Card>
        );
    }

    return (
        <Card size="3">
            <Flex direction="column" gap="4" align="center" p="4">
                <Heading size="5">📊 Trophy Stats</Heading>
                
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