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
 * @interface BaseEntity
 */
export interface BaseEntity {
    /**
     * 
     * @type {number}
     * @memberof BaseEntity
     */
    id?: number;
}

/**
 * Check if a given object implements the BaseEntity interface.
 */
export function instanceOfBaseEntity(value: object): value is BaseEntity {
    return true;
}

export function BaseEntityFromJSON(json: any): BaseEntity {
    return BaseEntityFromJSONTyped(json, false);
}

export function BaseEntityFromJSONTyped(json: any, ignoreDiscriminator: boolean): BaseEntity {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
    };
}

export function BaseEntityToJSON(json: any): BaseEntity {
    return BaseEntityToJSONTyped(json, false);
}

export function BaseEntityToJSONTyped(value?: BaseEntity | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
    };
}

