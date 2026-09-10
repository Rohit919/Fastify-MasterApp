/** JSON-only payloads crossing the API → Redis → worker boundary. */
export interface TraceCarrier {
  _otel?: Record<string, string>;
}

export interface TodoCreatedJobData extends TraceCarrier {
  type: "todo.created";
  todoId: string;
  userId: string;
  title: string;
}

export interface OrderCreatedJobData extends TraceCarrier {
  type: "order.created";
  orderId: string;
  userId: string;
  totalCents: number;
}

export interface EmailJobData extends TraceCarrier {
  type: "email.send";
  to: string;
  subject: string;
  text: string;
}

export type NotificationJobData =
  TodoCreatedJobData | OrderCreatedJobData | EmailJobData;

export interface JobDataByQueue {
  notifications: NotificationJobData;
}
