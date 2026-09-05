import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export function requestId(request: Request) {
  return request.headers.get("x-request-id") ?? randomUUID();
}

export function errorResponse(request: Request, code: string, message: string, status: number) {
  const id = requestId(request);
  return NextResponse.json({ error: { code, message, requestId: id } }, { status, headers: { "x-request-id": id } });
}

export function successResponse<T>(request: Request, data: T, status = 200) {
  const id = requestId(request);
  return NextResponse.json(data, { status, headers: { "x-request-id": id } });
}
