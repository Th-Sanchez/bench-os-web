import { describe, expect, it } from 'vitest';
import {
  isMarketingHost,
  isPublicMarketingPath,
  normalizeHostname,
} from './siteConfig';

describe('siteConfig host & route helpers', () => {
  it('normalizes host headers with ports or proxy lists', () => {
    expect(normalizeHostname('BenchOS.app.br:443')).toBe('benchos.app.br');
    expect(normalizeHostname('www.benchos.app.br, internal-proxy')).toBe('www.benchos.app.br');
    expect(normalizeHostname(null)).toBe('');
  });

  it('recognizes root and www domains as marketing hosts, but not app or localhost', () => {
    expect(isMarketingHost('benchos.app.br')).toBe(true);
    expect(isMarketingHost('www.benchos.app.br')).toBe(true);
    expect(isMarketingHost('app.benchos.app.br')).toBe(false);
    expect(isMarketingHost('localhost:3000')).toBe(false);
  });

  it('matches public marketing routes accurately', () => {
    expect(isPublicMarketingPath('/site')).toBe(true);
    expect(isPublicMarketingPath('/como-usar')).toBe(true);
    expect(isPublicMarketingPath('/privacidade')).toBe(true);
    expect(isPublicMarketingPath('/termos')).toBe(true);
    expect(isPublicMarketingPath('/excluir-conta')).toBe(true);
    expect(isPublicMarketingPath('/workbench')).toBe(false);
    expect(isPublicMarketingPath('/orders/new')).toBe(false);
  });
});
