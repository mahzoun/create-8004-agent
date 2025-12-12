/**
 * Solana-specific templates for 8004 protocol
 *
 * This file is separate from base.ts (EVM templates) for maintainability.
 * Uses the 8004-solana SDK for Solana blockchain interactions.
 *
 * @see https://www.npmjs.com/package/8004-solana
 */
import type { WizardAnswers } from "../wizard.js";
import type { SOLANA_CHAINS } from "../config-solana.js";
type SolanaChainConfig = (typeof SOLANA_CHAINS)[keyof typeof SOLANA_CHAINS];
export declare function generateSolanaPackageJson(answers: WizardAnswers): string;
export declare function generateSolanaEnv(answers: WizardAnswers): string;
export declare function generateSolanaRegistrationJson(answers: WizardAnswers, chain: SolanaChainConfig): string;
export declare function generateSolanaRegisterScript(answers: WizardAnswers, chain: SolanaChainConfig): string;
/**
 * Generate agent.ts for Solana projects
 * This is identical to EVM - the LLM logic doesn't depend on blockchain
 */
export declare function generateAgentTs(answers: WizardAnswers): string;
export {};
