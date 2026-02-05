import chalk from "chalk";
import inquirer from "inquirer";
import { Client, ConfigBuilder } from "@4mica/sdk";
import { createPublicClient, http, parseAbi } from "viem";
import { CHAINS, type ChainKey } from "./config.js";
import { isSolanaChain } from "./config-solana.js";
import { hasFeature, type WizardAnswers } from "./wizard.js";

const ONE_USDC = 1_000_000n;
const ERC20_ABI = parseAbi(["function balanceOf(address) view returns (uint256)"]);

const FOURMICA_RPC_URLS: Partial<Record<ChainKey, string>> = {
    "eth-sepolia": "https://ethereum.sepolia.api.4mica.xyz",
    "polygon-amoy": "https://api.4mica.xyz",
};

type FourmicaDepositResult =
    | {
          status: "deposited";
          address: string;
          approveTx?: string;
          depositTx?: string;
      }
    | {
          status: "already_registered";
          address: string;
          collateral: bigint;
      }
    | {
          status: "insufficient_balance";
          address: string;
          balance: bigint;
      };

export async function maybeRegisterWithFourmica(answers: WizardAnswers): Promise<void> {
    if (!hasFeature(answers, "x402")) return;
    if (isSolanaChain(answers.chain)) return;
    if (answers.x402Provider !== "4mica") return;

    const { registerOnFourmica } = await inquirer.prompt<{ registerOnFourmica: boolean }>([
        {
            type: "confirm",
            name: "registerOnFourmica",
            message: "Register with 4mica now (deposit 1 USDC collateral)?",
            default: false,
        },
    ]);

    if (!registerOnFourmica) return;

    let privateKey = answers.generatedPrivateKey;
    if (!privateKey) {
        const { walletPrivateKey } = await inquirer.prompt<{ walletPrivateKey: string }>([
            {
                type: "password",
                name: "walletPrivateKey",
                message: "Wallet private key (leave empty to skip):",
                mask: "*",
                validate: (input: string) => {
                    const trimmed = input.trim();
                    if (trimmed === "") return true;
                    const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
                    return /^[0-9a-fA-F]{64}$/.test(hex) || "Enter a valid 32-byte hex private key";
                },
            },
        ]);
        privateKey = walletPrivateKey?.trim() ?? "";
    }

    if (!privateKey) {
        console.log(chalk.yellow("Skipping 4mica registration (private key required)."));
        return;
    }

    try {
        const result = await depositFourmicaCollateral({
            chain: answers.chain as ChainKey,
            privateKey,
        });

        if (result.status === "already_registered") {
            console.log(chalk.green("4mica collateral already funded (>= 1 USDC)."));
            return;
        }

        if (result.status === "insufficient_balance") {
            console.log(chalk.yellow("Insufficient USDC balance for 4mica registration."));
            console.log(
                chalk.gray(
                    `Add at least 1 USDC to ${result.address} and re-run the setup if you want to register.`
                )
            );
            return;
        }

        console.log(chalk.green("4mica registration deposit submitted."));
        if (result.depositTx) {
            console.log(chalk.gray(`Deposit tx: ${result.depositTx}`));
        }
    } catch (error) {
        console.error(chalk.red("4mica registration failed:"), error);
    }
}

async function depositFourmicaCollateral({
    chain,
    privateKey,
    amount = ONE_USDC,
}: {
    chain: ChainKey;
    privateKey: string;
    amount?: bigint;
}): Promise<FourmicaDepositResult> {
    const chainConfig = CHAINS[chain];
    const rpcUrl = FOURMICA_RPC_URLS[chain];
    if (!rpcUrl) {
        throw new Error(`4mica RPC URL not configured for ${chainConfig.name}`);
    }

    const usdcAddress = chainConfig.usdcAddress;
    if (!usdcAddress) {
        throw new Error(`USDC address not configured for ${chainConfig.name}`);
    }

    const cfg = new ConfigBuilder()
        .rpcUrl(rpcUrl)
        .walletPrivateKey(normalizePrivateKey(privateKey))
        .build();

    const client = await Client.new(cfg);

    try {
        const address = client.signer.signer.address;
        const existingAssets = await client.user.getUser();
        const current = existingAssets.find(
            (asset) => asset.asset.toLowerCase() === usdcAddress.toLowerCase()
        );

        if (current && current.collateral >= amount) {
            return { status: "already_registered", address, collateral: current.collateral };
        }

        const ethereumRpcUrl = client.params.ethereumHttpRpcUrl ?? chainConfig.rpcUrl;
        const publicClient = createPublicClient({ transport: http(ethereumRpcUrl) });
        const balance = (await publicClient.readContract({
            address: usdcAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as `0x${string}`],
        })) as bigint;

        if (balance < amount) {
            return { status: "insufficient_balance", address, balance };
        }

        const approveReceipt = await client.user.approveErc20(usdcAddress, amount);
        const depositReceipt = await client.user.deposit(amount, usdcAddress);

        return {
            status: "deposited",
            address,
            approveTx: approveReceipt?.transactionHash,
            depositTx: depositReceipt?.transactionHash,
        };
    } finally {
        await client.aclose();
    }
}

function normalizePrivateKey(value: string): string {
    const trimmed = value.trim();
    if (trimmed.startsWith("0x")) return trimmed;
    return `0x${trimmed}`;
}
