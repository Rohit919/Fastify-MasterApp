import { Type } from '@sinclair/typebox';

export const ListExamplesResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Array(
    Type.Object({
      id: Type.String(),
      title: Type.String(),
      description: Type.String(),
      createdAt: Type.String({ format: 'date-time' }),
      updatedAt: Type.String({ format: 'date-time' }),
    })
  ),
});

export const CreateExampleBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.String({ maxLength: 1000 }),
});

export const CreateExampleResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    id: Type.String(),
    title: Type.String(),
    description: Type.String(),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  }),
});
