import { PublicKey } from "@solana/web3.js";

const CLIENT_SEED = "client";
const CONTRACTOR_SEED = "contractor";
const CONTRACT_SEED = "contract";
const PROPOSAL_SEED = "proposal";
const VAULT_SEED = "vault";

export function getClientPda(programId: PublicKey, owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(CLIENT_SEED), owner.toBuffer()],
    programId
  )[0];
}

export function getContractorPda(programId: PublicKey, owner: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(CONTRACTOR_SEED), owner.toBuffer()],
    programId
  )[0];
}

export function getContractPda(
  programId: PublicKey,
  clientPda: PublicKey,
  contractId: bigint | number
) {
  const bn = BigInt(contractId);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(bn);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(CONTRACT_SEED), clientPda.toBuffer(), buf],
    programId
  )[0];
}

export function getProposalPda(
  programId: PublicKey,
  contractorPda: PublicKey,
  proposalId: bigint | number
) {
  const bn = BigInt(proposalId);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(bn);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PROPOSAL_SEED), contractorPda.toBuffer(), buf],
    programId
  )[0];
}

export function getVaultPda(programId: PublicKey, contractPubkey: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), contractPubkey.toBuffer()],
    programId
  )[0];
}
