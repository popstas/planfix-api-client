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
import type { ReportSave } from './ReportSave';
import {
    ReportSaveFromJSON,
    ReportSaveFromJSONTyped,
    ReportSaveToJSON,
    ReportSaveToJSONTyped,
} from './ReportSave';

/**
 * 
 * @export
 * @interface CheckGetReportSaveByRequestId200Response
 */
export interface CheckGetReportSaveByRequestId200Response {
    /**
     * 
     * @type {string}
     * @memberof CheckGetReportSaveByRequestId200Response
     */
    result?: string;
    /**
     * 
     * @type {string}
     * @memberof CheckGetReportSaveByRequestId200Response
     */
    status?: string;
    /**
     * 
     * @type {ReportSave}
     * @memberof CheckGetReportSaveByRequestId200Response
     */
    save?: ReportSave;
}

/**
 * Check if a given object implements the CheckGetReportSaveByRequestId200Response interface.
 */
export function instanceOfCheckGetReportSaveByRequestId200Response(value: object): value is CheckGetReportSaveByRequestId200Response {
    return true;
}

export function CheckGetReportSaveByRequestId200ResponseFromJSON(json: any): CheckGetReportSaveByRequestId200Response {
    return CheckGetReportSaveByRequestId200ResponseFromJSONTyped(json, false);
}

export function CheckGetReportSaveByRequestId200ResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): CheckGetReportSaveByRequestId200Response {
    if (json == null) {
        return json;
    }
    return {
        
        'result': json['result'] == null ? undefined : json['result'],
        'status': json['status'] == null ? undefined : json['status'],
        'save': json['save'] == null ? undefined : ReportSaveFromJSON(json['save']),
    };
}

export function CheckGetReportSaveByRequestId200ResponseToJSON(json: any): CheckGetReportSaveByRequestId200Response {
    return CheckGetReportSaveByRequestId200ResponseToJSONTyped(json, false);
}

export function CheckGetReportSaveByRequestId200ResponseToJSONTyped(value?: CheckGetReportSaveByRequestId200Response | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'result': value['result'],
        'status': value['status'],
        'save': ReportSaveToJSON(value['save']),
    };
}

