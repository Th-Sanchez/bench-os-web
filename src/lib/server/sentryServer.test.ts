import { describe, expect, it } from 'vitest';
import { parseSentryDsn } from './sentryServer';

describe('sentryServer', () => {
  it('parses a standard Sentry DSN into an envelope endpoint', () => {
    const parsed = parseSentryDsn(
      'https://7cb872fd8b2a7d3b9a1f8e354f3e030f@o4512488634777601.ingest.us.sentry.io/4512497915985920'
    );
    expect(parsed).toEqual({
      envelopeUrl:
        'https://o4512488634777601.ingest.us.sentry.io/api/4512497915985920/envelope/',
      publicKey: '7cb872fd8b2a7d3b9a1f8e354f3e030f',
      projectId: '4512497915985920',
    });
  });

  it('returns null for empty or malformed DSNs', () => {
    expect(parseSentryDsn('')).toBeNull();
    expect(parseSentryDsn(undefined)).toBeNull();
    expect(parseSentryDsn('not-a-url')).toBeNull();
  });
});
