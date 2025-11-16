use anchor_lang::prelude::*;
use crate::states::Client;
use crate::constants::CLIENT_SEED;
use crate::events::ClientInitialized;

pub fn initialize_client(ctx: Context<InitializeClient>) -> Result<()> {

    let clock = Clock::get()?;

    let client_account = &mut ctx.accounts.client_account;

    client_account.owner = ctx.accounts.client.key();
    client_account.next_contract_id = 0;

    emit!(ClientInitialized {
        owner: ctx.accounts.client.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeClient<'info> {
    #[account(mut)]
    pub client: Signer<'info>,

    #[account(
        init,
        payer = client,
        seeds = [CLIENT_SEED, client.key().as_ref()],
        bump,
        space = 8 + 32 + 1 + 8,
    )]
    pub client_account: Account<'info, Client>,

    pub system_program: Program<'info, System>,
}
