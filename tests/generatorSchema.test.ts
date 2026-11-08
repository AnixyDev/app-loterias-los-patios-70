import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGeneratedNumbers } from '../services/generatorSchema';
import { LOTTERY_GAMES } from '../constants';

const g = (id: string) => {
    const game = LOTTERY_GAMES.find((x) => x.id === id);
    if (!game) throw new Error(`Juego no encontrado en el test: ${id}`);
    return game;
};

test('Euromillones: combinación válida', () => {
    const r = parseGeneratedNumbers({ main: [5, 12, 23, 34, 45], special: [3, 9] }, g('euromillones'), false);
    assert.deepEqual(r.main, [5, 12, 23, 34, 45]);
    assert.deepEqual(r.special, [3, 9]);
});

test('Euromillones: faltan números → error', () => {
    assert.throws(() => parseGeneratedNumbers({ main: [5, 12, 23], special: [3, 9] }, g('euromillones'), false));
});

test('Euromillones: número fuera de rango → error', () => {
    assert.throws(() => parseGeneratedNumbers({ main: [5, 12, 23, 34, 99], special: [3, 9] }, g('euromillones'), false));
});

test('Euromillones: número repetido → error', () => {
    assert.throws(() => parseGeneratedNumbers({ main: [5, 5, 23, 34, 45], special: [3, 9] }, g('euromillones'), false));
});

test('Euromillones: estrella fuera de rango → error', () => {
    assert.throws(() => parseGeneratedNumbers({ main: [5, 12, 23, 34, 45], special: [3, 20] }, g('euromillones'), false));
});

test('Primitiva: reintegro 0 es válido', () => {
    const r = parseGeneratedNumbers({ main: [1, 2, 3, 4, 5, 6], special: [0] }, g('primitiva'), false);
    assert.deepEqual(r.special, [0]);
});

test('Primitiva: con Joker cuando se pide', () => {
    const r = parseGeneratedNumbers(
        { main: [1, 2, 3, 4, 5, 6], special: [7], addOn: { name: 'Joker', numbers: [1234567] } },
        g('primitiva'), true,
    );
    assert.ok(r.addOn);
    assert.deepEqual(r.addOn!.numbers, [1234567]);
});

test('Primitiva: Joker pedido pero ausente → error', () => {
    assert.throws(() => parseGeneratedNumbers({ main: [1, 2, 3, 4, 5, 6], special: [7] }, g('primitiva'), true));
});

test('Lotería Nacional: un número de 5 cifras', () => {
    const r = parseGeneratedNumbers({ main: [6983] }, g('nacional'), false);
    assert.deepEqual(r.main, [6983]);
});

test('Formato roto (main no es lista) → error', () => {
    assert.throws(() => parseGeneratedNumbers({ main: 'hola' }, g('euromillones'), false));
});

test('Número negativo → error', () => {
    assert.throws(() => parseGeneratedNumbers({ main: [-1, 2, 3, 4, 5, 6], special: [7] }, g('primitiva'), false));
});
