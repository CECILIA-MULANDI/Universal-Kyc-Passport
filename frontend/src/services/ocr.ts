import { createWorker, PSM } from 'tesseract.js';
import type { ExtractedData, DocumentType } from '../types';

export interface OCRResult {
  birthdate?: string;
  documentNumber?: string;
  fullName?: string;
  country?: string;
  rawText: string;
}

/**
 * Extract text from an image using Tesseract.js OCR with optimized settings
 */
export async function extractTextFromImage(imageFile: File): Promise<string> {
  const worker = await createWorker('eng');
  
  try {
    // Configure OCR for better accuracy on documents
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-. :',
    });
    
    const { data: { text } } = await worker.recognize(imageFile);
    await worker.terminate();
    return text;
  } catch (error) {
    await worker.terminate();
    throw new Error(`OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Preprocess text for better parsing
 */
function preprocessText(text: string): string {
  // Remove extra whitespace and normalize
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\/\-\.:]/g, '')
    .trim();
}

/**
 * Normalize OCR text to fix common OCR errors in dates
 */
function normalizeOCRText(text: string): string {
  // Fix common OCR errors: 0 instead of O, 1 instead of I, etc.
  return text
    // Fix month abbreviations: 0CT -> OCT, 1AN -> JAN, etc.
    .replace(/\b0CT\b/gi, 'OCT')
    .replace(/\b1AN\b/gi, 'JAN')
    .replace(/\bFEB\b/gi, 'FEB')
    .replace(/\bMAR\b/gi, 'MAR') 
    .replace(/\bAPR\b/gi, 'APR')
    .replace(/\bMAY\b/gi, 'MAY') 
    .replace(/\b1UN\b/gi, 'JUN')
    .replace(/\b1UL\b/gi, 'JUL')
    .replace(/\bAUG\b/gi, 'AUG') 
    .replace(/\bSEP\b/gi, 'SEP')
    .replace(/\b0CT\b/gi, 'OCT') 
    .replace(/\bN0V\b/gi, 'NOV')
    .replace(/\bDEC\b/gi, 'DEC') 
    // Fix other common OCR errors
    .replace(/\b0\b/g, 'O') 
    .replace(/1([A-Z])/g, (match, letter) => {
      // If 1 is followed by a letter, it might be I
      if (['A', 'E', 'O', 'U'].includes(letter)) {
        return 'I' + letter;
      }
      return match;
    });
}

/**
 * Extract all potential dates from text
 */
function extractAllDates(text: string): string[] {
  const dates: string[] = [];
  
  // Normalize OCR text first to fix common errors
  const normalized = normalizeOCRText(text);
  
  // Comprehensive date patterns
  const datePatterns = [
    // DD/MM/YYYY or MM/DD/YYYY
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g,
    // YYYY/MM/DD
    /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/g,
    // DD-MMM-YYYY (e.g., 15-Jan-1990, 17-0CT-2001)
    /\b(\d{1,2})[\/\-\.\s]+([A-Z0-9]{3})[\/\-\.\s]+(\d{2,4})\b/gi,
    // DD MMM YYYY (e.g., 15 Jan 1990, 17 0CT 2001) - this is the key one!
    /\b(\d{1,2})\s+([A-Z0-9]{3})\s+(\d{2,4})\b/gi,
    // DD MMMM YYYY (full month names)
    /\b(\d{1,2})\s+(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+(\d{2,4})\b/gi,
  ];
  
  for (const pattern of datePatterns) {
    const matches = normalized.matchAll(pattern);
    for (const match of matches) {
      if (match[0]) {
        dates.push(match[0].trim());
      }
    }
  }
  
  // Also try the original text (in case normalization broke something)
  if (text !== normalized) {
    for (const pattern of datePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[0] && !dates.includes(match[0].trim())) {
          dates.push(match[0].trim());
        }
      }
    }
  }
  
  return dates;
}

/**
 * Find birthdate by looking for date patterns near birthdate keywords
 * @param text - The text to search for birthdate
 * @param documentType - Optional document type for future document-specific parsing
 */
function findBirthdate(text: string): string | null {
  // Normalize OCR text first
  const normalizedText = normalizeOCRText(text).toUpperCase();
  const originalText = text;
  
  // Keywords that indicate birthdate
  const birthdateKeywords = [
    'DATE OF BIRTH',
    'DOB',
    'BIRTH DATE',
    'BORN',
    'BIRTH',
    'DATE OF BIRTH:',
    'DOB:',
    'BIRTHDATE',
    'BIRTH DATE:',
    'BORN:', 
  ];
  
  // First, try to find dates near birthdate keywords
  for (const keyword of birthdateKeywords) {
    const keywordIndex = normalizedText.indexOf(keyword);
    if (keywordIndex !== -1) {
      // Extract text around the keyword (150 characters before and after)
      const start = Math.max(0, keywordIndex - 75);
      const end = Math.min(originalText.length, keywordIndex + keyword.length + 150);
      const context = originalText.substring(start, end);
      
      // Find all dates in this context
      const dates = extractAllDates(context);
      
      // Try to parse each date
      for (const dateStr of dates) {
        const parsed = parseDate(dateStr);
        if (parsed && isValidBirthdate(parsed)) {
          console.log(`Found birthdate near keyword "${keyword}": ${dateStr} -> ${parsed}`);
          return parsed;
        }
      }
    }
  }
  
  // Also try without keyword matching - just find all dates and pick the earliest valid one
  // This is useful when OCR doesn't capture the keyword properly
  
  // If no date found near keywords, try all dates in the text
  // and find the most likely birthdate (reasonable age range)
  const allDates = extractAllDates(originalText);
  const validBirthdates: string[] = [];
  const invalidDates: Array<{ date: string; reason: string }> = [];
  
  console.log('All dates found in text:', allDates);
  
  for (const dateStr of allDates) {
    const parsed = parseDate(dateStr);
    if (parsed) {
      if (isValidBirthdate(parsed)) {
        validBirthdates.push(parsed);
        console.log(`Valid birthdate found: ${dateStr} -> ${parsed}`);
      } else {
        // Check why it's invalid
        const date = new Date(parsed);
        const today = new Date();
        let reason = 'unknown';
        
        if (isNaN(date.getTime())) {
          reason = 'invalid date';
        } else if (date > today) {
          reason = 'future date';
        } else if (date < new Date('1900-01-01')) {
          reason = 'before 1900';
        } else {
          const age = today.getFullYear() - date.getFullYear();
          if (age < 0 || age > 150) {
            reason = `age out of range (${age})`;
          }
        }
        
        invalidDates.push({ date: `${dateStr} -> ${parsed}`, reason });
        console.log(`Invalid date: ${dateStr} -> ${parsed} (${reason})`);
      }
    } else {
      console.log(`Could not parse date: ${dateStr}`);
    }
  }
  
  // Log invalid dates for debugging
  if (invalidDates.length > 0) {
    console.log('Dates found but invalid:', invalidDates);
  }
  
  // Return the earliest valid date (most likely to be birthdate)
  if (validBirthdates.length > 0) {
    validBirthdates.sort();
    console.log('Valid birthdates found (sorted):', validBirthdates);
    return validBirthdates[0];
  }
  
  return null;
}

/**
 * Check if a date is a valid birthdate (between 1900 and today, reasonable age)
 */
function isValidBirthdate(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    const today = new Date();
    const minDate = new Date('1900-01-01');
    
    // Date must be valid
    if (isNaN(date.getTime())) {
      return false;
    }
    
    // Date must be in the past (allow up to 1 day in future for timezone issues)
    const oneDay = 24 * 60 * 60 * 1000;
    if (date > new Date(today.getTime() + oneDay)) {
      return false;
    }
    
    // Date must be after 1900
    if (date < minDate) {
      return false;
    }
    
    // Calculate age
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      actualAge--;
    }
    
    // Age should be between 0 and 150 (reasonable range)
    // Be more lenient - allow ages up to 150
    return actualAge >= 0 && actualAge <= 150;
  } catch {
    return false;
  }
}

/**
 * Parse extracted text to find relevant data based on document type
 * @param text - The OCR extracted text
 * @param documentType - Document type (passport, id, driver_license) - reserved for future document-specific parsing
 */
export function parseDocumentData(
  text: string,
  documentType: DocumentType
): OCRResult {
  const result: OCRResult = { rawText: text };
  
  // Preprocess text
  const preprocessedText = preprocessText(text);
  const normalizedText = preprocessedText.toUpperCase();
  
  // Extract birthdate with improved logic
  // Document type can be used to adjust parsing strategies (e.g., passport vs ID formats)
  // For now, we use a generic approach that works for all document types
 
  const birthdate = findBirthdate(preprocessedText);
  if (birthdate) {
    result.birthdate = birthdate;
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Parsing ${documentType} document`);
  }
  
  // Extract document number (comprehensive patterns)
  const docNumberPatterns = [
    // After keywords (PASSPORT NO, DOCUMENT NUMBER, etc.)
    /(?:PASSPORT|PASSPORT\s+NO|PASSPORT\s+NUMBER|DOCUMENT\s+NO|DOC\s+NO|DOCUMENT\s+NUMBER|ID\s+NO|ID\s+NUMBER)[\s:]*([A-Z0-9]{6,15})/i,
    // Country code followed by alphanumeric (e.g., KEN AK1626595)
    /\b([A-Z]{2,4})\s+([A-Z]{1,3}[0-9]{6,12})\b/i,
    // Standalone patterns (alphanumeric codes like AK1626595)
    /\b([A-Z]{1,3}[0-9]{6,12})\b/,
    // Numeric patterns (8-12 digits)
    /\b([0-9]{8,12})\b/,
    // Generic number after "NO" or "NUMBER"
    /(?:NO|NUMBER)[\s:]*([A-Z0-9]{6,15})/i,
  ];
  
  for (const pattern of docNumberPatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      let docNum: string;
      
      // Handle patterns with multiple capture groups (e.g., country code + number)
      if (match[2]) {
        docNum = match[2].trim(); // Use the document number part
      } else if (match[1]) {
        docNum = match[1].trim();
      } else {
        continue;
      }
      
      // Validate it's not a date and has reasonable length
      if (docNum.length >= 6 && !/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(docNum)) {
        // Additional validation: should contain at least one letter and one number
        // or be a long numeric sequence
        if ((/[A-Z]/.test(docNum) && /[0-9]/.test(docNum)) || /^[0-9]{8,}$/.test(docNum)) {
          result.documentNumber = docNum;
          console.log(`Found document number: ${docNum}`);
          break;
        }
      }
    }
  }
  
  // Extract name 
  // Common false positives to exclude
  const falsePositives = [
    'REPUBLIC', 'GOVERNMENT', 'PASSPORT', 'PASIPASSEPORT', 'JAMHURI', 'REPUBLIQUE',
    'KENYA', 'KENYAN', 'KEN', 'COUNTRY', 'NATIONALITY', 'ISSUING', 'AUTHORITY',
    'BEADS', 'PAR', 'BONE', 'NEER', 'MR', 'PRD', 'STN', 'PACE', 'HUH', 'PE', 'KI', 'NET',
    'RUIRU', 'GTR', 'BN', 'RIES', 'PT', 'AUG', 'OCT', 'JAN', 'FEB', 'MAR', 'APR', 'MAY',
    'JUN', 'JUL', 'SEP', 'NOV', 'DEC', 'GOVERNMENT', 'OF', 'THE'
  ];
  
  const namePatterns = [
    // After name keywords (most reliable)
    /(?:SURNAME|GIVEN\s+NAMES?|FULL\s+NAME|NAME)[\s:]*([A-Z][A-Z\s]{4,50})/i,
    // Look for all-caps names (common in passports) - two or three words, not too short
    // Must be after PASSPORT or before NATIONALITY/KENYAN
    /(?:PASSPORT[\/\s]+[A-Z\/\s]*\n?\s*)([A-Z]{3,}\s+[A-Z]{3,}(?:\s+[A-Z]{3,})?)(?:\s+\n?\s*(?:NATIONALITY|KENYAN|COUNTRY|SEX|DATE))/i,
    // Look for capitalized words that might be names (mixed case)
    /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/,
  ];
  
  for (const pattern of namePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      
      // Check if it's a false positive
      const nameWords = name.toUpperCase().split(/\s+/);
      const isFalsePositive = nameWords.some(word => 
        falsePositives.includes(word) || 
        word.length < 3 ||
        /^[A-Z]{1,3}[0-9]{6,}/.test(word) // Document number pattern
      );
      
      // Validate it's a reasonable name
      if (
        !isFalsePositive &&
        name.length >= 5 &&
        name.length <= 60 &&
        /[A-Za-z]/.test(name) &&
        nameWords.length >= 2 && // At least first and last name
        nameWords.length <= 5 && // Not too many words
        !/^(REPUBLIC|GOVERNMENT|PASSPORT|KENYA|KENYAN|KEN|COUNTRY)/i.test(name)
      ) {
        result.fullName = name;
        console.log(`Found name: ${name}`);
        break;
      }
    }
  }
  
  // If no name found with patterns, try to find it between PASSPORT and NATIONALITY
  if (!result.fullName) {
    const passportIndex = normalizedText.indexOf('PASSPORT');
    const nationalityIndex = normalizedText.indexOf('NATIONALITY');
    const kenyanIndex = normalizedText.indexOf('KENYAN');
    
    if (passportIndex !== -1 && (nationalityIndex !== -1 || kenyanIndex !== -1)) {
      const start = passportIndex + 'PASSPORT'.length;
      const end = nationalityIndex !== -1 ? nationalityIndex : kenyanIndex;
      const candidateText = normalizedText.substring(start, end).trim();
      
      // Look for name-like patterns in this section
      const nameMatch = candidateText.match(/\b([A-Z]{3,}\s+[A-Z]{3,}(?:\s+[A-Z]{3,})?)\b/);
      if (nameMatch && nameMatch[1]) {
        const candidateName = nameMatch[1].trim();
        const candidateWords = candidateName.toUpperCase().split(/\s+/);
        const isFalsePositive = candidateWords.some(word => falsePositives.includes(word));
        
        if (!isFalsePositive && candidateName.length >= 5 && candidateWords.length >= 2) {
          result.fullName = candidateName;
          console.log(`Found name (between PASSPORT and NATIONALITY): ${candidateName}`);
        }
      }
    }
  }
  
  // Extract country (comprehensive patterns)
  // Common country codes (ISO 3166-1 alpha-2 and alpha-3)
  const validCountryCodes = [
    'KEN', 'KENYA', 'USA', 'US', 'UNITED STATES', 'UK', 'GB', 'UNITED KINGDOM',
    'CAN', 'CANADA', 'GER', 'DEU', 'GERMANY', 'FRA', 'FRA', 'FRANCE',
    'ESP', 'SPAIN', 'ITA', 'ITALY', 'AUS', 'AUSTRALIA', 'JPN', 'JAPAN',
    'CHN', 'CHINA', 'IND', 'INDIA', 'BRA', 'BRAZIL', 'MEX', 'MEXICO',
    'RUS', 'RUSSIA', 'KOR', 'SOUTH KOREA', 'NLD', 'NETHERLANDS', 'BEL', 'BELGIUM',
    'CHE', 'SWITZERLAND', 'AUT', 'AUSTRIA', 'SWE', 'SWEDEN', 'NOR', 'NORWAY',
    'DNK', 'DENMARK', 'FIN', 'FINLAND', 'POL', 'POLAND', 'PRT', 'PORTUGAL',
    'GRC', 'GREECE', 'TUR', 'TURKEY', 'SAU', 'SAUDI ARABIA', 'ARE', 'UAE', 'UNITED ARAB EMIRATES'
  ];
  
  const countryPatterns = [
    // After country/nationality keywords (most reliable)
    /(?:COUNTRY\s+CODE|NATIONALITY|ISSUING\s+COUNTRY|COUNTRY\s+OF\s+ISSUE|COUNTRY)[\s:]*([A-Z]{2,3})\b/i,
    // Look for country code after "KEN" pattern (e.g., "KEN AK1626595" - KEN is the country)
    /\b(KEN|KENYA)\b/i,
    // Country names (full names)
    /\b(USA|UNITED\s+STATES|UK|UNITED\s+KINGDOM|CANADA|GERMANY|FRANCE|SPAIN|ITALY|AUSTRALIA|JAPAN|CHINA|INDIA|BRAZIL|MEXICO|RUSSIA|SOUTH\s+KOREA|NETHERLANDS|BELGIUM|SWITZERLAND|AUSTRIA|SWEDEN|NORWAY|DENMARK|FINLAND|POLAND|PORTUGAL|GREECE|TURKEY|SAUDI\s+ARABIA|UAE|UNITED\s+ARAB\s+EMIRATES|KENYA)\b/i,
  ];
  
  for (const pattern of countryPatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      let country = match[1].trim().toUpperCase();
      
      // Normalize country names to codes
      if (country === 'KENYA') country = 'KEN';
      if (country === 'UNITED STATES' || country === 'USA') country = 'USA';
      if (country === 'UNITED KINGDOM' || country === 'UK') country = 'UK';
      
      // Validate it's a known country code/name
      if (validCountryCodes.includes(country) || /^[A-Z]{2,3}$/.test(country)) {
        // Additional check: if it's a 3-letter code, make sure it's not a false positive
        if (country.length === 3) {
          // Check if it appears in a country-related context
          const countryIndex = normalizedText.indexOf(country);
          if (countryIndex !== -1) {
            const context = normalizedText.substring(
              Math.max(0, countryIndex - 20),
              Math.min(normalizedText.length, countryIndex + country.length + 20)
            ).toUpperCase();
            
            // Should be near country-related keywords or at the start of document
            const isCountryContext = 
              /(COUNTRY|NATIONALITY|KEN|KENYA|REPUBLIC|ISSUING)/.test(context) ||
              countryIndex < 100; // Near start of document
            
            if (isCountryContext) {
              result.country = country;
              console.log(`Found country: ${country} (context: ${context.substring(0, 40)}...)`);
              break;
            }
          }
        } else {
          result.country = country;
          console.log(`Found country: ${country}`);
          break;
        }
      }
    }
  }
  
  // Fallback: Look for "KEN" pattern which is very common in Kenyan passports
  if (!result.country && /\bKEN\b/i.test(normalizedText)) {
    result.country = 'KEN';
    console.log('Found country: KEN (fallback pattern)');
  }
  
  return result;
}

/**
 * Parse date string to YYYY-MM-DD format
 * Handles multiple date formats: DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD, DD-MMM-YYYY, DD MMM YYYY, etc.
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim().length === 0) {
    return null;
  }
  
  // Normalize OCR errors first
  let normalizedDate = normalizeOCRText(dateStr.trim());
  
  // Try DD MMM YYYY format first (e.g., "17 OCT 2001") - this is common in passports
  // This format uses spaces, so we need to handle it before removing spaces
  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];
  
  // Pattern for "DD MMM YYYY" format (spaces between components)
  const spaceSeparatedPattern = /^(\d{1,2})\s+([A-Z0-9]{3})\s+(\d{2,4})$/i;
  const spaceMatch = normalizedDate.match(spaceSeparatedPattern);
  if (spaceMatch) {
    const day = parseInt(spaceMatch[1], 10);
    let monthName = spaceMatch[2].toUpperCase();
    let year = parseInt(spaceMatch[3], 10);
    
    // Fix OCR errors in month name
    monthName = monthName
      .replace(/0CT/i, 'OCT')
      .replace(/1AN/i, 'JAN')
      .replace(/1UN/i, 'JUN')
      .replace(/1UL/i, 'JUL')
      .replace(/N0V/i, 'NOV');
    
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    
    const month = monthNames.indexOf(monthName) + 1;
    if (month > 0 && isValidDateComponents(year, month, day)) {
      console.log(`Parsed date "${dateStr}" -> "${normalizedDate}" -> ${formatDate(year, month, day)}`);
      return formatDate(year, month, day);
    }
  }
  
  // Now try other formats - remove spaces for these
  const cleanDate = normalizedDate.replace(/\s+/g, '');
  
  // Try YYYY/MM/DD or YYYY-MM-DD format
  const ymdPattern = /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/;
  const ymdMatch = cleanDate.match(ymdPattern);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    
    if (isValidDateComponents(year, month, day)) {
      return formatDate(year, month, day);
    }
  }
  
  // Try DD/MM/YYYY or MM/DD/YYYY format
  const dmyPattern = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/;
  const dmyMatch = cleanDate.match(dmyPattern);
  if (dmyMatch) {
    let part1 = parseInt(dmyMatch[1], 10);
    let part2 = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    
    // Handle 2-digit years
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    
    // Try both DD/MM/YYYY and MM/DD/YYYY
    let day: number, month: number;
    
    if (part1 > 12) {
      // Definitely DD/MM/YYYY
      day = part1;
      month = part2;
    } else if (part2 > 12) {
      // Definitely MM/DD/YYYY
      month = part1;
      day = part2;
    } else {
      // Ambiguous - try both formats
      // Try DD/MM/YYYY first (more common in international documents)
      if (isValidDateComponents(year, part2, part1)) {
        return formatDate(year, part2, part1);
      }
      // Try MM/DD/YYYY
      if (isValidDateComponents(year, part1, part2)) {
        return formatDate(year, part1, part2);
      }
      return null;
    }
    
    if (isValidDateComponents(year, month, day)) {
      return formatDate(year, month, day);
    }
  }
  
  // Try DD-MMM-YYYY format (with separators like - or .)
  const textDatePattern = /^(\d{1,2})[\/\-\.]+([A-Z0-9]{3})[\/\-\.]+(\d{2,4})$/i;
  const textDateMatch = cleanDate.match(textDatePattern);
  if (textDateMatch) {
    const day = parseInt(textDateMatch[1], 10);
    let monthName = textDateMatch[2].toUpperCase();
    let year = parseInt(textDateMatch[3], 10);
    
    // Fix OCR errors in month name
    monthName = monthName
      .replace(/0CT/i, 'OCT')
      .replace(/1AN/i, 'JAN')
      .replace(/1UN/i, 'JUN')
      .replace(/1UL/i, 'JUL')
      .replace(/N0V/i, 'NOV');
    
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    
    const month = monthNames.indexOf(monthName) + 1;
    if (month > 0 && isValidDateComponents(year, month, day)) {
      return formatDate(year, month, day);
    }
  }
  
  console.log(`Failed to parse date: "${dateStr}" (normalized: "${normalizedDate}")`);
  return null;
}

/**
 * Validate date components
 */
function isValidDateComponents(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // Check if the date is actually valid
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Format date components to YYYY-MM-DD string
 */
function formatDate(year: number, month: number, day: number): string {
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
}

/**
 * Main function to extract data from document
 */
export async function extractDocumentData(
  file: File,
  documentType: DocumentType
): Promise<ExtractedData> {
  // Extract text using OCR
  const text = await extractTextFromImage(file);
  
  // Log raw text for debugging
  console.log('=== OCR DEBUG INFO ===');
  console.log('Raw OCR Text:', text);
  console.log('Text Length:', text.length);
  console.log('Document Type:', documentType);
  
  // Parse the extracted text
  const parsed = parseDocumentData(text, documentType);
  
  // Log parsed data for debugging
  console.log('Parsed Data:', parsed);
  console.log('====================');
  
  // Validate required fields with helpful error messages
  if (!parsed.birthdate) {
    // Try to find any dates in the text to help debug
    const allDates = extractAllDates(text);
    const preprocessedText = preprocessText(text);
    const allDatesPreprocessed = extractAllDates(preprocessedText);
    
    // Try to parse all found dates
    const parsedDates: string[] = [];
    for (const dateStr of [...allDates, ...allDatesPreprocessed]) {
      const parsed = parseDate(dateStr);
      if (parsed) {
        parsedDates.push(`${dateStr} -> ${parsed}`);
      } else {
        parsedDates.push(`${dateStr} -> (could not parse)`);
      }
    }
    
    // Build detailed error message
    let errorMessage = 'Could not extract birthdate from document.\n\n';
    errorMessage += `OCR extracted ${text.length} characters of text.\n`;
    
    if (allDates.length > 0 || allDatesPreprocessed.length > 0) {
      errorMessage += `Found ${allDates.length + allDatesPreprocessed.length} potential date(s):\n`;
      parsedDates.forEach((d, i) => {
        errorMessage += `  ${i + 1}. ${d}\n`;
      });
      errorMessage += '\nThese dates were found but did not pass validation (must be between 1900 and today).\n';
    } else {
      errorMessage += 'No dates were found in the extracted text.\n';
    }
    
    errorMessage += '\nPlease check:\n';
    errorMessage += '1. The document image is clear and in focus\n';
    errorMessage += '2. The birthdate field is clearly visible\n';
    errorMessage += '3. The text is not rotated or skewed\n';
    errorMessage += '4. The image has sufficient resolution\n';
    errorMessage += '\nCheck the browser console for the full OCR text output.';
    

    console.error('Full OCR Text (for debugging):', text);
    console.error('All found dates:', allDates);
    
    throw new Error(errorMessage);
  }
  
  if (!parsed.documentNumber) {
    // Try to find potential document numbers
    const potentialNumbers: string[] = [];
    const normalizedText = preprocessText(text).toUpperCase();
    
    // Look for alphanumeric sequences
    const numberPatterns = [
      /\b([A-Z]{1,3}[0-9]{6,15})\b/g,
      /\b([0-9]{8,15})\b/g,
    ];
    
    for (const pattern of numberPatterns) {
      const matches = normalizedText.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length >= 6) {
          potentialNumbers.push(match[1]);
        }
      }
    }
    
    let errorMessage = 'Could not extract document number from document.\n\n';
    if (potentialNumbers.length > 0) {
      errorMessage += `Found ${potentialNumbers.length} potential document number(s):\n`;
      potentialNumbers.forEach((num, i) => {
        errorMessage += `  ${i + 1}. ${num}\n`;
      });
      errorMessage += '\nThese were found but did not match expected patterns.\n';
    } else {
      errorMessage += 'No potential document numbers were found.\n';
    }
    
    errorMessage += '\nPlease ensure the document number is clearly visible.';
    errorMessage += '\nCheck the browser console for the full OCR text output.';
    
    console.error('Potential document numbers found:', potentialNumbers);
    
    throw new Error(errorMessage);
  }
  
  return {
    birthdate: parsed.birthdate,
    documentNumber: parsed.documentNumber,
    documentType,
    fullName: parsed.fullName,
    country: parsed.country,
  };
}