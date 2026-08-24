import * as pulumi from "@pulumi/pulumi";
import { parseEnvironment } from "@seldon/foundation";

const config = new pulumi.Config("seldon");

/** The stack *is* the environment: `staging` or `production`. */
export const environment = parseEnvironment(pulumi.getStack());

export const accountId = config.require("accountId");
export const zoneId = config.require("zoneId");
export const accessTeamName = config.require("accessTeamName");
export const accessEmails = config.requireObject<string[]>("accessEmails");
