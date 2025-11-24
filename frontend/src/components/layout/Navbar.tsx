"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRole } from "./RoleProvider";

export function NavBar() {
  const pathname = usePathname();
  const { connected } = useWallet();
  const { role } = useRole();

  const isActive = (href: string) => pathname === href;

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
                    href="/contracts"
                    className={
                      pathname.startsWith("/contracts")
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
                    href="/client"
                    className={
                      pathname.startsWith("/contracts")
                        ? "text-slate-100"
                        : "hover:text-slate-200"
                    }
                  >
                    Client Dashboard
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Wallet button */}
        <div className="flex items-center gap-3">
          {connected && role && (
            <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
              Mode: <span className="font-semibold capitalize">{role}</span>
            </span>
          )}
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
