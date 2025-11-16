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