import { describe, expect, it } from "vitest";
import {
  getErrorFieldNames,
  hasErrorName,
} from "../../backend/src/utils/errors";

describe("backend error narrowing", () => {
  it("recognizes Sequelize-style named errors and their fields", () => {
    const error = {
      name: "SequelizeUniqueConstraintError",
      fields: { email: "duplicate@example.test" },
    };

    expect(hasErrorName(error, "SequelizeUniqueConstraintError")).toBe(true);
    expect(getErrorFieldNames(error)).toEqual(["email"]);
  });

  it("safely rejects malformed thrown values", () => {
    expect(hasErrorName("failure", "SequelizeUniqueConstraintError")).toBe(
      false,
    );
    expect(getErrorFieldNames(null)).toEqual([]);
  });
});
