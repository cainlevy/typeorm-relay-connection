import RelayConnection from "./RelayConnection";

const collection = [
  { id: "a" },
  { id: "b" },
  { id: "1" },
  { id: "d" },
  { id: "4" },
  { id: "c" },
  { id: "2" },
  { id: "f" },
  { id: "7" },
  { id: "e" },
  { id: "5" },
];

describe("RelayConnection", () => {
  test("no args", () => {
    const slice = new RelayConnection(collection, {});
    expect(slice.edges.map(({ cursor }) => cursor)).toEqual(
      collection.map((n) => n.id)
    );
    expect(slice.pageInfo.hasPreviousPage).toBeFalsy();
    expect(slice.pageInfo.hasNextPage).toBeFalsy();
  });

  test("first", () => {
    const slice = new RelayConnection(collection, { first: 3 });
    expect(slice.edges.map(({ cursor }) => cursor)).toEqual(["a", "b", "1"]);
    expect(slice.pageInfo.hasPreviousPage).toBeFalsy();
    expect(slice.pageInfo.hasNextPage).toBeTruthy();
  });

  test("last", () => {
    const slice = new RelayConnection(collection, { last: 3 });
    expect(slice.edges.map(({ cursor }) => cursor)).toEqual(["7", "e", "5"]);
    expect(slice.pageInfo.hasPreviousPage).toBeTruthy();
    expect(slice.pageInfo.hasNextPage).toBeFalsy();
  });

  test("after", () => {
    const slice = new RelayConnection(collection, { after: "7" });
    expect(slice.edges.map(({ cursor }) => cursor)).toEqual(["e", "5"]);
    expect(slice.pageInfo.hasPreviousPage).toBeTruthy();
    expect(slice.pageInfo.hasNextPage).toBeFalsy();
  });

  test("before", () => {
    const slice = new RelayConnection(collection, { before: "1" });
    expect(slice.edges.map(({ cursor }) => cursor)).toEqual(["a", "b"]);
    expect(slice.pageInfo.hasPreviousPage).toBeFalsy();
    expect(slice.pageInfo.hasNextPage).toBeTruthy();
  });

  test("after & first", () => {
    const slice = new RelayConnection(collection, { after: "2", first: 3 });
    expect(slice.edges.map(({ cursor }) => cursor)).toEqual(["f", "7", "e"]);
    expect(slice.pageInfo.hasPreviousPage).toBeTruthy();
    expect(slice.pageInfo.hasNextPage).toBeTruthy();
  });

  test("before & last", () => {
    const slice = new RelayConnection(collection, { before: "4", last: 3 });
    expect(slice.edges.map(({ cursor }) => cursor)).toEqual(["b", "1", "d"]);
    expect(slice.pageInfo.hasPreviousPage).toBeTruthy();
    expect(slice.pageInfo.hasNextPage).toBeTruthy();
  });

  test("after & before", () => {
    const slice = new RelayConnection(collection, { after: "4", first: 3 });
    expect(slice.edges.map(({ cursor }) => cursor)).toEqual(["c", "2", "f"]);
    expect(slice.pageInfo.hasPreviousPage).toBeTruthy();
    expect(slice.pageInfo.hasNextPage).toBeTruthy();
  });

  test("after & before & first", () => {
    const slice = new RelayConnection(collection, {
      after: "1",
      before: "7",
      first: 3,
    });
    expect(slice.edges.map(({ cursor }) => cursor)).toEqual(["d", "4", "c"]);
    expect(slice.pageInfo.hasPreviousPage).toBeTruthy();
    expect(slice.pageInfo.hasNextPage).toBeTruthy();
  });

  test("before & after & last", () => {
    const slice = new RelayConnection(collection, {
      after: "1",
      before: "7",
      last: 3,
    });
    expect(slice.edges.map(({ cursor }) => cursor)).toEqual(["c", "2", "f"]);
    expect(slice.pageInfo.hasPreviousPage).toBeTruthy();
    expect(slice.pageInfo.hasNextPage).toBeTruthy();
  });
});
