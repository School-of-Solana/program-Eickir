import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError } from "@coral-xyz/anchor";
import { Solance } from "../target/types/solance";
import { expect } from "chai";
import { strict as assert } from "assert";

async function airdrop(
  connection: anchor.web3.Connection,
  address: anchor.web3.PublicKey,
  amount = 1_000_000_000
) {
  const sig = await connection.requestAirdrop(address, amount);
  await connection.confirmTransaction(sig, "confirmed");
}

/**
 * Vérifie qu'une erreur Anchor correspond au code d'erreur attendu (par nom).
 *
 * Exemples :
 *   expectAnchorError(err, "TitleTooLong")
 *   expectAnchorError(err, "UnauthorizedAccount")
 */
function expectAnchorError(err: any, expectedCode: string) {

  if (err instanceof AnchorError) {
    const code = err.error.errorCode.code;  
    const num = err.error.errorCode.number;

    expect(
      code,
      `Expected Anchor error code "${expectedCode}", got "${code}" (num=${num})`
    ).to.equal(expectedCode);
    return;
  }

  const msg = String(err);
  const logs: string[] =
    err.logs ??
    err.transactionMessage?.meta?.logMessages ??
    err.transactionMessage?.logs ??
    [];

  const foundInMsg = msg.includes(expectedCode);
  const foundInLogs = logs.some((l) => l.includes(expectedCode));

  if (!foundInMsg && !foundInLogs) {
    console.error("Anchor error (raw object):", err);
    console.error("Anchor error message:", msg);
    console.error("Program logs:", logs);
  }

  expect(
    foundInMsg || foundInLogs,
    `Expected Anchor error code "${expectedCode}" in error message/logs`
  ).to.be.true;
}

async function accountExists(
  connection: anchor.web3.Connection,
  pubkey: anchor.web3.PublicKey
): Promise<boolean> {
  const info = await connection.getAccountInfo(pubkey);
  return info !== null;
}


async function ensureContractorInitialized(
  program: Program<Solance>,
  connection: anchor.web3.Connection,
  contractorKp: anchor.web3.Keypair,
  contractorPda: anchor.web3.PublicKey
) {
  if (await accountExists(connection, contractorPda)) {
    return;
  }

  await program.methods
    .initializeContractorIx()
    .accounts({
      contractor: contractorKp.publicKey,
      contractorAccount: contractorPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([contractorKp])
    .rpc({ commitment: "confirmed" });
}

async function ensureClientInitialized(
  program: Program<Solance>,
  connection: anchor.web3.Connection,
  clientKp: anchor.web3.Keypair,
  clientPda: anchor.web3.PublicKey
) {
  if (await accountExists(connection, clientPda)) {
    return;
  }

  await program.methods
    .initializeClientIx()
    .accounts({
      client: clientKp.publicKey,
      clientAccount: clientPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([clientKp])
    .rpc({ commitment: "confirmed" });
}


describe("solance program", () => {
  // ---------- SEEDS ----------

  const CLIENT_SEED = "client";
  const CONTRACTOR_SEED = "contractor";
  const CONTRACT_SEED = "contract";
  const PROPOSAL_SEED = "proposal";
  const VAULT_SEED = "vault";

  const TITLE_MAX_LENGTH = 100;
  const TOPIC_MAX_LENGTH = 500;

  // ---------- PROVIDER & PROGRAM ----------

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solance as Program<Solance>;

  // ---------- ACCOUNTS & PDAs ----------

  // Client
  const client = anchor.web3.Keypair.generate();
  const [client_pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CLIENT_SEED), client.publicKey.toBuffer()],
    program.programId
  );

  const client_no_fund = anchor.web3.Keypair.generate();
  const [client_no_fund_pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CLIENT_SEED), client_no_fund.publicKey.toBuffer()],
    program.programId
  );

  // discriminator + owner + is_initialized? + next_contract_id
  const space_client_account = 8 + 32 + 1 + 8;

  // Contractor
  const contractor = anchor.web3.Keypair.generate();
  const [contractor_pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONTRACTOR_SEED), contractor.publicKey.toBuffer()],
    program.programId
  );

  const contractor_no_fund = anchor.web3.Keypair.generate();
  const [contractor_no_fund_pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CONTRACTOR_SEED), contractor_no_fund.publicKey.toBuffer()],
    program.programId
  );

  const contractor_attacker = anchor.web3.Keypair.generate();
  const [contractor_attacker_pda] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(CONTRACTOR_SEED), contractor_attacker.publicKey.toBuffer()],
      program.programId
    );

  const space_contractor_account = 8 + 32 + 1 + 8;

  // Client attacker
  const client_attacker = anchor.web3.Keypair.generate();
  const [client_attacker_pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(CLIENT_SEED), client_attacker.publicKey.toBuffer()],
    program.programId
  );

  // Contracts
  const id0 = new anchor.BN(0);
  const [first_contract_pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(CONTRACT_SEED),
      client_pda.toBuffer(),
      id0.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  const id1 = new anchor.BN(1);
  const [second_contract_pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(CONTRACT_SEED),
      client_pda.toBuffer(),
      id1.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  // Vault pour first_contract
  const [first_vault_pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), first_contract_pda.toBuffer()],
    program.programId
  );

  // Proposals pour le contractor principal
  const proposal_id0 = new anchor.BN(0);
  const [first_proposal_pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(PROPOSAL_SEED),
      contractor_pda.toBuffer(),
      proposal_id0.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  const proposal_id1 = new anchor.BN(1);
  const [second_proposal_pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(PROPOSAL_SEED),
      contractor_pda.toBuffer(),
      proposal_id1.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  // ---------- CONSTS TEST ----------

  const good_title_length = "Blockchain Engineer on Solana";
  const wrong_title_length = good_title_length.repeat(10); // > 100 bytes
  const good_topic_length =
    "I need a blockchain engineer to write programs on Solana dApp";
  const wrong_topic_length = good_topic_length.repeat(10); // > 500 bytes

  const amount = new anchor.BN(1_000_000_000); // 1 SOL

  // ========== TESTS ==========

  describe("initialize client", () => {
    it("Should successfully initialize a Client account with next_contract_id = 0", async () => {
      await airdrop(provider.connection, client.publicKey);

      await program.methods
        .initializeClientIx()
        .accounts({
          client: client.publicKey,
          clientAccount: client_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      const clientAccount = await program.account.client.fetch(client_pda);

      expect(clientAccount.owner.toBase58()).to.equal(
        client.publicKey.toBase58()
      );
      expect(clientAccount.nextContractId.toNumber()).to.equal(0);
    });

    it("Should fail when initializing a Client account already initialized", async () => {
      try {
        await program.methods
          .initializeClientIx()
          .accounts({
            client: client.publicKey,
            clientAccount: client_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client])
          .rpc({ commitment: "confirmed" });

        assert.fail(
          "Expected initializeClientIx to fail for already initialized PDA"
        );
      } catch (err: any) {
        expect(String(err)).to.include("already in use");
      }
    });

    it("Should fail to initialize client when payer has not enough funds", async () => {
      const requiredRent =
        await provider.connection.getMinimumBalanceForRentExemption(
          space_client_account
        );
      await airdrop(
        provider.connection,
        client_no_fund.publicKey,
        requiredRent - 1
      );

      try {
        await program.methods
          .initializeClientIx()
          .accounts({
            client: client_no_fund.publicKey,
            clientAccount: client_no_fund_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client_no_fund])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected insufficient lamports error");
      } catch (err: any) {
        expect(String(err)).to.include("insufficient lamports");
      }
    });
  });

  describe("initialize contractor", () => {
    it("Should successfully initialize a Contractor account with next_proposal_id = 0", async () => {
      await airdrop(provider.connection, contractor.publicKey);

      await program.methods
        .initializeContractorIx()
        .accounts({
          contractor: contractor.publicKey,
          contractorAccount: contractor_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([contractor])
        .rpc({ commitment: "confirmed" });

      const contractorAccount = await program.account.contractor.fetch(
        contractor_pda
      );

      expect(contractorAccount.owner.toBase58()).to.equal(
        contractor.publicKey.toBase58()
      );
      expect(contractorAccount.nextProposalId.toNumber()).to.equal(0);
    });

    it("Should fail when initializing a Contractor account already initialized", async () => {
      try {
        await program.methods
          .initializeContractorIx()
          .accounts({
            contractor: contractor.publicKey,
            contractorAccount: contractor_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([contractor])
          .rpc({ commitment: "confirmed" });

        assert.fail(
          "Expected initializeContractorIx to fail for already initialized PDA"
        );
      } catch (err: any) {
        expect(String(err)).to.include("already in use");
      }
    });

    it("Should fail to initialize contractor when payer has not enough funds", async () => {
      const requiredRent =
        await provider.connection.getMinimumBalanceForRentExemption(
          space_contractor_account
        );
      await airdrop(
        provider.connection,
        contractor_no_fund.publicKey,
        requiredRent - 1
      );

      try {
        await program.methods
          .initializeContractorIx()
          .accounts({
            contractor: contractor_no_fund.publicKey,
            contractorAccount: contractor_no_fund_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([contractor_no_fund])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected insufficient lamports error for contractor init");
      } catch (err: any) {
        expect(String(err)).to.include("insufficient lamports");
      }
    });
  });

  describe("initialize contract", () => {
    it("Should successfully initialize a Contract account with contract_id = 0", async () => {
      await program.methods
        .initializeContractIx(good_title_length, good_topic_length)
        .accounts({
          signer: client.publicKey,
          clientAccount: client_pda,
          contractAccount: first_contract_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      const contractAccount = await program.account.contract.fetch(
        first_contract_pda
      );

      expect(contractAccount.client.toBase58()).to.equal(
        client_pda.toBase58()
      );
      expect(contractAccount.contractId.toNumber()).to.equal(0);
      expect(contractAccount.title).to.equal(good_title_length);
      expect(contractAccount.topic).to.equal(good_topic_length);
    });

    it(`Should fail to initialize a Contract with a title longer than ${TITLE_MAX_LENGTH} bytes`, async () => {
      try {
        await program.methods
          .initializeContractIx(wrong_title_length, good_topic_length)
          .accounts({
            signer: client.publicKey,
            clientAccount: client_pda,
            contractAccount: second_contract_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected TitleTooLong error");
      } catch (err: any) {
        expectAnchorError(err, "TitleTooLong");
      }
    });

    it(`Should fail to initialize a Contract with a topic longer than ${TOPIC_MAX_LENGTH} bytes`, async () => {
      try {
        await program.methods
          .initializeContractIx(good_title_length, wrong_topic_length)
          .accounts({
            signer: client.publicKey,
            clientAccount: client_pda,
            contractAccount: second_contract_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected TopicTooLong error");
      } catch (err: any) {
        expectAnchorError(err, "TopicTooLong");
      }
    });

    it("Should fail to initialize a Contract when the signer is not the owner of the Client Account", async () => {
      await airdrop(provider.connection, client_attacker.publicKey);

      await program.methods
        .initializeClientIx()
        .accounts({
          client: client_attacker.publicKey,
          clientAccount: client_attacker_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client_attacker])
        .rpc({ commitment: "confirmed" });

      try {
        await program.methods
          .initializeContractIx(good_title_length, good_topic_length)
          .accounts({
            signer: client_attacker.publicKey,
            clientAccount: client_pda,
            contractAccount: second_contract_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client_attacker])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected UnauthorizedAccount error");
      } catch (err: any) {
        expectAnchorError(err, "UnauthorizedAccount");
      }
    });
  });

  describe("initialize proposal", () => {
    it("Should successfully initialize a Proposal account with proposal_id = 0", async () => {
      await program.methods
        .initializeProposalIx(amount)
        .accounts({
          contractor: contractor.publicKey,
          contract: first_contract_pda,
          contractorAccount: contractor_pda,
          proposalAccount: first_proposal_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([contractor])
        .rpc({ commitment: "confirmed" });

      const contractorAccount = await program.account.contractor.fetch(
        contractor_pda
      );
      expect(contractorAccount.nextProposalId.toNumber()).to.equal(1);
    });

    it("Should store correct contract and contractor in Proposal account", async () => {
      const proposalAccount = await program.account.proposal.fetch(
        first_proposal_pda
      );
      expect(proposalAccount.contract.toBase58()).to.equal(
        first_contract_pda.toBase58()
      );
      expect(proposalAccount.contractor.toBase58()).to.equal(
        contractor_pda.toBase58()
      );
    });

    it("Should fail to initialize a Proposal when the signer is not the owner of the Contractor Account", async () => {
      await airdrop(provider.connection, contractor_attacker.publicKey);

      const contractorAccount = await program.account.contractor.fetch(
        contractor_pda
      );
      const nextProposalId = contractorAccount.nextProposalId as anchor.BN;

      const [unauthorized_proposal_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from(PROPOSAL_SEED),
            contractor_pda.toBuffer(),
            nextProposalId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

      try {
        await program.methods
          .initializeProposalIx(amount)
          .accounts({
            contractor: contractor_attacker.publicKey, 
            contract: first_contract_pda,
            contractorAccount: contractor_pda,
            proposalAccount: unauthorized_proposal_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([contractor_attacker])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected UnauthorizedAccount / constraint error");
      } catch (err: any) {

        if (err instanceof AnchorError) {
          const code = err.error.errorCode.code;
          expect(
            ["UnauthorizedAccount", "ConstraintSeeds"],
            `Expected UnauthorizedAccount or ConstraintSeeds, got ${code}`
          ).to.include(code);
          return;
        }
        const msg = String(err);
        const logs: string[] =
          err.logs ??
          err.transactionMessage?.meta?.logMessages ??
          err.transactionMessage?.logs ??
          [];
        const combined = msg + " " + logs.join(" ");
        expect(
          combined.includes("UnauthorizedAccount") ||
            combined.includes("ConstraintSeeds"),
          "Expected UnauthorizedAccount or ConstraintSeeds in error message/logs"
        ).to.be.true;
      }
    });
  });

  describe("update proposal", () => {
    it("Should let contractor update amount on an open proposal", async () => {
      const newAmount = new anchor.BN(2_000_000_000);

      await program.methods
        .updateProposalIx(newAmount)
        .accounts({
          contractor: contractor.publicKey,
          contractorAccount: contractor_pda,
          proposalAccount: first_proposal_pda,
          contract: first_contract_pda,
        })
        .signers([contractor])
        .rpc({ commitment: "confirmed" });

      const updated = await program.account.proposal.fetch(first_proposal_pda);
      expect(updated.amount.toNumber()).to.equal(newAmount.toNumber());
    });

    it("Should fail to update a Proposal that has been accepted (ProposalCannotBeUpdated)", async () => {
      const clientAccount = await program.account.client.fetch(client_pda);
      const nextId = clientAccount.nextContractId as anchor.BN;

      const [accepted_contract_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from(CONTRACT_SEED),
            client_pda.toBuffer(),
            nextId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

      const [accepted_vault_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from(VAULT_SEED), accepted_contract_pda.toBuffer()],
          program.programId
        );

      await program.methods
        .initializeContractIx(good_title_length, good_topic_length)
        .accounts({
          signer: client.publicKey,
          clientAccount: client_pda,
          contractAccount: accepted_contract_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      const contractorAccount = await program.account.contractor.fetch(
        contractor_pda
      );
      const nextProposalId = contractorAccount.nextProposalId as anchor.BN;

      const [accepted_proposal_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from(PROPOSAL_SEED),
            contractor_pda.toBuffer(),
            nextProposalId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

      const initialAmount = new anchor.BN(500_000_000);

      await program.methods
        .initializeProposalIx(initialAmount)
        .accounts({
          contractor: contractor.publicKey,
          contract: accepted_contract_pda,
          contractorAccount: contractor_pda,
          proposalAccount: accepted_proposal_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([contractor])
        .rpc({ commitment: "confirmed" });

      await airdrop(provider.connection, client.publicKey, 2_000_000_000);

      await program.methods
        .chooseProposalIx()
        .accounts({
          signer: client.publicKey,
          clientAccount: client_pda,
          contract: accepted_contract_pda,
          proposalAccount: accepted_proposal_pda,
          contractorAccount: contractor_pda,
          vault: accepted_vault_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      try {
        await program.methods
          .updateProposalIx(new anchor.BN(600_000_000))
          .accounts({
            contractor: contractor.publicKey,
            contractorAccount: contractor_pda,
            proposalAccount: accepted_proposal_pda,
            contract: accepted_contract_pda,
          })
          .signers([contractor])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected ProposalCannotBeUpdated error");
      } catch (err: any) {
        expectAnchorError(err, "ProposalCannotBeUpdated");
      }
    });

    it("Should fail if another contractor tries to update the proposal", async () => {
      await airdrop(provider.connection, contractor_attacker.publicKey);

      try {
        await program.methods
          .initializeContractorIx()
          .accounts({
            contractor: contractor_attacker.publicKey,
            contractorAccount: contractor_attacker_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([contractor_attacker])
          .rpc({ commitment: "confirmed" });
      } catch (err: any) {

        if (!String(err).includes("already in use")) {
          throw err;
        }
      }

      try {
        await program.methods
          .updateProposalIx(new anchor.BN(123_000_000))
          .accounts({
            contractor: contractor_attacker.publicKey,
            contractorAccount: contractor_attacker_pda,
            proposalAccount: first_proposal_pda,
            contract: first_contract_pda,
          })
          .signers([contractor_attacker])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected UnauthorizedAccount / Constraint error");
      } catch (err: any) {
        if (err instanceof AnchorError) {
          const code = err.error.errorCode.code;
          expect(
            ["UnauthorizedAccount", "ConstraintSeeds"],
            `Expected UnauthorizedAccount or ConstraintSeeds, got ${code}`
          ).to.include(code);
        } else {
          const msg = String(err);
          expect(
            msg.includes("UnauthorizedAccount") ||
              msg.includes("ConstraintSeeds"),
            "Expected UnauthorizedAccount or ConstraintSeeds in error"
          ).to.be.true;
        }
      }
    });


    it("Should fail to update Proposal if contract account doesn't match proposal.contract (InvalidProposalForContract)", async () => {

      const clientAccount = await program.account.client.fetch(client_pda);
      const nextId = clientAccount.nextContractId as anchor.BN;

      const [wrong_contract_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from(CONTRACT_SEED),
            client_pda.toBuffer(),
            nextId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

      await program.methods
        .initializeContractIx(good_title_length, good_topic_length)
        .accounts({
          signer: client.publicKey,
          clientAccount: client_pda,
          contractAccount: wrong_contract_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      try {
        await program.methods
          .updateProposalIx(new anchor.BN(999_000_000))
          .accounts({
            contractor: contractor.publicKey,
            contractorAccount: contractor_pda,
            proposalAccount: first_proposal_pda, 
            contract: wrong_contract_pda,    
          })
          .signers([contractor])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected InvalidProposalForContract error on updateProposalIx");
      } catch (err: any) {
        expectAnchorError(err, "InvalidProposalForContract");
      }
    });
  });

  describe("choose proposal (with vault)", () => {
    it("Should let the client choose a proposal, fund the vault, and update the contract", async () => {

      await airdrop(provider.connection, client.publicKey, 3_000_000_000);

      const beforeClientBalance = await provider.connection.getBalance(
        client.publicKey
      );
      const beforeVaultBalance = await provider.connection.getBalance(
        first_vault_pda
      );

      await program.methods
        .chooseProposalIx()
        .accounts({
          signer: client.publicKey,
          clientAccount: client_pda,
          contract: first_contract_pda,
          proposalAccount: first_proposal_pda,
          contractorAccount: contractor_pda,
          vault: first_vault_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      const afterClientBalance = await provider.connection.getBalance(
        client.publicKey
      );
      const afterVaultBalance = await provider.connection.getBalance(
        first_vault_pda
      );
      const contractAccount = await program.account.contract.fetch(
        first_contract_pda
      );

      const proposalAccount = await program.account.proposal.fetch(
        first_proposal_pda
      );
      const expectedAmount = proposalAccount.amount.toNumber();

      const vaultDelta = afterVaultBalance - beforeVaultBalance;
      expect(vaultDelta).to.be.greaterThanOrEqual(expectedAmount);

      expect(afterClientBalance).to.be.lessThan(beforeClientBalance);

      expect(contractAccount.amount.toNumber()).to.equal(expectedAmount);
      expect("accepted" in contractAccount.status).to.be.true;
      expect(contractAccount.contractor.toBase58()).to.equal(
        contractor_pda.toBase58()
      );
    });

    it("Should fail if client doesn't have enough funds", async () => {

      const clientAccount = await program.account.client.fetch(client_pda);
      const nextId = clientAccount.nextContractId as anchor.BN;

      const [third_contract_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from(CONTRACT_SEED),
            client_pda.toBuffer(),
            nextId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

      const [third_vault_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from(VAULT_SEED), third_contract_pda.toBuffer()],
          program.programId
        );


      await program.methods
        .initializeContractIx(good_title_length, good_topic_length)
        .accounts({
          signer: client.publicKey,
          clientAccount: client_pda,
          contractAccount: third_contract_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      const contractorAccount = await program.account.contractor.fetch(
        contractor_pda
      );
      const nextProposalId = contractorAccount.nextProposalId as anchor.BN;

      const [third_proposal_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from(PROPOSAL_SEED),
            contractor_pda.toBuffer(),
            nextProposalId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );


      const hugeAmount = new anchor.BN(10_000_000_000);

      await program.methods
        .initializeProposalIx(hugeAmount)
        .accounts({
          contractor: contractor.publicKey,
          contract: third_contract_pda,
          contractorAccount: contractor_pda,
          proposalAccount: third_proposal_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([contractor])
        .rpc({ commitment: "confirmed" });


      await airdrop(provider.connection, client.publicKey, 1_000_000_000);

      try {
        await program.methods
          .chooseProposalIx()
          .accounts({
            signer: client.publicKey,
            clientAccount: client_pda,
            contract: third_contract_pda,
            proposalAccount: third_proposal_pda,
            contractorAccount: contractor_pda,
            vault: third_vault_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected InsufficientClientFunds error");
      } catch (err: any) {
        expectAnchorError(err, "InsufficientClientFunds");
      }
    });

    it("Should fail if proposal does not belong to the given contract (InvalidProposalForContract)", async () => {

      const clientAccount = await program.account.client.fetch(client_pda);
      const nextId = clientAccount.nextContractId as anchor.BN;

      const [mismatch_contract_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from(CONTRACT_SEED),
            client_pda.toBuffer(),
            nextId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

      const [mismatch_vault_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from(VAULT_SEED), mismatch_contract_pda.toBuffer()],
          program.programId
        );

      await program.methods
        .initializeContractIx(good_title_length, good_topic_length)
        .accounts({
          signer: client.publicKey,
          clientAccount: client_pda,
          contractAccount: mismatch_contract_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      await airdrop(provider.connection, client.publicKey, 2_000_000_000);

      try {
        await program.methods
          .chooseProposalIx()
          .accounts({
            signer: client.publicKey,
            clientAccount: client_pda,
            contract: mismatch_contract_pda, 
            proposalAccount: first_proposal_pda, 
            contractorAccount: contractor_pda,
            vault: mismatch_vault_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected InvalidProposalForContract error");
      } catch (err: any) {

        if (err instanceof AnchorError) {
          const code = err.error.errorCode.code;
          expect(
            ["InvalidProposalForContract", "ContractNotOpened"],
            `Expected InvalidProposalForContract (or ContractNotOpened), got ${code}`
          ).to.include(code);
        } else {
          const msg = String(err);
          expect(
            msg.includes("InvalidProposalForContract") ||
              msg.includes("ContractNotOpened"),
            "Expected InvalidProposalForContract / ContractNotOpened in error"
          ).to.be.true;
        }
      }
    });

    it("Should fail if contractorAccount does not match proposal contractor (InvalidContractorForProposal)", async () => {
      await airdrop(provider.connection, contractor_attacker.publicKey);

      try {
        await program.methods
          .initializeContractorIx()
          .accounts({
            contractor: contractor_attacker.publicKey,
            contractorAccount: contractor_attacker_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([contractor_attacker])
          .rpc({ commitment: "confirmed" });
      } catch (err: any) {
        if (!String(err).includes("already in use")) {
          throw err;
        }
      }


      const clientAccount = await program.account.client.fetch(client_pda);
      const nextId = clientAccount.nextContractId as anchor.BN;

      const [own_contract_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(CONTRACT_SEED),
          client_pda.toBuffer(),
          nextId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const [own_vault_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_SEED), own_contract_pda.toBuffer()],
        program.programId
      );

      await program.methods
        .initializeContractIx(good_title_length, good_topic_length)
        .accounts({
          signer: client.publicKey,
          clientAccount: client_pda,
          contractAccount: own_contract_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });


      const contractorAccount = await program.account.contractor.fetch(
        contractor_pda
      );
      const nextProposalId = contractorAccount.nextProposalId as anchor.BN;

      const [own_proposal_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(PROPOSAL_SEED),
          contractor_pda.toBuffer(),
          nextProposalId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const proposalAmount = new anchor.BN(777_000_000);

      await program.methods
        .initializeProposalIx(proposalAmount)
        .accounts({
          contractor: contractor.publicKey,
          contract: own_contract_pda,
          contractorAccount: contractor_pda,
          proposalAccount: own_proposal_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([contractor])
        .rpc({ commitment: "confirmed" });

      await airdrop(provider.connection, client.publicKey, 2_000_000_000);

      try {
        await program.methods
          .chooseProposalIx()
          .accounts({
            signer: client.publicKey,
            clientAccount: client_pda,
            contract: own_contract_pda,
            proposalAccount: own_proposal_pda,
            contractorAccount: contractor_attacker_pda, 
            vault: own_vault_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected InvalidContractorForProposal error");
      } catch (err: any) {
        expectAnchorError(err, "InvalidContractorForProposal");
      }
    });

  });

  describe("mark work done", () => {
    it("Should let the contractor mark work as done and close the contract", async () => {
      await program.methods
        .markWorkDoneIx()
        .accounts({
          contractor: contractor.publicKey,
          contractorAccount: contractor_pda,
          contract: first_contract_pda,
        })
        .signers([contractor])
        .rpc({ commitment: "confirmed" });

      const contractAccount = await program.account.contract.fetch(
        first_contract_pda
      );
      expect("closed" in contractAccount.status).to.be.true;
    });

    it("Should fail if another contractor tries to mark work as done", async () => {
      await airdrop(provider.connection, contractor_attacker.publicKey);

      try {
        await program.methods
          .initializeContractorIx()
          .accounts({
            contractor: contractor_attacker.publicKey,
            contractorAccount: contractor_attacker_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([contractor_attacker])
          .rpc({ commitment: "confirmed" });
      } catch (err: any) {
        const msg = String(err);
        if (!msg.includes("already in use")) {
          throw err;
        }
      }

      try {
        await program.methods
          .markWorkDoneIx()
          .accounts({
            contractor: contractor_attacker.publicKey,
            contractorAccount: contractor_attacker_pda,
            contract: first_contract_pda,
          })
          .signers([contractor_attacker])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected UnauthorizedAccount error");
      } catch (err: any) {
        expectAnchorError(err, "UnauthorizedAccount");
      }
    });

    it("Should fail if contract is not in Accepted status", async () => {

      const clientAccount = await program.account.client.fetch(client_pda);
      const nextId = clientAccount.nextContractId as anchor.BN;

      const [not_accepted_contract_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from(CONTRACT_SEED),
            client_pda.toBuffer(),
            nextId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

      await program.methods
        .initializeContractIx(good_title_length, good_topic_length)
        .accounts({
          signer: client.publicKey,
          clientAccount: client_pda,
          contractAccount: not_accepted_contract_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      try {
        await program.methods
          .markWorkDoneIx()
          .accounts({
            contractor: contractor.publicKey,
            contractorAccount: contractor_pda,
            contract: not_accepted_contract_pda,
          })
          .signers([contractor])
          .rpc({ commitment: "confirmed" });

        assert.fail(
          "Expected ContractNotAccepted or UnauthorizedAccount error"
        );
      } catch (err: any) {

        if (err instanceof AnchorError) {
          const code = err.error.errorCode.code;
          expect(
            ["ContractNotAccepted", "UnauthorizedAccount"],
            `Expected ContractNotAccepted or UnauthorizedAccount, got ${code}`
          ).to.include(code);
        } else {
          const msg = String(err);
          expect(
            msg.includes("ContractNotAccepted") ||
              msg.includes("UnauthorizedAccount"),
            "Expected ContractNotAccepted or UnauthorizedAccount in error"
          ).to.be.true;
        }
      }
    });

    it("Should fail if markWorkDoneIx is called twice on the same contract", async () => {
      try {
        await program.methods
          .markWorkDoneIx()
          .accounts({
            contractor: contractor.publicKey,
            contractorAccount: contractor_pda,
            contract: first_contract_pda,
          })
          .signers([contractor])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected second markWorkDoneIx to fail");
      } catch (err: any) {
        if (err instanceof AnchorError) {
          const code = err.error.errorCode.code;
          expect(
            ["ContractNotAccepted", "ContractAlreadyClosed"],
            `Expected ContractNotAccepted or ContractAlreadyClosed, got ${code}`
          ).to.include(code);
        } else {
          const msg = String(err);
          expect(
            msg.includes("ContractNotAccepted") ||
              msg.includes("ContractAlreadyClosed"),
            "Expected ContractNotAccepted or ContractAlreadyClosed in error"
          ).to.be.true;
        }
      }
    });
  });

  describe("claim payment (with vault)", () => {
    it("Should transfer SOL from vault to contractor when contract is closed", async () => {
      await airdrop(provider.connection, client.publicKey, 2_000_000_000);

      const contractBefore = await program.account.contract.fetch(
        first_contract_pda
      );
      const paidAmount = contractBefore.amount.toNumber();

      const beforeClientBalance =
        await provider.connection.getBalance(client.publicKey);
      const beforeContractorBalance =
        await provider.connection.getBalance(contractor.publicKey);
      const beforeVaultBalance =
        await provider.connection.getBalance(first_vault_pda);

      await program.methods
        .claimPaymentIx()
        .accounts({
          client: client.publicKey,
          contractor: contractor.publicKey,
          clientAccount: client_pda,
          contractorAccount: contractor_pda,
          contract: first_contract_pda,
          vault: first_vault_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      const afterClientBalance =
        await provider.connection.getBalance(client.publicKey);
      const afterContractorBalance =
        await provider.connection.getBalance(contractor.publicKey);
      const afterVaultBalance =
        await provider.connection.getBalance(first_vault_pda);

      const contractorDelta = afterContractorBalance - beforeContractorBalance;
      const vaultDelta = beforeVaultBalance - afterVaultBalance;

      expect(contractorDelta).to.equal(paidAmount);

      expect(vaultDelta).to.equal(paidAmount);

      expect(afterClientBalance).to.be.lessThanOrEqual(beforeClientBalance);
    });

    it("Should fail on second claim (no double payment)", async () => {
      try {
        await program.methods
          .claimPaymentIx()
          .accounts({
            client: client.publicKey,
            contractor: contractor.publicKey,
            clientAccount: client_pda,
            contractorAccount: contractor_pda,
            contract: first_contract_pda,
            vault: first_vault_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected second claimPaymentIx to fail (no double payment)");
      } catch (err: any) {
        expectAnchorError(err, "ContractNotClosed");
      }
    });

    it("Should fail if contract is not closed yet (ContractNotClosed)", async () => {
      const clientAccount = await program.account.client.fetch(client_pda);
      const nextId = clientAccount.nextContractId as anchor.BN;

      const [accepted_only_contract_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from(CONTRACT_SEED),
            client_pda.toBuffer(),
            nextId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

      const [accepted_only_vault_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [Buffer.from(VAULT_SEED), accepted_only_contract_pda.toBuffer()],
          program.programId
        );

      await program.methods
        .initializeContractIx(good_title_length, good_topic_length)
        .accounts({
          signer: client.publicKey,
          clientAccount: client_pda,
          contractAccount: accepted_only_contract_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      const contractorAccount = await program.account.contractor.fetch(
        contractor_pda
      );
      const nextProposalId = contractorAccount.nextProposalId as anchor.BN;

      const [accepted_only_proposal_pda] =
        anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from(PROPOSAL_SEED),
            contractor_pda.toBuffer(),
            nextProposalId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

      const proposalAmount = new anchor.BN(333_000_000);

      await program.methods
        .initializeProposalIx(proposalAmount)
        .accounts({
          contractor: contractor.publicKey,
          contract: accepted_only_contract_pda,
          contractorAccount: contractor_pda,
          proposalAccount: accepted_only_proposal_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([contractor])
        .rpc({ commitment: "confirmed" });

      await airdrop(provider.connection, client.publicKey, 2_000_000_000);

      await program.methods
        .chooseProposalIx()
        .accounts({
          signer: client.publicKey,
          clientAccount: client_pda,
          contract: accepted_only_contract_pda,
          proposalAccount: accepted_only_proposal_pda,
          contractorAccount: contractor_pda,
          vault: accepted_only_vault_pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([client])
        .rpc({ commitment: "confirmed" });

      try {
        await program.methods
          .claimPaymentIx()
          .accounts({
            client: client.publicKey,
            contractor: contractor.publicKey,
            clientAccount: client_pda,
            contractorAccount: contractor_pda,
            contract: accepted_only_contract_pda,
            vault: accepted_only_vault_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected ContractNotClosed error");
      } catch (err: any) {
        expectAnchorError(err, "ContractNotClosed");
      }
    });

    it("Should fail claimPaymentIx if signer is not owner of the clientAccount", async () => {
      await airdrop(provider.connection, client_attacker.publicKey, 2_000_000_000);

      try {
        await program.methods
          .claimPaymentIx()
          .accounts({
            client: client_attacker.publicKey,
            contractor: contractor.publicKey,
            clientAccount: client_pda,
            contractorAccount: contractor_pda,
            contract: first_contract_pda,
            vault: first_vault_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client_attacker])
          .rpc({ commitment: "confirmed" });

        assert.fail("Expected UnauthorizedAccount error on claimPaymentIx");
      } catch (err: any) {
        expectAnchorError(err, "UnauthorizedAccount");
      }
    });
  });
});
