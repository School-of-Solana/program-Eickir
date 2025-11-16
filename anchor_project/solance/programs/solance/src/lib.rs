use anchor_lang::prelude::*;

pub mod constants;
pub mod states;
pub mod instructions;
pub use instructions::*;
pub mod errors;
pub use errors::SolanceError;
pub mod events;
pub use events::*;

declare_id!("4JasCNGt4XMT7hGh86296TQXrvyJYXEhF6R4apdVLyXg");

#[program]
pub mod solance {
    use super::*;

    pub fn initialize_client_ix(ctx: Context<InitializeClient>) -> Result<()> {
        initialize_client(ctx)
    }

    pub fn initialize_contractor_ix(ctx: Context<InitializeContractor>) -> Result<()> {
        initialize_contractor(ctx)
    }

    pub fn initialize_contract_ix(ctx: Context<InitializeContract>, title: String, topic: String) -> Result<()> {
        initialize_contract(ctx, title, topic)
    }

    pub fn initialize_proposal_ix(ctx: Context<InitializeProposal>, amount: u64) -> Result<()> {
        initialize_proposal(ctx,  amount)
    }

    pub fn update_proposal_ix(ctx: Context<UpdateProposal>, amount: u64) -> Result<()> {
        update_proposal(ctx, amount)
    }

    pub fn choose_proposal_ix(ctx: Context<ChooseProposal>) -> Result<()> {
        choose_proposal(ctx)
    }

}
