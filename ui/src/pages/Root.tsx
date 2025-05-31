// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Container, Heading } from "@radix-ui/themes";
import { NewAIGame } from "components/NewAIGame";
import { ReactElement } from "react";

/**
 * Landing page for the root path. Displays a form for creating a new game.
 */
export default function Root(): ReactElement {
    return (
        <Container m="2">
            <Heading size="9" mb="9">
                New Caro Game
            </Heading>
            <NewAIGame />
        </Container>
    );
}
