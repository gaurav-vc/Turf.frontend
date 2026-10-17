/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { StatusEnum } from './StatusEnum';
export type PatchedBooking = {
    readonly id?: string;
    readonly created_at?: string;
    readonly updated_at?: string;
    is_active?: boolean;
    deleted_at?: string | null;
    readonly code?: string;
    start_at?: string;
    end_at?: string;
    readonly status?: StatusEnum;
    readonly hold_expires_at?: string | null;
    amount?: string;
    tax?: string;
    discount?: string;
    created_by?: string | null;
    user?: string;
    court?: string;
    sport?: string;
};

