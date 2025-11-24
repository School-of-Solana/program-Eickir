"use client";

import { ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

export function WalletContextProvider({ children }: { children: ReactNode }) {
  // Env vars
  const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  const rawCluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";
  const cluster = rawCluster as string; // we treat it as generic string

  const endpoint = useMemo(() => {
    // 1. If a custom RPC is given, always use it
    if (customRpc && customRpc.length > 0) {
      return customRpc;
    }

    // 2. Handle local validator explicitly
    if (cluster === "localnet" || cluster === "localhost") {
      return "http://127.0.0.1:8899";
    }

    // 3. If cluster is recognized by clusterApiUrl, use it
    if (
      cluster === "devnet" ||
      cluster === "testnet" ||
      cluster === "mainnet-beta"
    ) {
      return clusterApiUrl(cluster);
    }

    // 4. Fallback: devnet
    return clusterApiUrl("devnet");
  }, [customRpc, cluster]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
