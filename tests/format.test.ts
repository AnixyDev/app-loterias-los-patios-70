import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPremio } from '../services/format';

test('importe entero grande: miles con punto, sin decimales', () => {
    const s = formatPremio('17000000');
    assert.match(s, /17\.000\.000/);
    assert.match(s, /€/);
});

test('importe con decimales (coma española) se conserva', () => {
    const s = formatPremio('718,29');
    assert.match(s, /718,29/);
});

test('importe pequeño entero lleva dos decimales', () => {
    assert.match(formatPremio('3'), /3,00/);
});

test('texto sin cifras se devuelve tal cual', () => {
    assert.equal(formatPremio('Sin Bote'), 'Sin Bote');
});

test('valores nulos → cadena vacía', () => {
    assert.equal(formatPremio(null), '');
    assert.equal(formatPremio(undefined), '');
});
