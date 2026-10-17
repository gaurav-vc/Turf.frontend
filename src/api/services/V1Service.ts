/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Booking } from '../models/Booking';
import type { Court } from '../models/Court';
import type { PatchedBooking } from '../models/PatchedBooking';
import type { PatchedCourt } from '../models/PatchedCourt';
import type { PatchedTurf } from '../models/PatchedTurf';
import type { Turf } from '../models/Turf';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class V1Service {
    /**
     * @returns Booking
     * @throws ApiError
     */
    public static v1BookingsList(): CancelablePromise<Array<Booking>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bookings/',
        });
    }
    /**
     * @param requestBody
     * @returns Booking
     * @throws ApiError
     */
    public static v1BookingsCreate(
        requestBody: Booking,
    ): CancelablePromise<Booking> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/bookings/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A UUID string identifying this booking.
     * @returns Booking
     * @throws ApiError
     */
    public static v1BookingsRetrieve(
        id: string,
    ): CancelablePromise<Booking> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/bookings/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id A UUID string identifying this booking.
     * @param requestBody
     * @returns Booking
     * @throws ApiError
     */
    public static v1BookingsUpdate(
        id: string,
        requestBody: Booking,
    ): CancelablePromise<Booking> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/bookings/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A UUID string identifying this booking.
     * @param requestBody
     * @returns Booking
     * @throws ApiError
     */
    public static v1BookingsPartialUpdate(
        id: string,
        requestBody?: PatchedBooking,
    ): CancelablePromise<Booking> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/bookings/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A UUID string identifying this booking.
     * @returns void
     * @throws ApiError
     */
    public static v1BookingsDestroy(
        id: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/bookings/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param requestBody
     * @returns Booking
     * @throws ApiError
     */
    public static v1BookingsHoldCreate(
        requestBody: Booking,
    ): CancelablePromise<Booking> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/bookings/hold/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns Court
     * @throws ApiError
     */
    public static v1TurfsAppCourtsList(): CancelablePromise<Array<Court>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/turfs-app/courts/',
        });
    }
    /**
     * @param requestBody
     * @returns Court
     * @throws ApiError
     */
    public static v1TurfsAppCourtsCreate(
        requestBody: Court,
    ): CancelablePromise<Court> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/turfs-app/courts/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A UUID string identifying this court.
     * @returns Court
     * @throws ApiError
     */
    public static v1TurfsAppCourtsRetrieve(
        id: string,
    ): CancelablePromise<Court> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/turfs-app/courts/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id A UUID string identifying this court.
     * @param requestBody
     * @returns Court
     * @throws ApiError
     */
    public static v1TurfsAppCourtsUpdate(
        id: string,
        requestBody: Court,
    ): CancelablePromise<Court> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/turfs-app/courts/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A UUID string identifying this court.
     * @param requestBody
     * @returns Court
     * @throws ApiError
     */
    public static v1TurfsAppCourtsPartialUpdate(
        id: string,
        requestBody?: PatchedCourt,
    ): CancelablePromise<Court> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/turfs-app/courts/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A UUID string identifying this court.
     * @returns void
     * @throws ApiError
     */
    public static v1TurfsAppCourtsDestroy(
        id: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/turfs-app/courts/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @returns Turf
     * @throws ApiError
     */
    public static v1TurfsAppTurfsList(): CancelablePromise<Array<Turf>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/turfs-app/turfs/',
        });
    }
    /**
     * @param requestBody
     * @returns Turf
     * @throws ApiError
     */
    public static v1TurfsAppTurfsCreate(
        requestBody: Turf,
    ): CancelablePromise<Turf> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/turfs-app/turfs/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A UUID string identifying this turf.
     * @returns Turf
     * @throws ApiError
     */
    public static v1TurfsAppTurfsRetrieve(
        id: string,
    ): CancelablePromise<Turf> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/turfs-app/turfs/{id}/',
            path: {
                'id': id,
            },
        });
    }
    /**
     * @param id A UUID string identifying this turf.
     * @param requestBody
     * @returns Turf
     * @throws ApiError
     */
    public static v1TurfsAppTurfsUpdate(
        id: string,
        requestBody: Turf,
    ): CancelablePromise<Turf> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/turfs-app/turfs/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A UUID string identifying this turf.
     * @param requestBody
     * @returns Turf
     * @throws ApiError
     */
    public static v1TurfsAppTurfsPartialUpdate(
        id: string,
        requestBody?: PatchedTurf,
    ): CancelablePromise<Turf> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/v1/turfs-app/turfs/{id}/',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @param id A UUID string identifying this turf.
     * @returns void
     * @throws ApiError
     */
    public static v1TurfsAppTurfsDestroy(
        id: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/turfs-app/turfs/{id}/',
            path: {
                'id': id,
            },
        });
    }
}
