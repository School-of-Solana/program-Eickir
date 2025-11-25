"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useRole } from "./RoleProvider";

const LAMPORTS_PER_SOL = 1_000_000_000;

export function NavBar() {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { role } = useRole();

  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const isActive = (href: string) => pathname === href;

  useEffect(() => {
    if (!connected || !publicKey || !connection) {
      setBalanceSol(null);
      return;
    }

    let cancelled = false;
    let subId: number | null = null;

    const fetchBalance = async () => {
      try {
        setLoadingBalance(true);
        const lamports = await connection.getBalance(publicKey);
        if (!cancelled) {
          setBalanceSol(lamports / LAMPORTS_PER_SOL);
        }
      } catch (e) {
        console.error("Failed to fetch balance:", e);
        if (!cancelled) setBalanceSol(null);
      } finally {
        if (!cancelled) setLoadingBalance(false);
      }
    };

    fetchBalance();

    (async () => {
      try {
        subId = await connection.onAccountChange(publicKey, (info) => {
          if (cancelled) return;
          setBalanceSol(info.lamports / LAMPORTS_PER_SOL);
        });
      } catch (e) {
        console.error("onAccountChange subscription error:", e);
      }
    })();

    return () => {
      cancelled = true;
      if (subId !== null) {
        connection.removeAccountChangeListener(subId).catch(() => {});
      }
    };
  }, [connected, publicKey, connection]);

  return (
    <header className="border-b border-slate-900/60 bg-slate-950/80 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo + Home + nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-base font-semibold">Solance</span>
            <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded-full">
              beta
            </span>
          </Link>

          {connected && (
            <nav className="hidden md:flex items-center gap-4 text-xs text-slate-400">
              <Link
                href="/"
                className={isActive("/") ? "text-slate-100" : "hover:text-slate-200"}
              >
                Home
              </Link>

              {/* Toujours visibles une fois connecté */}
              <Link
                href="/client"
                className={
                  pathname.startsWith("/client")
                    ? "text-slate-100"
                    : "hover:text-slate-200"
                }
              >
                Client dashboard
              </Link>

              <Link
                href="/contractor"
                className={
                  pathname.startsWith("/contractor")
                    ? "text-slate-100"
                    : "hover:text-slate-200"
                }
              >
                Contractor dashboard
              </Link>

              {/* Lien "Contracts" uniquement en mode client (optionnel) */}
              {role === "client" && (
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
              )}
            </nav>
          )}
        </div>

        {/* Wallet + rôle + balance */}
        <div className="flex items-center gap-3">
          {connected && role && (
            <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
              Mode: <span className="font-semibold capitalize">{role}</span>
            </span>
          )}

          {connected && (
            <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono">
              {loadingBalance
                ? "◎ Loading…"
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
