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
 * @interface ChecklistItemResponseStatus
 */
export interface ChecklistItemResponseStatus {
    /**
     * 
     * @type {number}
     * @memberof ChecklistItemResponseStatus
     */
    id?: number;
    /**
     * 
     * @type {string}
     * @memberof ChecklistItemResponseStatus
     */
    name?: string;
}

/**
 * Check if a given object implements the ChecklistItemResponseStatus interface.
 */
export function instanceOfChecklistItemResponseStatus(value: object): value is ChecklistItemResponseStatus {
    return true;
}

export function ChecklistItemResponseStatusFromJSON(json: any): ChecklistItemResponseStatus {
    return ChecklistItemResponseStatusFromJSONTyped(json, false);
}

export function ChecklistItemResponseStatusFromJSONTyped(json: any, ignoreDiscriminator: boolean): ChecklistItemResponseStatus {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'name': json['name'] == null ? undefined : json['name'],
    };
}

export function ChecklistItemResponseStatusToJSON(json: any): ChecklistItemResponseStatus {
    return ChecklistItemResponseStatusToJSONTyped(json, false);
}

export function ChecklistItemResponseStatusToJSONTyped(value?: ChecklistItemResponseStatus | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
        'name': value['name'],
    };
}

