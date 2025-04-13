declare namespace Deno {
  export interface Command {
    spawn(): {
      stdin: { getWriter(): { write(bytes: Uint8Array): Promise<void>; close(): Promise<void> } };
      stdout: { getReader(): { read(): Promise<{ value: Uint8Array | null }>; cancel(): Promise<void> } };
      status: Promise<{ code: number }>;
    };
  }

  export class CommandConstructor {
    constructor(cmd: string, options: {
      args: string[];
      cwd?: string;
      stdin?: 'piped' | 'inherit';
      stdout?: 'piped' | 'inherit';
      stderr?: 'inherit';
    });
    spawn(): Command['spawn'] extends (...args: any[]) => infer R ? R : never;
  }

  export const Command: typeof CommandConstructor;

  export interface RunOptions {
    cmd: string[];
    cwd?: string;
    stdin?: 'piped' | 'inherit';
    stdout?: 'piped' | 'inherit';
    stderr?: 'inherit';
  }

  export interface Process {
    stdin: {
      write(data: Uint8Array): Promise<number>;
      close(): void;
    };
    stdout: {
      read(p: Uint8Array): Promise<number | null>;
      close(): void;
    };
    status(): Promise<{ code: number }>;
    close(): void;
  }

  export function run(options: RunOptions): Process;

  export function readFile(path: string): Promise<Uint8Array>;
  export function writeFile(path: string, data: Uint8Array, options?: { mode?: number }): Promise<void>;
  export function makeTempFile(): Promise<string>;
  export function remove(path: string): Promise<void>;
  export function stat(path: string): Promise<unknown>;
  export function mkdir(path: string, options?: { recursive?: boolean; mode?: number }): Promise<void>;
  export function cwd(): string;
  export function exit(code: number): never;

  export const env: {
    get(key: string): string | undefined;
  };

  export const stderr: {
    rid: number;
    isTerminal?: () => boolean;
  };

  export function isatty(rid: number): boolean;

  export const build: {
    os: string;
    target: string;
  };

  export const errors: {
    Interrupted: { new(): Error };
    BadResource: { new(): Error };
  };

  export const args: string[];
}

// Global type declarations
interface ImportMeta {
  main: boolean;
  url: string;
}

interface Buffer extends Uint8Array {
  toString(encoding?: string): string;
}

declare var Buffer: {
  from(text: string): Buffer;
  from(buffer: ArrayBuffer | Uint8Array, byteOffset?: number, byteLength?: number): Buffer;
  concat(chunks: Buffer[]): Buffer;
  of(...args: number[]): Buffer;
};

declare module "https://deno.land/x/denoflate@1.2.1/mod.ts" {
  export function gunzip(data: Uint8Array): Uint8Array;
} 