import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { CHAINS, TRUST_MODELS } from "./config.js";
import { SOLANA_CHAINS, isSolanaChain } from "./config-solana.js";
function getAvailableDir(baseDir) {
    if (baseDir === ".")
        return baseDir;
    const fullPath = path.resolve(process.cwd(), baseDir);
    if (!fs.existsSync(fullPath))
        return baseDir;
    // Directory exists, find available name with suffix
    let index = 1;
    let newDir = `${baseDir}-${index}`;
    while (fs.existsSync(path.resolve(process.cwd(), newDir))) {
        index++;
        newDir = `${baseDir}-${index}`;
    }
    return newDir;
}
// Re-export for convenience
export { isSolanaChain } from "./config-solana.js";
// Helper getters for cleaner access
export const hasFeature = (answers, feature) => answers.features.includes(feature);
export async function runWizard() {
    console.log("\n");
    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "projectDir",
            message: "Project directory (or . for current):",
            default: "my-agent",
        },
        {
            type: "input",
            name: "agentName",
            message: "Agent name:",
            validate: (input) => input.length > 0 || "Agent name is required",
        },
        {
            type: "input",
            name: "agentDescription",
            message: "Agent description:",
            validate: (input) => input.length > 0 || "Description is required",
        },
        {
            type: "input",
            name: "agentImage",
            message: "Agent image URL:",
            default: "https://example.com/agent.png",
        },
        {
            type: "list",
            name: "chain",
            message: "Blockchain network:",
            choices: [
                ...Object.entries(CHAINS).map(([key, chain]) => ({
                    name: chain.name,
                    value: key,
                })),
                new inquirer.Separator("── Solana ──"),
                ...Object.entries(SOLANA_CHAINS).map(([key, chain]) => ({
                    name: chain.name,
                    value: key,
                    disabled: "disabled" in chain && chain.disabled ? true : false,
                })),
            ],
        },
        {
            type: "input",
            name: "agentWallet",
            message: "Agent wallet address (leave empty to generate new):",
            validate: (input, answers) => {
                if (input === "")
                    return true;
                // Validate based on selected chain
                if (answers?.chain && isSolanaChain(answers.chain)) {
                    // Solana address validation (base58, 32-44 chars)
                    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(input) || "Enter a valid Solana address or leave empty";
                }
                // EVM address validation
                return /^0x[a-fA-F0-9]{40}$/.test(input) || "Enter a valid Ethereum address or leave empty";
            },
        },
        {
            type: "checkbox",
            name: "features",
            message: "Select features to include:",
            choices: () => {
                return [
                    { name: "A2A Server (agent-to-agent communication)", value: "a2a", checked: true },
                    { name: "x402 Payments (Coinbase, USDC)", value: "x402", checked: false },
                    { name: "MCP Server (Model Context Protocol tools)", value: "mcp", checked: false },
                ];
            },
        },
        {
            type: "confirm",
            name: "a2aStreaming",
            message: "Enable A2A streaming responses? (SSE):",
            default: false,
            when: (ans) => ans.features?.includes("a2a") ?? false,
        },
        {
            type: "list",
            name: "storageType",
            message: "Registration metadata storage:",
            choices: [
                { name: "Base64 (on-chain, no external dependencies)", value: "base64" },
                { name: "IPFS (Pinata)", value: "ipfs" },
            ],
        },
        {
            type: "checkbox",
            name: "trustModels",
            message: "Supported trust models:",
            choices: TRUST_MODELS.map((model) => ({ name: model, value: model, checked: true })),
        },
    ]);
    // Check if directory exists and get available name
    let projectDir = answers.projectDir;
    const availableDir = getAvailableDir(projectDir);
    if (availableDir !== projectDir) {
        console.log(`\n📁 Directory "${projectDir}" exists, using "${availableDir}" instead`);
        projectDir = availableDir;
    }
    // Generate wallet if not provided
    let agentWallet = answers.agentWallet;
    let generatedPrivateKey;
    if (!agentWallet) {
        if (isSolanaChain(answers.chain)) {
            // Generate Solana keypair
            const keypair = Keypair.generate();
            generatedPrivateKey = bs58.encode(keypair.secretKey);
            agentWallet = keypair.publicKey.toBase58();
            console.log("\n🔑 Generated new Solana wallet:", agentWallet);
        }
        else {
            // Generate EVM wallet
            const privateKey = generatePrivateKey();
            generatedPrivateKey = privateKey;
            const account = privateKeyToAccount(privateKey);
            agentWallet = account.address;
            console.log("\n🔑 Generated new wallet:", agentWallet);
        }
    }
    return {
        ...answers,
        projectDir,
        agentWallet,
        generatedPrivateKey,
        // Default to false if A2A not selected (question was skipped)
        a2aStreaming: answers.a2aStreaming ?? false,
    };
}
