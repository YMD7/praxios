import { describe, expect, it } from "vitest";

import { cliLayer } from "../apps/cli/src/index";
import { contractsLayer } from "../contracts/src/index";
import { adaptersLayer } from "../packages/adapters/src/index";
import { applicationLayer } from "../packages/application/src/index";
import { coreLayer } from "../packages/core/src/index";
import { portsLayer } from "../packages/ports/src/index";

describe("runtime baseline", () => {
  it("loads the minimal TypeScript workspace packages", () => {
    expect({
      adaptersLayer,
      applicationLayer,
      cliLayer,
      contractsLayer,
      coreLayer,
      portsLayer,
    }).toEqual({
      adaptersLayer: "adapters",
      applicationLayer: "application",
      cliLayer: "cli",
      contractsLayer: "contracts",
      coreLayer: "core",
      portsLayer: "ports",
    });
  });
});
