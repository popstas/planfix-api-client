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
import type { GroupResponse } from './GroupResponse';
import {
    GroupResponseFromJSON,
    GroupResponseFromJSONTyped,
    GroupResponseToJSON,
    GroupResponseToJSONTyped,
} from './GroupResponse';

/**
 * 
 * @export
 * @interface GetContactListGroups200Response
 */
export interface GetContactListGroups200Response {
    /**
     * 
     * @type {string}
     * @memberof GetContactListGroups200Response
     */
    result?: string;
    /**
     * 
     * @type {Array<GroupResponse>}
     * @memberof GetContactListGroups200Response
     */
    groups?: Array<GroupResponse>;
}

/**
 * Check if a given object implements the GetContactListGroups200Response interface.
 */
export function instanceOfGetContactListGroups200Response(value: object): value is GetContactListGroups200Response {
    return true;
}

export function GetContactListGroups200ResponseFromJSON(json: any): GetContactListGroups200Response {
    return GetContactListGroups200ResponseFromJSONTyped(json, false);
}

export function GetContactListGroups200ResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetContactListGroups200Response {
    if (json == null) {
        return json;
    }
    return {
        
        'result': json['result'] == null ? undefined : json['result'],
        'groups': json['groups'] == null ? undefined : ((json['groups'] as Array<any>).map(GroupResponseFromJSON)),
    };
}

export function GetContactListGroups200ResponseToJSON(json: any): GetContactListGroups200Response {
    return GetContactListGroups200ResponseToJSONTyped(json, false);
}

export function GetContactListGroups200ResponseToJSONTyped(value?: GetContactListGroups200Response | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'result': value['result'],
        'groups': value['groups'] == null ? undefined : ((value['groups'] as Array<any>).map(GroupResponseToJSON)),
    };
}

