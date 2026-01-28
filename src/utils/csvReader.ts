import fs from 'fs';
import Papa from 'papaparse';

export function parseCsvFile<T = Record<string, string>>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(filePath);
    Papa.parse(input, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<T>) => resolve(results.data as T[]),
      error: (err) => reject(err)
    });
  });
}
