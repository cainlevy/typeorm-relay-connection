## TypeORM Relay Connection

TypeORM implementation of Relay Connection spec.

## Getting Started

Install:

```
npm install typeorm-relay-connection
```

### GraphQL Resolver

```js
const QueryResolver = {
  books: async (_, args, { db }) =>
    new TypeORMRelayConnection(
      // query builder with some number of requirements
      db.createQueryBuilder(Book, "book").where("published_at IS NOT NULL"),
      // standard relay arguments from client
      args,
      // configuration
      {
        // constraint on args.first and args.last
        // default: 500
        limit: 100,

        // primary (unique!) key for Book
        // default: 'id'
        cursorKey: "id",

        // desired sorting for pagination order
        // default: 'created_at'
        sortingKey: "published_at",
        // default: 'ASC'
        sortingOrder: "ASC",
      }
    ),
};
```

### Connection Aggregates

You can access the scope from connection resolvers to calculate aggregates on whatever query was previously built for pagination:

```graphql
query {
  books {
    total
    edges {
      node {
        id
        name
      }
    }
  }
}
```

```js
const BookConnectionResolver = {
  // parent is the TypeORMRelayConnection from BookResolver.books
  total: async (parent) => await parent.scope.getCount(),
};
```

## Releasing

1. Review `CHANGELOG.md` and determine the next semantic version
2. Commit a change to `package.json` and `CHANGELOG.md` with the next version. Push.
3. Tag the commit. Push tags.
4. Run `npm publish`

## Contributing

Bug reports and pull requests are welcome! This project is intended to be a safe, welcoming space for collaboration.
