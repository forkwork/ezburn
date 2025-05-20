export type Platform = 'browser' | 'node' | 'neutral';
export type Format = 'iife' | 'cjs' | 'esm';
export type Loader = 'base64' | 'binary' | 'copy' | 'css' | 'dataurl' | 'default' | 'empty' | 'file' | 'js' | 'json' | 'jsx' | 'local-css' | 'text' | 'ts' | 'tsx';
export type LogLevel = 'verbose' | 'debug' | 'info' | 'warning' | 'error' | 'silent';
export type Charset = 'ascii' | 'utf8';
export type Drop = 'console' | 'debugger';

interface CommonOptions {
  sourcemap?: boolean | 'linked' | 'inline' | 'external' | 'both';
  legalComments?: 'none' | 'inline' | 'eof' | 'linked' | 'external';
  sourceRoot?: string;
  sourcesContent?: boolean;

  format?: Format;
  globalName?: string;
  target?: string | string[];
  supported?: Record<string, boolean>;
  platform?: Platform;

  mangleProps?: RegExp;
  reserveProps?: RegExp;
  mangleQuoted?: boolean;
  mangleCache?: Record<string, string | false>;
  drop?: Drop[];
  dropLabels?: string[];
  minify?: boolean;
  minifyWhitespace?: boolean;
  minifyIdentifiers?: boolean;
  minifySyntax?: boolean;
  lineLimit?: number;
  charset?: Charset;
  treeShaking?: boolean;
  ignoreAnnotations?: boolean;

  jsx?: 'transform' | 'preserve' | 'automatic';
  jsxFactory?: string;
  jsxFragment?: string;
  jsxImportSource?: string;
  jsxDev?: boolean;
  jsxSideEffects?: boolean;

  define?: { [key: string]: string };
  pure?: string[];
  keepNames?: boolean;

  color?: boolean;
  logLevel?: LogLevel;
  logLimit?: number;
  logOverride?: Record<string, LogLevel>;

  tsconfigRaw?: string | TsconfigRaw;
}

export interface TsconfigRaw {
  compilerOptions?: {
    alwaysStrict?: boolean;
    baseUrl?: string;
    experimentalDecorators?: boolean;
    importsNotUsedAsValues?: 'remove' | 'preserve' | 'error';
    jsx?: 'preserve' | 'react-native' | 'react' | 'react-jsx' | 'react-jsxdev';
    jsxFactory?: string;
    jsxFragmentFactory?: string;
    jsxImportSource?: string;
    paths?: Record<string, string[]>;
    preserveValueImports?: boolean;
    strict?: boolean;
    target?: string;
    useDefineForClassFields?: boolean;
    verbatimModuleSyntax?: boolean;
  };
}

export interface BuildOptions extends CommonOptions {
  bundle?: boolean;
  splitting?: boolean;
  preserveSymlinks?: boolean;
  outfile?: string;
  metafile?: boolean;
  outdir?: string;
  outbase?: string;
  external?: string[];
  packages?: 'bundle' | 'external';
  alias?: Record<string, string>;
  loader?: { [ext: string]: Loader };
  resolveExtensions?: string[];
  mainFields?: string[];
  conditions?: string[];
  write?: boolean;
  allowOverwrite?: boolean;
  tsconfig?: string;
  outExtension?: { [ext: string]: string };
  publicPath?: string;
  entryNames?: string;
  chunkNames?: string;
  assetNames?: string;
  inject?: string[];
  banner?: { [type: string]: string };
  footer?: { [type: string]: string };
  entryPoints?: string[] | Record<string, string> | { in: string; out: string }[];
  stdin?: StdinOptions;
  plugins?: Plugin[];
  absWorkingDir?: string;
  nodePaths?: string[];
}

export interface StdinOptions {
  contents: string | Uint8Array;
  resolveDir?: string;
  sourcefile?: string;
  loader?: Loader;
}

export interface Message {
  id: string;
  pluginName: string;
  text: string;
  location: Location | null;
  notes: Note[];
  detail: any;
}

export interface Note {
  text: string;
  location: Location | null;
}

export interface Location {
  file: string;
  namespace: string;
  line: number;
  column: number;
  length: number;
  lineText: string;
  suggestion: string;
}

export interface OutputFile {
  path: string;
  contents: Uint8Array;
  hash: string;
  readonly text: string;
}

export interface BuildResult<ProvidedOptions extends BuildOptions = BuildOptions> {
  errors: Message[];
  warnings: Message[];
  outputFiles: OutputFile[] | (ProvidedOptions['write'] extends false ? never : undefined);
  metafile: Metafile | (ProvidedOptions['metafile'] extends true ? never : undefined);
  mangleCache: Record<string, string | false> | (ProvidedOptions['mangleCache'] extends Object ? never : undefined);
}

export interface BuildFailure extends Error {
  errors: Message[];
  warnings: Message[];
}

export interface ServeOptions {
  port?: number;
  host?: string;
  servedir?: string;
  keyfile?: string;
  certfile?: string;
  fallback?: string;
  onRequest?: (args: ServeOnRequestArgs) => void;
}

export interface ServeOnRequestArgs {
  remoteAddress: string;
  method: string;
  path: string;
  status: number;
  timeInMS: number;
}

export interface ServeResult {
  port: number;
  hosts: string[];
}

export interface TransformOptions extends CommonOptions {
  sourcefile?: string;
  loader?: Loader;
  banner?: string;
  footer?: string;
}

export interface TransformResult<ProvidedOptions extends TransformOptions = TransformOptions> {
  code: string;
  map: string;
  warnings: Message[];
  mangleCache: Record<string, string | false> | (ProvidedOptions['mangleCache'] extends Object ? never : undefined);
  legalComments: string | (ProvidedOptions['legalComments'] extends 'external' ? never : undefined);
}

export interface TransformFailure extends Error {
  errors: Message[];
  warnings: Message[];
}

export interface Plugin {
  name: string;
  setup: (build: PluginBuild) => void | Promise<void>;
}

export interface PluginBuild {
  initialOptions: BuildOptions;
  resolve(path: string, options?: ResolveOptions): Promise<ResolveResult>;
  onStart(callback: () => OnStartResult | null | void | Promise<OnStartResult | null | void>): void;
  onEnd(callback: (result: BuildResult) => OnEndResult | null | void | Promise<OnEndResult | null | void>): void;
  onResolve(options: OnResolveOptions, callback: (args: OnResolveArgs) => OnResolveResult | null | undefined | Promise<OnResolveResult | null | undefined>): void;
  onLoad(options: OnLoadOptions, callback: (args: OnLoadArgs) => OnLoadResult | null | undefined | Promise<OnLoadResult | null | undefined>): void;
  onDispose(callback: () => void): void;
}

export interface ResolveOptions {
  pluginName?: string;
  importer?: string;
  namespace?: string;
  resolveDir?: string;
  kind?: ImportKind;
  pluginData?: any;
  with?: Record<string, string>;
}

export interface ResolveResult {
  errors: Message[];
  warnings: Message[];
  path: string;
  external: boolean;
  sideEffects: boolean;
  namespace: string;
  suffix: string;
  pluginData: any;
}

export interface OnStartResult {
  errors?: PartialMessage[];
  warnings?: PartialMessage[];
}

export interface OnEndResult {
  errors?: PartialMessage[];
  warnings?: PartialMessage[];
}

export interface OnResolveOptions {
  filter: RegExp;
  namespace?: string;
}

export interface OnResolveArgs {
  path: string;
  importer: string;
  namespace: string;
  resolveDir: string;
  kind: ImportKind;
  pluginData: any;
  with: Record<string, string>;
}

export type ImportKind =
  | 'entry-point'
  | 'import-statement'
  | 'require-call'
  | 'dynamic-import'
  | 'require-resolve'
  | 'import-rule'
  | 'composes-from'
  | 'url-token';

export interface OnResolveResult {
  pluginName?: string;
  errors?: PartialMessage[];
  warnings?: PartialMessage[];
  path?: string;
  external?: boolean;
  sideEffects?: boolean;
  namespace?: string;
  suffix?: string;
  pluginData?: any;
  watchFiles?: string[];
  watchDirs?: string[];
}

export interface OnLoadOptions {
  filter: RegExp;
  namespace?: string;
}

export interface OnLoadArgs {
  path: string;
  namespace: string;
  suffix: string;
  pluginData: any;
  with: Record<string, string>;
}

export interface OnLoadResult {
  pluginName?: string;
  errors?: PartialMessage[];
  warnings?: PartialMessage[];
  contents?: string | Uint8Array;
  resolveDir?: string;
  loader?: Loader;
  pluginData?: any;
  watchFiles?: string[];
  watchDirs?: string[];
}

export interface PartialMessage {
  id?: string;
  pluginName?: string;
  text?: string;
  location?: Partial<Location> | null;
  notes?: PartialNote[];
  detail?: any;
}

export interface PartialNote {
  text?: string;
  location?: Partial<Location> | null;
}

export interface Metafile {
  inputs: {
    [path: string]: {
      bytes: number;
      imports: {
        path: string;
        kind: ImportKind;
        external?: boolean;
        original?: string;
        with?: Record<string, string>;
      }[];
      format?: 'cjs' | 'esm';
      with?: Record<string, string>;
    };
  };
  outputs: {
    [path: string]: {
      bytes: number;
      inputs: {
        [path: string]: {
          bytesInOutput: number;
        };
      };
      imports: {
        path: string;
        kind: ImportKind | 'file-loader';
        external?: boolean;
      }[];
      exports: string[];
      entryPoint?: string;
      cssBundle?: string;
    };
  };
}

export interface FormatMessagesOptions {
  kind: 'error' | 'warning';
  color?: boolean;
  terminalWidth?: number;
}

export interface AnalyzeMetafileOptions {
  color?: boolean;
  verbose?: boolean;
}

export interface WatchOptions {}

export interface BuildContext<ProvidedOptions extends BuildOptions = BuildOptions> {
  rebuild(): Promise<BuildResult<ProvidedOptions>>;
  watch(options?: WatchOptions): Promise<void>;
  serve(options?: ServeOptions): Promise<ServeResult>;
  cancel(): Promise<void>;
  dispose(): Promise<void>;
}

type SameShape<Out, In extends Out> = In & { [Key in Exclude<keyof In, keyof Out>]: never };

export declare function build<T extends BuildOptions>(options: SameShape<BuildOptions, T>): Promise<BuildResult<T>>;
export declare function context<T extends BuildOptions>(options: SameShape<BuildOptions, T>): Promise<BuildContext<T>>;
export declare function transform<T extends TransformOptions>(input: string | Uint8Array, options?: SameShape<TransformOptions, T>): Promise<TransformResult<T>>;
export declare function formatMessages(messages: PartialMessage[], options: FormatMessagesOptions): Promise<string[]>;
export declare function analyzeMetafile(metafile: Metafile | string, options?: AnalyzeMetafileOptions): Promise<string>;
export declare function buildSync<T extends BuildOptions>(options: SameShape<BuildOptions, T>): BuildResult<T>;
export declare function transformSync<T extends TransformOptions>(input: string | Uint8Array, options?: SameShape<TransformOptions, T>): TransformResult<T>;
export declare function formatMessagesSync(messages: PartialMessage[], options: FormatMessagesOptions): string[];
export declare function analyzeMetafileSync(metafile: Metafile | string, options?: AnalyzeMetafileOptions): string;
export declare function initialize(options: InitializeOptions): Promise<void>;

export interface InitializeOptions {
  wasmURL?: string | URL;
  wasmModule?: WebAssembly.Module;
  worker?: boolean;
}

export declare function stop(): Promise<void>; 