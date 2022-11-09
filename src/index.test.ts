import { hello } from "./index";

test("hello", () => {
  expect(hello()).toBe("hello world");
});
