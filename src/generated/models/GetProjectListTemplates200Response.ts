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
import type { ProjectResponse } from './ProjectResponse';
import {
    ProjectResponseFromJSON,
    ProjectResponseFromJSONTyped,
    ProjectResponseToJSON,
    ProjectResponseToJSONTyped,
} from './ProjectResponse';

/**
 * 
 * @export
 * @interface GetProjectListTemplates200Response
 */
export interface GetProjectListTemplates200Response {
    /**
     * 
     * @type {string}
     * @memberof GetProjectListTemplates200Response
     */
    result?: string;
    /**
     * 
     * @type {Array<ProjectResponse>}
     * @memberof GetProjectListTemplates200Response
     */
    templates?: Array<ProjectResponse>;
}

/**
 * Check if a given object implements the GetProjectListTemplates200Response interface.
 */
export function instanceOfGetProjectListTemplates200Response(value: object): value is GetProjectListTemplates200Response {
    return true;
}

export function GetProjectListTemplates200ResponseFromJSON(json: any): GetProjectListTemplates200Response {
    return GetProjectListTemplates200ResponseFromJSONTyped(json, false);
}

export function GetProjectListTemplates200ResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): GetProjectListTemplates200Response {
    if (json == null) {
        return json;
    }
    return {
        
        'result': json['result'] == null ? undefined : json['result'],
        'templates': json['templates'] == null ? undefined : ((json['templates'] as Array<any>).map(ProjectResponseFromJSON)),
    };
}

export function GetProjectListTemplates200ResponseToJSON(json: any): GetProjectListTemplates200Response {
    return GetProjectListTemplates200ResponseToJSONTyped(json, false);
}

export function GetProjectListTemplates200ResponseToJSONTyped(value?: GetProjectListTemplates200Response | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'result': value['result'],
        'templates': value['templates'] == null ? undefined : ((value['templates'] as Array<any>).map(ProjectResponseToJSON)),
    };
}

