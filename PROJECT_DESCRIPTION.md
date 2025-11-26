
# Solance – On‑Chain Freelance Marketplace on Solana

## Project Description

- **Deployed Frontend URL:** `https://solance-six.vercel.app/`
- **Solana Program ID (Deployed on Devnet):** `9os8f9dUNrZzg53kjGb1wj1stMabFFj4fuRnrF9pCjR6`

---

## Project Overview

### Description

Solance is a minimal on‑chain freelance marketplace built on **Solana** with **Anchor**.

The idea is to model the lifecycle of a freelance mission directly in a Solana program:

- A **client** creates a mission, represented as a `Contract` account.
- Several **contractors** can submit price proposals via `Proposal` accounts.
- The client chooses one proposal, and the proposed amount is **escrowed in a vault PDA**.
- The contractor does the work and then marks it as done.
- The client releases the payment from the vault to the selected contractor.
- The contract can then be marked as **paid**, and both parties keep an immutable on‑chain history.

The frontend (Next.js + wallet adapter) exposes two separate user flows:

- **Client mode** – create and manage missions, choose proposals, lock funds, and release payments.
- **Contractor mode** – browse open missions, submit / update proposals, mark work done, and track pending payments.

---

## Key Features

- **Dual Roles (Client / Contractor)**  
  - A single wallet can initialize a `Client` account, a `Contractor` account, or both.
  - The UI lets you choose which “role” you’re currently using.

- **Mission / Contract Management**
  - Clients create `Contract` accounts with a title and a textual description / topic.
  - Each contract tracks an incremental `contract_id`, status, amount, selected contractor, etc.

- **Proposals System**
  - Contractors submit `Proposal` accounts for a given contract with an amount (in lamports).
  - Contractors can **update** their proposals as long as they haven’t been accepted.

- **Vault Escrow (PDA)**
  - When a client chooses a proposal, the corresponding SOL amount is transferred from the client wallet into a **vault PDA** tied to the contract.
  - Funds stay locked until the client explicitly releases them.

- **Work Lifecycle**
  - Contractor can call `mark_work_done_ix` once the job is finished.
  - Client can then call `claim_payment_ix` to move funds from the vault to the contractor’s wallet and mark the contract as paid.

- **Front‑End Flows**
  - **Client dashboard:** list contracts, create new ones, inspect proposals per contract, and view “pending payments” (closed contracts waiting for release).
  - **Contractor dashboard:** list open missions, view “my missions” (where you were selected), see “pending payments”, and track all proposals.

---

## How to Use the dApp

> Assumes you’re on devnet / localnet with Phantom (or another wallet) connected.

1. **Connect Wallet**
   - Open the frontend.
   - Click the wallet button (top‑right) to connect your Solana wallet (devnet/localnet).

2. **Initialize Your Role**
   - On the home page, you can initialize:
     - a **Client account** (PDA derived from your wallet), and/or
     - a **Contractor account** (another PDA derived from the same wallet).
   - Once initialized, you can enter the client or contractor dashboards.

3. **Client Flow**
   1. Go to **Client dashboard**.
   2. Click **Create new mission** and fill in:
      - Title (≤ 100 bytes)
      - Topic / description (≤ 500 bytes)
   3. You’ll see your contracts in **Your contracts** list.
   4. Click a specific contract to see all proposals submitted by contractors.
   5. When you choose a proposal:
      - The app derives the **vault PDA**.
      - Your wallet signs a transaction transferring the proposal amount into the vault.
      - The contract status is set to `Accepted` and stores the selected contractor + proposal id.
   6. After the contractor calls **mark work done**, you’ll see the contract under **Pending payments**.
   7. From there, you can click **Release payment**, which calls `claim_payment_ix` and:
      - transfers SOL from the vault PDA to the contractor wallet,
      - updates the contract to `Paid`.

4. **Contractor Flow**
   1. Go to **Contractor dashboard**.
   2. Click **Available missions** to see all contracts in `Opened` status.
   3. Click any contract to view details and:
      - Submit a new proposal (amount entered in SOL, converted to lamports),
      - Or later update your proposal amount using `update_proposal_ix`.
   4. When a client selects your proposal:
      - The contract moves to `Accepted` status.
      - You’ll see that contract in **My missions**.
   5. Once you have finished the job, call **Mark work done** from **My missions**, which sets the contract to `Closed`.
   6. The contract then appears for the client in **Pending payments**. After the client releases funds, you’ll see that mission as **paid** in your own views.

---

## Program Architecture

### Main Accounts

- **Client**
  - Owner = client wallet public key.
  - `next_contract_id` → incremental counter used to derive contract PDAs.

- **Contract**
  - References the client PDA.
  - Optionally references the contractor PDA (once selected).
  - Stores a numeric `contract_id`, `title`, `topic`, `amount`, `status`, and `accepted_proposal_id`.
  - `status` is an enum: `Opened`, `Accepted`, `Closed`, `Paid`.

- **Contractor**
  - Owner = contractor wallet public key.
  - `next_proposal_id` → incremental counter used to derive proposal PDAs.

- **Proposal**
  - References the `contract` Pubkey.
  - References the contractor PDA.
  - Stores a `proposal_id` and `amount` (lamports).

- **Vault PDA (SystemAccount)**
  - Seeded by `["vault", contract_pubkey]`.
  - Holds SOL locked when a proposal is chosen.
  - Only the program can move funds out of it (to the contractor) via CPI.

### Data Flow

1. Client initializes `Client` account → `next_contract_id = 0`.
2. Contractor initializes `Contractor` account → `next_proposal_id = 0`.
3. Client calls `initialize_contract_ix` → creates a new `Contract` PDA using `next_contract_id`, then increments it.
4. Contractors call `initialize_proposal_ix` → create `Proposal` PDAs using `next_proposal_id`, then increment it.
5. Client calls `choose_proposal_ix`:
   - Ensures contract is `Opened` and has no contractor yet.
   - Transfers `amount` SOL from client wallet to vault PDA.
   - Sets `contract.contractor`, `contract.amount`, `accepted_proposal_id`, and `status = Accepted`.
6. Contractor calls `mark_work_done_ix`:
   - Ensures contractor is the one selected on the contract.
   - Moves `status` from `Accepted` to `Closed`.
7. Client calls `claim_payment_ix`:
   - Ensures status is `Closed`.
   - Transfers funds from `vault` PDA to contractor wallet.
   - Sets `status = Paid`.

---

## PDA Usage

### Seeds

- **Client PDA**
  - Seeds: `["client", client_wallet_pubkey]`
  - Purpose: Store per‑wallet metadata (owner, next_contract_id).

- **Contractor PDA**
  - Seeds: `["contractor", contractor_wallet_pubkey]`
  - Purpose: Store per‑wallet metadata (owner, next_proposal_id).

- **Contract PDA**
  - Seeds: `["contract", client_account_pda, client_account.next_contract_id]`
  - Purpose: Unique mission for a given client and index; avoids collisions and lets the program derive related PDAs deterministically.

- **Proposal PDA**
  - Seeds: `["proposal", contractor_account_pda, contractor_account.next_proposal_id]`
  - Purpose: Unique proposal for a given contractor and index.

- **Vault PDA**
  - Seeds: `["vault", contract_pubkey]`
  - Purpose: Escrow account that temporarily holds funds for a specific contract.

These PDAs ensure that:

- The mapping between wallet ↔ account is deterministic.
- Only the program can control the vault’s funds.
- We can filter accounts off‑chain using the seeds and account layouts.

---

## Program Instructions

### Instructions Implemented

- **`initialize_client_ix`**
  - Creates a `Client` PDA for the caller (client wallet).
  - Initializes `next_contract_id = 0`.
  - Fails if the client account already exists.

- **`initialize_contractor_ix`**
  - Creates a `Contractor` PDA for the caller (contractor wallet).
  - Initializes `next_proposal_id = 0`.
  - Fails if the contractor account already exists.

- **`initialize_contract_ix(title, topic)`**
  - Requires the signer to be the owner of the `Client` account.
  - Creates a new `Contract` PDA using `client_account.next_contract_id`.
  - Validates title and topic length against fixed limits.
  - Emits a `ContractInitialized` event.

- **`initialize_proposal_ix(amount)`**
  - Requires the signer to be the owner of the `Contractor` account.
  - Creates a new `Proposal` PDA using `contractor_account.next_proposal_id`.
  - Links it to a specific contract.
  - Emits a `ProposalInitialized` event.

- **`update_proposal_ix(amount)`**
  - Allows the owner of the `Contractor` account to update an existing proposal’s amount.
  - Fails if the proposal was already accepted (`ProposalCannotBeUpdated`).
  - Emits a `ProposalUpdated` event.

- **`choose_proposal_ix`**
  - Only the client owner can call it.
  - Checks that:
    - The contract is `Opened` and has no contractor yet.
    - The proposal belongs to this contract.
    - The contractor account matches the proposal’s contractor.
    - The client wallet has enough SOL to pay the proposal.
  - Derives the vault PDA and transfers `proposal.amount` lamports into it.
  - Updates the contract: `contractor`, `amount`, `accepted_proposal_id`, and `status = Accepted`.

- **`mark_work_done_ix`**
  - Called by the selected contractor (verified through `Contractor` + `Contract` accounts).
  - Ensures contract is in `Accepted` status.
  - Moves status to `Closed`.

- **`claim_payment_ix`**
  - Called by the client (payer).
  - Checks:
    - Contract is `Closed`.
    - Contract has a `contractor` set and an `amount` set.
  - Transfers funds from the **vault PDA** to the contractor’s wallet.
  - Marks the contract as `Paid`.
  - Optionally can close the vault account if the balance becomes zero.

---

## Account Structure

### `Client`

```rust
#[account]
pub struct Client {
    pub owner: Pubkey,
    pub next_contract_id: u64,
}
```

- `owner` – client wallet public key.
- `next_contract_id` – auto-incremented id used for deriving new `Contract` PDAs.

### `Contract`

```rust
#[derive(AnchorDeserialize, AnchorSerialize, Clone, InitSpace, PartialEq)]
pub enum Status {
    Opened,
    Accepted,
    Closed,
    Paid,
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
    pub status: Status,
    pub accepted_proposal_id: Option<u64>,
}
```

- `client` – PDA of the Client account.
- `contractor` – PDA of the selected Contractor account (once chosen).
- `contract_id` – sequential id unique per client.
- `title` / `topic` – mission metadata.
- `amount` – amount in lamports, once a proposal is accepted.
- `status` – lifecycle state.
- `accepted_proposal_id` – identifies which proposal was chosen.

### `Contractor`

```rust
#[account]
pub struct Contractor {
    pub owner: Pubkey,
    pub next_proposal_id: u64,
}
```

- `owner` – contractor wallet public key.
- `next_proposal_id` – auto-incremented id for proposals.

### `Proposal`

```rust
#[account]
pub struct Proposal {
    pub contract: Pubkey,
    pub contractor: Pubkey,
    pub proposal_id: u64,
    pub amount: u64,
}
```

- `contract` – associated contract public key.
- `contractor` – PDA of the Contractor account.
- `proposal_id` – id within the contractor’s proposals sequence.
- `amount` – proposed price in lamports.

---

## Testing

### Overview

The Anchor test suite (`tests/solance.ts`) provides full coverage of both **happy path** and **failure** scenarios.  
It extensively validates:

- PDA derivation  
- Account ownership rules  
- Error codes from your custom `SolanceError` enum  
- Cross-account consistency (proposal ↔ contract, contractor ↔ proposal, client ↔ contract)  
- The complete lifecycle of a freelance mission (contract → proposal → vault → work done → payment)

The tests use TypeScript (`mocha` + `chai`) and the Anchor testing provider.

---

## Happy Path Scenarios

These tests validate that the full workflow functions exactly as intended.

### 1. Client Initialization

- Creates a `Client` PDA derived from the user’s wallet.
- Checks that:
  - `owner == wallet.publicKey`
  - `next_contract_id == 0`.

### 2. Contractor Initialization

- Creates a `Contractor` PDA for the contractor wallet.
- Verifies:
  - `owner == wallet.publicKey`
  - `next_proposal_id == 0`.

### 3. Contract Creation

Using `initialize_contract_ix(title, topic)`:

- Valid lengths for title and topic.
- Contract stored at the expected PDA.
- `contract_id` increments properly.
- Status is initially `Opened`.

### 4. Proposal Creation

Using `initialize_proposal_ix(amount)`:

- Valid contractor creates a new proposal.
- Proposal stores:
  - correct `contract` reference,
  - correct `contractor` PDA,
  - `proposal_id == next_proposal_id`,
  - correct `amount`.

### 5. Proposal Update

Using `update_proposal_ix(new_amount)`:

- Contractor can update their proposal as long as the contract is still `Opened`.
- Confirms the `amount` is updated and other fields remain unchanged.

### 6. Choose Proposal (Vault Escrow Mechanism)

Using `choose_proposal_ix`:

- Confirms:
  - Client has enough SOL,
  - Proposal belongs to the contract,
  - Contractor account matches the proposal,
  - Contract has status `Opened`.

- Effects checked:
  - Vault PDA receives ≥ `proposal.amount`,
  - Client wallet decreases by at least the amount + rent,
  - Contract updated with:
    - `status = Accepted`,
    - `contractor = contractor_pda`,
    - `amount = proposal.amount`,
    - `accepted_proposal_id`.

### 7. Mark Work Done

Using `mark_work_done_ix`:

- Only the *selected* contractor can call it.
- Contract status transitions from `Accepted` → `Closed`.

### 8. Claim Payment (Releasing Vault Funds)

Using `claim_payment_ix`:

- Can only be called by the client.
- Contract must be in `Closed` status.
- Vault transfers exactly `amount` lamports to the contractor.
- Contract status becomes `Paid`.

---

## Failure Scenarios (Unhappy Path)

The test suite also verifies all important invalid or malicious scenarios.

### 1. Re-initialization & Rent Errors

- Attempting to re-initialize an already created Client/Contractor PDA → `"account already in use"`.
- Attempting to initialize with insufficient lamports → `"insufficient lamports"`.

### 2. Title and Topic Length Validation

- Title > `TITLE_MAX_LENGTH` ⇒ `TitleTooLong`.
- Topic > `TOPIC_MAX_LENGTH` ⇒ `TopicTooLong`.

### 3. Unauthorized Access (`UnauthorizedAccount`)

These scenarios verify that your account constraints work correctly:

- Non-owner tries to initialize a contract using someone else’s `client_account`.
- Non-owner tries to create a proposal using someone else’s `contractor_account`.
- Wrong contractor tries to:
  - update a proposal,
  - mark work as done.
- A non-owner of `client_account` tries to call `claim_payment_ix`.

### 4. Cross-Account Inconsistencies

Tests verify custom error codes:

- **InvalidProposalForContract**
  - The proposal does not belong to the passed contract.

- **InvalidContractorForProposal**
  - The contractor account passed does not match the proposal’s contractor.

### 5. Proposal Lifecycle Violations

- Updating a proposal after it has been accepted ⇒ `ProposalCannotBeUpdated`.

### 6. Mark Work Done Errors

- Contract not in `Accepted` state ⇒ `ContractNotAccepted`.
- Attempting to mark work done twice:
  - May trigger `ContractNotAccepted` or a similar constraint error depending on state order.

### 7. Claim Payment Errors

- Second call to `claim_payment_ix` (double spend attempt) ⇒ `ContractNotClosed`.
- Contract is still `Accepted` (not yet closed) ⇒ `ContractNotClosed`.
- Wrong signer (not owner of `client_account`) ⇒ `UnauthorizedAccount`.

### 8. Insufficient Funds When Choosing a Proposal

- `choose_proposal_ix` fails with `InsufficientClientFunds` when:
  - client wallet balance < proposal amount.

---

## Running Tests

To run the full suite:

```bash
anchor test --provider.cluster localnet

solance program
    initialize client
      ✔ Should successfully initialize a Client account with next_contract_id = 0 (701ms)
      ✔ Should fail when initializing a Client account already initialized
      ✔ Should fail to initialize client when payer has not enough funds (474ms)

    initialize contractor
      ✔ Should successfully initialize a Contractor account with next_proposal_id = 0 (906ms)
      ✔ Should fail when initializing a Contractor account already initialized
      ✔ Should fail to initialize contractor when payer has not enough funds (479ms)

    initialize contract
      ✔ Should successfully initialize a Contract account with contract_id = 0 (468ms)
      ✔ Should fail to initialize a Contract with a title longer than 100 bytes
      ✔ Should fail to initialize a Contract with a topic longer than 500 bytes
      ✔ Should fail to initialize a Contract when the signer is not the owner of the Client Account (920ms)

    initialize proposal
      ✔ Should successfully initialize a Proposal account with proposal_id = 0 (461ms)
      ✔ Should store correct contract and contractor in Proposal account
      ✔ Should fail to initialize a Proposal when the signer is not the owner of the Contractor Account (487ms)

    update proposal
      ✔ Should let contractor update amount on an open proposal (459ms)
      ✔ Should fail to update a Proposal that has been accepted (ProposalCannotBeUpdated) (1873ms)
      ✔ Should fail if another contractor tries to update the proposal (472ms)
      ✔ Should fail to update Proposal if contract account doesn't match proposal.contract (InvalidProposalForContract) (946ms)

    choose proposal (with vault)
      ✔ Should let the client choose a proposal, fund the vault, and update the contract (921ms)
      ✔ Should fail if client doesn't have enough funds (934ms)
      ✔ Should fail if proposal does not belong to the given contract (InvalidProposalForContract) (472ms)
      ✔ Should fail if contractorAccount does not match proposal contractor (InvalidContractorForProposal) (908ms)

    mark work done
      ✔ Should let the contractor mark work as done and close the contract (467ms)
      ✔ Should fail if another contractor tries to mark work as done
      ✔ Should fail if contract is not in Accepted status (453ms)
      ✔ Should fail if markWorkDoneIx is called twice on the same contract

    claim payment (with vault)
      ✔ Should transfer SOL from vault to contractor when contract is closed (454ms)
      ✔ Should fail on second claim (no double payment)
      ✔ Should fail if contract is not closed yet (ContractNotClosed) (1887ms)
      ✔ Should fail claimPaymentIx if signer is not owner of the clientAccount (479ms)

  29 passing (16s)

✨  Done in 17.18s.
```

This command:

- Builds the program,
- Starts a local validator (if needed),
- Deploys the program,
- Runs the TypeScript test suite against the localnet instance.

---

## Additional Notes for Evaluators

- The project focuses on **program design + front integration** rather than a full marketplace UI.
- The on‑chain model is intentionally simple but realistic:
  - PDAs for role accounts (`Client`, `Contractor`),
  - PDAs for `Contract` and `Proposal` with incremental IDs,
  - A vault PDA for escrowed funds.
- The frontend is built with **Next.js App Router**, **TypeScript**, and **Solana Wallet Adapter** and provides:
  - A role‑aware navigation bar (client / contractor mode),
  - Separate dashboards for each role,
  - Detailed contract views showing linked proposals,
  - Contractor flows for creating / updating proposals and marking work as done,
  - Client flows for funding the vault and releasing payments.

