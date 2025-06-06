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
/**
 * 
 * @export
 * @interface GetTaskChecklistRequest
 */
export interface GetTaskChecklistRequest {
    /**
     * Offset from beginning of list
     * @type {number}
     * @memberof GetTaskChecklistRequest
     */
    offset?: number;
    /**
     * Size of requested list
     * @type {number}
     * @memberof GetTaskChecklistRequest
     */
    pageSize?: number;
    /**
     * Fields returned - names, comma-delimited
     * @type {string}
     * @memberof GetTaskChecklistRequest
     */
    fields?: string;
}

/**
 * Check if a given object implements the GetTaskChecklistRequest interface.
 */
export function instanceOfGetTaskChecklistRequest(value: object): value is GetTaskChecklistRequest {
    return true;
}

export function GetTaskChecklistRequestFromJSON(json: any): GetTaskChecklistRequest {
    return GetTaskChecklistRequestFromJSONTyped(json, false);
}

export function GetTaskChecklistRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetTaskChecklistRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'offset': json['offset'] == null ? undefined : json['offset'],
        'pageSize': json['pageSize'] == null ? undefined : json['pageSize'],
        'fields': json['fields'] == null ? undefined : json['fields'],
    };
}

export function GetTaskChecklistRequestToJSON(json: any): GetTaskChecklistRequest {
    return GetTaskChecklistRequestToJSONTyped(json, false);
}

export function GetTaskChecklistRequestToJSONTyped(value?: GetTaskChecklistRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'offset': value['offset'],
        'pageSize': value['pageSize'],
        'fields': value['fields'],
    };
}

