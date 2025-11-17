use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::states::{Client, Contractor, Contract, Status};
use crate::constants::VAULT_SEED;
use crate::errors::SolanceError;

 pub fn claim_payment(ctx: Context<ClaimPayment>) -> Result<()> {
    let contract = &mut ctx.accounts.contract;

    require!(
        contract.status == Status::Closed,
        SolanceError::ContractNotClosed
    );

    let amount = contract
        .amount
        .ok_or(SolanceError::MissingAmount)?;

    let vault_info = ctx.accounts.vault.to_account_info();
    let contractor_info = ctx.accounts.contractor.to_account_info();

    **vault_info.try_borrow_mut_lamports()? -= amount;
    **contractor_info.try_borrow_mut_lamports()? += amount;

    contract.amount = None;

    Ok(())
}


#[derive(Accounts)]
pub struct ClaimPayment<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(mut)]
    pub contractor: SystemAccount<'info>,

    #[account(
        mut,
        constraint = client_account.owner == client.key() @ SolanceError::UnauthorizedAccount
    )]
    pub client_account: Account<'info, Client>,

    #[account(
        mut,
        constraint = contractor_account.owner == contractor.key() @ SolanceError::UnauthorizedAccount
    )]
    pub contractor_account: Account<'info, Contractor>,

    #[account(
        mut,
        constraint = contract.client == client_account.key() @ SolanceError::UnauthorizedAccount,
        constraint = contract.contractor == Some(contractor_account.key()) @ SolanceError::InvalidContractorForContract,
        constraint = contract.status == Status::Closed @ SolanceError::ContractNotClosed,
    )]
    pub contract: Account<'info, Contract>,

    #[account(
        mut,
        seeds = [VAULT_SEED, contract.key().as_ref()],
        bump,
    )]
    /// CHECK: Vault controlled by program, contains lamports only
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
