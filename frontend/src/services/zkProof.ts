import { Noir } from "@noir-lang/noir_js";
import type { InputMap } from "@noir-lang/noir_js";
import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import circuit from "../assets/circuits/age_verification.json"
export interface ProofInputs{
    birthdate_year: number;
    birthdate_month: number;
    birthdate_day: number;
    current_year: number;
    current_month: number;
    current_day: number;
    minimum_age: number;
}
export interface ProofResult{
   proof:Uint8Array;
   publicInputs: string[];
}
let noirInstance: Noir | null = null;
let backend: BarretenbergBackend | null = null;

/**
 * Initialize Noir and backend (call once on app load)
 */
export async function initializeNoir(): Promise<void> {
  if (noirInstance && backend) {
    return; // Already initialized
  }

  try {
    backend = new BarretenbergBackend(circuit as any);
    noirInstance = new Noir(circuit as any);
   
    await noirInstance.init();
    
    console.log('Noir initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Noir:', error);
    throw new Error('Failed to initialize zero-knowledge proof system');
  }
}

/**
 * Parse birthdate string (YYYY-MM-DD) into components
 */
function parseBirthdate(birthdate: string): { year: number; month: number; day: number } {
  const [year, month, day] = birthdate.split('-').map(Number);
  if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error('Invalid birthdate format. Expected YYYY-MM-DD');
  }
  return { year, month, day };
}

/**
 * Get current date components
 */
function getCurrentDate(): { year: number; month: number; day: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

/**
 * Generate zero-knowledge proof for age verification
 * Proves age >= minimum_age without revealing the actual birthdate
 */
export async function generateAgeProof(
  birthdate: string,
  minimumAge: number = 18
): Promise<ProofResult> {
  if (!noirInstance || !backend) {
    await initializeNoir();
  }

  if (!noirInstance || !backend) {
    throw new Error('Noir not initialized');
  }

  const { year: birthYear, month: birthMonth, day: birthDay } = parseBirthdate(birthdate);
  const { year: currentYear, month: currentMonth, day: currentDay } = getCurrentDate();

  const inputs: ProofInputs = {
    birthdate_year: birthYear,
    birthdate_month: birthMonth,
    birthdate_day: birthDay,
    current_year: currentYear,
    current_month: currentMonth,
    current_day: currentDay,
    minimum_age: minimumAge,
  };

  try {
    console.log('Generating proof with inputs:', inputs);
    // Step 1: Execute the circuit to get the witness
    // Convert inputs to InputMap format (Record<string, any>)
    const inputMap: InputMap = inputs as unknown as InputMap;
    const { witness } = await noirInstance.execute(inputMap);
    
    // Step 2: Generate the proof from the witness
    const { proof, publicInputs } = await backend.generateProof(witness);
    
    console.log('Proof generated successfully');
    return {
      proof,
      publicInputs: publicInputs.map((input: any) => input.toString()),
    };
  } catch (error) {
    console.error('Proof generation error:', error);
    throw new Error(`Failed to generate proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify a proof
 */
export async function verifyProof(proof: Uint8Array, publicInputs: string[]): Promise<boolean> {
  if (!noirInstance || !backend) {
    await initializeNoir();
  }

  if (!noirInstance || !backend) {
    throw new Error('Noir not initialized');
  }

  try {
    const result = await backend.verifyProof({ proof, publicInputs });
    return result;
  } catch (error) {
    console.error('Proof verification error:', error);
    return false;
  }
}