import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solance } from "../target/types/solance";
import { expect } from "chai";
import { strict as assert } from "assert";   // ⬅️ important : Node assert, pas chai

describe("solance program", () => {

  const CLIENT_SEED = "client";
  const CONTRACTOR_SEED = "contractor";
  const CONTRACT_SEED = "contract";
  const PROPOSAL_SEED = "proposal";

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solance as Program<Solance>;
  
  const client = anchor.web3.Keypair.generate();
  const [client_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(CLIENT_SEED),              
          client.publicKey.toBuffer(),
        ],
        program.programId
      );
  const client_no_fund = anchor.web3.Keypair.generate();
  const client_no_fund_pda = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(CLIENT_SEED),              
      client_no_fund.publicKey.toBuffer(),
    ], 
    program.programId
  )
  const space_client_account = 8 + 32 + 1 + 8;


  const contractor = anchor.web3.Keypair.generate();
  const [contractor_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(CONTRACTOR_SEED),              
          contractor.publicKey.toBuffer(),
        ],
        program.programId
      );
  const contractor_no_fund = anchor.web3.Keypair.generate();
  const contractor_no_fund_pda = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(CONTRACTOR_SEED),              
      contractor_no_fund.publicKey.toBuffer(),
    ], 
    program.programId
  )
  const space_contractor_account = 8 + 32 + 1 + 8;

  describe("initialize client", () => {

    it("It Should successfully initialize a Client account with 0 on next_contract_id", async () => {

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

      expect(clientAccount.owner.toBase58()).to.equal(client.publicKey.toBase58());
      expect(clientAccount.nextContractId).to.not.be.null;
      expect(clientAccount.nextContractId?.toNumber()).to.equal(0);
    });

    it("It Should fail when we want to initialize a Client account already initialized", async () => {

      await assert.rejects(
        program.methods
          .initializeClientIx()
          .accounts({
            client: client.publicKey, 
            clientAccount: client_pda, 
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client])
          .rpc({ commitment: "confirmed" }),
      ),
      (err: any) => {
        const anchorErr = err as anchor.AnchorError;
        if (anchorErr.error.errorCode.code === "ClientAlreadyInitialized") {
          return true;
        }
        return false;
      }

    });

    it("Should fail to initialize client when payer has not enough funds", async () => {

      const requiredRent = await provider.connection.getMinimumBalanceForRentExemption(space_client_account);
      await airdrop(provider.connection, client_no_fund.publicKey, requiredRent - 1);

      await assert.rejects(
        program.methods
          .initializeClientIx()
          .accounts({
            client: client_no_fund.publicKey, 
            clientAccount: client_no_fund_pda, 
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client_no_fund])
          .rpc({ commitment: "confirmed" })
        );
    });


    });

    describe("initialize contractor", () => {

      it("It Should successfully initialize a Contractor account with 0 on next_contract_id", async () => {

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

            const contractorAccount = await program.account.contractor.fetch(contractor_pda);

            expect(contractorAccount.owner.toBase58()).to.equal(contractor.publicKey.toBase58());
            expect(contractorAccount.nextProposalId).to.not.be.null;
            expect(contractorAccount.nextProposalId?.toNumber()).to.equal(0);
          });

      it("It Should fail when we want to initialize a Contractor account already initialized", async () => {

        await assert.rejects(
          program.methods
            .initializeContractorIx()
            .accounts({
              contractor: contractor.publicKey, 
              contractorAccount: contractor_pda, 
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([contractor])
            .rpc({ commitment: "confirmed" }),
        ),
        (err: any) => {
          const anchorErr = err as anchor.AnchorError;
          if (anchorErr.error.errorCode.code === "ContractorAlreadyInitialized") {
            return true;
          }
          return false;
        }

      });

      it("Should fail to initialize contractor when payer has not enough funds", async () => {

        const requiredRent = await provider.connection.getMinimumBalanceForRentExemption(space_contractor_account);
        await airdrop(provider.connection, contractor_no_fund.publicKey, requiredRent - 1);

        await assert.rejects(
          program.methods
            .initializeContractorIx()
            .accounts({
              contractor: contractor_no_fund.publicKey, 
              contractorAccount: contractor_no_fund_pda, 
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .signers([contractor_no_fund])
            .rpc({ commitment: "confirmed" })
          );
      });
  });

});


async function airdrop(connection: any, address: any, amount = 1000000000) {
  await connection.confirmTransaction(await connection.requestAirdrop(address, amount), "confirmed");
}

class SolanaError {
  static contains(logs, error): boolean {
    const match = logs?.filter(s => s.includes(error));
    return Boolean(match?.length)
  }
}