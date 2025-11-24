use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::states::{Client, Contract, Contractor, Proposal, Status};
use crate::constants::VAULT_SEED;
use crate::errors::SolanceError;

pub fn choose_proposal(ctx: Context<ChooseProposal>) -> Result<()> {
    let contract = &mut ctx.accounts.contract;
    let proposal = &ctx.accounts.proposal_account;

    require!(contract.contractor.is_none(),SolanceError::ContractAlreadyHasContractor);

    let client_lamports = ctx.accounts.signer.to_account_info().lamports();
    require!(client_lamports >= proposal.amount,SolanceError::InsufficientClientFunds);

    let cpi_accounts = system_program::Transfer {
        from: ctx.accounts.signer.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        cpi_accounts,
    );

    system_program::transfer(cpi_ctx, proposal.amount)?;

    contract.contractor = Some(proposal.contractor);
    contract.amount = Some(proposal.amount);
    contract.status = Status::Accepted;
    contract.accepted_proposal_id = Some(proposal.proposal_id);

    Ok(())
}

#[derive(Accounts)]
pub struct ChooseProposal <'info> {
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
        constraint = proposal_account.contract == contract.key() @ SolanceError::InvalidProposalForContract,
    )]
    pub proposal_account: Account<'info, Proposal>,
    #[account(
        mut,
        constraint = proposal_account.contractor == contractor_account.key() @ SolanceError::InvalidContractorForProposal
    )]
    pub contractor_account: Account<'info, Contractor>,
    #[account(
        init,
        payer = signer,
        seeds = [VAULT_SEED, contract.key().as_ref()],
        bump,
        space = 0,
    )]
    /// CHECK: Vault controlled by program, contains lamports only
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
