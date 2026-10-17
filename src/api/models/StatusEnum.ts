/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * * `HOLD` - Hold
 * * `CONFIRMED` - Confirmed
 * * `CANCELLED` - Cancelled
 * * `EXPIRED` - Expired
 * * `COMPLETED` - Completed
 * * `NO_SHOW` - No Show
 */
export const StatusEnum = {
    HOLD: 'HOLD',
    CONFIRMED: 'CONFIRMED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED',
    COMPLETED: 'COMPLETED',
    NO_SHOW: 'NO_SHOW',
} as const;

export type StatusEnum = (typeof StatusEnum)[keyof typeof StatusEnum];
