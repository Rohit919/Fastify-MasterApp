import { Type, type Static } from "@sinclair/typebox";
import { PaginatedEnvelope, PaginationQuery } from "./common.js";

export const AuditLogDto = Type.Object({
  id: Type.String(),
  action: Type.String(),
  actorId: Type.Union([Type.String(), Type.Null()]),
  targetType: Type.Union([Type.String(), Type.Null()]),
  targetId: Type.Union([Type.String(), Type.Null()]),
  metadata: Type.Unknown(),
  requestId: Type.Union([Type.String(), Type.Null()]),
  ip: Type.Union([Type.String(), Type.Null()]),
  userAgent: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
});
export type AuditLogDto = Static<typeof AuditLogDto>;

export const ListAuditLogsQuery = Type.Composite([
  PaginationQuery,
  Type.Object({
    action: Type.Optional(Type.String({ maxLength: 100 })),
    actorId: Type.Optional(Type.String({ maxLength: 100 })),
    targetType: Type.Optional(Type.String({ maxLength: 100 })),
    targetId: Type.Optional(Type.String({ maxLength: 100 })),
  }),
]);
export type ListAuditLogsQuery = Static<typeof ListAuditLogsQuery>;

export const AuditLogsResponse = PaginatedEnvelope(AuditLogDto);
export type AuditLogsResponse = Static<typeof AuditLogsResponse>;
