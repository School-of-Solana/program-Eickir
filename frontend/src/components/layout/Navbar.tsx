"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useRole } from "./RoleProvider";

export function NavBar() {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { role } = useRole();

  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const isActive = (href: string) => pathname === href;

  // Load SOL balance of the connected wallet
  useEffect(() => {
    if (!connected || !publicKey || !connection) {
      setBalanceSol(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingBalance(true);
        const lamports = await connection.getBalance(publicKey);
        if (!cancelled) {
          setBalanceSol(lamports / 1_000_000_000); // lamports -> SOL
        }
      } catch (e) {
        console.error("Failed to fetch balance:", e);
        if (!cancelled) {
          setBalanceSol(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingBalance(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, connection]);

  return (
    <header className="border-b border-slate-900/60 bg-slate-950/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo + Home */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-base font-semibold">Solance</span>
            <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded-full">
              beta
            </span>
          </Link>

          {/* Liens contextuels selon le rôle */}
          {connected && (
            <nav className="hidden md:flex items-center gap-4 text-xs text-slate-400">
              <Link
                href="/"
                className={isActive("/") ? "text-slate-100" : "hover:text-slate-200"}
              >
                Home
              </Link>

              {role === "client" && (
                <>
                  <Link
                    href="/client"
                    className={
                      isActive("/client") ? "text-slate-100" : "hover:text-slate-200"
                    }
                  >
                    Client dashboard
                  </Link>
                  <Link
                    href="/client/contracts"
                    className={
                      pathname.startsWith("/client/contracts")
                        ? "text-slate-100"
                        : "hover:text-slate-200"
                    }
                  >
                    Contracts
                  </Link>
                </>
              )}

              {role === "contractor" && (
                <>
                  <Link
                    href="/contractor"
                    className={
                      isActive("/contractor")
                        ? "text-slate-100"
                        : "hover:text-slate-200"
                    }
                  >
                    Contractor dashboard
                  </Link>
                  <Link
                    href="/contractor/available-contracts"
                    className={
                      pathname.startsWith("/contractor/available-contracts")
                        ? "text-slate-100"
                        : "hover:text-slate-200"
                    }
                  >
                    Missions
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Wallet + balance + mode */}
        <div className="flex items-center gap-3">
          {connected && role && (
            <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
              Mode: <span className="font-semibold capitalize">{role}</span>
            </span>
          )}

          {connected && (
            <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono">
              {loadingBalance
                ? "Loading…"
                : balanceSol !== null
                ? `◎ ${balanceSol.toFixed(3)} SOL`
                : "◎ -- SOL"}
            </span>
          )}

          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
