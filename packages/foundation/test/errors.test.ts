import { describe, expect, it } from "vitest";
import { errors, httpStatusFor, SeldonError } from "../src/errors.js";

describe("SeldonError", () => {
  it("maps codes to the documented statuses", () => {
    expect(httpStatusFor("dsl_error")).toBe(400);
    expect(httpStatusFor("upstream_error")).toBe(502);
    expect(errors.notFound("epoch").httpStatus).toBe(404);
  });

  it("survives an RPC hop as its own code, not internal", () => {
    const thrown = new SeldonError("not_found", "epoch not found", {
      details: { epochId: "ep_5f9c2a1d44e0" },
    });
    // A structured clone across a service binding loses the prototype.
    const cloned = JSON.parse(JSON.stringify(thrown.toWire().error));
    const recovered = SeldonError.from(cloned);
    expect(recovered.code).toBe("not_found");
    expect(recovered.httpStatus).toBe(404);
    expect(recovered.details).toEqual({ epochId: "ep_5f9c2a1d44e0" });
  });

  it("classifies an unknown throw as internal", () => {
    expect(SeldonError.from(new TypeError("boom")).code).toBe("internal");
    expect(SeldonError.from("boom").code).toBe("internal");
  });

  it("carries the request id into the wire envelope", () => {
    const envelope = errors.validationFailed("bad body").toWire("req_01j9ab7f");
    expect(envelope.error.requestId).toBe("req_01j9ab7f");
  });
});
