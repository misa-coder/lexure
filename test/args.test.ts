import { Lexer, Parser, Args, some, none, Unordered } from '../src';

describe('args', () => {
    it('can retrieve single and many args', () => {
        const s = 'hello "world" baz "quux"';
        const ts = new Lexer(s).setQuotes([['"', '"']]).lex();
        const po = new Parser(ts).setUnorderedStrategy(Unordered.longStrategy()).parse();
        const args = new Args(po);

        expect(args.single()).toEqual('hello');
        expect(args.single()).toEqual('world');
        expect(args.many()).toEqual([{ value: 'baz', trailing: ' ' }, { value: 'quux', quoted: '"quux"', trailing: '' }]);
        expect(args.single()).toEqual(null);
    });

    it('can retrieve a limited amount of many args', () => {
        const s = 'hello "world" baz "quux"';
        const ts = new Lexer(s).setQuotes([['"', '"']]).lex();
        const po = new Parser(ts).setUnorderedStrategy(Unordered.longStrategy()).parse();
        const args = new Args(po);

        expect(args.many(2)).toEqual([{ value: 'hello', trailing: ' ' }, { value: 'world', quoted: '"world"', trailing: ' ' }]);
        expect(args.single()).toEqual('baz');
        expect(args.single()).toEqual('quux');
        expect(args.single()).toEqual(null);
    });

    it('can retrieve flags and options', () => {
        const s = '--foo --bar=123';
        const ts = new Lexer(s).setQuotes([['"', '"']]).lex();
        const po = new Parser(ts).setUnorderedStrategy(Unordered.longStrategy()).parse();
        const args = new Args(po);

        expect(args.flag('foo')).toEqual(true);
        expect(args.flag('hello')).toEqual(false);
        expect(args.option('bar')).toEqual('123');
        expect(args.option('world')).toEqual(null);
    });

    it('can retrieve do both things above', () => {
        const s = 'hello "world" --foo --bar=123 baz "quux"';
        const ts = new Lexer(s).setQuotes([['"', '"']]).lex();
        const po = new Parser(ts).setUnorderedStrategy(Unordered.longStrategy()).parse();
        const args = new Args(po);

        expect(args.single()).toEqual('hello');
        expect(args.single()).toEqual('world');
        expect(args.many()).toEqual([{ value: 'baz', trailing: ' ' }, { value: 'quux', quoted: '"quux"', trailing: '' }]);
        expect(args.single()).toEqual(null);
        expect(args.flag('foo')).toEqual(true);
        expect(args.flag('hello')).toEqual(false);
        expect(args.option('bar')).toEqual('123');
        expect(args.option('world')).toEqual(null);
    });

    it('has the correct state and counts', () => {
        const s = 'hello "world" baz "quux"';
        const ts = new Lexer(s).setQuotes([['"', '"']]).lex();
        const po = new Parser(ts).setUnorderedStrategy(Unordered.longStrategy()).parse();
        const args = new Args(po);

        expect(args.length).toEqual(4);
        expect(args.remaining).toEqual(4);
        expect(args.finished).toEqual(false);
        expect(args.usedIndices).toEqual(new Set());

        args.single();
        args.single();

        expect(args.length).toEqual(4);
        expect(args.remaining).toEqual(2);
        expect(args.finished).toEqual(false);
        expect(args.usedIndices).toEqual(new Set([0, 1]));

        args.many();

        expect(args.length).toEqual(4);
        expect(args.remaining).toEqual(0);
        expect(args.finished).toEqual(true);
        expect(args.usedIndices).toEqual(new Set([0, 1, 2, 3]));
    });

    it('can find a token', () => {
        const s = 'hello "world" baz "quux"';
        const ts = new Lexer(s).setQuotes([['"', '"']]).lex();
        const po = new Parser(ts).setUnorderedStrategy(Unordered.longStrategy()).parse();
        const args = new Args(po);

        const y = args.findMap(x => x === 'hello' ? some(10) : none());
        expect(y).toEqual(some(10));
    });

    it('cannot find a token', () => {
        const s = 'hello "world" baz "quux"';
        const ts = new Lexer(s).setQuotes([['"', '"']]).lex();
        const po = new Parser(ts).setUnorderedStrategy(Unordered.longStrategy()).parse();
        const args = new Args(po);

        const y = args.findMap(x => x === 'goodbye' ? some(10) : none());
        expect(y).toEqual(none());
    });

    it('can filter multiple tokens', () => {
        const s = 'hello "world" hello "quux"';
        const ts = new Lexer(s).setQuotes([['"', '"']]).lex();
        const po = new Parser(ts).setUnorderedStrategy(Unordered.longStrategy()).parse();
        const args = new Args(po);

        const y = args.filterMap(x => x === 'hello' ? some(10) : none());
        expect(y).toEqual([10, 10]);
    });

    it('will skip over a used token', () => {
        const s = 'hello "world" baz "quux"';
        const ts = new Lexer(s).setQuotes([['"', '"']]).lex();
        const po = new Parser(ts).setUnorderedStrategy(Unordered.longStrategy()).parse();
        const args = new Args(po);

        args.findMap(x => x === 'hello' ? some(10) : none());
        expect(args.usedIndices).toEqual(new Set([0]));
        expect(args.single()).toEqual('world');
        expect(args.usedIndices).toEqual(new Set([0, 1]));
        expect(args.position).toEqual(2);
    });

    it('will skip over multiple used tokens', () => {
        const s = 'hello a hello b';
        const ts = new Lexer(s).setQuotes([['"', '"']]).lex();
        const po = new Parser(ts).setUnorderedStrategy(Unordered.longStrategy()).parse();
        const args = new Args(po);

        args.filterMap(x => x === 'hello' ? some(10) : none());
        expect(args.usedIndices).toEqual(new Set([0, 2]));
        expect(args.many()).toEqual([{ value: 'a', trailing: ' ' }, { value: 'b', trailing: '' }]);
        expect(args.usedIndices).toEqual(new Set([0, 1, 2, 3]));
    });
});