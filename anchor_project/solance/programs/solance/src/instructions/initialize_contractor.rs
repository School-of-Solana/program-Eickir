use anchor_lang::prelude::*;
use crate::ContractorInitialized;
use crate::states::Contractor;
use crate::constants::CONTRACTOR_SEED;

pub fn initialize_contractor(ctx: Context<InitializeContractor>) -> Result<()> {

    let clock = Clock::get()?;

    let contractor: &mut Account<'_, Contractor> = &mut ctx.accounts.contractor_account;

    contractor.owner = ctx.accounts.contractor.key();
    contractor.next_proposal_id = 0;

    emit!(ContractorInitialized {
        owner: ctx.accounts.contractor.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())

}

#[derive(Accounts)]
pub struct InitializeContractor<'info> {
    #[account(mut)]
    pub contractor: Signer<'info>, 
    #[account(
        init, 
        payer = contractor, 
        seeds = [CONTRACTOR_SEED, contractor.key().as_ref()],
        bump,
        space = 8 + 32 + 1 + 8,
    )]
    pub contractor_account: Account<'info, Contractor>, 
    pub system_program: Program<'info, System>

}