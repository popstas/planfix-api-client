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
 * @interface PostCustomfieldMainUpdate200Response
 */
export interface PostCustomfieldMainUpdate200Response {
    /**
     * 
     * @type {string}
     * @memberof PostCustomfieldMainUpdate200Response
     */
    result: string;
}

/**
 * Check if a given object implements the PostCustomfieldMainUpdate200Response interface.
 */
export function instanceOfPostCustomfieldMainUpdate200Response(value: object): value is PostCustomfieldMainUpdate200Response {
    if (!('result' in value) || value['result'] === undefined) return false;
    return true;
}

export function PostCustomfieldMainUpdate200ResponseFromJSON(json: any): PostCustomfieldMainUpdate200Response {
    return PostCustomfieldMainUpdate200ResponseFromJSONTyped(json, false);
}

export function PostCustomfieldMainUpdate200ResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): PostCustomfieldMainUpdate200Response {
    if (json == null) {
        return json;
    }
    return {
        
        'result': json['result'],
    };
}

export function PostCustomfieldMainUpdate200ResponseToJSON(json: any): PostCustomfieldMainUpdate200Response {
    return PostCustomfieldMainUpdate200ResponseToJSONTyped(json, false);
}

export function PostCustomfieldMainUpdate200ResponseToJSONTyped(value?: PostCustomfieldMainUpdate200Response | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'result': value['result'],
    };
}

