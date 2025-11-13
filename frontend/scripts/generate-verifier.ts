#!/usr/bin/env node
/**
 * Generate Solidity verifier contract programmatically
 * This bypasses CLI size limits by using the @aztec/bb.js API directly
 */

import { Barretenberg, RawBuffer, Crs } from '@aztec/bb.js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { gunzipSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CIRCUIT_PATH = join(__dirname, '../../circuits/age_verification/target/age_verification.json');
const VK_OUTPUT_PATH = join(__dirname, '../../circuits/age_verification/target/vk');
const VERIFIER_OUTPUT_PATH = join(__dirname, '../../contracts/solidity/AgeVerifier.sol');

function getBytecode(bytecodePath: string): Uint8Array {
  const encodedCircuit = JSON.parse(readFileSync(bytecodePath, 'utf8'));
  const decompressed = gunzipSync(Buffer.from(encodedCircuit.bytecode, 'base64'));
  return new Uint8Array(decompressed);
}

async function generateVerifier() {
  console.log('🚀 Starting verifier generation...');
  console.log(` Circuit: ${CIRCUIT_PATH}`);
  
  // Read and decompress circuit
  console.log('📖 Reading circuit...');
  const bytecode = getBytecode(CIRCUIT_PATH);
  
  // Initialize Barretenberg API
  console.log('⚙️  Initializing Barretenberg...');
  const api = await Barretenberg.new({ threads: 1 });
  
  try {
    // Get circuit size
    console.log('Computing circuit size...');
    const recursive = false;
    const honkRecursion = false; // Use UltraPlonk for Solidity verifier generation
    const [total, subgroupSize] = await api.acirGetCircuitSizes(bytecode, recursive, honkRecursion);
    console.log(`   Circuit gates: ${total}`);
    console.log(`   Subgroup size: ${subgroupSize}`);
    
    // Check size limits (WASM has 2^19 limit)
    const MAX_CIRCUIT_SIZE = 2 ** 19;
    if (subgroupSize > MAX_CIRCUIT_SIZE) {
      throw new Error(`Circuit size ${subgroupSize} exceeds WASM limit of ${MAX_CIRCUIT_SIZE}`);
    }
    
    // Initialize CRS (Common Reference String)
    console.log('Loading CRS...');
    const crs = await Crs.new(subgroupSize + 1);
    await api.srsInitSrs(
      new RawBuffer(crs.getG1Data()),
      crs.numPoints,
      new RawBuffer(crs.getG2Data())
    );
    
    // Generate verification key using UltraHonk with Keccak (for Solidity compatibility)
    console.log('Generating verification key (UltraHonk Keccak)...');
    const vk = await api.acirWriteVkUltraKeccakHonk(bytecode);
    
    // Write verification key to file
    console.log(`Writing verification key to ${VK_OUTPUT_PATH}...`);
    writeFileSync(VK_OUTPUT_PATH, vk);
    console.log('Verification key generated!');
    
    // Generate Solidity verifier contract using UltraHonk Keccak
    console.log('Generating Solidity verifier contract (UltraHonk Keccak)...');
    const contract = await api.acirHonkSolidityVerifier(bytecode, vk);
    
    // Write Solidity verifier to file
    console.log(`Writing Solidity verifier to ${VERIFIER_OUTPUT_PATH}...`);
    mkdirSync(dirname(VERIFIER_OUTPUT_PATH), { recursive: true });
    writeFileSync(VERIFIER_OUTPUT_PATH, contract);
    console.log('Solidity verifier generated!');
    
    console.log('\n Success! Files generated:');
    console.log(`   VK: ${VK_OUTPUT_PATH}`);
    console.log(`   Verifier: ${VERIFIER_OUTPUT_PATH}`);
    
  } catch (error) {
    console.error('❌ Error generating verifier:', error);
    throw error;
  } finally {
    await api.destroy();
  }
}

// Run the script
generateVerifier()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });

