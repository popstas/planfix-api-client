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
 * @interface GroupRequest
 */
export interface GroupRequest {
    /**
     * 
     * @type {number}
     * @memberof GroupRequest
     */
    id?: number;
}

/**
 * Check if a given object implements the GroupRequest interface.
 */
export function instanceOfGroupRequest(value: object): value is GroupRequest {
    return true;
}

export function GroupRequestFromJSON(json: any): GroupRequest {
    return GroupRequestFromJSONTyped(json, false);
}

export function GroupRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): GroupRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
    };
}

export function GroupRequestToJSON(json: any): GroupRequest {
    return GroupRequestToJSONTyped(json, false);
}

export function GroupRequestToJSONTyped(value?: GroupRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
    };
}

