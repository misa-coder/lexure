import { UnorderedStrategy, noStrategy } from './unordered';
import { Token } from './tokens';
import { ParserOutput, emptyOutput } from './parserOutput';

/**
 * Parses a list of tokens to separate out flags and options.
 */
export class Parser implements IterableIterator<ParserOutput>, Iterator<ParserOutput, null, ParserOutput | undefined> {
    private readonly input: Token[];

    private unorderedStrategy: UnorderedStrategy = noStrategy();
    private position = 0;

    /**
     * @param input - The input tokens.
     */
    public constructor(input: Token[]) {
        this.input = input;
    }

    /**
     * Sets the strategy for parsing unordered arguments.
     * This can be done in the middle of parsing.
     *
     * ```ts
     * const parser = new Parser(tokens)
     *   .setUnorderedStrategy(longStrategy())
     *   .parse();
     * ```
     *
     * @returns The parser.
     */
    public setUnorderedStrategy(s: UnorderedStrategy): this {
        this.unorderedStrategy = s;
        return this;
    }

    /**
     * Whether the parser is finished.
     */
    public get finished(): boolean {
        return this.position >= this.input.length;
    }

    private shift(n: number): void {
        this.position += n;
    }

    /**
     * Gets the next parsed tokens.
     * If a parser output is passed in, that output will be mutated, otherwise a new one is made.
     * @param output - Parser output to mutate.
     * @returns An iterator result containing parser output.
     */
    public next(output?: ParserOutput): IteratorResult<ParserOutput> {
        if (this.finished) {
            return { done: true, value: null };
        }

        const ts = this.processToken(output);
        if (ts == null) {
            throw new Error('Unexpected end of input (this should never happen).');
        }

        return { done: false, value: ts };
    }

    private processToken(output?: ParserOutput): ParserOutput {
        return this.pFlag(output)
            || this.pOption(output)
            || this.pCompactOption(output)
            || this.pOrdered(output);
    }

    private pFlag(output = emptyOutput()): ParserOutput | null {
        const t = this.input[this.position];
        const f = this.unorderedStrategy.matchFlag(t.value);
        if (f == null) {
            return null;
        }

        this.shift(1);

        output.flags.add(f);
        return output;
    }

    private pOption(output = emptyOutput()): ParserOutput | null {
        const t = this.input[this.position];
        const o = this.unorderedStrategy.matchOption(t.value);
        if (o == null) {
            return null;
        }

        this.shift(1);

        if (!output.options.has(o)) {
            output.options.set(o, []);
        }

        const n = this.input[this.position];
        if (n == null) {
            return output;
        }

        const bad = (this.unorderedStrategy.matchFlag(n.value)
                || this.unorderedStrategy.matchOption(n.value)
                || this.unorderedStrategy.matchCompactOption(n.value)) != null;

        if (bad) {
            return output;
        }

        this.shift(1);

        const xs = output.options.get(o);
        xs!.push(n.value);
        return output;
    }

    private pCompactOption(output = emptyOutput()): ParserOutput | null {
        const t = this.input[this.position];
        const o = this.unorderedStrategy.matchCompactOption(t.value);
        if (o == null) {
            return null;
        }

        this.shift(1);

        if (!output.options.has(o[0])) {
            output.options.set(o[0], [o[1]]);
        } else {
            const a = output.options.get(o[0])!;
            a.push(o[1]);
        }

        return output;
    }

    private pOrdered(output = emptyOutput()): ParserOutput {
        const t = this.input[this.position];
        this.shift(1);

        output.ordered.push(t);
        return output;
    }

    public [Symbol.iterator](): this {
        return this;
    }

    /**
     * Runs the parser.
     *
     * ```ts
     * const lexer = new Lexer(input);
     * const tokens = lexer.lex();
     * const parser = new Parser(tokens);
     * const output = parser.parse();
     * ```
     *
     * @returns The parser output.
     */
    public parse(): ParserOutput {
        const output = emptyOutput();
        let r = this.next(output);
        while (!r.done) {
            r = this.next(output);
        }

        return output;
    }
}
