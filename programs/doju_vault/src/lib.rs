//! Doju share vault.
//!
//! One pooled vault per asset mint. Depositors receive share tokens 1:1 on the
//! first deposit, then pro-rata. Exchange rate uses internal `total_assets`,
//! not the token balance, so a donation cannot inflate the share price.
//!
//! Withdrawals stay open when deposits are paused.
//! `ENFORCE_ADMIN` is false for the devnet demo. Set it, and replace `ADMIN`,
//! before any mainnet deployment.

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Burn, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked},
};

declare_id!("H1QaDVDzpWcCdHvpGyb7CND7s3NqdP3zVn6ETeAm2yuF");

/// Flip to true and replace [`ADMIN`] before a mainnet deploy so random
/// wallets cannot initialize the canonical vault for a mint.
pub const ENFORCE_ADMIN: bool = false;
pub const ADMIN: Pubkey = pubkey!("11111111111111111111111111111111");

pub fn admin_ok(authority: &Pubkey) -> bool {
    if !ENFORCE_ADMIN {
        return true;
    }
    authority == &ADMIN
}

#[program]
pub mod doju_vault {
    use super::*;

    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        require!(
            admin_ok(&ctx.accounts.authority.key()),
            VaultError::Unauthorized
        );
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.asset_mint = ctx.accounts.asset_mint.key();
        vault.share_mint = ctx.accounts.share_mint.key();
        vault.vault_token = ctx.accounts.vault_token.key();
        vault.bump = ctx.bumps.vault;
        vault.share_bump = ctx.bumps.share_mint;
        vault.paused = false;
        vault.total_assets = 0;
        vault.asset_decimals = ctx.accounts.asset_mint.decimals;
        vault.reserved = [0u8; 64];
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64, min_shares: u64) -> Result<()> {
        require!(!ctx.accounts.vault.paused, VaultError::Paused);
        require!(amount > 0, VaultError::ZeroAmount);

        let total_assets = ctx.accounts.vault.total_assets;
        let supply = ctx.accounts.share_mint.supply;
        let shares = shares_for_deposit(amount, total_assets, supply)?;
        require!(shares > 0, VaultError::ZeroShares);
        require!(shares >= min_shares, VaultError::Slippage);

        let decimals = ctx.accounts.asset_mint.decimals;
        let bump = ctx.accounts.vault.bump;
        let asset_mint_key = ctx.accounts.vault.asset_mint;

        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.user_asset.to_account_info(),
                    mint: ctx.accounts.asset_mint.to_account_info(),
                    to: ctx.accounts.vault_token.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
            decimals,
        )?;

        let seeds: &[&[u8]] = &[b"vault", asset_mint_key.as_ref(), &[bump]];
        token_interface::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.share_mint.to_account_info(),
                    to: ctx.accounts.user_share.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                &[seeds],
            ),
            shares,
        )?;

        ctx.accounts.vault.total_assets = total_assets
            .checked_add(amount)
            .ok_or(VaultError::Overflow)?;

        emit!(Deposited {
            vault: ctx.accounts.vault.key(),
            user: ctx.accounts.user.key(),
            assets: amount,
            shares,
        });
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64, min_assets: u64) -> Result<()> {
        require!(shares > 0, VaultError::ZeroAmount);

        let total_assets = ctx.accounts.vault.total_assets;
        let supply = ctx.accounts.share_mint.supply;
        let assets = assets_for_shares(shares, total_assets, supply)?;
        require!(assets >= min_assets, VaultError::Slippage);
        require!(assets <= total_assets, VaultError::InsufficientAssets);

        let decimals = ctx.accounts.asset_mint.decimals;
        let bump = ctx.accounts.vault.bump;
        let asset_mint_key = ctx.accounts.vault.asset_mint;

        token_interface::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.share_mint.to_account_info(),
                    from: ctx.accounts.user_share.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            shares,
        )?;

        let seeds: &[&[u8]] = &[b"vault", asset_mint_key.as_ref(), &[bump]];
        token_interface::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.vault_token.to_account_info(),
                    mint: ctx.accounts.asset_mint.to_account_info(),
                    to: ctx.accounts.user_asset.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                &[seeds],
            ),
            assets,
            decimals,
        )?;

        ctx.accounts.vault.total_assets = total_assets
            .checked_sub(assets)
            .ok_or(VaultError::Overflow)?;

        emit!(Withdrawn {
            vault: ctx.accounts.vault.key(),
            user: ctx.accounts.user.key(),
            assets,
            shares,
        });
        Ok(())
    }

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        ctx.accounts.vault.paused = paused;
        Ok(())
    }
}

pub fn shares_for_deposit(assets: u64, total_assets: u64, total_shares: u64) -> Result<u64> {
    if total_assets == 0 {
        require!(total_shares == 0, VaultError::Invariant);
        return Ok(assets);
    }
    require!(total_shares > 0, VaultError::Invariant);
    let shares = (assets as u128)
        .checked_mul(total_shares as u128)
        .ok_or(VaultError::Overflow)?
        / (total_assets as u128);
    u64::try_from(shares).map_err(|_| VaultError::Overflow.into())
}

pub fn assets_for_shares(shares: u64, total_assets: u64, total_shares: u64) -> Result<u64> {
    require!(shares > 0, VaultError::ZeroAmount);
    require!(total_shares > 0, VaultError::Invariant);
    let assets = (shares as u128)
        .checked_mul(total_assets as u128)
        .ok_or(VaultError::Overflow)?
        / (total_shares as u128);
    require!(assets > 0, VaultError::ZeroAssets);
    u64::try_from(assets).map_err(|_| VaultError::Overflow.into())
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub asset_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", asset_mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = authority,
        seeds = [b"share", asset_mint.key().as_ref()],
        bump,
        mint::decimals = asset_mint.decimals,
        mint::authority = vault,
        mint::token_program = token_program
    )]
    pub share_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = authority,
        associated_token::mint = asset_mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program
    )]
    pub vault_token: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", asset_mint.key().as_ref()],
        bump = vault.bump,
        has_one = asset_mint,
        has_one = share_mint,
        has_one = vault_token
    )]
    pub vault: Account<'info, Vault>,
    pub asset_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub share_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub vault_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_asset.mint == vault.asset_mint,
        constraint = user_asset.owner == user.key()
    )]
    pub user_asset: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_share.mint == vault.share_mint,
        constraint = user_share.owner == user.key()
    )]
    pub user_share: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault", asset_mint.key().as_ref()],
        bump = vault.bump,
        has_one = asset_mint,
        has_one = share_mint,
        has_one = vault_token
    )]
    pub vault: Account<'info, Vault>,
    pub asset_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub share_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub vault_token: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_asset.mint == vault.asset_mint,
        constraint = user_asset.owner == user.key()
    )]
    pub user_asset: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        constraint = user_share.mint == vault.share_mint,
        constraint = user_share.owner == user.key()
    )]
    pub user_share: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority)]
    pub vault: Account<'info, Vault>,
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub authority: Pubkey,
    pub asset_mint: Pubkey,
    pub share_mint: Pubkey,
    pub vault_token: Pubkey,
    pub bump: u8,
    pub share_bump: u8,
    pub paused: bool,
    pub total_assets: u64,
    pub asset_decimals: u8,
    pub reserved: [u8; 64],
}

#[event]
pub struct Deposited {
    pub vault: Pubkey,
    pub user: Pubkey,
    pub assets: u64,
    pub shares: u64,
}

#[event]
pub struct Withdrawn {
    pub vault: Pubkey,
    pub user: Pubkey,
    pub assets: u64,
    pub shares: u64,
}

#[error_code]
pub enum VaultError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Deposit is too small to mint a share")]
    ZeroShares,
    #[msg("Withdrawal rounds down to zero assets")]
    ZeroAssets,
    #[msg("Deposits are paused")]
    Paused,
    #[msg("Slippage: received amount is below the minimum")]
    Slippage,
    #[msg("Math overflow")]
    Overflow,
    #[msg("Not enough assets in the vault")]
    InsufficientAssets,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Vault accounting invariant broken")]
    Invariant,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::AccountSerialize;
    use anchor_lang::InstructionData;
    use solana_program_test::{processor, BanksClientError, ProgramTest, ProgramTestContext};
    use solana_sdk::{
        account::Account,
        instruction::{AccountMeta, Instruction},
        program_pack::Pack,
        pubkey::Pubkey,
        signature::Keypair,
        signer::Signer,
        system_instruction, system_program,
        transaction::Transaction,
    };
    use std::result::Result as StdResult;
    use spl_associated_token_account::{
        get_associated_token_address, instruction::create_associated_token_account,
    };
    use spl_token::{
        instruction as token_ix,
        state::{Account as TokenAccountState, Mint as MintState},
    };

    #[test]
    fn math_rounds_down_and_rejects_dust() {
        assert_eq!(shares_for_deposit(1_000, 0, 0).unwrap(), 1_000);
        assert_eq!(shares_for_deposit(2, 4, 3).unwrap(), 1);
        assert_eq!(assets_for_shares(1, 4, 3).unwrap(), 1);
        assert!(assets_for_shares(1, 1, 100).is_err());
        assert!(shares_for_deposit(u64::MAX, 1, 2).is_err());
        assert!(shares_for_deposit(1, 0, 5).is_err());
    }

    #[test]
    fn admin_gate_is_open_for_the_devnet_demo() {
        assert!(!ENFORCE_ADMIN);
        assert!(admin_ok(&Pubkey::new_unique()));
    }

    #[test]
    fn vault_layout_matches_the_client_decoder() {
        let vault = Vault {
            authority: Pubkey::new_unique(),
            asset_mint: Pubkey::new_unique(),
            share_mint: Pubkey::new_unique(),
            vault_token: Pubkey::new_unique(),
            bump: 3,
            share_bump: 4,
            paused: true,
            total_assets: 99,
            asset_decimals: 6,
            reserved: [0u8; 64],
        };
        let mut bytes = Vec::new();
        vault.try_serialize(&mut bytes).unwrap();
        let disc = anchor_lang::solana_program::hash::hash(b"account:Vault");
        assert_eq!(&bytes[..8], &disc.to_bytes()[..8]);
        // discriminator + 4 pubkeys + bump + share_bump + paused
        let total_at = 8 + 32 * 4 + 3;
        assert_eq!(&bytes[total_at..total_at + 8], &99u64.to_le_bytes());
        assert_eq!(bytes[total_at + 8], 6);
    }

    #[test]
    fn instruction_discriminators() {
        let deposit = instruction::Deposit {
            amount: 1,
            min_shares: 0,
        }
        .data();
        let hash = anchor_lang::solana_program::hash::hash(b"global:deposit");
        assert_eq!(&deposit[..8], &hash.to_bytes()[..8]);
        assert_eq!(deposit.len(), 24);

        let withdraw = instruction::Withdraw {
            shares: 1,
            min_assets: 0,
        }
        .data();
        let hash = anchor_lang::solana_program::hash::hash(b"global:withdraw");
        assert_eq!(&withdraw[..8], &hash.to_bytes()[..8]);

        let init = instruction::InitializeVault {}.data();
        let hash = anchor_lang::solana_program::hash::hash(b"global:initialize_vault");
        assert_eq!(&init[..8], &hash.to_bytes()[..8]);
        assert_eq!(init.len(), 8);
    }

    /// Anchor's `entry` ties account lifetimes together. The test runtime wants
    /// them independent. The ABI is the same, so the pointer cast is sound here.
    fn test_entry(
        program_id: &Pubkey,
        accounts: &[anchor_lang::prelude::AccountInfo],
        data: &[u8],
    ) -> solana_sdk::entrypoint::ProgramResult {
        type EntryFn = fn(
            &Pubkey,
            &[anchor_lang::prelude::AccountInfo],
            &[u8],
        ) -> solana_sdk::entrypoint::ProgramResult;
        let entry: EntryFn = unsafe { std::mem::transmute(crate::entry as *const ()) };
        entry(program_id, accounts, data)
    }

    fn start() -> ProgramTest {
        ProgramTest::new("doju_vault", crate::id(), processor!(test_entry))
    }

    async fn send(
        ctx: &mut ProgramTestContext,
        ixs: &[Instruction],
        signers: &[&Keypair],
    ) -> StdResult<(), BanksClientError> {
        let blockhash = ctx.banks_client.get_latest_blockhash().await?;
        let mut tx = Transaction::new_with_payer(ixs, Some(&ctx.payer.pubkey()));
        let mut keys: Vec<&Keypair> = vec![&ctx.payer];
        keys.extend(signers);
        tx.sign(&keys, blockhash);
        ctx.banks_client.process_transaction(tx).await
    }

    async fn create_mint(ctx: &mut ProgramTestContext, decimals: u8) -> Keypair {
        let mint = Keypair::new();
        let rent = ctx.banks_client.get_rent().await.unwrap();
        let lamports = rent.minimum_balance(MintState::LEN);
        send(
            ctx,
            &[
                system_instruction::create_account(
                    &ctx.payer.pubkey(),
                    &mint.pubkey(),
                    lamports,
                    MintState::LEN as u64,
                    &spl_token::id(),
                ),
                token_ix::initialize_mint(
                    &spl_token::id(),
                    &mint.pubkey(),
                    &ctx.payer.pubkey(),
                    None,
                    decimals,
                )
                .unwrap(),
            ],
            &[&mint],
        )
        .await
        .unwrap();
        mint
    }

    async fn mint_to(ctx: &mut ProgramTestContext, mint: &Pubkey, owner: &Pubkey, amount: u64) {
        let ata = get_associated_token_address(owner, mint);
        let create = create_associated_token_account(
            &ctx.payer.pubkey(),
            owner,
            mint,
            &spl_token::id(),
        );
        let mint_ix =
            token_ix::mint_to(&spl_token::id(), mint, &ata, &ctx.payer.pubkey(), &[], amount)
                .unwrap();
        send(ctx, &[create, mint_ix], &[]).await.unwrap();
    }

    async fn token_amount(ctx: &mut ProgramTestContext, account: &Pubkey) -> u64 {
        let acct: Account = ctx
            .banks_client
            .get_account(*account)
            .await
            .unwrap()
            .expect("token account");
        TokenAccountState::unpack(&acct.data).unwrap().amount
    }

    fn pdas(mint: &Pubkey) -> (Pubkey, Pubkey, Pubkey) {
        let (vault, _) = Pubkey::find_program_address(&[b"vault", mint.as_ref()], &crate::id());
        let (share, _) = Pubkey::find_program_address(&[b"share", mint.as_ref()], &crate::id());
        let vault_token = get_associated_token_address(&vault, mint);
        (vault, share, vault_token)
    }

    fn init_ix(authority: &Pubkey, mint: &Pubkey) -> Instruction {
        let (vault, share, vault_token) = pdas(mint);
        Instruction {
            program_id: crate::id(),
            accounts: vec![
                AccountMeta::new(*authority, true),
                AccountMeta::new_readonly(*mint, false),
                AccountMeta::new(vault, false),
                AccountMeta::new(share, false),
                AccountMeta::new(vault_token, false),
                AccountMeta::new_readonly(spl_token::id(), false),
                AccountMeta::new_readonly(spl_associated_token_account::id(), false),
                AccountMeta::new_readonly(system_program::id(), false),
            ],
            data: instruction::InitializeVault {}.data(),
        }
    }

    fn deposit_ix(user: &Pubkey, mint: &Pubkey, amount: u64, min_shares: u64) -> Instruction {
        let (vault, share, vault_token) = pdas(mint);
        Instruction {
            program_id: crate::id(),
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(vault, false),
                AccountMeta::new_readonly(*mint, false),
                AccountMeta::new(share, false),
                AccountMeta::new(vault_token, false),
                AccountMeta::new(get_associated_token_address(user, mint), false),
                AccountMeta::new(get_associated_token_address(user, &share), false),
                AccountMeta::new_readonly(spl_token::id(), false),
            ],
            data: instruction::Deposit { amount, min_shares }.data(),
        }
    }

    fn withdraw_ix(user: &Pubkey, mint: &Pubkey, shares: u64, min_assets: u64) -> Instruction {
        let (vault, share, vault_token) = pdas(mint);
        Instruction {
            program_id: crate::id(),
            accounts: vec![
                AccountMeta::new(*user, true),
                AccountMeta::new(vault, false),
                AccountMeta::new_readonly(*mint, false),
                AccountMeta::new(share, false),
                AccountMeta::new(vault_token, false),
                AccountMeta::new(get_associated_token_address(user, mint), false),
                AccountMeta::new(get_associated_token_address(user, &share), false),
                AccountMeta::new_readonly(spl_token::id(), false),
            ],
            data: instruction::Withdraw { shares, min_assets }.data(),
        }
    }

    #[tokio::test]
    async fn deposit_withdraw_pause_and_slippage() {
        let mut ctx = start().start_with_context().await;
        let mint = create_mint(&mut ctx, 6).await;
        let payer = ctx.payer.pubkey();
        mint_to(&mut ctx, &mint.pubkey(), &payer, 5_000_000).await;

        let user2 = Keypair::new();
        send(
            &mut ctx,
            &[system_instruction::transfer(
                &payer,
                &user2.pubkey(),
                500_000_000,
            )],
            &[],
        )
        .await
        .unwrap();
        mint_to(&mut ctx, &mint.pubkey(), &user2.pubkey(), 5_000_000).await;

        send(&mut ctx, &[init_ix(&payer, &mint.pubkey())], &[])
            .await
            .unwrap();

        let (vault_pda, share_mint, vault_token) = pdas(&mint.pubkey());
        let vault_acct = ctx
            .banks_client
            .get_account(vault_pda)
            .await
            .unwrap()
            .unwrap();
        let vault = Vault::try_deserialize(&mut &vault_acct.data[..]).unwrap();
        assert_eq!(vault.authority, payer);
        assert_eq!(vault.total_assets, 0);
        assert!(!vault.paused);

        let user_share = get_associated_token_address(&payer, &share_mint);
        let create_share = create_associated_token_account(
            &payer,
            &payer,
            &share_mint,
            &spl_token::id(),
        );
        send(
            &mut ctx,
            &[
                create_share,
                deposit_ix(&payer, &mint.pubkey(), 1_000_000, 1_000_000),
            ],
            &[],
        )
        .await
        .unwrap();
        assert_eq!(token_amount(&mut ctx, &user_share).await, 1_000_000);
        assert_eq!(token_amount(&mut ctx, &vault_token).await, 1_000_000);

        let too_high = send(
            &mut ctx,
            &[deposit_ix(&payer, &mint.pubkey(), 10, u64::MAX)],
            &[],
        )
        .await;
        assert!(too_high.is_err());

        let user2_share = get_associated_token_address(&user2.pubkey(), &share_mint);
        let create_user2 = create_associated_token_account(
            &payer,
            &user2.pubkey(),
            &share_mint,
            &spl_token::id(),
        );
        // user2 must sign the deposit. Payer pays the ATA rent.
        let blockhash = ctx.banks_client.get_latest_blockhash().await.unwrap();
        let mut tx = Transaction::new_with_payer(
            &[
                create_user2,
                deposit_ix(&user2.pubkey(), &mint.pubkey(), 1_000_000, 1_000_000),
            ],
            Some(&payer),
        );
        tx.sign(&[&ctx.payer, &user2], blockhash);
        ctx.banks_client.process_transaction(tx).await.unwrap();
        assert_eq!(token_amount(&mut ctx, &user2_share).await, 1_000_000);

        send(
            &mut ctx,
            &[withdraw_ix(&payer, &mint.pubkey(), 400_000, 400_000)],
            &[],
        )
        .await
        .unwrap();
        assert_eq!(token_amount(&mut ctx, &user_share).await, 600_000);
        assert_eq!(token_amount(&mut ctx, &vault_token).await, 1_600_000);

        let pause = Instruction {
            program_id: crate::id(),
            accounts: vec![
                AccountMeta::new_readonly(payer, true),
                AccountMeta::new(vault_pda, false),
            ],
            data: instruction::SetPaused { paused: true }.data(),
        };
        send(&mut ctx, &[pause], &[]).await.unwrap();

        let blocked = send(
            &mut ctx,
            &[deposit_ix(&payer, &mint.pubkey(), 1, 0)],
            &[],
        )
        .await;
        assert!(blocked.is_err());

        let blockhash = ctx.banks_client.get_latest_blockhash().await.unwrap();
        let mut tx = Transaction::new_with_payer(
            &[withdraw_ix(&user2.pubkey(), &mint.pubkey(), 100_000, 100_000)],
            Some(&user2.pubkey()),
        );
        tx.sign(&[&user2], blockhash);
        ctx.banks_client.process_transaction(tx).await.unwrap();
        assert_eq!(token_amount(&mut ctx, &user2_share).await, 900_000);

        let rogue_ix = Instruction {
            program_id: crate::id(),
            accounts: vec![
                AccountMeta::new_readonly(user2.pubkey(), true),
                AccountMeta::new(vault_pda, false),
            ],
            data: instruction::SetPaused { paused: false }.data(),
        };
        let blockhash = ctx.banks_client.get_latest_blockhash().await.unwrap();
        let mut tx = Transaction::new_with_payer(&[rogue_ix], Some(&user2.pubkey()));
        tx.sign(&[&user2], blockhash);
        assert!(ctx.banks_client.process_transaction(tx).await.is_err());
    }
}
