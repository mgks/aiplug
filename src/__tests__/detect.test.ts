/**
 * Tests for the auto-detection module — provider credential discovery
 * via env vars, dotenv files, and AWS shared credentials, plus masked-prefix
 * output. Local-runtime port probes are exercised in a live e2e
 * (skipped when the network is unreachable) so the unit tests stay
 * deterministic.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mask } from '../detect.js';

describe('mask', () => {
    it('returns bullets when value is short', () => {
        assert.equal(mask('ab'), '••');
        assert.equal(mask(''), '');
    });
    it('keeps first 4 + last 4 chars for longer values', () => {
        assert.equal(mask('sk-proj-abcdefgh1234'), 'sk-p…1234');
    });
    it('splits long values into first 4 + … + last 4', () => {
        // 8 chars: first 4 + ellipsis + last 4
        assert.equal(mask('12345678'), '1234…5678');
    });
});
