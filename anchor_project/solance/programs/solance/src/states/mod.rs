use anchor_lang::prelude::*;
use crate::constants::{TITLE_MAX_LENGTH, TOPIC_MAX_LENGTH};

#[derive(AnchorDeserialize, AnchorSerialize, Clone, InitSpace, PartialEq)]
pub enum Status {
    Opened,
    Accepted, 
    Closed, 
    Paid
}

#[account]
pub struct Client { 
    pub owner: Pubkey, 
    pub next_contract_id: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Contract {
    pub client: Pubkey, 
    pub contractor: Option<Pubkey>, 
    pub contract_id: u64,
    #[max_len(TITLE_MAX_LENGTH)]
    pub title: String, 
    #[max_len(TOPIC_MAX_LENGTH)]
    pub topic: String, 
    pub amount: Option<u64>, 
    pub status: Status

}

#[account]
pub struct Contractor {
    pub owner: Pubkey,
    pub next_proposal_id: u64,
}

#[account]
pub struct Proposal {
    pub contract: Pubkey, 
    pub contractor: Pubkey, 
    pub proposal_id: u64, 
    pub amount: u64
}
