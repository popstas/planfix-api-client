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
 * @interface PostContactAddDataTagEntryNewComment201Response
 */
export interface PostContactAddDataTagEntryNewComment201Response {
    /**
     * 
     * @type {string}
     * @memberof PostContactAddDataTagEntryNewComment201Response
     */
    result?: string;
    /**
     * 
     * @type {Array<number>}
     * @memberof PostContactAddDataTagEntryNewComment201Response
     */
    keys?: Array<number>;
    /**
     * 
     * @type {number}
     * @memberof PostContactAddDataTagEntryNewComment201Response
     */
    commentId?: number;
}

/**
 * Check if a given object implements the PostContactAddDataTagEntryNewComment201Response interface.
 */
export function instanceOfPostContactAddDataTagEntryNewComment201Response(value: object): value is PostContactAddDataTagEntryNewComment201Response {
    return true;
}

export function PostContactAddDataTagEntryNewComment201ResponseFromJSON(json: any): PostContactAddDataTagEntryNewComment201Response {
    return PostContactAddDataTagEntryNewComment201ResponseFromJSONTyped(json, false);
}

export function PostContactAddDataTagEntryNewComment201ResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): PostContactAddDataTagEntryNewComment201Response {
    if (json == null) {
        return json;
    }
    return {
        
        'result': json['result'] == null ? undefined : json['result'],
        'keys': json['keys'] == null ? undefined : json['keys'],
        'commentId': json['commentId'] == null ? undefined : json['commentId'],
    };
}

export function PostContactAddDataTagEntryNewComment201ResponseToJSON(json: any): PostContactAddDataTagEntryNewComment201Response {
    return PostContactAddDataTagEntryNewComment201ResponseToJSONTyped(json, false);
}

export function PostContactAddDataTagEntryNewComment201ResponseToJSONTyped(value?: PostContactAddDataTagEntryNewComment201Response | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'result': value['result'],
        'keys': value['keys'],
        'commentId': value['commentId'],
    };
}

