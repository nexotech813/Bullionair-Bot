'use server';
import { Firestore, doc, setDoc, onSnapshot, getDoc } from "firebase/firestore";
import type { Trade } from "./types";
import { setDocumentNonBlocking } from "@/firebase";

const COMMAND_DOC_PATH = 'bullionaire-bot-commands/trade-command';

export type TradeCommand = {
    action: 'OPEN' | 'CLOSE';
    timestamp: number;
    details: {
        symbol: string;
        volume: number;
        type: 'BUY' | 'SELL';
        stopLoss?: number;
        takeProfit?: number;
    } | {
        ticketId: string; // Using a placeholder for ticketId
    };
};

/**
 * Sends a trade command to the Firestore command queue.
 * The MT5 bridge should be listening to this document for changes.
 */
export function sendTradeCommand(firestore: Firestore, command: Omit<TradeCommand, 'timestamp'>) {
    const commandRef = doc(firestore, COMMAND_DOC_PATH);
    const commandWithTimestamp: TradeCommand = {
        ...command,
        timestamp: Date.now(),
    };
    
    // Use a non-blocking write. The server doesn't need to wait for this to complete.
    setDocumentNonBlocking(commandRef, commandWithTimestamp, { merge: false });
    console.log(`Command sent to Firestore queue: ${command.action}`);
}

/**
 * Deletes the command from the queue.
 * The MT5 bridge should call this after successfully executing a command.
 */
export async function clearTradeCommand(firestore: Firestore) {
    const commandRef = doc(firestore, COMMAND_DOC_PATH);
    // Overwrite with an empty object to clear it
    await setDoc(commandRef, {});
    console.log('Trade command cleared from queue.');
}
