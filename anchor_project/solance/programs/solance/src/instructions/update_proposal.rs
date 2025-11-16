use anchor_lang::prelude::*;
use crate::ProposalUpdated;
use crate::states::{Contractor, Proposal, Contract};
use crate::errors::SolanceError;
use crate::states::Status;



pub fn update_proposal(ctx: Context<UpdateProposal>, amount: u64) -> Result<()> {

    let proposal_account = &mut ctx.accounts.proposal_account;
    let old_amount = proposal_account.amount;
    proposal_account.amount = amount;
    
    emit!(ProposalUpdated{
        contract: proposal_account.contract, 
        contractor: proposal_account.contractor, 
        proposal_id: proposal_account.proposal_id, 
        old_amount: old_amount, 
        new_amount: proposal_account.amount
    });

    Ok(())

}


#[derive(Accounts)]
pub struct UpdateProposal<'info> {
    #[account(mut)]
    pub contractor: Signer<'info>,
    #[account(
        mut,
        constraint = contractor_account.owner == contractor.key() @ SolanceError::UnauthorizedAccount
    )]
    pub contractor_account: Account<'info, Contractor>,
    #[account(
        mut,
        constraint = proposal_account.contractor == contractor_account.key() @ SolanceError::UnauthorizedAccount
    )]
    pub proposal_account: Account<'info, Proposal>,
    #[account(
        constraint = contract.status == Status::Opened @ SolanceError::ProposalCannotBeUpdated
    )]
    pub contract: Account<'info, Contract>
}
