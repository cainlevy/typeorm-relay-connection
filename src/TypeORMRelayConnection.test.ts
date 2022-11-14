import { SelectQueryBuilder } from "typeorm";
import { Author, Book, manager as db } from "./databaseTesting";
import TypeORMRelayConnection from "./TypeORMRelayConnection";

// shared fixture set
const authors: Partial<Author>[] = [
  { id: 0, name: "a", createdAt: new Date(2021, 0, 1) },
  { id: 1, name: "b", createdAt: new Date(2021, 0, 2) },
  { id: 2, name: "1", createdAt: new Date(2021, 0, 3) },
  { id: 3, name: "d", createdAt: new Date(2021, 0, 3) }, // non-unique sorting key
  { id: 4, name: "4", createdAt: new Date(2021, 0, 5) },
  { id: 5, name: "c", createdAt: new Date(2021, 0, 6) },
  { id: 6, name: "2", createdAt: new Date(2021, 0, 7) },
  { id: 7, name: "f", createdAt: new Date(2021, 0, 8) },
  { id: 8, name: "7", createdAt: new Date(2021, 0, 9) },
  { id: 9, name: "e", createdAt: new Date(2021, 0, 10) },
  { id: 10, name: "5", createdAt: new Date(2021, 0, 11) },
];
beforeEach(async () => {
  const authorRepo = db.getRepository(Author);
  await authorRepo.save(authorRepo.create(authors));
});

describe("TypeORMRelayConnection", () => {
  let qb: SelectQueryBuilder<Author>;
  beforeEach(async () => {
    qb = db
      .createQueryBuilder(Author, "myAlias")
      .where("LENGTH(myAlias.name) = 1")
      // joins require distinct column references
      .leftJoin("myAlias.books", "book");
  });

  test("default config", async () => {
    const conn = new TypeORMRelayConnection(qb, {});
    expect(conn.config).toMatchInlineSnapshot(`
      Object {
        "cursorKey": "id",
        "limit": 500,
        "sortingKey": "created_at",
        "sortingOrder": "ASC",
      }
    `);
  });

  test("custom config", async () => {
    const conn = new TypeORMRelayConnection(qb, {}, { sortingKey: "test" });
    expect(conn.config).toMatchInlineSnapshot(`
      Object {
        "cursorKey": "id",
        "limit": 500,
        "sortingKey": "test",
        "sortingOrder": "ASC",
      }
    `);
  });

  test("no args", async () => {
    const slice = new TypeORMRelayConnection(qb, {});
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual(
      authors.map((n) => n.name)
    );
    expect((await slice.pageInfo()).hasPreviousPage).toBeFalsy();
    expect((await slice.pageInfo()).hasNextPage).toBeFalsy();
  });

  test("first", async () => {
    const slice = new TypeORMRelayConnection(qb, { first: 3 });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual([
      "a",
      "b",
      "1",
    ]);
    expect((await slice.pageInfo()).hasPreviousPage).toBeFalsy();
    expect((await slice.pageInfo()).hasNextPage).toBeTruthy();
  });

  test("last", async () => {
    const slice = new TypeORMRelayConnection(qb, { last: 3 });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual([
      "7",
      "e",
      "5",
    ]);
    expect((await slice.pageInfo()).hasPreviousPage).toBeTruthy();
    expect((await slice.pageInfo()).hasNextPage).toBeFalsy();
  });

  test("after", async () => {
    const slice = new TypeORMRelayConnection(qb, {
      after: "8",
    });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual([
      "e",
      "5",
    ]);
    expect((await slice.pageInfo()).hasPreviousPage).toBeTruthy();
    expect((await slice.pageInfo()).hasNextPage).toBeFalsy();
  });

  test("before", async () => {
    const slice = new TypeORMRelayConnection(qb, {
      before: "2",
    });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual([
      "a",
      "b",
    ]);
    expect((await slice.pageInfo()).hasPreviousPage).toBeFalsy();
    expect((await slice.pageInfo()).hasNextPage).toBeTruthy();
  });

  test("after & first", async () => {
    const slice = new TypeORMRelayConnection(qb, {
      after: "6",
      first: 3,
    });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual([
      "f",
      "7",
      "e",
    ]);
    expect((await slice.pageInfo()).hasPreviousPage).toBeTruthy();
    expect((await slice.pageInfo()).hasNextPage).toBeTruthy();
  });

  test("before & last", async () => {
    const slice = new TypeORMRelayConnection(qb, {
      before: "4",
      last: 3,
    });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual([
      "b",
      "1",
      "d",
    ]);
    expect((await slice.pageInfo()).hasPreviousPage).toBeTruthy();
    expect((await slice.pageInfo()).hasNextPage).toBeTruthy();
  });

  test("after & before", async () => {
    const slice = new TypeORMRelayConnection(qb, {
      after: "4",
      first: 3,
    });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual([
      "c",
      "2",
      "f",
    ]);
    expect((await slice.pageInfo()).hasPreviousPage).toBeTruthy();
    expect((await slice.pageInfo()).hasNextPage).toBeTruthy();
  });

  test("after & before & first", async () => {
    const slice = new TypeORMRelayConnection(qb, {
      after: "2",
      before: "8",
      first: 3,
    });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual([
      "d",
      "4",
      "c",
    ]);
    expect((await slice.pageInfo()).hasPreviousPage).toBeTruthy();
    expect((await slice.pageInfo()).hasNextPage).toBeTruthy();
  });

  test("before & after & last", async () => {
    const slice = new TypeORMRelayConnection(qb, {
      after: "2",
      before: "8",
      last: 3,
    });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual([
      "c",
      "2",
      "f",
    ]);
    expect((await slice.pageInfo()).hasPreviousPage).toBeTruthy();
    expect((await slice.pageInfo()).hasNextPage).toBeTruthy();
  });

  test("grouping", async () => {
    // the first author has three books, which could be enough to fool "hasNextPage"
    const author = await db.findOneByOrFail(Author, { id: 0 });
    for (const i of [1, 2, 3]) {
      await db.save(
        db.create(Book, {
          name: `${author.name}: Vol ${i}`,
          author,
        })
      );
    }

    // joining creates extra entries
    const slice = new TypeORMRelayConnection(qb, {
      first: 1,
    });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual(["a"]);
    expect((await slice.pageInfo()).hasNextPage).toBeTruthy();
  });

  test("after non-unique sorting key", async () => {
    const slice = new TypeORMRelayConnection(qb, {
      after: "2",
      first: 1,
    });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual(["d"]);
    expect((await slice.pageInfo()).hasPreviousPage).toBeTruthy();
    expect((await slice.pageInfo()).hasNextPage).toBeTruthy();
  });

  test("before non-unique sorting key", async () => {
    const slice = new TypeORMRelayConnection(qb, {
      before: "3",
      last: 1,
    });
    expect((await slice.edges()).map(({ node }) => node.name)).toEqual(["1"]);
    expect((await slice.pageInfo()).hasPreviousPage).toBeTruthy();
    expect((await slice.pageInfo()).hasNextPage).toBeTruthy();
  });
});
