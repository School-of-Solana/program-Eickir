// src/utils/pubkey.ts
import { PublicKey } from "@solana/web3.js";

export function tryParsePubkey(value: string | undefined | null): PublicKey | null {
  if (!value) return null;
  try {
    const cleaned = decodeURIComponent(value).trim();
    return new PublicKey(cleaned);
  } catch (e) {
    console.error("tryParsePubkey: invalid pubkey string", value, e);
    return null;
  }
}
