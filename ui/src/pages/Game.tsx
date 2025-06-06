import "./Game.css";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { TrashIcon } from "@radix-ui/react-icons";
import { AlertDialog, Badge, Button, Flex } from "@radix-ui/themes";
import { Board } from "components/Board";
import { Error } from "components/Error";
import { IDLink } from "components/IDLink";
import { Loading } from "components/Loading";
import { AIGameBoard } from "components/AIGameBoard";
import { ReversiGameBoard } from "components/ReversiGameBoard";
import { useAIGameQuery } from "hooks/useAIGameQuery";
import { useReversiGameQuery } from "hooks/useReversiGameQuery";
import { Game as GameData, InvalidateGameQuery, Mark, useGameQuery } from "hooks/useGameQuery";
import { useTransactions } from "hooks/useTransactions";
import { InvalidateTrophyQuery, Trophy, useTrophyQuery } from "hooks/useTrophyQuery";
import { useExecutor } from "mutations/useExecutor";
import { ReactElement } from "react";

type Props = {
    id: string;
    gameType?: "caro" | "reversi";
};

enum Turn {
    Spectating,
    Yours,
    Theirs,
}

enum Winner {
    /** Nobody has won yet */
    None,

    /** X has won, and you are not a player */
    X,

    /** O has won, and you are not a player */
    O,

    /** You won */
    You,

    /** The other player won */
    Them,

    /** Game ended in a draw */
    Draw,
}

/**
 * Render the game at the given ID.
 *
 * Displays the noughts and crosses board, as well as a toolbar with:
 *
 * - An indicator of whose turn it is.
 * - A button to delete the game.
 * - The ID of the game being played.
 */
export default function Game({ id, gameType = "caro" }: Props): ReactElement {
    // Call ALL hooks first, before any conditional returns
    const [game, invalidateGame] = useGameQuery(id);
    const [aiGame, _] = useAIGameQuery(id);
    const [reversiGame, __] = useReversiGameQuery(id);
    const [trophy, invalidateTrophy] = useTrophyQuery(game?.data);
    const account = useCurrentAccount();

    // Handle AI Game (Caro)
    if (gameType === "caro" && game.status === "error" && aiGame.status === "success" && aiGame.data) {
        return (
            <AIGameBoard 
                game={aiGame.data} 
                currentAccount={account?.address || ""} 
            />
        );
    }

    // Handle Reversi Game
    if (gameType === "reversi") {
        if (reversiGame.status === "pending") {
            return <Loading />;
        } else if (reversiGame.status === "error") {
            return (
                <Error title="Error loading Reversi game">
                    Could not load Reversi game at <IDLink id={id} size="2" display="inline-flex" />.
                    <br />
                    {reversiGame.error.message}
                </Error>
            );
        } else if (reversiGame.status === "success" && reversiGame.data) {
            return (
                <ReversiGameBoard 
                    game={reversiGame.data} 
                    currentAccount={account?.address || ""} 
                />
            );
        }
    }

    // Handle AI Game loading/error states
    if (game.status === "error" && aiGame.status === "pending") {
        return <Loading />;
    }

    if (game.status === "error" && aiGame.status === "error") {
        return (
            <Error title="Error loading game">
                Could not load game at <IDLink id={id} size="2" display="inline-flex" />.
                <br />
                This game ID is not a valid regular game or AI game.
            </Error>
        );
    }

    // Handle regular game states
    if (game.status === "pending") {
        return <Loading />;
    } else if (game.status === "error") {
        return (
            <Error title="Error loading game">
                Could not load game at <IDLink id={id} size="2" display="inline-flex" />.
                <br />
                {game.error.message}
            </Error>
        );
    }

    if (trophy.status === "pending") {
        return <Loading />;
    } else if (trophy.status === "error") {
        return (
            <Error title="Error loading game">
                Could not check win for <IDLink id={id} size="2" display="inline-flex" />:
                <br />
                {trophy.error.message}
            </Error>
        );
    }

    return (
        <SharedGame
            game={game.data}
            trophy={trophy.data}
            invalidateGame={invalidateGame}
            invalidateTrophy={invalidateTrophy}
        />
    );
}

function SharedGame({
    game,
    trophy,
    invalidateGame,
    invalidateTrophy,
}: {
    game: GameData;
    trophy: Trophy;
    invalidateGame: InvalidateGameQuery;
    invalidateTrophy: InvalidateTrophyQuery;
}): ReactElement {
    const account = useCurrentAccount();
    const { mutate: signAndExecute } = useExecutor();
    const tx = useTransactions()!!;

    const { id, board, turn, x, o } = game;
    const [mark, curr, next] = turn % 2 === 0 ? [Mark.X, x, o] : [Mark.O, o, x];

    // If it's the current account's turn, then empty cells should show
    // the current player's mark on hover. Otherwise show nothing, and
    // disable interactivity.
    const player = whoseTurn({ curr, next, addr: account?.address });
    const winner = whoWon({ curr, next, addr: account?.address, turn, trophy });
    const empty = Turn.Yours === player && trophy === Trophy.None ? mark : Mark._;

    const onMove = (row: number, col: number) => {
        signAndExecute({ tx: tx.placeMark(game, row, col) }, () => {
            invalidateGame();
            invalidateTrophy();
        });
    };

    const onDelete = (andThen: () => void) => {
        signAndExecute({ tx: tx.burn(game) }, andThen);
    };

    return (
        <>
            <Board marks={board} empty={empty} onMove={onMove} />
            <Flex direction="row" gap="2" mx="2" my="6" justify="between">
                {trophy !== Trophy.None ? (
                    <WinIndicator winner={winner} />
                ) : (
                    <MoveIndicator turn={player} />
                )}
                {trophy !== Trophy.None && account ? <DeleteButton onDelete={onDelete} /> : null}
                <IDLink id={id} />
            </Flex>
        </>
    );
}

/**
 * Figure out whose turn it should be based on who the `curr`ent
 * player is, who the `next` player is, and what the `addr`ess of the
 * current account is.
 */
function whoseTurn({ curr, next, addr }: { curr: string; next: string; addr?: string }): Turn {
    if (addr === curr) {
        return Turn.Yours;
    } else if (addr === next) {
        return Turn.Theirs;
    } else {
        return Turn.Spectating;
    }
}

/**
 * Figure out who won the game, out of the `curr`ent, and `next`
 * players, relative to whose asking (`addr`). `turns` indicates the
 * number of turns we've seen so far, which is used to determine which
 * address corresponds to player X and player O.
 */
function whoWon({
    curr,
    next,
    addr,
    turn,
    trophy,
}: {
    curr: string;
    next: string;
    addr?: string;
    turn: number;
    trophy: Trophy;
}): Winner {
    switch (trophy) {
        case Trophy.None:
            return Winner.None;
        case Trophy.Draw:
            return Winner.Draw;
        case Trophy.Win:
            // These tests are "backwards" because the game advances to the
            // next turn after the win has happened. Nevertheless, make sure
            // to test for the "you" case before the "them" case to handle a
            // situation where a player is playing themselves.
            if (addr === next) {
                return Winner.You;
            } else if (addr === curr) {
                return Winner.Them;
            } else if (turn % 2 === 0) {
                return Winner.O;
            } else {
                return Winner.X;
            }
    }
}

function MoveIndicator({ turn }: { turn: Turn }): ReactElement {
    switch (turn) {
        case Turn.Yours:
            return <Badge color="green">Your turn</Badge>;
        case Turn.Theirs:
            return <Badge color="orange">Their turn</Badge>;
        case Turn.Spectating:
            return <Badge color="blue">Spectating</Badge>;
    }
}

function WinIndicator({ winner }: { winner: Winner }): ReactElement | null {
    switch (winner) {
        case Winner.None:
            return null;
        case Winner.Draw:
            return <Badge color="orange">Draw!</Badge>;
        case Winner.You:
            return <Badge color="green">You Win!</Badge>;
        case Winner.Them:
            return <Badge color="red">You Lose!</Badge>;
        case Winner.X:
            return <Badge color="blue">X Wins!</Badge>;
        case Winner.O:
            return <Badge color="blue">O Wins!</Badge>;
    }
}

/**
 * "Delete" button with a confirmation dialog. On confirmation, the
 * button calls `onDelete`, passing in an action to perform after
 * deletion has completed (returning to the homepage).
 */
function DeleteButton({ onDelete }: { onDelete: (andThen: () => void) => void }): ReactElement {
    const redirect = () => {
        // Navigate back to homepage, because the game is gone now.
        window.location.href = "/";
    };

    return (
        <AlertDialog.Root>
            <AlertDialog.Trigger>
                <Button color="red" size="1" variant="outline">
                    <TrashIcon /> Delete Game
                </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
                <AlertDialog.Title>Delete Game</AlertDialog.Title>
                <AlertDialog.Description>
                    Are you sure you want to delete this game? This will delete the object from the
                    blockchain and cannot be undone.
                </AlertDialog.Description>
                <Flex gap="3" mt="3" justify="end">
                    <AlertDialog.Cancel>
                        <Button variant="soft" color="gray">
                            Cancel
                        </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action onClick={() => onDelete(redirect)}>
                        <Button variant="solid" color="red">
                            Delete
                        </Button>
                    </AlertDialog.Action>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    );
}
