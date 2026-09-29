import type { ArgWord } from "./node-text";

// ── Public surface ─────────────────────────────────────────────────────────

/**
 * Whether a `sed` invocation's arguments withdraw its read claim.
 *
 * The claim stands only when the whole command line is **proven** read-only:
 * every option is one the allowlist knows, and every script parses under a
 * grammar that admits no command able to write a file or run one. Anything
 * the walk does not recognize withdraws the claim, so an unknown option or
 * command costs one ask rather than a missed write.
 *
 * A computed word withdraws the claim wherever it sits: GNU `sed` permutes
 * options, so even a trailing `"$f"` can arrive as `-i`.
 *
 * The walk never needs to know which `sed` is installed. Where GNU and BSD
 * would read the same argument list differently — an `-e` after the first
 * positional, which GNU takes as a script and BSD as a file — it withdraws.
 */
export function sedWithdrawsReadClaim(argWords: readonly ArgWord[]): boolean {
  if (argWords.some(({ computed }) => computed)) return true;
  const scripts = selectScripts(argWords.map(({ value }) => value));
  if (scripts === null) return true;
  return !scripts.every(provesReadOnlyScript);
}

// ── The option walk ────────────────────────────────────────────────────────

/** Short options that take no argument and cannot write: `-n -E -r -s -u -z`. */
const FLAG_LETTERS: ReadonlySet<string> = new Set([
  "n",
  "E",
  "r",
  "s",
  "u",
  "z",
]);

/**
 * Long options that take no argument and cannot write, matched exactly.
 *
 * Abbreviations are deliberately absent: GNU accepts `--qui` for `--quiet`
 * and `--in` for `--in-place` alike, and matching whole words only is what
 * lets every abbreviation withdraw without a prefix rule.
 */
const FLAG_WORDS: ReadonlySet<string> = new Set([
  "--quiet",
  "--silent",
  "--regexp-extended",
  "--separate",
  "--unbuffered",
  "--null-data",
  "--posix",
  "--debug",
  "--sandbox",
]);

const EXPRESSION_OPTION = "--expression";

/**
 * The scripts an argument list hands `sed`, or `null` when the list cannot be
 * proven to hand it only those.
 *
 * Every `-e` value is a script; with none, the first positional is. Options
 * are recognized wherever they sit until a `--`, because GNU permutes them.
 */
function selectScripts(values: readonly string[]): string[] | null {
  const scripts: string[] = [];
  let firstPositional: string | undefined;
  let optionsEnded = false;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (optionsEnded || !isOptionWord(value)) {
      firstPositional ??= value;
      continue;
    }
    if (value === "--") {
      optionsEnded = true;
      continue;
    }
    if (FLAG_WORDS.has(value)) continue;
    const expression = expressionOf(value, values[i + 1]);
    if (expression === null) return null;
    // An -e after a positional is a script to GNU and a file to BSD.
    if (expression.script !== undefined && firstPositional !== undefined) {
      return null;
    }
    if (expression.script !== undefined) scripts.push(expression.script);
    if (expression.consumesNext) i++;
  }
  if (scripts.length > 0) return scripts;
  return firstPositional === undefined ? null : [firstPositional];
}

function isOptionWord(value: string): boolean {
  return value.startsWith("-") && value !== "-";
}

/** What one option word contributes: a script, and whether it took the next word. */
interface OptionReading {
  readonly script?: string;
  readonly consumesNext: boolean;
}

/**
 * Read one option word, or `null` when it is not one the allowlist proves.
 *
 * A short cluster may hold only flag letters until an `e`, which ends it: the
 * rest of the word is the script, or the next word is when nothing follows.
 */
function expressionOf(
  value: string,
  next: string | undefined,
): OptionReading | null {
  if (value.startsWith("--")) return longExpressionOf(value, next);
  for (let j = 1; j < value.length; j++) {
    const letter = value[j];
    if (letter === "e") {
      const attached = value.slice(j + 1);
      if (attached !== "") return { script: attached, consumesNext: false };
      return next === undefined ? null : { script: next, consumesNext: true };
    }
    if (!FLAG_LETTERS.has(letter)) return null;
  }
  return { consumesNext: false };
}

function longExpressionOf(
  value: string,
  next: string | undefined,
): OptionReading | null {
  if (value.startsWith(`${EXPRESSION_OPTION}=`)) {
    return {
      script: value.slice(EXPRESSION_OPTION.length + 1),
      consumesNext: false,
    };
  }
  if (value !== EXPRESSION_OPTION || next === undefined) return null;
  return { script: next, consumesNext: true };
}

// ── The script grammar ─────────────────────────────────────────────────────

/**
 * Commands that take no argument and neither write a file nor run a command.
 *
 * `l`, `q`, and `Q` accept an optional number, read by the scanner.
 */
const READ_ONLY_COMMANDS: ReadonlySet<string> = new Set([
  "p",
  "P",
  "d",
  "D",
  "n",
  "N",
  "g",
  "G",
  "h",
  "H",
  "x",
  "=",
  "z",
  "F",
  "l",
  "q",
  "Q",
]);

/** The commands among {@link READ_ONLY_COMMANDS} that take an optional number. */
const NUMBERED_COMMANDS: ReadonlySet<string> = new Set(["l", "q", "Q"]);

/**
 * Whether a script is made only of commands that cannot write a file or run
 * a command.
 *
 * An allowlist grammar: `w`, `W`, `r`, `R`, `e`, `v`, `a`, `i`, `c`, and any
 * character the scanner does not recognize end the proof.
 */
function provesReadOnlyScript(script: string): boolean {
  return new ScriptScanner(script).provesReadOnly();
}

/** A single left-to-right pass over one script. */
class ScriptScanner {
  private position = 0;

  constructor(private readonly source: string) {}

  provesReadOnly(): boolean {
    this.skipSeparators();
    while (!this.atEnd()) {
      if (!this.readCommand()) return false;
      this.skipSeparators();
    }
    return true;
  }

  /** One `[address[,address]][!…]command`, and what may follow it. */
  private readCommand(): boolean {
    if (this.readAddress()) {
      this.skipBlanks();
      if (this.peek() === ",") {
        this.position++;
        this.skipBlanks();
        if (!this.readSecondAddress()) return false;
      }
    }
    this.skipBlanks();
    while (this.peek() === "!") {
      this.position++;
      this.skipBlanks();
    }
    const command = this.peek();
    if (command === undefined || !READ_ONLY_COMMANDS.has(command)) return false;
    this.position++;
    if (NUMBERED_COMMANDS.has(command)) {
      this.skipBlanks();
      this.skipDigits();
    }
    this.skipBlanks();
    return this.atEnd() || this.atSeparator();
  }

  /** A line number, `first~step`, or `$`; false when none starts here. */
  private readAddress(): boolean {
    if (this.peek() === "$") {
      this.position++;
      return true;
    }
    if (!this.skipDigits()) return false;
    if (this.peek() === "~") {
      this.position++;
      this.skipDigits();
    }
    return true;
  }

  /** The end of a range: an address, or GNU's `+N` / `~N`. */
  private readSecondAddress(): boolean {
    const sign = this.peek();
    if (sign === "+" || sign === "~") {
      this.position++;
      return this.skipDigits();
    }
    return this.readAddress();
  }

  private skipSeparators(): void {
    while (this.atSeparator() || this.isBlank(this.peek())) this.position++;
  }

  private skipBlanks(): void {
    while (this.isBlank(this.peek())) this.position++;
  }

  /** Advance over digits; true when there was at least one. */
  private skipDigits(): boolean {
    const start = this.position;
    while (/[0-9]/.test(this.peek() ?? "")) this.position++;
    return this.position > start;
  }

  private atSeparator(): boolean {
    const next = this.peek();
    return next === ";" || next === "\n";
  }

  private isBlank(character: string | undefined): boolean {
    return character === " " || character === "\t";
  }

  private atEnd(): boolean {
    return this.position >= this.source.length;
  }

  private peek(): string | undefined {
    return this.source[this.position];
  }
}
