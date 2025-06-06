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
 * @interface CompanyEntity
 */
export interface CompanyEntity {
    /**
     * 
     * @type {number}
     * @memberof CompanyEntity
     */
    id?: number;
    /**
     * 
     * @type {string}
     * @memberof CompanyEntity
     */
    name?: string;
}

/**
 * Check if a given object implements the CompanyEntity interface.
 */
export function instanceOfCompanyEntity(value: object): value is CompanyEntity {
    return true;
}

export function CompanyEntityFromJSON(json: any): CompanyEntity {
    return CompanyEntityFromJSONTyped(json, false);
}

export function CompanyEntityFromJSONTyped(json: any, ignoreDiscriminator: boolean): CompanyEntity {
    if (json == null) {
        return json;
    }
    return {
        
        'id': json['id'] == null ? undefined : json['id'],
        'name': json['name'] == null ? undefined : json['name'],
    };
}

export function CompanyEntityToJSON(json: any): CompanyEntity {
    return CompanyEntityToJSONTyped(json, false);
}

export function CompanyEntityToJSONTyped(value?: CompanyEntity | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'id': value['id'],
        'name': value['name'],
    };
}

