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
import type { ReportSaveDataItem } from './ReportSaveDataItem';
import {
    ReportSaveDataItemFromJSON,
    ReportSaveDataItemFromJSONTyped,
    ReportSaveDataItemToJSON,
    ReportSaveDataItemToJSONTyped,
} from './ReportSaveDataItem';

/**
 * 
 * @export
 * @interface ReportSaveDataRow
 */
export interface ReportSaveDataRow {
    /**
     * 
     * @type {string}
     * @memberof ReportSaveDataRow
     */
    type?: ReportSaveDataRowTypeEnum;
    /**
     * 
     * @type {number}
     * @memberof ReportSaveDataRow
     */
    depth?: number;
    /**
     * 
     * @type {Array<ReportSaveDataItem>}
     * @memberof ReportSaveDataRow
     */
    items?: Array<ReportSaveDataItem>;
}


/**
 * @export
 */
export const ReportSaveDataRowTypeEnum = {
    Header: 'Header',
    Normal: 'Normal'
} as const;
export type ReportSaveDataRowTypeEnum = typeof ReportSaveDataRowTypeEnum[keyof typeof ReportSaveDataRowTypeEnum];


/**
 * Check if a given object implements the ReportSaveDataRow interface.
 */
export function instanceOfReportSaveDataRow(value: object): value is ReportSaveDataRow {
    return true;
}

export function ReportSaveDataRowFromJSON(json: any): ReportSaveDataRow {
    return ReportSaveDataRowFromJSONTyped(json, false);
}

export function ReportSaveDataRowFromJSONTyped(json: any, ignoreDiscriminator: boolean): ReportSaveDataRow {
    if (json == null) {
        return json;
    }
    return {
        
        'type': json['type'] == null ? undefined : json['type'],
        'depth': json['depth'] == null ? undefined : json['depth'],
        'items': json['items'] == null ? undefined : ((json['items'] as Array<any>).map(ReportSaveDataItemFromJSON)),
    };
}

export function ReportSaveDataRowToJSON(json: any): ReportSaveDataRow {
    return ReportSaveDataRowToJSONTyped(json, false);
}

export function ReportSaveDataRowToJSONTyped(value?: ReportSaveDataRow | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'type': value['type'],
        'depth': value['depth'],
        'items': value['items'] == null ? undefined : ((value['items'] as Array<any>).map(ReportSaveDataItemToJSON)),
    };
}

