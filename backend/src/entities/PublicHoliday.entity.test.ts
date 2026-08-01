import { PublicHoliday } from "./PublicHoliday.entity";

describe("PublicHoliday entity", () => {
  it("can be instantiated and properties assigned", () => {
    // Arrange
    const holiday = new PublicHoliday();

    // Act
    holiday.id = 1;
    holiday.date = new Date("2026-12-25");
    holiday.name = "Christmas Day";

    // Assert
    expect(holiday.id).toBe(1);
    expect(holiday.date).toEqual(new Date("2026-12-25"));
    expect(holiday.name).toBe("Christmas Day");
  });
});
