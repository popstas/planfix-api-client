/* tslint:disable */
/* eslint-disable */
/**
 * Planfix REST API
 * Documentation for Planfix REST API. <br> Generated <a href=\"https://root/restapidocs/swagger.json\">swagger.json</a>
 *
 * The version of the OpenAPI document: 1.3.3
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from '../runtime';
import type { GroupRequest } from './GroupRequest';
import {
    GroupRequestFromJSON,
    GroupRequestFromJSONTyped,
    GroupRequestToJSON,
    GroupRequestToJSONTyped,
} from './GroupRequest';
import type { PersonRequest } from './PersonRequest';
import {
    PersonRequestFromJSON,
    PersonRequestFromJSONTyped,
    PersonRequestToJSON,
    PersonRequestToJSONTyped,
} from './PersonRequest';

/**
 * 
 * @export
 * @interface NotifiedRequest
 */
export interface NotifiedRequest {
    /**
     * 
     * @type {Array<PersonRequest>}
     * @memberof NotifiedRequest
     */
    users?: Array<PersonRequest>;
    /**
     * 
     * @type {Array<GroupRequest>}
     * @memberof NotifiedRequest
     */
    groups?: Array<GroupRequest>;
    /**
     * 
     * @type {string}
     * @memberof NotifiedRequest
     */
    roles?: NotifiedRequestRolesEnum;
}


/**
 * @export
 */
export const NotifiedRequestRolesEnum = {
    Assignee: 'assignee',
    Participant: 'participant',
    Auditor: 'auditor',
    Assigner: 'assigner'
} as const;
export type NotifiedRequestRolesEnum = typeof NotifiedRequestRolesEnum[keyof typeof NotifiedRequestRolesEnum];


/**
 * Check if a given object implements the NotifiedRequest interface.
 */
export function instanceOfNotifiedRequest(value: object): value is NotifiedRequest {
    return true;
}

export function NotifiedRequestFromJSON(json: any): NotifiedRequest {
    return NotifiedRequestFromJSONTyped(json, false);
}

export function NotifiedRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): NotifiedRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'users': json['users'] == null ? undefined : ((json['users'] as Array<any>).map(PersonRequestFromJSON)),
        'groups': json['groups'] == null ? undefined : ((json['groups'] as Array<any>).map(GroupRequestFromJSON)),
        'roles': json['roles'] == null ? undefined : json['roles'],
    };
}

export function NotifiedRequestToJSON(json: any): NotifiedRequest {
    return NotifiedRequestToJSONTyped(json, false);
}

export function NotifiedRequestToJSONTyped(value?: NotifiedRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'users': value['users'] == null ? undefined : ((value['users'] as Array<any>).map(PersonRequestToJSON)),
        'groups': value['groups'] == null ? undefined : ((value['groups'] as Array<any>).map(GroupRequestToJSON)),
        'roles': value['roles'],
    };
}

