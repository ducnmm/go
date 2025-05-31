// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ReactElement, useState } from "react";
import { Box } from "@radix-ui/themes";

const BOARD_SIZE = 8;

export enum ReversiBoardMark {
    /** No mark (empty cell) */
    EMPTY = 0,
    /** Black piece (player) */
    BLACK = 1,
    /** White piece (AI) */
    WHITE = 2,
}

type Props = {
    /** The current marks on the board */
    marks: number[];
    /** What to show when hovering over empty cells */
    empty: ReversiBoardMark;
    /** Callback when a move is made */
    onMove: (position: number) => void;
    /** Valid moves positions */
    validMoves?: number[];
};

/**
 * Clean Reversi game board component matching the Caro board style
 */
export function ReversiBoard({ marks, empty, onMove, validMoves = [] }: Props): ReactElement {
    // Convert flat array to 2D board
    const board = Array.from({ length: BOARD_SIZE }, (_, i) => 
        marks.slice(i * BOARD_SIZE, (i + 1) * BOARD_SIZE)
    );

    return (
        <Box 
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                gap: "3px",
                padding: "16px",
                maxWidth: "520px",
                margin: "0 auto"
            }}
        >
            {board.map((row, r) =>
                row.map((mark, c) => {
                    const position = r * BOARD_SIZE + c;
                    const isValidMove = validMoves.includes(position);
                    return (
                        <ReversiCell
                            key={`${r}-${c}`}
                            mark={mark}
                            empty={empty}
                            isValidMove={isValidMove}
                            onClick={() => onMove(position)}
                        />
                    );
                })
            )}
        </Box>
    );
}

type CellProps = {
    mark: ReversiBoardMark;
    empty: ReversiBoardMark;
    isValidMove: boolean;
    onClick: () => void;
};

function ReversiCell({ mark, empty, isValidMove, onClick }: CellProps): ReactElement {
    const [isHovered, setIsHovered] = useState(false);
    const isClickable = mark === ReversiBoardMark.EMPTY && (isValidMove || empty !== ReversiBoardMark.EMPTY);

    const cellStyle = {
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--gray-1)",
        border: "1px solid var(--gray-5)",
        borderRadius: "6px",
        cursor: isClickable ? "pointer" : "default",
        transition: "all 0.2s ease",
        fontSize: "32px",
    };

    const hoverStyle = isClickable && isHovered ? {
        // backgroundColor: "var(--blue-2)",
        // borderColor: "var(--blue-6)",
        // transform: "scale(1.05)",
    } : {};

    const validMoveStyle = isValidMove ? {
        backgroundColor: "var(--green-2)",
        borderColor: "var(--green-6)",
    } : {};

    switch (mark) {
        case ReversiBoardMark.BLACK:
            return (
                <Box 
                    style={{
                        ...cellStyle,
                        backgroundColor: "var(--gray-2)",
                        borderColor: "var(--gray-6)",
                        color: "var(--gray-12)"
                    }}
                >
                    ⚫
                </Box>
            );
        case ReversiBoardMark.WHITE:
            return (
                <Box 
                    style={{
                        ...cellStyle,
                        backgroundColor: "var(--gray-2)",
                        borderColor: "var(--gray-6)",
                        color: "var(--gray-12)"
                    }}
                >
                    🔴
                </Box>
            );
        case ReversiBoardMark.EMPTY:
            return <EmptyCell 
                empty={empty} 
                onMove={onClick} 
                cellStyle={cellStyle} 
                hoverStyle={hoverStyle}
                validMoveStyle={validMoveStyle}
                isValidMove={isValidMove}
                isHovered={isHovered}
                setIsHovered={setIsHovered}
            />;
    }
}

function EmptyCell({ 
    empty, 
    onMove, 
    cellStyle, 
    hoverStyle,
    validMoveStyle,
    isValidMove,
    isHovered,
    setIsHovered
}: { 
    empty: ReversiBoardMark; 
    onMove: () => void;
    cellStyle: any;
    hoverStyle: any;
    validMoveStyle: any;
    isValidMove: boolean;
    isHovered: boolean;
    setIsHovered: (value: boolean) => void;
}): ReactElement {
    const isClickable = empty !== ReversiBoardMark.EMPTY || isValidMove;

    switch (empty) {
        case ReversiBoardMark.BLACK:
            return (
                <Box 
                    style={{
                        ...cellStyle,
                        ...hoverStyle,
                        ...validMoveStyle
                    }}
                    onClick={isClickable ? onMove : undefined}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {isHovered ? "⚫" : "" }
                </Box>
            );
        case ReversiBoardMark.WHITE:
            return (
                <Box 
                    style={{
                        ...cellStyle,
                        ...hoverStyle,
                        ...validMoveStyle
                    }}
                    onClick={isClickable ? onMove : undefined}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {isHovered ? "🔸" : (isValidMove ? "🟢" : "")}
                </Box>
            );
        case ReversiBoardMark.EMPTY:
            return (
                <Box 
                    style={{
                        ...cellStyle,
                        ...validMoveStyle
                    }}
                    onClick={isValidMove ? onMove : undefined}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* {isValidMove ? "⚪" : ""} */}
                </Box>
            );
    }
} 