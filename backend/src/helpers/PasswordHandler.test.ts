import { PasswordHandler } from "./PasswordHandler";

describe("PasswordHandler", () => {
  describe("hashPassword", () => {
    it("returns a hashedPassword string and a salt string", () => {
      // Act
      const { hashedPassword, salt } =
        PasswordHandler.hashPassword("securepassword");

      // Assert
      expect(typeof hashedPassword).toBe("string");
      expect(typeof salt).toBe("string");
      expect(hashedPassword.length).toBeGreaterThan(0);
      expect(salt.length).toBeGreaterThan(0);
    });

    it("generates a unique salt on each call", () => {
      // Act
      const { salt: salt1 } = PasswordHandler.hashPassword("password");
      const { salt: salt2 } = PasswordHandler.hashPassword("password");

      // Assert
      expect(salt1).not.toBe(salt2);
    });

    it("produces a different hash for the same password due to unique salts", () => {
      // Act
      const { hashedPassword: hash1 } =
        PasswordHandler.hashPassword("password");
      const { hashedPassword: hash2 } =
        PasswordHandler.hashPassword("password");

      // Assert
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("returns true when the correct password is provided", () => {
      // Arrange
      const password = "correctpassword";
      const { hashedPassword, salt } = PasswordHandler.hashPassword(password);

      // Act
      const result = PasswordHandler.verifyPassword(
        password,
        hashedPassword,
        salt,
      );

      // Assert
      expect(result).toBe(true);
    });

    it("returns false when an incorrect password is provided", () => {
      // Arrange
      const { hashedPassword, salt } =
        PasswordHandler.hashPassword("correctpassword");

      // Act
      const result = PasswordHandler.verifyPassword(
        "wrongpassword",
        hashedPassword,
        salt,
      );

      // Assert
      expect(result).toBe(false);
    });
  });
});
