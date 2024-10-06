type Token = {
  type: 'dot' | 'class' | 'literal' | 'group' | 'alternation' | 'quantifier';
  value?: string | Token[];
};

/**
 * Returns a random character from the given character set.
 *
 * @param charset - An array of characters to select from.
 * @returns A single random character from the charset.
 */
const getRandomCharFromCharset = (charset: string[]): string => {
  const randomIndex = Math.floor(Math.random() * charset.length);
  return charset[randomIndex];
};

/**
 * Expands a character class like `[a-z]` or predefined classes like `\d` into an array of possible characters.
 *
 * @param charClass - The character class to expand.
 * @returns An array of characters that the character class represents.
 */
const expandCharacterClass = (charClass: string): string[] => {
  const charsets: { [key: string]: string } = {
    '\\d': '0123456789',
    '\\w': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
    '\\s': ' \t\r\n',
  };
  if (charsets[charClass]) return charsets[charClass].split('');

  const match = charClass.match(/^\[(.*?)\]$/);
  if (match) {
    const expandedCharset: string[] = [];
    const content = match[1];

    let i = 0;
    while (i < content.length) {
      if (i + 2 < content.length && content[i + 1] === '-') {
        const start = content[i];
        const end = content[i + 2];
        for (let c = start.charCodeAt(0); c <= end.charCodeAt(0); c++) {
          expandedCharset.push(String.fromCharCode(c));
        }
        i += 3;
      } else {
        expandedCharset.push(content[i]);
        i++;
      }
    }
    return expandedCharset;
  }

  return [charClass];
};

/**
 * Parses a regex pattern into a list of tokens for easier processing.
 *
 * @param regex - The regex pattern to parse.
 * @returns An array of tokens parsed from the regex pattern.
 */
const parseRegex = (regex: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;

  while (i < regex.length) {
    const char = regex[i];

    switch (char) {
      case '^':
      case '$':
        i++;
        break;

      case '.':
        tokens.push({ type: 'dot' });
        i++;
        break;

      case '\\':
        const nextChar = regex[i + 1];
        if (nextChar === 'd' || nextChar === 'w' || nextChar === 's') {
          tokens.push({ type: 'class', value: `\\${nextChar}` });
          i += 2;
        } else {
          tokens.push({ type: 'literal', value: nextChar });
          i += 2;
        }
        break;

      case '[':
        const endIndex = regex.indexOf(']', i);
        if (endIndex === -1) throw new Error('Unterminated character class');
        const charClass = regex.substring(i, endIndex + 1);
        tokens.push({ type: 'class', value: charClass });
        i = endIndex + 1;
        break;

      case '(':
        const groupEnd = regex.indexOf(')', i);
        if (groupEnd === -1) throw new Error('Unterminated group');
        const groupContent = regex.substring(i + 1, groupEnd);
        tokens.push({ type: 'group', value: parseRegex(groupContent) });
        i = groupEnd + 1;
        break;

      case '|':
        tokens.push({ type: 'alternation' });
        i++;
        break;

      case '*':
      case '+':
      case '?':
        tokens.push({ type: 'quantifier', value: char });
        i++;
        break;

      case '{':
        const quantifierEnd = regex.indexOf('}', i);
        if (quantifierEnd === -1) throw new Error('Unterminated quantifier');
        const quantifier = regex.substring(i + 1, quantifierEnd);
        const quantifierParts = quantifier.split(',');

        const min = parseInt(quantifierParts[0], 10);
        const max = quantifierParts.length > 1 ? parseInt(quantifierParts[1], 10) : min;

        if (isNaN(min) || (quantifierParts.length > 1 && isNaN(max))) {
          throw new Error('Invalid quantifier format');
        }

        tokens.push({ type: 'quantifier', value: `{${min},${max}}` });
        i = quantifierEnd + 1;
        break;

      default:
        tokens.push({ type: 'literal', value: char });
        i++;
        break;
    }
  }

  return tokens;
};

/**
 * Generates a random string based on a list of parsed regex tokens.
 *
 * @param tokens - The array of tokens to generate a string from.
 * @returns A string that matches the regex pattern represented by the tokens.
 */
const generateFromTokens = (tokens: Token[]): string => {
  let result = '';
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    switch (token.type) {
      case 'dot':
        result += getRandomCharFromCharset(
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
        );
        i++;
        break;

      case 'class':
        const charset = expandCharacterClass(token.value as string);
        let repeatCount = 1;

        if (tokens[i + 1] && tokens[i + 1].type === 'quantifier') {
          const quantifierToken = tokens[i + 1];
          if (quantifierToken.value === '*') {
            repeatCount = Math.floor(Math.random() * 5);
          } else if (quantifierToken.value === '+') {
            repeatCount = Math.floor(Math.random() * 5) + 1;
          } else if (quantifierToken.value === '?') {
            repeatCount = Math.random() > 0.5 ? 1 : 0;
          } else if (
            typeof quantifierToken.value === 'string' &&
            quantifierToken.value.startsWith('{')
          ) {
            const quantifierMatch = quantifierToken.value.match(/{(\d+),(\d+)?}/);
            const min = parseInt(quantifierMatch![1], 10);
            const max = quantifierMatch![2] ? parseInt(quantifierMatch![2], 10) : min;
            repeatCount = Math.floor(Math.random() * (max - min + 1)) + min;
          }
          i++;
        }

        for (let j = 0; j < repeatCount; j++) {
          result += getRandomCharFromCharset(charset);
        }

        i++;
        break;

      case 'literal':
        result += token.value;
        i++;
        break;

      case 'group':
        result += generateFromTokens(token.value as Token[]);
        i++;
        break;

      case 'alternation':
        const options: Token[][] = [];
        let j = i + 1;
        let currentOption: Token[] = [];
        while (j < tokens.length && tokens[j].type !== 'alternation') {
          currentOption.push(tokens[j]);
          j++;
        }
        options.push(currentOption);
        result += generateFromTokens(options[Math.floor(Math.random() * options.length)]);
        i = j;
        break;

      default:
        throw new Error('Unknown token type');
    }
  }

  return result;
};

/**
 * Generates a random string based on the given regex pattern.
 *
 * @param regex - A string or RegExp object representing the regex pattern.
 * @returns A string that matches the given regex pattern.
 */
export const randString = (regex: string | RegExp): string => {
  // If input is a RegExp, extract its source pattern as a string
  const pattern = typeof regex === 'string' ? regex : regex.source;

  const tokens = parseRegex(pattern);
  return generateFromTokens(tokens);
};
