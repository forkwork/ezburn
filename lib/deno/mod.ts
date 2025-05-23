import type * as types from "../shared/types"
import * as common from "../shared/common"
import * as ourselves from "./mod"
import * as denoflate from "https://deno.land/x/denoflate@1.2.1/mod.ts"

declare const EZBURN_VERSION: string

export let version = EZBURN_VERSION

export let build: typeof types.build = (options: types.BuildOptions) =>
  ensureServiceIsRunning().then(service =>
    service.build(options))

export const context: typeof types.context = (options: types.BuildOptions) =>
  ensureServiceIsRunning().then(service =>
    service.context(options))

export const transform: typeof types.transform = (input: string | Uint8Array, options?: types.TransformOptions) =>
  ensureServiceIsRunning().then(service =>
    service.transform(input, options))

export const formatMessages: typeof types.formatMessages = (messages, options) =>
  ensureServiceIsRunning().then(service =>
    service.formatMessages(messages, options))

export const analyzeMetafile: typeof types.analyzeMetafile = (metafile, options) =>
  ensureServiceIsRunning().then(service =>
    service.analyzeMetafile(metafile, options))

export const buildSync: typeof types.buildSync = () => {
  throw new Error(`The "buildSync" API does not work in Deno`)
}

export const transformSync: typeof types.transformSync = () => {
  throw new Error(`The "transformSync" API does not work in Deno`)
}

export const formatMessagesSync: typeof types.formatMessagesSync = () => {
  throw new Error(`The "formatMessagesSync" API does not work in Deno`)
}

export const analyzeMetafileSync: typeof types.analyzeMetafileSync = () => {
  throw new Error(`The "analyzeMetafileSync" API does not work in Deno`)
}

export const stop = async () => {
  if (stopService) await stopService()
}

let initializeWasCalled = false

export const initialize: typeof types.initialize = async (options) => {
  options = common.validateInitializeOptions(options || {})
  if (options.wasmURL) throw new Error(`The "wasmURL" option only works in the browser`)
  if (options.wasmModule) throw new Error(`The "wasmModule" option only works in the browser`)
  if (options.worker) throw new Error(`The "worker" option only works in the browser`)
  if (initializeWasCalled) throw new Error('Cannot call "initialize" more than once')
  await ensureServiceIsRunning()
  initializeWasCalled = true
}

async function installFromNPM(name: string, subpath: string): Promise<string> {
  const { finalPath, finalDir } = getCachePath(name)
  try {
    await Deno.stat(finalPath)
    return finalPath
  } catch (e) {
  }

  const npmRegistry = Deno.env.get("NPM_CONFIG_REGISTRY") || "https://registry.npmjs.org"
  const url = `${npmRegistry}/${name}/-/${name.replace("@ezburn/", "")}-${version}.tgz`
  const buffer = await fetch(url).then(r => r.arrayBuffer())
  const executable = extractFileFromTarGzip(new Uint8Array(buffer), subpath)

  await Deno.mkdir(finalDir, {
    recursive: true,
    mode: 0o700, // https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
  })

  await Deno.writeFile(finalPath, executable, { mode: 0o755 })
  return finalPath
}

function getCachePath(name: string): { finalPath: string, finalDir: string } {
  let baseDir: string | undefined

  switch (Deno.build.os) {
    case 'darwin':
      baseDir = Deno.env.get('HOME')
      if (baseDir) baseDir += '/Library/Caches'
      break

    case 'windows':
      baseDir = Deno.env.get('LOCALAPPDATA')
      if (!baseDir) {
        baseDir = Deno.env.get('USERPROFILE')
        if (baseDir) baseDir += '/AppData/Local'
      }
      if (baseDir) baseDir += '/Cache'
      break

    case 'linux':
      // https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
      const xdg = Deno.env.get('XDG_CACHE_HOME')
      if (xdg && xdg[0] === '/') baseDir = xdg
      break
  }

  if (!baseDir) {
    baseDir = Deno.env.get('HOME')
    if (baseDir) baseDir += '/.cache'
  }

  if (!baseDir) throw new Error('Failed to find cache directory')
  const finalDir = baseDir + `/ezburn/bin`
  const finalPath = finalDir + `/${name.replace('/', '-')}@${version}`
  return { finalPath, finalDir }
}

function extractFileFromTarGzip(buffer: Uint8Array, file: string): Uint8Array {
  try {
    buffer = denoflate.gunzip(buffer)
  } catch (err: any) {
    throw new Error(`Invalid gzip data in archive: ${err && err.message || err}`)
  }
  let str = (i: number, n: number) => String.fromCharCode(...buffer.subarray(i, i + n)).replace(/\0.*$/, '')
  let offset = 0
  file = `package/${file}`
  while (offset < buffer.length) {
    let name = str(offset, 100)
    let size = parseInt(str(offset + 124, 12), 8)
    offset += 512
    if (!isNaN(size)) {
      if (name === file) return buffer.subarray(offset, offset + size)
      offset += (size + 511) & ~511
    }
  }
  throw new Error(`Could not find ${JSON.stringify(file)} in archive`)
}

async function install(): Promise<string> {
  const overridePath = Deno.env.get('EZBURN_BINARY_PATH')
  if (overridePath) return overridePath

  const platformKey = Deno.build.target
  const knownWindowsPackages: Record<string, string> = {
    'x86_64-pc-windows-msvc': '@ezburn/win32-x64',
  }
  const knownUnixlikePackages: Record<string, string> = {
    // These are the only platforms that Deno supports
    'aarch64-apple-darwin': '@ezburn/darwin-arm64',
    'aarch64-unknown-linux-gnu': '@ezburn/linux-arm64',
    'x86_64-apple-darwin': '@ezburn/darwin-x64',
    'x86_64-unknown-linux-gnu': '@ezburn/linux-x64',

    // These platforms are not supported by Deno
    'aarch64-linux-android': '@ezburn/android-arm64',
    'x86_64-unknown-freebsd': '@ezburn/freebsd-x64',
    "x86_64-alpine-linux-musl": '@ezburn/linux-x64',
  }

  // Pick a package to install
  if (platformKey in knownWindowsPackages) {
    return await installFromNPM(knownWindowsPackages[platformKey], 'ezburn.exe')
  } else if (platformKey in knownUnixlikePackages) {
    return await installFromNPM(knownUnixlikePackages[platformKey], 'bin/ezburn')
  } else {
    throw new Error(`Unsupported platform: ${platformKey}`)
  }
}

interface Service {
  build: typeof types.build
  context: typeof types.context
  transform: typeof types.transform
  formatMessages: typeof types.formatMessages
  analyzeMetafile: typeof types.analyzeMetafile
}

let defaultWD = Deno.cwd()
let longLivedService: Promise<Service> | undefined
let stopService: (() => Promise<void>) | undefined

// Declare a common subprocess API for the two implementations below
type SpawnFn = (cmd: string, options: {
  args: string[]
  stdin: 'piped' | 'inherit'
  stdout: 'piped' | 'inherit'
  stderr: 'inherit'
}) => {
  write(bytes: Uint8Array): void
  read(): Promise<Uint8Array | null>
  close(): Promise<void> | void
  status(): Promise<{ code: number }>
}

// Deno ≥1.40
const spawnNew: SpawnFn = (cmd, { args, stdin, stdout, stderr }) => {
  const child = new Deno.Command(cmd, {
    args,
    cwd: defaultWD,
    stdin,
    stdout,
    stderr,
  }).spawn()
  // If any stdio options are not set to "piped", accessing the corresponding field on the Command or its CommandOutput will throw a TypeError.
  const writer = stdin === "piped" ? child.stdin.getWriter() : null;
  const reader = stdout === "piped" ? child.stdout.getReader() : null;
  return {
    write(bytes) {
      if (writer === null) throw new Error("stdin is not piped");
      return writer.write(bytes);
    },
    async read() {
      if (reader === null) throw new Error("stdout is not piped");
      const result = await reader.read();
      return result.value;
    },
    async close() {
      await writer?.close();
      await reader?.cancel();
      await child.status;
    },
    status: () => child.status,
  }
}

// Deno <1.40
const spawnOld: SpawnFn = (cmd, { args, stdin, stdout, stderr }) => {
  const child = Deno.run({
    cmd: [cmd].concat(args),
    cwd: defaultWD,
    stdin,
    stdout,
    stderr,
  })
  const stdoutBuffer = new Uint8Array(4 * 1024 * 1024)
  let writeQueue: Uint8Array[] = []
  let isQueueLocked = false

  // We need to keep calling "write()" until it actually writes the data
  const startWriteFromQueueWorker = () => {
    if (isQueueLocked || writeQueue.length === 0) return
    isQueueLocked = true
    child.stdin!.write(writeQueue[0]).then(bytesWritten => {
      isQueueLocked = false
      if (bytesWritten === writeQueue[0].length) writeQueue.shift()
      else writeQueue[0] = writeQueue[0].subarray(bytesWritten)
      startWriteFromQueueWorker()
    })
  }

  return {
    write: bytes => {
      writeQueue.push(bytes)
      startWriteFromQueueWorker()
    },
    read: () => child.stdout!.read(stdoutBuffer).then(n => n === null ? null : stdoutBuffer.subarray(0, n)),
    close: () => {
      child.stdin!.close()
      child.stdout!.close()
      child.close()
    },
    status: () => child.status(),
  }
}

// This is a shim for "Deno.run" for newer versions of Deno
const spawn: SpawnFn = Deno.Command ? spawnNew : spawnOld

const ensureServiceIsRunning = (): Promise<Service> => {
  if (!longLivedService) {
    longLivedService = (async (): Promise<Service> => {
      const binPath = await install()
      const isTTY = Deno.stderr.isTerminal
        ? Deno.stderr.isTerminal() // Deno ≥1.40
        : Deno.isatty(Deno.stderr.rid) // Deno <1.40

      const child = spawn(binPath, {
        args: [`--service=${version}`],
        stdin: 'piped',
        stdout: 'piped',
        stderr: 'inherit',
      })

      stopService = async () => {
        // Close all resources related to the subprocess.
        await child.close()
        initializeWasCalled = false
        longLivedService = undefined
        stopService = undefined
      }

      const { readFromStdout, afterClose, service } = common.createChannel({
        writeToStdin(bytes) {
          child.write(bytes)
        },
        isSync: false,
        hasFS: true,
        ezburn: ourselves,
      })

      const readMoreStdout = () => child.read().then(buffer => {
        if (buffer === null) {
          afterClose(null)
        } else {
          readFromStdout(buffer)
          readMoreStdout()
        }
      }).catch(e => {
        if (e instanceof Deno.errors.Interrupted || e instanceof Deno.errors.BadResource) {
          // ignore the error if read was interrupted (stdout was closed)
          afterClose(e)
        } else {
          throw e
        }
      })
      readMoreStdout()

      return {
        build: (options: types.BuildOptions) =>
          new Promise<types.BuildResult>((resolve, reject) => {
            service.buildOrContext({
              callName: 'build',
              refs: null,
              options,
              isTTY,
              defaultWD,
              callback: (err, res) => err ? reject(err) : resolve(res as types.BuildResult),
            })
          }),

        context: (options: types.BuildOptions) =>
          new Promise<types.BuildContext>((resolve, reject) =>
            service.buildOrContext({
              callName: 'context',
              refs: null,
              options,
              isTTY,
              defaultWD,
              callback: (err, res) => err ? reject(err) : resolve(res as types.BuildContext),
            })),

        transform: (input: string | Uint8Array, options?: types.TransformOptions) =>
          new Promise<types.TransformResult>((resolve, reject) =>
            service.transform({
              callName: 'transform',
              refs: null,
              input,
              options: options || {},
              isTTY,
              fs: {
                readFile(tempFile, callback) {
                  Deno.readFile(tempFile).then(
                    bytes => {
                      let text = new TextDecoder().decode(bytes)
                      try {
                        Deno.remove(tempFile)
                      } catch (e) {
                      }
                      callback(null, text)
                    },
                    err => callback(err, null),
                  )
                },
                writeFile(contents, callback) {
                  Deno.makeTempFile().then(
                    tempFile => Deno.writeFile(tempFile, typeof contents === 'string' ? new TextEncoder().encode(contents) : contents).then(
                      () => callback(tempFile),
                      () => callback(null)),
                    () => callback(null))
                },
              },
              callback: (err, res) => err ? reject(err) : resolve(res!),
            })),

        formatMessages: (messages, options) =>
          new Promise((resolve, reject) =>
            service.formatMessages({
              callName: 'formatMessages',
              refs: null,
              messages,
              options,
              callback: (err, res) => err ? reject(err) : resolve(res!),
            })),

        analyzeMetafile: (metafile, options) =>
          new Promise((resolve, reject) =>
            service.analyzeMetafile({
              callName: 'analyzeMetafile',
              refs: null,
              metafile: typeof metafile === 'string' ? metafile : JSON.stringify(metafile),
              options,
              callback: (err, res) => err ? reject(err) : resolve(res!),
            })),
      }
    })()
  }
  return longLivedService
}

// If we're called as the main script, forward the CLI to the underlying executable
if (import.meta.main) {
  spawn(await install(), {
    args: Deno.args,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  }).status().then(({ code }) => {
    Deno.exit(code)
  })
}
