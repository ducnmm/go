import { Box } from "@radix-ui/themes";
import { Mark } from "hooks/useGameQuery";
import { ReactElement, useState } from "react";

/**
 * Represents a Caro board that adapts to different sizes automatically.
 *
 * `marks` is a linear array containing the marks on the board, in
 * row-major order, `empty` is the Mark to display when hovering over
 * an empty cell, and `onMove` is a callback to be called when an
 * empty cell is clicked. Setting `empty` to `Mark._` will make empty
 * cells non-interactive.
 */
export function Board({
    marks,
    empty,
    onMove,
}: {
    marks: Mark[];
    empty: Mark;
    onMove: (i: number, j: number) => void;
}): ReactElement {
    // Auto-detect board size: 49 = 7x7, 81 = 9x9
    const totalCells = marks.length;
    const BOARD_SIZE = totalCells === 49 ? 7 : 9;
    
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
                // backgroundColor: "var(--gray-2)",
                // borderRadius: "12px",
                // border: "2px solid var(--gray-6)",
                maxWidth: BOARD_SIZE === 7 ? "500px" : "600px",
                margin: "0 auto"
            }}
        >
            {board.map((row, r) =>
                row.map((cell, c) => (
                    <Cell 
                        key={`${r}-${c}`} 
                        mark={cell} 
                        empty={empty} 
                        onMove={() => onMove(r, c)}
                        boardSize={BOARD_SIZE}
                    />
                ))
            )}
        </Box>
    );
}

function Cell({
    mark,
    empty,
    onMove,
    boardSize,
}: {
    mark: Mark;
    empty: Mark;
    onMove: () => void;
    boardSize: number;
}): ReactElement {
    const cellStyle = {
        width: boardSize === 7 ? "50px" : "40px",
        height: boardSize === 7 ? "50px" : "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--gray-1)",
        border: "1px solid var(--gray-5)",
        borderRadius: "6px",
        cursor: mark === Mark._ && empty !== Mark._ ? "pointer" : "default",
        transition: "all 0.2s ease",
        fontSize: boardSize === 7 ? "24px" : "20px",
        fontWeight: "bold",
    };

    switch (mark) {
        case Mark.X:
            return (
                <Box 
                    style={{
                        ...cellStyle,
                        backgroundColor: "var(--red-2)",
                        borderColor: "var(--red-6)",
                        color: "var(--red-11)"
                    }}
                >
                    ❌
                </Box>
            );
        case Mark.O:
            return (
                <Box 
                    style={{
                        ...cellStyle,
                        backgroundColor: "var(--blue-2)",
                        borderColor: "var(--blue-6)",
                        color: "var(--blue-11)"
                    }}
                >
                    ⭕
                </Box>
            );
        case Mark._:
            return <EmptyCell empty={empty} onMove={onMove} cellStyle={cellStyle} />;
    }
}

function EmptyCell({ 
    empty, 
    onMove, 
    cellStyle, 
}: { 
    empty: Mark; 
    onMove: () => void;
    cellStyle: any;
}): ReactElement | null {
    const [isHovered, setIsHovered] = useState(false);

    switch (empty) {
        case Mark.X:
            return (
                <Box 
                    style={{
                        ...cellStyle,
                    }}
                    onClick={onMove}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {isHovered ? "❌" : ""}
                </Box>
            );
        case Mark.O:
            return (
                <Box 
                    style={{
                        ...cellStyle,
                    }}
                    onClick={onMove}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {isHovered ? "🔵" : ""}
                </Box>
            );
        case Mark._:
            return (
                <Box 
                    style={cellStyle}
                />
            );
    }
}
