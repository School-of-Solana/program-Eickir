"use client";

import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { SOLANCE_PROGRAM_ID } from "./program";

export const CLIENT_SEED = "client";
export const CONTRACTOR_SEED = "contractor";
export const CONTRACT_SEED = "contract";
export const PROPOSAL_SEED = "proposal";
export const VAULT_SEED = "vault";

export function getClientPda(user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(CLIENT_SEED), user.toBuffer()],
    SOLANCE_PROGRAM_ID
  )[0];
}

export function getContractorPda(user: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(CONTRACTOR_SEED), user.toBuffer()],
    SOLANCE_PROGRAM_ID
  )[0];
}

export function getContractPda(
  clientAccount: PublicKey,
  contractId: BN
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(CONTRACT_SEED),
      clientAccount.toBuffer(),
      contractId.toArrayLike(Buffer, "le", 8),
    ],
    SOLANCE_PROGRAM_ID
  )[0];
}

export function getProposalPda(
  contractorAccount: PublicKey,
  proposalId: BN
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PROPOSAL_SEED),
      contractorAccount.toBuffer(),
      proposalId.toArrayLike(Buffer, "le", 8),
    ],
    SOLANCE_PROGRAM_ID
  )[0];
}

export function getVaultPda(contract: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), contract.toBuffer()],
    SOLANCE_PROGRAM_ID
  )[0];
}
