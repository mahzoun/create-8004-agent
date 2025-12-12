import fs from "fs/promises";
import path from "path";
import { CHAINS } from "./config.js";
import { SOLANA_CHAINS, isSolanaChain } from "./config-solana.js";
import { hasFeature } from "./wizard.js";
// EVM templates
import { generatePackageJson, generateEnvExample, generateRegistrationJson, generateRegisterScript, generateAgentTs, } from "./templates/base.js";
// Solana templates
import { generateSolanaPackageJson, generateSolanaEnv, generateSolanaRegistrationJson, generateSolanaRegisterScript, generateAgentTs as generateSolanaAgentTs, } from "./templates/solana.js";
// Shared templates (work for both EVM and Solana)
import { generateA2AServer, generateAgentCard } from "./templates/a2a.js";
import { generateMCPServer, generateMCPTools } from "./templates/mcp.js";
export async function generateProject(answers) {
    const projectPath = path.resolve(process.cwd(), answers.projectDir);
    // Create directories
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, "src"), { recursive: true });
    if (hasFeature(answers, "a2a")) {
        await fs.mkdir(path.join(projectPath, ".well-known"), { recursive: true });
    }
    // Route to Solana or EVM templates based on chain
    if (isSolanaChain(answers.chain)) {
        await generateSolanaProject(projectPath, answers);
    }
    else {
        await generateEVMProject(projectPath, answers);
    }
    // Generate shared files (A2A, MCP work for both)
    if (hasFeature(answers, "a2a")) {
        await writeFile(projectPath, "src/a2a-server.ts", generateA2AServer(answers));
        await writeFile(projectPath, ".well-known/agent-card.json", generateAgentCard(answers));
    }
    if (hasFeature(answers, "mcp")) {
        await writeFile(projectPath, "src/mcp-server.ts", generateMCPServer(answers));
        await writeFile(projectPath, "src/tools.ts", generateMCPTools());
    }
}
/**
 * Generate EVM-specific project files
 */
async function generateEVMProject(projectPath, answers) {
    const chain = CHAINS[answers.chain];
    await writeFile(projectPath, "package.json", generatePackageJson(answers));
    await writeFile(projectPath, ".env", generateEnvExample(answers));
    await writeFile(projectPath, "registration.json", generateRegistrationJson(answers, chain));
    await writeFile(projectPath, "src/register.ts", generateRegisterScript(answers, chain));
    await writeFile(projectPath, "src/agent.ts", generateAgentTs(answers));
    await writeFile(projectPath, "tsconfig.json", generateTsConfig());
    await writeFile(projectPath, ".gitignore", generateGitignore());
}
/**
 * Generate Solana-specific project files
 */
async function generateSolanaProject(projectPath, answers) {
    const chain = SOLANA_CHAINS[answers.chain];
    await writeFile(projectPath, "package.json", generateSolanaPackageJson(answers));
    await writeFile(projectPath, ".env", generateSolanaEnv(answers));
    await writeFile(projectPath, "registration.json", generateSolanaRegistrationJson(answers, chain));
    await writeFile(projectPath, "src/register.ts", generateSolanaRegisterScript(answers, chain));
    await writeFile(projectPath, "src/agent.ts", generateSolanaAgentTs(answers));
    await writeFile(projectPath, "tsconfig.json", generateTsConfig());
    await writeFile(projectPath, ".gitignore", generateGitignore());
}
async function writeFile(projectPath, filePath, content) {
    const fullPath = path.join(projectPath, filePath);
    await fs.writeFile(fullPath, content, "utf-8");
}
function generateTsConfig() {
    return JSON.stringify({
        compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            outDir: "./dist",
            rootDir: "./src",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            resolveJsonModule: true,
        },
        include: ["src/**/*"],
        exclude: ["node_modules", "dist"],
    }, null, 2);
}
function generateGitignore() {
    return `node_modules/
dist/
.env
*.log
`;
}
