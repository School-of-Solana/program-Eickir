use anchor_lang::prelude::*;

#[error_code]
pub enum SolanceError {
    #[msg("This account is not authorized to call this instruction")]
    UnauthorizedAccount, 
    #[msg("Cannot initialize the contract, title is too long")]
    TitleTooLong,
    #[msg("Cannot initialize the contract, topic is too long")]
    TopicTooLong,
    #[msg("Proposal is already accepted. You can't update it.")]
    ProposalCannotBeUpdated,
    #[msg("Contract is not in Opened status")]
    ContractNotOpened,
    #[msg("Contract already has a contractor")]
    ContractAlreadyHasContractor,
    #[msg("Proposal does not belong to this contract")]
    InvalidProposalForContract,
    #[msg("ContractorAccount does not match proposal contractor")]
    InvalidContractorForProposal,

}