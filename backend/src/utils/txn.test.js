import { test } from 'node:test'
import assert from 'node:assert'
import { generateTxnId } from './txn.js'

test('generateTxnId should return a valid transaction ID format', () => {
  const txnId = generateTxnId()
  assert.ok(txnId.startsWith('TXN-'), 'Should start with TXN-')
  assert.strictEqual(txnId.length, 16, 'Should be 16 characters long')
  assert.match(txnId, /^TXN-[0-9A-F]{12}$/, 'Should match TXN- followed by 12 uppercase hex characters')
})
