// One WorkBuddy Cloud client for the whole app. Initialized lazily so the
// server prerender (no window, no env) never touches it.
//
// Both values come from `publicConfig` returned by the cloud-service tool and are
// safe to ship in front-end code. Never put a long-lived key or admin credential here.

import { createWorkBuddyCloud, type WorkBuddyCloudClient } from "@tencent-ai/workbuddy-cloud-sdk";

const endpoint = process.env.NEXT_PUBLIC_CLOUD_ENDPOINT;
const publishableKey = process.env.NEXT_PUBLIC_CLOUD_KEY;

export const cloudEnabled = Boolean(endpoint && publishableKey);

let _cloud: WorkBuddyCloudClient | null | undefined;

export function getCloud(): WorkBuddyCloudClient | null {
  if (_cloud !== undefined) return _cloud;
  if (!endpoint || !publishableKey) {
    _cloud = null;
    return null;
  }
  _cloud = createWorkBuddyCloud({ endpoint, publishableKey });
  return _cloud;
}

export function requireCloud(): WorkBuddyCloudClient {
  const c = getCloud();
  if (!c) throw new Error("云服务未启用");
  return c;
}
