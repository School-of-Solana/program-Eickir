use anchor_lang::prelude::*;
use crate::states::{Client, Contract, Contractor, Proposal, Status};
use crate::errors::SolanceError;

pub fn choose_proposal(ctx: Context<ChooseProposal>) -> Result<()> {
    let contract = &mut ctx.accounts.contract;
    let proposal = &ctx.accounts.proposal_account;

    require!(contract.contractor.is_none(),SolanceError::ContractAlreadyHasContractor);

    contract.contractor = Some(proposal.contractor);
    contract.amount = Some(proposal.amount);
    contract.status = Status::Accepted;

    Ok(())
}

#[derive(Accounts)]
pub struct ChooseProposal<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        constraint = client_account.owner == signer.key() @ SolanceError::UnauthorizedAccount
    )]
    pub client_account: Account<'info, Client>,
    #[account(
        mut,
        constraint = contract.client == client_account.key() @ SolanceError::UnauthorizedAccount,
        constraint = contract.status == Status::Opened @ SolanceError::ContractNotOpened,
    )]
    pub contract: Account<'info, Contract>,
    #[account(
        mut,
        constraint = proposal_account.contract == contract.key()
            @ SolanceError::InvalidProposalForContract,
    )]
    pub proposal_account: Account<'info, Proposal>,
    #[account(
        mut,
        constraint = proposal_account.contractor == contractor_account.key() @ SolanceError::InvalidContractorForProposal
    )]
    pub contractor_account: Account<'info, Contractor>,
}
