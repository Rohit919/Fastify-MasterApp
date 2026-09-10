import { Type, type Static } from "@sinclair/typebox";

/**
 * Example contracts — shared between the Fastify API and the admin.
 * The example module demonstrates direct Prisma access for simple CRUD.
 */

export const CreateExampleBody = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.String({ maxLength: 1000 }),
});
export type CreateExampleBody = Static<typeof CreateExampleBody>;

export const Example = Type.Object({
  id: Type.String(),
  title: Type.String(),
  description: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});
export type Example = Static<typeof Example>;

export const CreateExampleResponse = Type.Object({
  success: Type.Literal(true),
  data: Example,
});
export type CreateExampleResponse = Static<typeof CreateExampleResponse>;

export const ListExamplesResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Array(Example),
});
export type ListExamplesResponse = Static<typeof ListExamplesResponse>;
