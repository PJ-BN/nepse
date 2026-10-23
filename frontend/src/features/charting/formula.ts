import type { KLineData } from "klinecharts";
import { ema, hma, rsi, sma, wma } from "./indicators";

type N = number | null;

type Token =
  | { type: "num"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: string }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "comma" };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(input[i + 1] ?? ""))) {
      let numStr = "";
      while (i < input.length && /[0-9.]/.test(input[i])) {
        numStr += input[i++];
      }
      tokens.push({ type: "num", value: Number(numStr) });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = "";
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        ident += input[i++];
      }
      tokens.push({ type: "ident", value: ident.toLowerCase() });
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma" });
      i++;
      continue;
    }
    if (["+", "-", "*", "/", "^", "%"].includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    throw new Error(`Unexpected character: '${ch}' at position ${i}`);
  }
  return tokens;
}

type AST =
  | { type: "num"; value: number }
  | { type: "var"; name: string }
  | { type: "unary"; op: string; expr: AST }
  | { type: "binary"; op: string; left: AST; right: AST }
  | { type: "call"; fn: string; args: AST[] };

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  parse(): AST {
    if (this.tokens.length === 0) throw new Error("Empty formula");
    const res = this.expr(0);
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected token at position ${this.pos}`);
    }
    return res;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private prec(op: string): number {
    switch (op) {
      case "+":
      case "-":
        return 1;
      case "*":
      case "/":
      case "%":
        return 2;
      case "^":
        return 3;
      default:
        return 0;
    }
  }

  private expr(minPrec: number): AST {
    let left = this.primary();

    while (this.pos < this.tokens.length) {
      const tok = this.peek();
      if (!tok || tok.type !== "op") break;
      const p = this.prec(tok.value);
      if (p < minPrec) break;

      const op = this.consume() as { type: "op"; value: string };
      // exponentiation is right-associative
      const nextMin = op.value === "^" ? p : p + 1;
      const right = this.expr(nextMin);
      left = { type: "binary", op: op.value, left, right };
    }
    return left;
  }

  private primary(): AST {
    const tok = this.consume();
    if (!tok) throw new Error("Unexpected end of formula");

    if (tok.type === "num") {
      return { type: "num", value: tok.value };
    }

    if (tok.type === "op" && (tok.value === "-" || tok.value === "+")) {
      const operand = this.primary();
      return { type: "unary", op: tok.value, expr: operand };
    }

    if (tok.type === "lparen") {
      const inner = this.expr(0);
      const close = this.consume();
      if (!close || close.type !== "rparen") throw new Error("Missing closing parenthesis");
      return inner;
    }

    if (tok.type === "ident") {
      if (this.peek()?.type === "lparen") {
        this.consume(); // eat '('
        const args: AST[] = [];
        if (this.peek()?.type !== "rparen") {
          while (true) {
            args.push(this.expr(0));
            const next = this.peek();
            if (next?.type === "comma") {
              this.consume();
            } else if (next?.type === "rparen") {
              break;
            } else {
              throw new Error("Expected ',' or ')' in argument list");
            }
          }
        }
        this.consume(); // eat ')'
        return { type: "call", fn: tok.value, args };
      }
      return { type: "var", name: tok.value };
    }

    throw new Error(`Unexpected token: ${JSON.stringify(tok)}`);
  }
}

type EvalResult = { isScalar: true; value: number } | { isScalar: false; values: N[] };

function toSeries(res: EvalResult, len: number): N[] {
  if (res.isScalar) {
    return Array.from({ length: len }, () => res.value);
  }
  return res.values;
}

function stdDev(values: number[], period: number): N[] {
  const m = sma(values, period);
  return values.map((_, i) => {
    if (i < period - 1 || m[i] === null) return null;
    let sumSq = 0;
    const mean = m[i]!;
    for (let j = i - period + 1; j <= i; j++) sumSq += (values[j] - mean) ** 2;
    return Math.sqrt(sumSq / period);
  });
}

function rollingHigh(values: number[], period: number): N[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    let mx = -Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (values[j] > mx) mx = values[j];
    }
    return mx;
  });
}

function rollingLow(values: number[], period: number): N[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    let mn = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (values[j] < mn) mn = values[j];
    }
    return mn;
  });
}

function evaluateAST(ast: AST, bars: KLineData[]): EvalResult {
  const len = bars.length;
  const c = bars.map((b) => b.close);
  const o = bars.map((b) => b.open);
  const h = bars.map((b) => b.high);
  const l = bars.map((b) => b.low);
  const v = bars.map((b) => b.volume ?? 0);

  const getVar = (name: string): N[] => {
    switch (name) {
      case "close":
      case "c":
        return c;
      case "open":
      case "o":
        return o;
      case "high":
      case "h":
        return h;
      case "low":
      case "l":
        return l;
      case "volume":
      case "vol":
      case "v":
        return v;
      case "hl2":
        return h.map((high, i) => (high + l[i]) / 2);
      case "hlc3":
        return h.map((high, i) => (high + l[i] + c[i]) / 3);
      case "ohlc4":
        return o.map((open, i) => (open + h[i] + l[i] + c[i]) / 4);
      default:
        throw new Error(`Unknown variable: '${name}'. Allowed: open, high, low, close, volume, hl2, hlc3, ohlc4.`);
    }
  };

  const evalNode = (node: AST): EvalResult => {
    if (node.type === "num") {
      return { isScalar: true, value: node.value };
    }
    if (node.type === "var") {
      return { isScalar: false, values: getVar(node.name) };
    }
    if (node.type === "unary") {
      const inner = evalNode(node.expr);
      if (inner.isScalar) {
        return { isScalar: true, value: node.op === "-" ? -inner.value : inner.value };
      }
      return {
        isScalar: false,
        values: inner.values.map((val) => (val === null ? null : node.op === "-" ? -val : val)),
      };
    }
    if (node.type === "binary") {
      const left = evalNode(node.left);
      const right = evalNode(node.right);

      const opFunc = (a: number, b: number): number => {
        switch (node.op) {
          case "+":
            return a + b;
          case "-":
            return a - b;
          case "*":
            return a * b;
          case "/":
            return b === 0 ? 0 : a / b;
          case "%":
            return b === 0 ? 0 : a % b;
          case "^":
            return a ** b;
          default:
            return 0;
        }
      };

      if (left.isScalar && right.isScalar) {
        return { isScalar: true, value: opFunc(left.value, right.value) };
      }

      const sLeft = toSeries(left, len);
      const sRight = toSeries(right, len);
      const values = sLeft.map((lv, i) => {
        const rv = sRight[i];
        if (lv === null || rv === null || !Number.isFinite(lv) || !Number.isFinite(rv)) return null;
        const res = opFunc(lv, rv);
        return Number.isFinite(res) ? res : null;
      });
      return { isScalar: false, values };
    }

    if (node.type === "call") {
      const fn = node.fn;
      const evalArg = (idx: number): EvalResult => {
        if (!node.args[idx]) throw new Error(`Missing argument ${idx + 1} for ${fn}()`);
        return evalNode(node.args[idx]);
      };

      // Built-in functions:
      if (["sma", "ema", "wma", "hma", "rsi", "std", "highest", "lowest"].includes(fn)) {
        // Can be called as fn(period) -> uses close, or fn(series, period)
        let series: number[];
        let period: number;

        if (node.args.length === 1) {
          series = c;
          const p = evalArg(0);
          if (!p.isScalar) throw new Error(`${fn}(period) requires a number for period`);
          period = Math.round(p.value);
        } else if (node.args.length >= 2) {
          const sRes = evalArg(0);
          series = toSeries(sRes, len).map((val) => val ?? 0);
          const p = evalArg(1);
          if (!p.isScalar) throw new Error(`${fn}(series, period) requires a number for period`);
          period = Math.round(p.value);
        } else {
          throw new Error(`${fn}() requires at least 1 parameter (period)`);
        }

        if (period < 1) period = 1;

        let res: N[];
        switch (fn) {
          case "sma":
            res = sma(series, period);
            break;
          case "ema":
            res = ema(series, period);
            break;
          case "wma":
            res = wma(series, period);
            break;
          case "hma":
            res = hma(series, period);
            break;
          case "rsi":
            res = rsi(series, period);
            break;
          case "std":
            res = stdDev(series, period);
            break;
          case "highest":
            res = rollingHigh(series, period);
            break;
          case "lowest":
            res = rollingLow(series, period);
            break;
          default:
            res = series.map(() => null);
        }
        return { isScalar: false, values: res };
      }

      if (fn === "abs" || fn === "sqrt" || fn === "log" || fn === "round") {
        const arg = evalArg(0);
        const mathFn = (x: number): number => {
          if (fn === "abs") return Math.abs(x);
          if (fn === "sqrt") return x < 0 ? 0 : Math.sqrt(x);
          if (fn === "log") return x <= 0 ? 0 : Math.log(x);
          return Math.round(x);
        };
        if (arg.isScalar) {
          return { isScalar: true, value: mathFn(arg.value) };
        }
        return { isScalar: false, values: arg.values.map((v) => (v === null ? null : mathFn(v))) };
      }

      if (fn === "min" || fn === "max") {
        const a1 = evalArg(0);
        const a2 = evalArg(1);
        const s1 = toSeries(a1, len);
        const s2 = toSeries(a2, len);
        return {
          isScalar: false,
          values: s1.map((v, i) => (v === null || s2[i] === null ? null : fn === "min" ? Math.min(v, s2[i]!) : Math.max(v, s2[i]!))),
        };
      }

      throw new Error(`Unknown function: '${fn}()'`);
    }

    throw new Error("Unrecognized AST node");
  };

  return evalNode(ast);
}

/** Parses and evaluates a formula against candles, returning series aligned with input. */
export function evaluateFormula(formula: string, bars: KLineData[]): N[] {
  const tokens = tokenize(formula);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const res = evaluateAST(ast, bars);
  return toSeries(res, bars.length);
}

/** Validates formula syntax and evaluates on test bars. Returns error message if invalid. */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  if (!formula.trim()) return { valid: false, error: "Formula cannot be empty." };
  try {
    const tokens = tokenize(formula);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    // Test on 50 mock bars
    const testBars: KLineData[] = Array.from({ length: 50 }, (_, i) => ({
      timestamp: 1700000000000 + i * 86400000,
      open: 100 + i,
      high: 105 + i,
      low: 98 + i,
      close: 102 + i,
      volume: 1000 + i * 50,
    }));
    evaluateAST(ast, testBars);
    return { valid: true };
  } catch (err: unknown) {
    return { valid: false, error: (err as Error).message || "Invalid formula" };
  }
}
