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
 * @interface GetDataTagsRequest
 */
export interface GetDataTagsRequest {
    /**
     * Offset from beginning of list
     * @type {number}
     * @memberof GetDataTagsRequest
     */
    offset?: number;
    /**
     * Size of requested list
     * @type {number}
     * @memberof GetDataTagsRequest
     */
    pageSize?: number;
    /**
     * Fields returned - names separated by commas
     * @type {string}
     * @memberof GetDataTagsRequest
     */
    fields?: string;
}

/**
 * Check if a given object implements the GetDataTagsRequest interface.
 */
export function instanceOfGetDataTagsRequest(value: object): value is GetDataTagsRequest {
    return true;
}

export function GetDataTagsRequestFromJSON(json: any): GetDataTagsRequest {
    return GetDataTagsRequestFromJSONTyped(json, false);
}

export function GetDataTagsRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetDataTagsRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'offset': json['offset'] == null ? undefined : json['offset'],
        'pageSize': json['pageSize'] == null ? undefined : json['pageSize'],
        'fields': json['fields'] == null ? undefined : json['fields'],
    };
}

export function GetDataTagsRequestToJSON(json: any): GetDataTagsRequest {
    return GetDataTagsRequestToJSONTyped(json, false);
}

export function GetDataTagsRequestToJSONTyped(value?: GetDataTagsRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'offset': value['offset'],
        'pageSize': value['pageSize'],
        'fields': value['fields'],
    };
}

