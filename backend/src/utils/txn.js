import crypto from 'crypto'

export const generateTxnId = () => 'TXN-' + crypto.randomBytes(6).toString('hex').toUpperCase()
