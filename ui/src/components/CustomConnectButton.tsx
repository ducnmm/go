import { useCurrentAccount, useDisconnectWallet, ConnectButton } from "@mysten/dapp-kit";
import { PersonIcon, StarIcon, ExitIcon } from "@radix-ui/react-icons";
import { 
    Button, 
    DropdownMenu, 
    Flex, 
    Text, 
    Dialog
} from "@radix-ui/themes";
import { formatAddress } from "@mysten/sui/utils";
import { useState } from "react";
import { AccountAchievements } from "./AccountAchievements";

export function CustomConnectButton() {
    const account = useCurrentAccount();
    const { mutate: disconnect } = useDisconnectWallet();
    const [showAchievements, setShowAchievements] = useState(false);

    if (!account) {
        return <ConnectButton />;
    }

    return (
        <>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Button variant="soft" style={{ cursor: "pointer" }}>
                        <PersonIcon />
                        <Text>{formatAddress(account.address)}</Text>
                    </Button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Content align="end" sideOffset={8}>
                    <DropdownMenu.Item onSelect={() => setShowAchievements(true)}>
                        <Flex align="center" gap="2">
                            <StarIcon />
                            <Text>Account</Text>
                        </Flex>
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator />

                    <DropdownMenu.Item 
                        onSelect={() => disconnect()} 
                        color="red"
                    >
                        <Flex align="center" gap="2">
                            <ExitIcon />
                            <Text>Disconnect</Text>
                        </Flex>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>

            {/* Account Achievements Dialog */}
            <Dialog.Root open={showAchievements} onOpenChange={setShowAchievements}>
                <Dialog.Content style={{ maxWidth: 600 }}>
                    <Dialog.Title>
                        <Flex align="center" gap="2">
                            <StarIcon width="24" height="24" />
                            <Text>Account Achievements</Text>
                        </Flex>
                    </Dialog.Title>
                    
                    <Dialog.Description size="2" color="gray" mb="4">
                        Your gaming achievements and trophy collection
                    </Dialog.Description>

                    <AccountAchievements address={account.address} />

                    <Flex justify="end" mt="4">
                        <Dialog.Close>
                            <Button variant="soft" color="gray">
                                Close
                            </Button>
                        </Dialog.Close>
                    </Flex>
                </Dialog.Content>
            </Dialog.Root>
        </>
    );
} 