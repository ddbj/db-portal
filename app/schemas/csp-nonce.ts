// Request header that carries the per-request CSP nonce from the BFF into the
// React Router request handler. The BFF middleware overwrites the header on
// every request, so a value sent by the client never reaches the app.
export const CSP_NONCE_HEADER = "x-csp-nonce"
