import dayjs from 'dayjs';

import { TUsersStatus, USERS_STATUS_VALUES } from '@libs/contracts/constants';

import { SubscriptionSettingsEntity } from '@modules/subscription-settings/entities';
import { UserEntity } from '@modules/users/entities';

import { prettyBytesUtil } from '../bytes';
import { parseTemplate, renderTemplate } from './template-parser';
import { TemplateResolvers } from './template-variables';

const USER_STATUS_LABELS = Object.fromEntries(
    USERS_STATUS_VALUES.map((status) => [status, status.charAt(0) + status.slice(1).toLowerCase()]),
) as Record<TUsersStatus, string>;

const EXPIRE_DATE_FALLBACK = '—';

function formatExpireDate(value: Date | null | undefined, withTime = false): string {
    if (value === null || value === undefined) {
        return EXPIRE_DATE_FALLBACK;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return EXPIRE_DATE_FALLBACK;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const datePart = `${day}.${month}.${date.getFullYear()}`;

    if (!withTime) {
        return datePart;
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${datePart} ${hours}:${minutes}`;
}

export class TemplateEngine {
    static replace(template: string, resolvers: TemplateResolvers): string {
        return renderTemplate(parseTemplate(template), resolvers);
    }

    static createUserValueMap(
        user: UserEntity,
        subscriptionSettings: SubscriptionSettingsEntity,
        subPublicDomain: string,
    ): TemplateResolvers {
        const trafficLeft = (): bigint =>
            user.trafficLimitBytes === 0n
                ? 0n
                : user.trafficLimitBytes - user.userTraffic.usedTrafficBytes;

        return {
            DAYS_LEFT: () => Math.max(0, dayjs(user.expireAt).diff(dayjs(), 'day')),
            TRAFFIC_USED: () => prettyBytesUtil(user.userTraffic.usedTrafficBytes, true, 3),
            TRAFFIC_LEFT: () => prettyBytesUtil(trafficLeft(), true, 3),
            TOTAL_TRAFFIC: () => prettyBytesUtil(user.trafficLimitBytes, true, 3),
            STATUS: (args) => args[user.status] ?? USER_STATUS_LABELS[user.status],
            USERNAME: () => user.username,
            EMAIL: () => user.email || '',
            TELEGRAM_ID: () => user.telegramId?.toString() || '',
            SUBSCRIPTION_URL: () => `https://${subPublicDomain}/${user.shortUuid}`,
            TAG: () => user.tag || '',
            EXPIRE_UNIX: () => dayjs(user.expireAt).unix(),
            EXPIRE_DATE: () => formatExpireDate(user.expireAt),
            EXPIRE_DATETIME: () => formatExpireDate(user.expireAt, true),
            SHORT_UUID: () => user.shortUuid,
            ID: () => user.id.toString(),
            TRAFFIC_USED_BYTES: () => user.userTraffic.usedTrafficBytes.toString(),
            TRAFFIC_LEFT_BYTES: () => trafficLeft().toString(),
            TOTAL_TRAFFIC_BYTES: () => user.trafficLimitBytes.toString(),
            RESET_STRATEGY: (args) => args[user.trafficLimitStrategy] ?? user.trafficLimitStrategy,
            LIFETIME_USED_BYTES: () => user.userTraffic.lifetimeUsedTrafficBytes.toString(),
            CREATED_AT_UNIX: () => dayjs(user.createdAt).unix(),
            LAST_TRAFFIC_RESET_AT_UNIX: () =>
                user.lastTrafficResetAt ? dayjs(user.lastTrafficResetAt).unix() : 0,
            SS_HWID_LIMIT: () =>
                (user.hwidDeviceLimit !== null
                    ? user.hwidDeviceLimit
                    : (subscriptionSettings.hwidSettings.fallbackDeviceLimit ?? 0)
                ).toString(),
            HWID_DEVICES_COUNT: () => user.hwidDevicesCount.toString(),
            HWID_DEVICES_LIMIT: () =>
                (user.hwidDeviceLimit !== null && user.hwidDeviceLimit !== 0
                    ? user.hwidDeviceLimit
                    : (subscriptionSettings.hwidSettings.fallbackDeviceLimit ?? 0)
                ).toString(),
            DESCRIPTION: () => user.description ?? '',
        };
    }

    static formatWithUser(
        template: string,
        user: UserEntity,
        subscriptionSettings: SubscriptionSettingsEntity,
        subPublicDomain: string,
    ): string {
        return this.replace(
            template,
            this.createUserValueMap(user, subscriptionSettings, subPublicDomain),
        );
    }
}
