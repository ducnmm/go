// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { SuiClient, SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import toast from "react-hot-toast";

type Options = Omit<Parameters<SuiClient["getTransactionBlock"]>[0], "digest"> & {
    tx: Transaction;
};

type ExecuteResponse = { digest: string; rawEffects?: number[] };

type ExecuteCallback = ({
    bytes,
    signature,
}: {
    bytes: string;
    signature: string;
}) => Promise<ExecuteResponse>;

type ResponseCallback = (tx: SuiTransactionBlockResponse) => void | Promise<void>;
type Executor = (options: Options, then: ResponseCallback) => void;

type ExecutorResult = {
    mutate: Executor;
    status: string;
    isIdle: boolean;
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    isPaused: boolean;
};

/**
 * Hook encapsulating running a transaction, waiting for its effects
 * and then doing something with them.
 */
export function useExecutor({ execute }: { execute?: ExecuteCallback } = {}): ExecutorResult {
    const client = useSuiClient();
    const {
        mutate: signAndExecute,
        status,
        isIdle,
        isPending,
        isSuccess,
        isError,
        isPaused,
    } = useSignAndExecuteTransaction({ execute });

    const mutate: Executor = ({ tx, ...options }, then) => {
        signAndExecute(
            {
                // Fails with Transaction type version mismatch
                // @ts-ignore
                transaction: tx,
            },
            {
                onSuccess: ({ digest }) => {
                    client.waitForTransaction({ digest, ...options }).then(then).catch((error) => {
                        console.error("Transaction execution failed:", error);
                        
                        // Check for InsufficientGas error
                        const errorMessage = error?.message || error?.toString() || "";
                        if (errorMessage.includes("InsufficientGas")) {
                            toast.error("❌ Không đủ gas để thực hiện giao dịch! Vui lòng nạp thêm SUI vào ví.");
                            return;
                        }
                        
                        // Generic error message
                        toast.error("❌ Giao dịch thất bại! Vui lòng thử lại.");
                    });
                },

                onError: (error) => {
                    console.error("Failed to execute transaction", tx, error);
                    
                    // Check for InsufficientGas error
                    const errorMessage = error?.message || error?.toString() || "";
                    if (errorMessage.includes("InsufficientGas")) {
                        toast.error("❌ Không đủ gas để thực hiện giao dịch! Vui lòng nạp thêm SUI vào ví.");
                        return;
                    }
                    
                    // Generic error message
                    toast.error("❌ Giao dịch thất bại! Vui lòng thử lại.");
                },
            },
        );
    };

    return {
        mutate,
        status,
        isIdle,
        isPending,
        isSuccess,
        isError,
        isPaused,
    };
}
