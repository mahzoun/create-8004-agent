/**
 * Solana chain configurations for 8004 protocol
 * Separate from EVM chains for maintainability
 */
export declare const SOLANA_CHAINS: {
    readonly "solana-devnet": {
        readonly name: "Solana Devnet";
        readonly cluster: "devnet";
        readonly rpcUrl: "https://api.devnet.solana.com";
        readonly explorer: "https://explorer.solana.com";
        readonly explorerSuffix: "?cluster=devnet";
        readonly programId: "HvF3JqhahcX7JfhbDRYYCJ7S3f6nJdrqu5yi9hyTREp";
        readonly scanPath: null;
        readonly x402Network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
    };
};
export type SolanaChainKey = keyof typeof SOLANA_CHAINS;
/**
 * Type guard to check if a chain key is a Solana chain
 */
export declare function isSolanaChain(chain: string): chain is SolanaChainKey;
/**
 * Get Solana chain config with type safety
 */
export declare function getSolanaChain(key: SolanaChainKey): {
    readonly name: "Solana Devnet";
    readonly cluster: "devnet";
    readonly rpcUrl: "https://api.devnet.solana.com";
    readonly explorer: "https://explorer.solana.com";
    readonly explorerSuffix: "?cluster=devnet";
    readonly programId: "HvF3JqhahcX7JfhbDRYYCJ7S3f6nJdrqu5yi9hyTREp";
    readonly scanPath: null;
    readonly x402Network: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
};
