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
import type { CustomField } from './CustomField';
import {
    CustomFieldFromJSON,
    CustomFieldFromJSONTyped,
    CustomFieldToJSON,
    CustomFieldToJSONTyped,
} from './CustomField';
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
 * @interface DataTag
 */
export interface DataTag {
    /**
     * 
     * @type {number}
     * @memberof DataTag
     */
    id?: number;
    /**
     * 
     * @type {string}
     * @memberof DataTag
     */
    name?: string;
    /**
     * 
     * @type {GroupResponse}
     * @memberof DataTag
     */
    group?: GroupResponse;
    /**
     * 
     * @type {Array<CustomField>}
     * @memberof DataTag
     */
    fields?: Array<CustomField>;
}

/**
 * Check if a given object implements the DataTag interface.
 */
export function instanceOfDataTag(value: object): value is DataTag {
    return true;
}

export function DataTagFromJSON(json: any): DataTag {
    return DataTagFromJSONTyped(json, false);
}

export function DataTagFromJSONTyped(json: any, ignoreDiscriminator: boolean): DataTag {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'name': json['name'] == null ? undefined : json['name'],
        'group': json['group'] == null ? undefined : GroupResponseFromJSON(json['group']),
        'fields': json['fields'] == null ? undefined : ((json['fields'] as Array<any>).map(CustomFieldFromJSON)),
    };
}

export function DataTagToJSON(json: any): DataTag {
    return DataTagToJSONTyped(json, false);
}

export function DataTagToJSONTyped(value?: DataTag | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
        'name': value['name'],
        'group': GroupResponseToJSON(value['group']),
        'fields': value['fields'] == null ? undefined : ((value['fields'] as Array<any>).map(CustomFieldToJSON)),
    };
}

