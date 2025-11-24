use anchor_lang::prelude::*;
use crate::states::{Client, Contract, Status};
use crate::constants::{CONTRACT_SEED, TOPIC_MAX_LENGTH, TITLE_MAX_LENGTH};
use crate::errors::SolanceError;
use crate::events::ContractInitialized;

pub fn initialize_contract(ctx: Context<InitializeContract>, title: String, topic: String) -> Result<()> {

    let contract_account = &mut ctx.accounts.contract_account;

    contract_account.client = ctx.accounts.client_account.key();
    contract_account.contractor = None;
    contract_account.contract_id = ctx.accounts.client_account.next_contract_id;
    contract_account.title = title;
    contract_account.topic = topic;
    contract_account.amount = None;
    contract_account.status = Status::Opened;
    contract_account.accepted_proposal_id = None;

    let client_account = &mut ctx.accounts.client_account;
    client_account.next_contract_id += 1;


    emit!(ContractInitialized{
        client: contract_account.client,
        contract_id: contract_account.contract_id
    });

    Ok(())

}

#[derive(Accounts)]
#[instruction(title: String, topic: String)]
pub struct InitializeContract<'info> {
    #[account(mut)]
    pub signer: Signer<'info>, 
    #[account(
        mut,
        constraint = client_account.owner == signer.key() @ SolanceError::UnauthorizedAccount
    )]
    pub client_account: Account<'info, Client>,
    #[account(
        init,
        payer = signer, 
        seeds = [CONTRACT_SEED, client_account.key().as_ref(), client_account.next_contract_id.to_le_bytes().as_ref()], 
        bump, 
        space = 8 + 1 + 32 + 4 + 8 + 100 + 4 + 500 + 1 + 8 + 1 + 1 + 8, 
        constraint = title.len() <= TITLE_MAX_LENGTH @ SolanceError::TitleTooLong,
        constraint = topic.len() <= TOPIC_MAX_LENGTH @ SolanceError::TopicTooLong,
    )]
    pub contract_account: Account<'info, Contract>,
    pub system_program: Program<'info, System>

}