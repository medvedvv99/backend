import { describe, expect, it } from 'vitest';

import { SubscriptionSettingsEntity } from '@modules/subscription-settings/entities/subscription-settings.entity';
import { UserEntity } from '@modules/users/entities/user.entity';

import { TemplateEngine } from './replace-templates-values';

// Deterministic local-timezone rendering for date-format assertions.
process.env.TZ = 'UTC';

const pad = (value: number): string => String(value).padStart(2, '0');

type UserOverrides = Partial<Omit<UserEntity, 'expireAt' | 'hwidDeviceLimit'>> & {
    expireAt?: Date | null;
    hwidDeviceLimit?: number | null;
};

function createUser(overrides: UserOverrides = {}): UserEntity {
    const user = new UserEntity({
        id: 1n,
        shortUuid: 'test-short-uuid',
        username: 'test-user',
        status: 'ACTIVE',
        trafficLimitBytes: 0n,
        trafficLimitStrategy: 'NO_RESET',
        expireAt: new Date('2026-06-10T14:52:57Z'),
        lastTrafficResetAt: null,
        subRevokedAt: null,
        lastTriggeredThreshold: 0,
        trojanPassword: 'trojan-password',
        vlessUuid: '00000000-0000-0000-0000-000000000000',
        ssPassword: 'ss-password',
        description: null,
        tag: null,
        telegramId: null,
        email: null,
        hwidDeviceLimit: null,
        externalSquadUuid: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        usedTrafficBytes: 0n,
        lifetimeUsedTrafficBytes: 0n,
        firstConnectedAt: null,
        onlineAt: null,
        lastConnectedNodeUuid: null,
        activeInternalSquads: [],
    });

    return Object.assign(user, overrides);
}

function createSettings(fallbackDeviceLimit = 3): SubscriptionSettingsEntity {
    return new SubscriptionSettingsEntity({
        hwidSettings: {
            enabled: true,
            fallbackDeviceLimit,
            maxDevicesAnnounce: null,
        },
    });
}

describe('TemplateEngine EXPIRE_DATE / EXPIRE_DATETIME', () => {
    it('formats expire date as DD.MM.YYYY in server-local timezone', () => {
        const expireAt = new Date('2026-06-10T14:52:57Z');
        const user = createUser({ expireAt });

        const rendered = TemplateEngine.formatWithUser(
            '{{EXPIRE_DATE}}',
            user,
            createSettings(),
            'example.com',
        );

        const expected = `${pad(expireAt.getDate())}.${pad(expireAt.getMonth() + 1)}.${expireAt.getFullYear()}`;
        expect(rendered).toBe(expected);
    });

    it('formats expire datetime as DD.MM.YYYY HH:mm in server-local timezone', () => {
        const expireAt = new Date('2026-06-10T14:52:57Z');
        const user = createUser({ expireAt });

        const rendered = TemplateEngine.formatWithUser(
            '{{EXPIRE_DATETIME}}',
            user,
            createSettings(),
            'example.com',
        );

        const expected = `${pad(expireAt.getDate())}.${pad(expireAt.getMonth() + 1)}.${expireAt.getFullYear()} ${pad(expireAt.getHours())}:${pad(expireAt.getMinutes())}`;
        expect(rendered).toBe(expected);
    });

    it('renders pinned UTC instant as DD.MM.YYYY HH:mm', () => {
        const user = createUser({ expireAt: new Date('2026-06-10T14:52:57Z') });

        const rendered = TemplateEngine.formatWithUser(
            '{{EXPIRE_DATE}} {{EXPIRE_DATETIME}}',
            user,
            createSettings(),
            'example.com',
        );

        expect(rendered).toBe('10.06.2026 10.06.2026 14:52');
    });

    it('renders fallback for null expiry without crashing', () => {
        const user = createUser({ expireAt: null });

        const rendered = TemplateEngine.formatWithUser(
            '{{EXPIRE_DATE}} / {{EXPIRE_DATETIME}}',
            user,
            createSettings(),
            'example.com',
        );

        expect(rendered).toBe('— / —');
    });

    it('renders fallback for undefined expiry without crashing', () => {
        const user = createUser({ expireAt: undefined });

        const rendered = TemplateEngine.formatWithUser(
            '{{EXPIRE_DATE}} / {{EXPIRE_DATETIME}}',
            user,
            createSettings(),
            'example.com',
        );

        expect(rendered).toBe('— / —');
    });
});

describe('TemplateEngine HWID_DEVICES_COUNT / HWID_DEVICES_LIMIT', () => {
    it('renders zero device count when user has no hwid devices', () => {
        const user = createUser({ hwidDevicesCount: 0 });

        const rendered = TemplateEngine.formatWithUser(
            '{{HWID_DEVICES_COUNT}}',
            user,
            createSettings(),
            'example.com',
        );

        expect(rendered).toBe('0');
    });

    it('renders actual device count', () => {
        const user = createUser({ hwidDevicesCount: 5 });

        const rendered = TemplateEngine.formatWithUser(
            '{{HWID_DEVICES_COUNT}}',
            user,
            createSettings(),
            'example.com',
        );

        expect(rendered).toBe('5');
    });

    it('uses per-user limit when set', () => {
        const user = createUser({ hwidDeviceLimit: 4 });
        const settings = createSettings(2);

        const rendered = TemplateEngine.formatWithUser(
            '{{HWID_DEVICES_LIMIT}}',
            user,
            settings,
            'example.com',
        );

        expect(rendered).toBe('4');
    });

    it('falls back to global fallbackDeviceLimit when user limit is null', () => {
        const user = createUser({ hwidDeviceLimit: null });

        const rendered = TemplateEngine.formatWithUser(
            '{{HWID_DEVICES_LIMIT}}',
            user,
            createSettings(3),
            'example.com',
        );

        expect(rendered).toBe('3');
    });

    it('falls back to global fallbackDeviceLimit when user limit is 0', () => {
        const user = createUser({ hwidDeviceLimit: 0 });

        const rendered = TemplateEngine.formatWithUser(
            '{{HWID_DEVICES_LIMIT}}',
            user,
            createSettings(3),
            'example.com',
        );

        expect(rendered).toBe('3');
    });

    it('HWID_DEVICES_LIMIT matches SS_HWID_LIMIT for the same user', () => {
        const user = createUser({ hwidDeviceLimit: 4 });
        const settings = createSettings(2);

        const ssLimit = TemplateEngine.formatWithUser(
            '{{SS_HWID_LIMIT}}',
            user,
            settings,
            'example.com',
        );
        const hwidLimit = TemplateEngine.formatWithUser(
            '{{HWID_DEVICES_LIMIT}}',
            user,
            settings,
            'example.com',
        );

        expect(ssLimit).toBe('4');
        expect(hwidLimit).toBe(ssLimit);
    });
});

describe('TemplateEngine announce rendering', () => {
    it('renders announce template without raw {{...}} placeholders', () => {
        const user = createUser({
            expireAt: new Date('2026-06-10T14:52:57Z'),
            hwidDeviceLimit: 3,
            hwidDevicesCount: 2,
        });

        const template =
            'Срок действия: {{EXPIRE_DATE}} ({{EXPIRE_DATETIME}}), ' +
            'устройств: {{HWID_DEVICES_COUNT}}/{{HWID_DEVICES_LIMIT}}, дней осталось: {{DAYS_LEFT}}';

        const rendered = TemplateEngine.formatWithUser(
            template,
            user,
            createSettings(5),
            'example.com',
        );

        expect(rendered).not.toMatch(/\{\{/);
        expect(rendered).toContain('10.06.2026');
        expect(rendered).toContain('2/3');
    });
});
