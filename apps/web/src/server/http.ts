import { NextResponse } from "next/server";

export const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

export const jsonErrorWithDetail = (message: string, detail: string, status: number) =>
  NextResponse.json({ error: message, detail }, { status });
