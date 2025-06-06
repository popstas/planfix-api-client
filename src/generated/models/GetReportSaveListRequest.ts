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
 * @interface GetReportSaveListRequest
 */
export interface GetReportSaveListRequest {
    /**
     * Fields returned - system field names, comma-delimited
     * @type {string}
     * @memberof GetReportSaveListRequest
     */
    fields?: string;
}

/**
 * Check if a given object implements the GetReportSaveListRequest interface.
 */
export function instanceOfGetReportSaveListRequest(value: object): value is GetReportSaveListRequest {
    return true;
}

export function GetReportSaveListRequestFromJSON(json: any): GetReportSaveListRequest {
    return GetReportSaveListRequestFromJSONTyped(json, false);
}

export function GetReportSaveListRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetReportSaveListRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'fields': json['fields'] == null ? undefined : json['fields'],
    };
}

export function GetReportSaveListRequestToJSON(json: any): GetReportSaveListRequest {
    return GetReportSaveListRequestToJSONTyped(json, false);
}

export function GetReportSaveListRequestToJSONTyped(value?: GetReportSaveListRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'fields': value['fields'],
    };
}

