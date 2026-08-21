import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildApiUrl,
  isRetryableMethod,
  resolveApiBaseUrl,
  shouldClearAuthentication,
} from '../src/services/apiConfig.ts';

test('production requires an explicit API URL', () => {
  assert.throws(() => resolveApiBaseUrl(undefined, false), /VITE_API_URL/);
});

test('API base normalization never duplicates api/v1', () => {
  const base = resolveApiBaseUrl('https://api.example/api/v1/', false);
  assert.equal(base, 'https://api.example');
  assert.equal(buildApiUrl(base, '/reports'), 'https://api.example/api/v1/reports');
});

test('development defaults to the local backend only in development', () => {
  assert.equal(resolveApiBaseUrl(undefined, true), 'http://127.0.0.1:8000');
});

test('non-idempotent methods are not retryable', () => {
  assert.equal(isRetryableMethod('GET'), true);
  assert.equal(isRetryableMethod('POST'), false);
  assert.equal(isRetryableMethod('PUT'), false);
  assert.equal(isRetryableMethod('DELETE'), false);
});

test('only an authentication failure clears the browser session', () => {
  assert.equal(shouldClearAuthentication(401), true);
  assert.equal(shouldClearAuthentication(403), false);
  assert.equal(shouldClearAuthentication(500), false);
});
