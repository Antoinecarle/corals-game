// Polyfill Symbol.metadata (TC39 Stage 3) required by @colyseus/schema v4
(Symbol as any).metadata ??= Symbol('Symbol.metadata');
