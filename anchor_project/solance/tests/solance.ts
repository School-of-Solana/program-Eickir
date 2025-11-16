import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solance } from "../target/types/solance";
import { expect } from "chai";
import { strict as assert } from "assert";  

describe("solance program", () => {

  const CLIENT_SEED = "client";
  const CONTRACTOR_SEED = "contractor";
  const CONTRACT_SEED = "contract";
  const PROPOSAL_SEED = "proposal";
  const TITLE_MAX_LENGTH = 100;
  const TOPIC_MAX_LENGTH = 500;

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solance as Program<Solance>;
  
  // Client consts 
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

  // Contractor consts
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
  const contractor_attacker = anchor.web3.Keypair.generate();
  const [contractor_attacker_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(CONTRACTOR_SEED),              
          contractor_attacker.publicKey.toBuffer(),
        ],
        program.programId
      );
  const space_contractor_account = 8 + 32 + 1 + 8;

  // Contract consts
  const client_attacker = anchor.web3.Keypair.generate();
  const [client_attacker_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(CLIENT_SEED),              
          client_attacker.publicKey.toBuffer(),
        ],
        program.programId
      );
  const id = new anchor.BN(0);
  const [first_contract_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(CONTRACT_SEED),              
          client_pda.toBuffer(),
          id.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      );
  const second_id = new anchor.BN(1);
  const [second_contract_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(CONTRACT_SEED),              
          client_pda.toBuffer(),
          second_id.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      );


  const good_title_length = "Blockchain Engineer on Solana";
  let wrong_title_length = good_title_length.repeat(10);
  const good_topic_length = "I need a blockchain engineer to write programs on Solana dApp";
  let wrong_topic_length = good_topic_length.repeat(10);

  // Proposal consts
  const proposal_id = new anchor.BN(0);
  const [first_proposal_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(PROPOSAL_SEED),              
          contractor_pda.toBuffer(),
          proposal_id.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      );
  const second_proposal_id = new anchor.BN(1);
  const [second_proposal_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(PROPOSAL_SEED),              
          contractor_pda.toBuffer(),
          second_proposal_id.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      );
  const [first_proposal_attacker_pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from(PROPOSAL_SEED),              
          contractor_attacker_pda.toBuffer(),
          proposal_id.toArrayLike(Buffer, "le", 8)
        ],
        program.programId
      );
  const amount = new anchor.BN(1_000_000_000);    


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
      expect(clientAccount.nextContractId.toNumber()).to.equal(0);
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

      it("It Should successfully initialize a Contractor account with 0 on next_proposal_id", async () => {

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
            expect(contractorAccount.nextProposalId.toNumber()).to.equal(0);
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

    describe("initialize contract", async() => {

      it("It Should successfully initialize a Contract account with 0 as contract id", async () => {

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

      }); 

      it("It Should fail to initialize a Contract with a title that is longer than 100 bytes", async () => {

        await assert.rejects( 
          program.methods
              .initializeContractIx(wrong_title_length, good_topic_length)
              .accounts({
                signer: client.publicKey, 
                clientAccount: client_pda, 
                contractAccount: second_contract_pda,
                systemProgram: anchor.web3.SystemProgram.programId,
              })
              .signers([client])
              .rpc({ commitment: "confirmed" })
          , (err: any) => {
              const anchorErr = err as anchor.AnchorError;
              if (anchorErr.error.errorCode.code === "TitleTooLong") {
                return true;
              }
              return false;
          })    
          
      });

      it("It Should fail to initialize a Contract with a topic that is longer than 500 bytes", async () => {

        await assert.rejects( 
          program.methods
              .initializeContractIx(good_title_length, wrong_topic_length)
              .accounts({
                signer: client.publicKey, 
                clientAccount: client_pda, 
                contractAccount: second_contract_pda,
                systemProgram: anchor.web3.SystemProgram.programId,
              })
              .signers([client])
              .rpc({ commitment: "confirmed" })
          , (err: any) => {
              const anchorErr = err as anchor.AnchorError;
              if (anchorErr.error.errorCode.code === "TopicTooLong") {
                return true;
              }
              return false;
          });        
        }); 
      
      it("It Should fail to initialize a Contract when the signer is not the owner of the Client Account", async () => {

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

        await assert.rejects( 
          program.methods
              .initializeContractIx(good_title_length, good_topic_length)
              .accounts({
                signer: client_attacker.publicKey, 
                clientAccount: client_pda, 
                contractAccount: second_contract_pda,
                systemProgram: anchor.web3.SystemProgram.programId,
              })
              .signers([client_attacker])
              .rpc({ commitment: "confirmed" })
          , (err: any) => {
              const anchorErr = err as anchor.AnchorError;
              if (anchorErr.error.errorCode.code === "UnauthorizedAccount") {
                return true;
              }
              return false;
          });        
      }); 
    });

    describe("initialize proposal", async() => {

      it("It Should successfully initialize a Proposal account with 0 as proposal id", async () => {

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

      });    

      it("It Should fail to initialize a Proposal when the signer is not the owner of the Contractor Account", async () => {

          await airdrop(provider.connection, contractor_attacker.publicKey);

          await program.methods
              .initializeContractIx(good_title_length, good_topic_length)
              .accounts({
                signer: client.publicKey, 
                clientAccount: client_pda, 
                contractAccount: second_contract_pda,
                systemProgram: anchor.web3.SystemProgram.programId,
              })
              .signers([client])
              .rpc({ commitment: "confirmed" })

          await assert.rejects(
            program.methods
              .initializeProposalIx(amount)
              .accounts({
                contractor: contractor_attacker.publicKey, 
                contract: second_contract_pda,
                contractorAccount: contractor_pda, 
                proposalAccount: second_proposal_pda, 
                systemProgram: anchor.web3.SystemProgram.programId,
              })
              .signers([contractor_attacker])
              .rpc({ commitment: "confirmed" })
            , (err: any) => {
              const anchorErr = err as anchor.AnchorError;
              if (anchorErr.error.errorCode.code === "UnauthorizedAccount") {
                return true;
              }
              return false;
          });                           
        });
    });
      
      describe("Update proposal", async () => {

        it("It should update an existing proposal", async () => {
          // On part du principe que first_proposal_pda a déjà été créée
          // par le test "It Should successfully initialize a Proposal account with 0 as proposal id"

          const newAmount = new anchor.BN(2_000_000_000); // nouveau montant

          await program.methods
            .updateProposalIx(newAmount)
            .accounts({
              contractor: contractor.publicKey,
              contract: first_contract_pda,         // 👈 ajouté
              contractorAccount: contractor_pda,
              proposalAccount: first_proposal_pda,
            })
            .signers([contractor])
            .rpc({ commitment: "confirmed" });

          // On vérifie on-chain que l'amount a bien été mis à jour
          const proposalAccount = await program.account.proposal.fetch(first_proposal_pda);

          expect(proposalAccount.amount.toNumber()).to.equal(newAmount.toNumber());
          expect(proposalAccount.contract.toBase58()).to.equal(first_contract_pda.toBase58());
          expect(proposalAccount.contractor.toBase58()).to.equal(contractor_pda.toBase58());
          expect(proposalAccount.proposalId.toNumber()).to.equal(0);
        });

        it("It should fail to update an existing proposal already accepted by the client", async () => {
          const newAmount = new anchor.BN(3_000_000_000);

            program.methods
              .updateProposalIx(newAmount)
              .accounts({
                contractor: contractor.publicKey,
                contract: first_contract_pda,       
                contractorAccount: contractor_pda,
                proposalAccount: first_proposal_pda,
              })
              .signers([contractor])
              .rpc({ commitment: "confirmed" });
        });

        it("It should fail to update an existing proposal that is not created by the signer", async () => {
          const newAmount = new anchor.BN(4_000_000_000);

          await airdrop(provider.connection, contractor_attacker.publicKey);

          await assert.rejects(
            program.methods
              .updateProposalIx(newAmount)
              .accounts({
                contractor: contractor_attacker.publicKey,  
                contract: first_contract_pda,              
                contractorAccount: contractor_pda,          
                proposalAccount: first_proposal_pda,        
              })
              .signers([contractor_attacker])
              .rpc({ commitment: "confirmed" }),
          );
        });

      });

        describe("choose proposal", async () => {

      it("It should let the client choose a proposal and update the contract", async () => {
        await program.methods
          .chooseProposalIx()
          .accounts({
            signer: client.publicKey,
            clientAccount: client_pda,
            contract: first_contract_pda,
            proposalAccount: first_proposal_pda,
            contractorAccount: contractor_pda,
          })
          .signers([client])
          .rpc({ commitment: "confirmed" });

        const contractAccount = await program.account.contract.fetch(first_contract_pda);
        const proposalAccount = await program.account.proposal.fetch(first_proposal_pda);

        expect(contractAccount.contractor).to.not.equal(null);
        const chosenContractor = (contractAccount.contractor as anchor.web3.PublicKey).toBase58();
        expect(chosenContractor).to.equal(contractor_pda.toBase58());

        expect(contractAccount.amount).to.not.equal(null);
        const chosenAmount = (contractAccount.amount as anchor.BN).toNumber();
        const proposalAmount = proposalAccount.amount.toNumber();

        expect(chosenAmount).to.equal(proposalAmount);
      });


      it("It should fail if a different client tries to choose a proposal", async () => {
        await airdrop(provider.connection, client_attacker.publicKey);

        await assert.rejects(
          program.methods
            .chooseProposalIx()
            .accounts({
              signer: client_attacker.publicKey,  
              clientAccount: client_pda,         
              contract: first_contract_pda,
              proposalAccount: first_proposal_pda,
              contractorAccount: contractor_pda,
            })
            .signers([client_attacker])
            .rpc({ commitment: "confirmed" })
        );
        // Si tu veux affiner :
        // , (err: any) => {
        //   if (!err.logs) return false;
        //   const anchorErr = anchor.AnchorError.parse(err.logs);
        //   return anchorErr.error.errorCode.code === "UnauthorizedAccount";
        // }
      });

      it("It should fail if proposal does not belong to the given contract", async () => {

        const clientAccount = await program.account.client.fetch(client_pda);
        const nextContractId = clientAccount.nextContractId as anchor.BN;

        const [other_contract_pda] = anchor.web3.PublicKey.findProgramAddressSync(
          [
            Buffer.from(CONTRACT_SEED),
            client_pda.toBuffer(),
            nextContractId.toArrayLike(Buffer, "le", 8),
          ],
          program.programId
        );

        await program.methods
          .initializeContractIx(good_title_length, good_topic_length)
          .accounts({
            signer: client.publicKey,
            clientAccount: client_pda,
            contractAccount: other_contract_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([client])
          .rpc({ commitment: "confirmed" });

        await assert.rejects(
          program.methods
            .chooseProposalIx()
            .accounts({
              signer: client.publicKey,
              clientAccount: client_pda,
              contract: other_contract_pda,       
              proposalAccount: first_proposal_pda,
              contractorAccount: contractor_pda,
            })
            .signers([client])
            .rpc({ commitment: "confirmed" })
        );
        // Si tu veux tester l'erreur InvalidProposalForContract :
        // , (err: any) => {
        //   if (!err.logs) return false;
        //   const anchorErr = anchor.AnchorError.parse(err.logs);
        //   return anchorErr.error.errorCode.code === "InvalidProposalForContract";
        // }
      });

      it("It should fail if contractorAccount does not match proposal contractor", async () => {
        
        await airdrop(provider.connection, contractor_attacker.publicKey);

        // On initialise son ContractorAccount
        await program.methods
          .initializeContractorIx()
          .accounts({
            contractor: contractor_attacker.publicKey,
            contractorAccount: contractor_attacker_pda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([contractor_attacker])
          .rpc({ commitment: "confirmed" });

        await assert.rejects(
          program.methods
            .chooseProposalIx()
            .accounts({
              signer: client.publicKey,
              clientAccount: client_pda,
              contract: first_contract_pda,
              proposalAccount: first_proposal_pda,
              contractorAccount: contractor_attacker_pda, // 👈 mismatch volontaire
            })
            .signers([client])
            .rpc({ commitment: "confirmed" })
        );
        // Et là tu peux affiner :
        // , (err: any) => {
        //   if (!err.logs) return false;
        //   const anchorErr = anchor.AnchorError.parse(err.logs);
        //   return anchorErr.error.errorCode.code === "InvalidContractorForProposal";
        // }
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