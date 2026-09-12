export interface IdGeneratorConfig {
  prefix: string;
  includeYear: boolean;
  year: string;
  separator: '-' | '/' | '.' | '';
  numberLength: number;
  sequenceNumber: number;
}

export function generateFormattedId(config: IdGeneratorConfig): string {
  const parts: string[] = [];
  
  if (config.prefix.trim()) {
    parts.push(config.prefix.trim().toUpperCase());
  }

  if (config.includeYear && config.year) {
    parts.push(config.year.trim());
  }

  const paddedNum = String(config.sequenceNumber).padStart(config.numberLength, '0');
  parts.push(paddedNum);

  return parts.join(config.separator);
}

export function getRandomId(prefix: string = 'EMP'): string {
  const year = new Date().getFullYear().toString();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix.toUpperCase()}-${year}-${randomNum}`;
}
