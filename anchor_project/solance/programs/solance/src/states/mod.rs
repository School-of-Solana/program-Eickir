use anchor_lang::prelude::*;

#[account]
pub struct Client { 
    pub owner: Pubkey, 
    pub next_contract_id: Option<u64>,
}

#[account]
pub struct Contractor {
    pub owner: Pubkey,
    pub next_proposal_id: Option<u64>,
}