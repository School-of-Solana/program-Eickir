import { Connection } from "@solana/web3.js";

export const SOLANA_RPC_ENDPOINT = "http://127.0.0.1:8899"; 

export const connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
