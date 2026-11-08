import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQrTicket } from '../services/qrTicket';

test('décimo de Lotería Nacional (QR real)', () => {
    const raw = 'A=1327510020054002468431330528647249;P=10;S=08905NOV26:1;W=0;N=06983;F=1;SE=3;DF=3;T=51170-0;';
    const t = parseQrTicket(raw);
    assert.ok(t);
    assert.equal(t!.game, 'nacional');
    assert.equal(t!.numero, '06983');
    assert.equal(t!.serie, '3');
    assert.equal(t!.fraccion, '1');
    assert.equal(t!.fecha, '2026-11-05');
    assert.deepEqual(t!.apuestas, []); // la Nacional no lleva combinación
});

test('apuesta de Bonoloto con combinación y reintegro', () => {
    const t = parseQrTicket('A=X;P=2;S=33501DIC23:10;.1=122022273446;R=3');
    assert.ok(t);
    assert.equal(t!.game, 'bonoloto');
    assert.equal(t!.fecha, '2023-12-01');
    assert.equal(t!.semanas, '10');
    assert.deepEqual(t!.apuestas[0].main, [12, 20, 22, 27, 34, 46]);
    assert.equal(t!.reintegro, '3');
});

test('texto que no es un resguardo SELAE → null', () => {
    assert.equal(parseQrTicket('hola mundo'), null);
    assert.equal(parseQrTicket(''), null);
});
