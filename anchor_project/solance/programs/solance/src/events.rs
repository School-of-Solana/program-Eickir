use anchor_lang::prelude::*;

#[event]
pub struct ClientInitialized {
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ContractorInitialized {
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ContractInitialized {
    pub client: Pubkey,
    pub contract_id: u64,
}

#[event]
pub struct ProposalInitialized {
    pub contract: Pubkey, 
    pub contractor: Pubkey, 
    pub proposal_id: u64, 
    pub amount: u64
}

#[event]
pub struct ProposalUpdated {
    pub contract: Pubkey, 
    pub contractor: Pubkey, 
    pub proposal_id: u64, 
    pub old_amount: u64,
    pub new_amount: u64
}