// Self-verifying indexer test: boots anvil, deploys the factory, exercises the
// full flow (create ×2, log dives, EIP-712 attest, release), runs the indexer
// pass, and asserts the indexed output. Exit code 0 = indexer is correct.
import { spawn } from "node:child_process";
import { createPublicClient, createWalletClient, http } from "viem";
import { foundry } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CHAINS } from "./config.js";
import { runOnce } from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));
const factoryArtifact = JSON.parse(
  readFileSync(join(here, "../../src/contracts/DiveLogFactory.json"), "utf8"),
);
const logArtifact = JSON.parse(
  readFileSync(join(here, "../../src/contracts/SovereignDiveLog.json"), "utf8"),
);

const URL = "http://127.0.0.1:8545";
const ALICE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // anvil #0
const BOB_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // anvil #1

function assert(cond, msg) {
  if (!cond) {
    console.error(`VERIFY FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

async function main() {
  console.log("[verify] booting anvil…");
  const anvil = spawn("anvil", ["--port", "8545", "--silent"], { stdio: "ignore" });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(1200);
  try {
    const alice = privateKeyToAccount(ALICE_KEY);
    const bob = privateKeyToAccount(BOB_KEY);
    const publicClient = createPublicClient({ chain: foundry, transport: http(URL) });
    const wc = (acct) => createWalletClient({ account: acct, chain: foundry, transport: http(URL) });
    const a = wc(alice);
    const b = wc(bob);
    const wait = (hash) => publicClient.waitForTransactionReceipt({ hash });

    console.log("[verify] deploying factory…");
    const deployHash = await a.deployContract({
      abi: factoryArtifact.abi,
      bytecode: factoryArtifact.bytecode,
    });
    const deployReceipt = await wait(deployHash);
    const factory = deployReceipt.contractAddress;

    console.log("[verify] alice + bob claim logbooks…");
    const h1 = await a.writeContract({ address: factory, abi: factoryArtifact.abi, functionName: "createLogbook" });
    await wait(h1);
    const h2 = await b.writeContract({ address: factory, abi: factoryArtifact.abi, functionName: "createLogbook" });
    await wait(h2);

    const aliceLogbook = await publicClient.readContract({
      address: factory, abi: factoryArtifact.abi, functionName: "logbookOf", args: [alice.address],
    });

    const dive = (date) => ({
      diveDate: date,
      units: 1,
      data: { leaveSurfaceTime: 0, leaveBottomTime: 0, reachSurfaceTime: 0, bottomTimeMinutes: 40,
        maxDepth: 18, averageDepth: 12, mode: 1, purpose: 11, suit: 0 },
      env: { airTemp: 0, waterTemp: 0, currentKnots: 0, bottomType: 0,
        coords: { latitude: 0, longitude: 0 }, location: "anvil", weatherConditions: "" },
      decomp: { decompType: 0, totalDecompTimeMinutes: 0, maxDepthAttained: 18,
        tableSchedule: "0x" + "0".repeat(64), repetitiveGroup: "0x00",
        surfaceIntervalMinutes: 0, newRepetitiveGroup: "0x00" },
      gas: { gasType: 0, o2Percent: 2090, hePercent: 0, n2Percent: 7910,
        cylinderPressureIn: 0, cylinderPressureOut: 0, gasConsumed: 0, bailoutPressure: 0 },
      remarks: "verify",
    });

    console.log("[verify] logging dives…");
    const h3 = await a.writeContract({
      address: aliceLogbook, abi: logArtifact.abi, functionName: "logDive", args: [dive(1_700_000_000)],
    });
    await wait(h3);

    console.log("[verify] bob signs + alice relays an attestation…");
    const signature = await b.signTypedData({
      domain: { name: "DiveLog", version: "1", chainId: 31337, verifyingContract: aliceLogbook },
      types: { Attestation: [
        { name: "diveId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
        { name: "nonce", type: "uint256" },
      ] },
      primaryType: "Attestation",
      message: { diveId: 1n, verifyingContract: aliceLogbook, nonce: 0n },
    });
    const h4 = await a.writeContract({
      address: aliceLogbook, abi: logArtifact.abi, functionName: "attestDive",
      args: [1n, 0n, signature],
    });
    await wait(h4);

    console.log("[verify] bob releases his logbook…");
    const h5 = await b.writeContract({
      address: factory, abi: factoryArtifact.abi, functionName: "releaseLogbook",
    });
    await wait(h5);

    // Point the indexer at our fresh anvil + factory
    CHAINS.anvil.factory = factory;
    CHAINS.anvil.rpc = URL;
    console.log("[verify] running indexer pass…");
    const out = await runOnce({ outPath: join(here, "../out/anvil-verify.json") });

    const chain = out.chains.anvil;
    assert(chain.factory === factory, "factory address recorded");
    assert(chain.logbooks.length === 1, "released logbook dropped, active kept");
    assert(
      chain.logbooks[0]?.owner?.toLowerCase() === alice.address.toLowerCase(),
      "owner indexed correctly",
    );
    assert(chain.logbooks[0]?.dives === 1, "dive count indexed");
    assert(chain.logbooks[0]?.attestations === 1, "attestation indexed");
    assert(out.global.divers === 1 && out.global.dives === 1, "global stats correct");

    console.log(process.exitCode ? "\n[verify] FAILED" : "\n[verify] all checks passed");
  } finally {
    anvil.kill();
  }
}

main().catch((e) => {
  console.error("[verify] error:", e);
  process.exitCode = 1;
});
