// lib/utils/numberParser.ts - Convert spoken numbers to digits

/**
 * Word-to-number mapping
 */
const WORD_TO_NUMBER: Record<string, number> = {
  // Basic numbers
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
  'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
  'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
  'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
  'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
  'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
  
  // Hundreds
  'hundred': 100, 'thousand': 1000,
  
  // Common alternatives
  'a': 1, 'an': 1,
  'couple': 2, 'few': 3,
  'dozen': 12, 'score': 20
};

/**
 * Parse spoken number from text
 * Handles: "two", "twenty three", "2", "23", "twenty-three"
 */
export function parseSpokenNumber(text: string): number | null {
  if (!text) return null;
  
  const cleanText = text.toLowerCase().trim();
  
  // Try direct digit parsing first (e.g., "23")
  const directNumber = parseInt(cleanText);
  if (!isNaN(directNumber)) {
    return directNumber;
  }
  
  // Try single word lookup (e.g., "two")
  if (WORD_TO_NUMBER[cleanText] !== undefined) {
    return WORD_TO_NUMBER[cleanText];
  }
  
  // Handle compound numbers (e.g., "twenty three", "twenty-three")
  const words = cleanText.split(/[\s-]+/);
  
  if (words.length === 1) {
    return WORD_TO_NUMBER[words[0]] ?? null;
  }
  
  // Parse multi-word numbers
  let total = 0;
  let current = 0;
  
  for (const word of words) {
    const value = WORD_TO_NUMBER[word];
    
    if (value === undefined) {
      // Not a number word, might be a digit
      const digit = parseInt(word);
      if (!isNaN(digit)) {
        current += digit;
      } else {
        // Unknown word, skip it
        continue;
      }
    } else if (value >= 100) {
      // Multiplier (hundred, thousand)
      if (current === 0) current = 1;
      current *= value;
    } else {
      // Regular number
      current += value;
    }
  }
  
  total += current;
  
  return total > 0 ? total : null;
}

/**
 * Extract first number from text
 * Example: "there are twenty three students" → 23
 */
export function extractNumber(text: string): number | null {
  if (!text) return null;
  
  const cleanText = text.toLowerCase().trim();
  
  // Try to find digits first
  const digitMatch = cleanText.match(/\d+/);
  if (digitMatch) {
    return parseInt(digitMatch[0]);
  }
  
  // Split into words and try to find number words
  const words = cleanText.split(/\s+/);
  
  // Look for sequences of number words
  let i = 0;
  while (i < words.length) {
    const word = words[i];
    
    if (WORD_TO_NUMBER[word] !== undefined) {
      // Found a number word, collect consecutive number words
      const numberWords: string[] = [];
      while (i < words.length && WORD_TO_NUMBER[words[i]] !== undefined) {
        numberWords.push(words[i]);
        i++;
      }
      
      // Parse the collected number words
      const number = parseSpokenNumber(numberWords.join(' '));
      if (number !== null) {
        return number;
      }
    }
    
    i++;
  }
  
  return null;
}

/**
 * Smart number parser - tries multiple strategies
 */
export function smartParseNumber(text: string): number | null {
  if (!text) return null;
  
  // Strategy 1: Extract any number from the text
  const extracted = extractNumber(text);
  if (extracted !== null) {
    return extracted;
  }
  
  // Strategy 2: Parse the entire text as a number
  const parsed = parseSpokenNumber(text);
  if (parsed !== null) {
    return parsed;
  }
  
  return null;
}

/**
 * Test if text contains a valid number
 */
export function containsNumber(text: string): boolean {
  return extractNumber(text) !== null;
}