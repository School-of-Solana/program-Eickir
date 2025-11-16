use anchor_lang::prelude::*;

#[error_code]
pub enum SolanceError {
    #[msg("Client is already initialized")]
    ClientAlreadyInitialized,
    #[msg("Contractor is already initialized")]
    ContractorAlreadyInitialized,
    #[msg("This account is not authorized to call this instruction")]
    UnauthorizedAccount, 
    #[msg("Contract is already initialized")]
    ContractAlreadyInitialized,
    #[msg("Cannot initialize the contract, title is too long")]
    TitleTooLong,
    #[msg("Cannot initialize the contract, topic is too long")]
    TopicTooLong,

}