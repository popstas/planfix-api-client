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


import * as runtime from '../runtime';
import type {
  ApiResponseError,
  CustomField,
  GetCustomfieldContact200Response,
  GetCustomfieldTypes200Response,
  PostContact201Response,
  PostCustomfieldMainUpdate200Response,
} from '../models/index';
import {
    ApiResponseErrorFromJSON,
    ApiResponseErrorToJSON,
    CustomFieldFromJSON,
    CustomFieldToJSON,
    GetCustomfieldContact200ResponseFromJSON,
    GetCustomfieldContact200ResponseToJSON,
    GetCustomfieldTypes200ResponseFromJSON,
    GetCustomfieldTypes200ResponseToJSON,
    PostContact201ResponseFromJSON,
    PostContact201ResponseToJSON,
    PostCustomfieldMainUpdate200ResponseFromJSON,
    PostCustomfieldMainUpdate200ResponseToJSON,
} from '../models/index';

export interface GetCustomfieldGenericRequest {
    fields?: string;
}

export interface GetCustomfieldsForDatatagRequest {
    id: string;
    fields?: string;
}

export interface GetCustomfieldsForDirectoryRequest {
    id: string;
    fields?: string;
}

export interface PostCustomfieldMainAddRequest {
    customField?: CustomField;
}

export interface PostCustomfieldMainUpdateRequest {
    id: string;
    customField?: CustomField;
}

/**
 * 
 */
export class CustomFieldsApi extends runtime.BaseAPI {

    /**
     * This method lets you get a list of custom main fields
     * Get list of custom main fields
     */
    async getCustomfieldGenericRaw(requestParameters: GetCustomfieldGenericRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<GetCustomfieldContact200Response>> {
        const queryParameters: any = {};

        if (requestParameters['fields'] != null) {
            queryParameters['fields'] = requestParameters['fields'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token("rest_auth", []);

            if (tokenString) {
                headerParameters["Authorization"] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({
            path: `/customfield/main`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => GetCustomfieldContact200ResponseFromJSON(jsonValue));
    }

    /**
     * This method lets you get a list of custom main fields
     * Get list of custom main fields
     */
    async getCustomfieldGeneric(requestParameters: GetCustomfieldGenericRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<GetCustomfieldContact200Response> {
        const response = await this.getCustomfieldGenericRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * This method lets you get a list of custom field types
     * Get a list of a custom field types
     */
    async getCustomfieldTypesRaw(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<GetCustomfieldTypes200Response>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token("rest_auth", []);

            if (tokenString) {
                headerParameters["Authorization"] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({
            path: `/customfield/type`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => GetCustomfieldTypes200ResponseFromJSON(jsonValue));
    }

    /**
     * This method lets you get a list of custom field types
     * Get a list of a custom field types
     */
    async getCustomfieldTypes(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<GetCustomfieldTypes200Response> {
        const response = await this.getCustomfieldTypesRaw(initOverrides);
        return await response.value();
    }

    /**
     * This method lets you get a list of custom fields for data tag
     * Get list of custom fields for data tag
     */
    async getCustomfieldsForDatatagRaw(requestParameters: GetCustomfieldsForDatatagRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<GetCustomfieldContact200Response>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling getCustomfieldsForDatatag().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['fields'] != null) {
            queryParameters['fields'] = requestParameters['fields'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token("rest_auth", []);

            if (tokenString) {
                headerParameters["Authorization"] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({
            path: `/customfield/datatag/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => GetCustomfieldContact200ResponseFromJSON(jsonValue));
    }

    /**
     * This method lets you get a list of custom fields for data tag
     * Get list of custom fields for data tag
     */
    async getCustomfieldsForDatatag(requestParameters: GetCustomfieldsForDatatagRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<GetCustomfieldContact200Response> {
        const response = await this.getCustomfieldsForDatatagRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * This method lets you get a list of custom fields for directory
     * Get list of custom fields for directory
     */
    async getCustomfieldsForDirectoryRaw(requestParameters: GetCustomfieldsForDirectoryRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<GetCustomfieldContact200Response>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling getCustomfieldsForDirectory().'
            );
        }

        const queryParameters: any = {};

        if (requestParameters['fields'] != null) {
            queryParameters['fields'] = requestParameters['fields'];
        }

        const headerParameters: runtime.HTTPHeaders = {};

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token("rest_auth", []);

            if (tokenString) {
                headerParameters["Authorization"] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({
            path: `/customfield/directory/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => GetCustomfieldContact200ResponseFromJSON(jsonValue));
    }

    /**
     * This method lets you get a list of custom fields for directory
     * Get list of custom fields for directory
     */
    async getCustomfieldsForDirectory(requestParameters: GetCustomfieldsForDirectoryRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<GetCustomfieldContact200Response> {
        const response = await this.getCustomfieldsForDirectoryRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * This method lets you create a custom main field
     * Create a custom main field
     */
    async postCustomfieldMainAddRaw(requestParameters: PostCustomfieldMainAddRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<PostContact201Response>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token("rest_auth", []);

            if (tokenString) {
                headerParameters["Authorization"] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({
            path: `/customfield/main/`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: CustomFieldToJSON(requestParameters['customField']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => PostContact201ResponseFromJSON(jsonValue));
    }

    /**
     * This method lets you create a custom main field
     * Create a custom main field
     */
    async postCustomfieldMainAdd(requestParameters: PostCustomfieldMainAddRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<PostContact201Response> {
        const response = await this.postCustomfieldMainAddRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * This method lets you update a custom main field
     * Update a custom main field
     */
    async postCustomfieldMainUpdateRaw(requestParameters: PostCustomfieldMainUpdateRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<PostCustomfieldMainUpdate200Response>> {
        if (requestParameters['id'] == null) {
            throw new runtime.RequiredError(
                'id',
                'Required parameter "id" was null or undefined when calling postCustomfieldMainUpdate().'
            );
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        if (this.configuration && this.configuration.accessToken) {
            const token = this.configuration.accessToken;
            const tokenString = await token("rest_auth", []);

            if (tokenString) {
                headerParameters["Authorization"] = `Bearer ${tokenString}`;
            }
        }
        const response = await this.request({
            path: `/customfield/main/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters['id']))),
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: CustomFieldToJSON(requestParameters['customField']),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => PostCustomfieldMainUpdate200ResponseFromJSON(jsonValue));
    }

    /**
     * This method lets you update a custom main field
     * Update a custom main field
     */
    async postCustomfieldMainUpdate(requestParameters: PostCustomfieldMainUpdateRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<PostCustomfieldMainUpdate200Response> {
        const response = await this.postCustomfieldMainUpdateRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
