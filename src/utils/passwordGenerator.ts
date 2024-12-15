// List of Serbian words that can be used for passwords
const serbianWords = [
  'sunce', 'mesec', 'zvezda', 'nebo', 'zemlja',
  'voda', 'vatra', 'vetar', 'suma', 'planina',
  'reka', 'more', 'jezero', 'kisa', 'sneg',
  'cvet', 'drvo', 'trava', 'ptica', 'riba',
  'macka', 'pas', 'konj', 'leptir', 'pcela'
];

// Generate a random number between 100 and 999
const getRandomNumber = () => Math.floor(Math.random() * 900 + 100);

export const generateSerbianPassword = (): string => {
  const randomWord = serbianWords[Math.floor(Math.random() * serbianWords.length)];
  const number = getRandomNumber();
  // Capitalize first letter and add random number
  return randomWord.charAt(0).toUpperCase() + randomWord.slice(1) + number;
};
