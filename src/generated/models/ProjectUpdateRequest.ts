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
import type { PeopleRequest } from './PeopleRequest';
import {
    PeopleRequestFromJSON,
    PeopleRequestFromJSONTyped,
    PeopleRequestToJSON,
    PeopleRequestToJSONTyped,
} from './PeopleRequest';
import type { GroupRequest } from './GroupRequest';
import {
    GroupRequestFromJSON,
    GroupRequestFromJSONTyped,
    GroupRequestToJSON,
    GroupRequestToJSONTyped,
} from './GroupRequest';
import type { BaseEntity } from './BaseEntity';
import {
    BaseEntityFromJSON,
    BaseEntityFromJSONTyped,
    BaseEntityToJSON,
    BaseEntityToJSONTyped,
} from './BaseEntity';
import type { CustomFieldValueRequest } from './CustomFieldValueRequest';
import {
    CustomFieldValueRequestFromJSON,
    CustomFieldValueRequestFromJSONTyped,
    CustomFieldValueRequestToJSON,
    CustomFieldValueRequestToJSONTyped,
} from './CustomFieldValueRequest';
import type { PersonRequest } from './PersonRequest';
import {
    PersonRequestFromJSON,
    PersonRequestFromJSONTyped,
    PersonRequestToJSON,
    PersonRequestToJSONTyped,
} from './PersonRequest';
import type { TimePoint } from './TimePoint';
import {
    TimePointFromJSON,
    TimePointFromJSONTyped,
    TimePointToJSON,
    TimePointToJSONTyped,
} from './TimePoint';

/**
 * 
 * @export
 * @interface ProjectUpdateRequest
 */
export interface ProjectUpdateRequest {
    /**
     * 
     * @type {string}
     * @memberof ProjectUpdateRequest
     */
    sourceObjectId?: string;
    /**
     * 
     * @type {string}
     * @memberof ProjectUpdateRequest
     */
    sourceDataVersion?: string;
    /**
     * 
     * @type {string}
     * @memberof ProjectUpdateRequest
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof ProjectUpdateRequest
     */
    description?: string;
    /**
     * 
     * @type {BaseEntity}
     * @memberof ProjectUpdateRequest
     */
    status?: BaseEntity;
    /**
     * 
     * @type {PersonRequest}
     * @memberof ProjectUpdateRequest
     */
    owner?: PersonRequest;
    /**
     * 
     * @type {BaseEntity}
     * @memberof ProjectUpdateRequest
     */
    parent?: BaseEntity;
    /**
     * 
     * @type {BaseEntity}
     * @memberof ProjectUpdateRequest
     */
    template?: BaseEntity;
    /**
     * 
     * @type {GroupRequest}
     * @memberof ProjectUpdateRequest
     */
    group?: GroupRequest;
    /**
     * 
     * @type {PersonRequest}
     * @memberof ProjectUpdateRequest
     */
    counterparty?: PersonRequest;
    /**
     * 
     * @type {TimePoint}
     * @memberof ProjectUpdateRequest
     */
    endDate?: TimePoint;
    /**
     * 
     * @type {boolean}
     * @memberof ProjectUpdateRequest
     */
    hasEndDate?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ProjectUpdateRequest
     */
    hiddenForEmployees?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ProjectUpdateRequest
     */
    hiddenForClients?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ProjectUpdateRequest
     */
    overdue?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof ProjectUpdateRequest
     */
    isCloseToDeadline?: boolean;
    /**
     * 
     * @type {PeopleRequest}
     * @memberof ProjectUpdateRequest
     */
    assignees?: PeopleRequest;
    /**
     * 
     * @type {PeopleRequest}
     * @memberof ProjectUpdateRequest
     */
    participants?: PeopleRequest;
    /**
     * 
     * @type {PeopleRequest}
     * @memberof ProjectUpdateRequest
     */
    auditors?: PeopleRequest;
    /**
     * 
     * @type {PeopleRequest}
     * @memberof ProjectUpdateRequest
     */
    clientManagers?: PeopleRequest;
    /**
     * 
     * @type {boolean}
     * @memberof ProjectUpdateRequest
     */
    isDeleted?: boolean;
    /**
     * 
     * @type {Array<CustomFieldValueRequest>}
     * @memberof ProjectUpdateRequest
     */
    customFieldData?: Array<CustomFieldValueRequest>;
}

/**
 * Check if a given object implements the ProjectUpdateRequest interface.
 */
export function instanceOfProjectUpdateRequest(value: object): value is ProjectUpdateRequest {
    return true;
}

export function ProjectUpdateRequestFromJSON(json: any): ProjectUpdateRequest {
    return ProjectUpdateRequestFromJSONTyped(json, false);
}

export function ProjectUpdateRequestFromJSONTyped(json: any, ignoreDiscriminator: boolean): ProjectUpdateRequest {
    if (json == null) {
        return json;
    }
    return {
        
        'sourceObjectId': json['sourceObjectId'] == null ? undefined : json['sourceObjectId'],
        'sourceDataVersion': json['sourceDataVersion'] == null ? undefined : json['sourceDataVersion'],
        'name': json['name'] == null ? undefined : json['name'],
        'description': json['description'] == null ? undefined : json['description'],
        'status': json['status'] == null ? undefined : BaseEntityFromJSON(json['status']),
        'owner': json['owner'] == null ? undefined : PersonRequestFromJSON(json['owner']),
        'parent': json['parent'] == null ? undefined : BaseEntityFromJSON(json['parent']),
        'template': json['template'] == null ? undefined : BaseEntityFromJSON(json['template']),
        'group': json['group'] == null ? undefined : GroupRequestFromJSON(json['group']),
        'counterparty': json['counterparty'] == null ? undefined : PersonRequestFromJSON(json['counterparty']),
        'endDate': json['endDate'] == null ? undefined : TimePointFromJSON(json['endDate']),
        'hasEndDate': json['hasEndDate'] == null ? undefined : json['hasEndDate'],
        'hiddenForEmployees': json['hiddenForEmployees'] == null ? undefined : json['hiddenForEmployees'],
        'hiddenForClients': json['hiddenForClients'] == null ? undefined : json['hiddenForClients'],
        'overdue': json['overdue'] == null ? undefined : json['overdue'],
        'isCloseToDeadline': json['isCloseToDeadline'] == null ? undefined : json['isCloseToDeadline'],
        'assignees': json['assignees'] == null ? undefined : PeopleRequestFromJSON(json['assignees']),
        'participants': json['participants'] == null ? undefined : PeopleRequestFromJSON(json['participants']),
        'auditors': json['auditors'] == null ? undefined : PeopleRequestFromJSON(json['auditors']),
        'clientManagers': json['clientManagers'] == null ? undefined : PeopleRequestFromJSON(json['clientManagers']),
        'isDeleted': json['isDeleted'] == null ? undefined : json['isDeleted'],
        'customFieldData': json['customFieldData'] == null ? undefined : ((json['customFieldData'] as Array<any>).map(CustomFieldValueRequestFromJSON)),
    };
}

export function ProjectUpdateRequestToJSON(json: any): ProjectUpdateRequest {
    return ProjectUpdateRequestToJSONTyped(json, false);
}

export function ProjectUpdateRequestToJSONTyped(value?: ProjectUpdateRequest | null, ignoreDiscriminator: boolean = false): any {
    if (value == null) {
        return value;
    }

    return {
        
        'sourceObjectId': value['sourceObjectId'],
        'sourceDataVersion': value['sourceDataVersion'],
        'name': value['name'],
        'description': value['description'],
        'status': BaseEntityToJSON(value['status']),
        'owner': PersonRequestToJSON(value['owner']),
        'parent': BaseEntityToJSON(value['parent']),
        'template': BaseEntityToJSON(value['template']),
        'group': GroupRequestToJSON(value['group']),
        'counterparty': PersonRequestToJSON(value['counterparty']),
        'endDate': TimePointToJSON(value['endDate']),
        'hasEndDate': value['hasEndDate'],
        'hiddenForEmployees': value['hiddenForEmployees'],
        'hiddenForClients': value['hiddenForClients'],
        'overdue': value['overdue'],
        'isCloseToDeadline': value['isCloseToDeadline'],
        'assignees': PeopleRequestToJSON(value['assignees']),
        'participants': PeopleRequestToJSON(value['participants']),
        'auditors': PeopleRequestToJSON(value['auditors']),
        'clientManagers': PeopleRequestToJSON(value['clientManagers']),
        'isDeleted': value['isDeleted'],
        'customFieldData': value['customFieldData'] == null ? undefined : ((value['customFieldData'] as Array<any>).map(CustomFieldValueRequestToJSON)),
    };
}

