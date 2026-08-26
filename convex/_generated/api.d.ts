/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as artifacts from "../artifacts.js";
import type * as auth from "../auth.js";
import type * as gallery from "../gallery.js";
import type * as http from "../http.js";
import type * as licenses from "../licenses.js";
import type * as mentor from "../mentor.js";
import type * as mentorAI from "../mentorAI.js";
import type * as pipelineAI from "../pipelineAI.js";
import type * as pipelineData from "../pipelineData.js";
import type * as products from "../products.js";
import type * as providerData from "../providerData.js";
import type * as providerKeys from "../providerKeys.js";
import type * as researchAI from "../researchAI.js";
import type * as researchData from "../researchData.js";
import type * as turso from "../turso.js";
import type * as usage from "../usage.js";
import type * as userSettings from "../userSettings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  artifacts: typeof artifacts;
  auth: typeof auth;
  gallery: typeof gallery;
  http: typeof http;
  licenses: typeof licenses;
  mentor: typeof mentor;
  mentorAI: typeof mentorAI;
  pipelineAI: typeof pipelineAI;
  pipelineData: typeof pipelineData;
  products: typeof products;
  providerData: typeof providerData;
  providerKeys: typeof providerKeys;
  researchAI: typeof researchAI;
  researchData: typeof researchData;
  turso: typeof turso;
  usage: typeof usage;
  userSettings: typeof userSettings;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
